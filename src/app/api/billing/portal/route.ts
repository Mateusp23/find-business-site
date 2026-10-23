import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { jsonError, withApiErrors } from "@/lib/api/handler.server";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api/rateLimit.server";
import { requireSession } from "@/lib/api/session.server";
import { appUrl, getStripe, isBillingConfigured } from "@/lib/billing/stripe.server";

/** Portal do Stripe: trocar cartão, mudar de plano, ver faturas e cancelar. */
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
  await enforceRateLimit(session, RATE_LIMITS.billing, request);

  const { data, error } = await session.supabase
    .from("subscriptions")
    .select("customer_id")
    .eq("user_id", session.userId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.customer_id) {
    throw new ApiError("Você ainda não tem uma assinatura para gerenciar.", 404, "NO_CUSTOMER");
  }

  const portal = await getStripe().billingPortal.sessions.create({
    customer: data.customer_id,
    locale: "pt-BR",
    return_url: `${appUrl(request)}/plano?portal=1`,
  });
  return NextResponse.json({ url: portal.url }, { headers: { "Cache-Control": "no-store" } });
});
