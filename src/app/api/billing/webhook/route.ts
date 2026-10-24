import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { jsonError, withApiErrors } from "@/lib/api/handler.server";
import { getStripe, isBillingConfigured } from "@/lib/billing/stripe.server";
import { syncSubscription } from "@/lib/billing/sync.server";
import { getSupabaseAdmin } from "@/lib/supabase/admin.server";

/** Eventos que mudam a assinatura. Configure os mesmos no Stripe (veja o README). */
const SUBSCRIPTION_EVENTS = new Set<Stripe.Event.Type>([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
]);

function subscriptionIdOf(event: Stripe.Event): string | null {
  if (SUBSCRIPTION_EVENTS.has(event.type)) {
    return (event.data.object as Stripe.Subscription).id;
  }
  if (event.type === "checkout.session.completed") {
    const s = event.data.object;
    if (s.mode !== "subscription" || !s.subscription) return null;
    return typeof s.subscription === "string" ? s.subscription : s.subscription.id;
  }
  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const sub = event.data.object.parent?.subscription_details?.subscription;
    if (!sub) return null;
    return typeof sub === "string" ? sub : sub.id;
  }
  return null;
}

/**
 * Webhook do Stripe. Rota pública (o Stripe não tem login), protegida pela assinatura
 * do evento (STRIPE_WEBHOOK_SECRET). Responde 500 em erro para o Stripe tentar de novo.
 */
export const POST = withApiErrors(async (request: Request) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!isBillingConfigured || !secret) {
    return jsonError(503, "Pagamentos não configurados.", "BILLING_OFF");
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return jsonError(400, "Assinatura ausente.", "BAD_SIGNATURE");

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return jsonError(400, "Assinatura inválida.", "BAD_SIGNATURE");
  }

  const db = getSupabaseAdmin()!;
  const { data: seen } = await db
    .from("billing_events")
    .select("id")
    .eq("id", event.id)
    .maybeSingle();
  if (seen) return NextResponse.json({ received: true, duplicate: true });

  const subscriptionId = subscriptionIdOf(event);
  if (subscriptionId) await syncSubscription(subscriptionId);

  // Registra depois de processar: se falhar no meio, o Stripe reenvia e processa de novo.
  const { error } = await db.from("billing_events").insert({ id: event.id, type: event.type });
  if (error && error.code !== "23505") console.error("[billing] erro ao registrar evento", error);

  return NextResponse.json({ received: true });
});
