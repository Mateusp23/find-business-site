import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { jsonError, withApiErrors } from "@/lib/api/handler.server";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api/rateLimit.server";
import { requireSession } from "@/lib/api/session.server";
import { getStripe, isBillingConfigured } from "@/lib/billing/stripe.server";
import { syncSubscription } from "@/lib/billing/sync.server";
import { apiBillingSyncSchema } from "@/lib/validation/api";

/**
 * Atualiza a assinatura logo na volta do checkout/portal, sem esperar o webhook.
 * O webhook continua sendo a fonte oficial; isto só deixa a tela certa na hora.
 */
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
  const { sessionId } = apiBillingSyncSchema.parse(await request.json().catch(() => ({})));
  await enforceRateLimit(session, RATE_LIMITS.billing, request);

  let subscriptionId: string | null = null;
  if (sessionId) {
    const checkout = await getStripe().checkout.sessions.retrieve(sessionId);
    // Só a pessoa que abriu o checkout pode usar o id dele.
    if (checkout.client_reference_id !== session.userId) {
      throw new ApiError("Sessão de pagamento não encontrada.", 404, "NOT_FOUND");
    }
    if (checkout.status !== "complete") {
      return NextResponse.json({ synced: false, status: checkout.status });
    }
    subscriptionId =
      typeof checkout.subscription === "string"
        ? checkout.subscription
        : (checkout.subscription?.id ?? null);
  } else {
    const { data, error } = await session.supabase
      .from("subscriptions")
      .select("subscription_id")
      .eq("user_id", session.userId)
      .maybeSingle();
    if (error) throw error;
    subscriptionId = data?.subscription_id ?? null;
  }

  if (subscriptionId) await syncSubscription(subscriptionId, session.userId);
  return NextResponse.json({ synced: Boolean(subscriptionId) });
});
