import "server-only";

import type Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin.server";
import { SUBSCRIPTION_STATUS_LABEL, type SubscriptionStatus } from "./plans";
import { getStripe, planIdForPrice } from "./stripe.server";

const iso = (unix: number | null | undefined) =>
  typeof unix === "number" ? new Date(unix * 1000).toISOString() : null;

function admin() {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("SUPABASE_SECRET_KEY não configurada");
  return client;
}

const ENDED = new Set<Stripe.Subscription.Status>(["canceled", "incomplete_expired"]);

/**
 * Copia o estado ATUAL de uma assinatura do Stripe para public.subscriptions.
 * Sempre busca a assinatura no Stripe (não confia na ordem dos eventos do webhook),
 * então pode ser chamada quantas vezes for preciso.
 *
 * @param expectedUserId quando vem de uma ação do próprio usuário, confere que a assinatura é dele.
 */
export async function syncSubscription(subscriptionId: string, expectedUserId?: string) {
  const stripe = getStripe();
  const db = admin();
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // Dono: metadata gravada no checkout → senão, quem tem esse customer no banco.
  let userId = sub.metadata?.user_id || null;
  if (!userId) {
    const { data } = await db
      .from("subscriptions")
      .select("user_id")
      .eq("customer_id", customerId)
      .maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId) {
    console.error(`[billing] assinatura ${sub.id} sem usuário (customer ${customerId})`);
    return null;
  }
  if (expectedUserId && expectedUserId !== userId) {
    throw new Error(`[billing] assinatura ${sub.id} não pertence a ${expectedUserId}`);
  }

  const { data: current } = await db
    .from("subscriptions")
    .select("subscription_id, provider")
    .eq("user_id", userId)
    .maybeSingle();

  // Conta liberada à mão (provider manual) não é mexida pelo Stripe.
  if (current?.provider === "manual") return userId;

  if (ENDED.has(sub.status)) {
    // Evento atrasado de uma assinatura antiga não derruba a assinatura nova.
    if (current?.subscription_id && current.subscription_id !== sub.id) return userId;
    const { error } = await db.from("subscriptions").upsert({
      user_id: userId,
      plan_id: "gratis",
      status: "active",
      provider: "none",
      customer_id: customerId,
      subscription_id: null,
      price_id: null,
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      canceled_at: iso(sub.canceled_at ?? sub.ended_at),
    });
    if (error) throw error;
    return userId;
  }

  const item = sub.items.data[0];
  const planId = planIdForPrice(item?.price.id);
  if (!planId) {
    console.error(
      `[billing] preço ${item?.price.id} sem plano: confira STRIPE_PRICE_PRO e STRIPE_PRICE_AGENCIA`,
    );
    return null;
  }

  const { error } = await db.from("subscriptions").upsert({
    user_id: userId,
    plan_id: planId,
    // Status novo que o Stripe venha a criar: trata como pendente (sem acesso pago).
    status: (sub.status in SUBSCRIPTION_STATUS_LABEL
      ? sub.status
      : "incomplete") as SubscriptionStatus,
    provider: "stripe",
    customer_id: customerId,
    subscription_id: sub.id,
    price_id: item.price.id,
    current_period_start: iso(item.current_period_start),
    current_period_end: iso(item.current_period_end),
    cancel_at_period_end: sub.cancel_at_period_end || sub.cancel_at !== null,
    canceled_at: iso(sub.canceled_at),
  });
  if (error) throw error;
  return userId;
}

/** Cliente do Stripe do usuário (cria na primeira vez e guarda no banco). */
export async function ensureCustomer(userId: string, email: string | null) {
  const db = admin();
  const { data: row, error } = await db
    .from("subscriptions")
    .select("customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (row?.customer_id) return row.customer_id;

  const customer = await getStripe().customers.create(
    { email: email ?? undefined, metadata: { user_id: userId } },
    // Dois cliques seguidos não criam dois clientes no Stripe.
    { idempotencyKey: `customer-${userId}` },
  );
  const { error: saveError } = await db
    .from("subscriptions")
    .upsert({ user_id: userId, customer_id: customer.id }, { onConflict: "user_id" });
  if (saveError) throw saveError;
  return customer.id;
}
