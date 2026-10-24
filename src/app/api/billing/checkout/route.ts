import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { jsonError, withApiErrors } from "@/lib/api/handler.server";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api/rateLimit.server";
import { requireSession } from "@/lib/api/session.server";
import { appUrl, getStripe, isBillingConfigured, priceIdFor } from "@/lib/billing/stripe.server";
import { ensureCustomer } from "@/lib/billing/sync.server";
import { apiCheckoutSchema } from "@/lib/validation/api";

/** Abre o checkout do Stripe para assinar um plano pago. Devolve { url } para redirecionar. */
export const POST = withApiErrors(async (request: Request) => {
  const session = await requireSession();
  if (!session.supabase || !session.userId) {
    return jsonError(400, "Planos só existem com login (Supabase configurado).", "LOCAL_MODE");
  }
  if (!isBillingConfigured) {
    throw new ApiError(
      "Os pagamentos ainda não foram ativados neste servidor.",
      503,
      "BILLING_OFF",
    );
  }
  const { planId } = apiCheckoutSchema.parse(await request.json().catch(() => ({})));
  await enforceRateLimit(session, RATE_LIMITS.billing, request);

  const price = priceIdFor(planId);
  if (!price) {
    throw new ApiError("Este plano ainda não tem preço configurado.", 503, "BILLING_OFF");
  }

  // Já assina? Troca de plano e cancelamento ficam no portal do Stripe.
  const { data: current, error } = await session.supabase
    .from("subscriptions")
    .select("provider, status, subscription_id")
    .eq("user_id", session.userId)
    .maybeSingle();
  if (error) throw error;
  if (
    current?.provider === "manual" ||
    (current?.subscription_id && ["active", "trialing", "past_due"].includes(current.status))
  ) {
    throw new ApiError(
      "Você já tem uma assinatura ativa. Use “Gerenciar assinatura” para trocar de plano.",
      409,
      "ALREADY_SUBSCRIBED",
    );
  }

  const customer = await ensureCustomer(session.userId, session.email);
  const base = appUrl(request);
  const checkout = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: session.userId,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { metadata: { user_id: session.userId, plan_id: planId } },
    metadata: { user_id: session.userId, plan_id: planId },
    allow_promotion_codes: true,
    locale: "pt-BR",
    success_url: `${base}/plano?checkout=sucesso&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/plano?checkout=cancelado`,
  });
  if (!checkout.url) throw new Error("Stripe não devolveu a URL do checkout");

  return NextResponse.json({ url: checkout.url }, { headers: { "Cache-Control": "no-store" } });
});
