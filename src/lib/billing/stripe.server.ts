import "server-only";

import Stripe from "stripe";
import { isAdminConfigured } from "@/lib/supabase/admin.server";
import type { PaidPlanId, PlanId } from "./plans";

const SECRET = process.env.STRIPE_SECRET_KEY ?? "";

/** Preço (price_...) de cada plano pago no Stripe. Teste e produção têm IDs diferentes. */
const PRICE_BY_PLAN: Record<PaidPlanId, string> = {
  pro: process.env.STRIPE_PRICE_PRO ?? "",
  agencia: process.env.STRIPE_PRICE_AGENCIA ?? "",
};

/** Pagamentos ligados: Stripe + chave secreta do Supabase (para gravar a assinatura). */
export const isBillingConfigured = Boolean(SECRET) && isAdminConfigured;
export const isWebhookConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET);

let client: Stripe | null = null;

/** Cliente criado só quando usado (o build não precisa da chave). */
export function getStripe(): Stripe {
  if (!SECRET) throw new Error("STRIPE_SECRET_KEY não configurada");
  client ??= new Stripe(SECRET, {
    appInfo: { name: "Find Business" },
    maxNetworkRetries: 2,
    timeout: 20_000,
  });
  return client;
}

export const priceIdFor = (plan: PaidPlanId) => PRICE_BY_PLAN[plan] || null;

export function planIdForPrice(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  const entry = Object.entries(PRICE_BY_PLAN).find(([, id]) => id && id === priceId);
  return (entry?.[0] as PlanId | undefined) ?? null;
}

/** Endereço público do app (links de volta do checkout). Em produção, defina APP_URL. */
export function appUrl(request: Request) {
  const fromEnv = process.env.APP_URL?.replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  return new URL(request.url).origin;
}
