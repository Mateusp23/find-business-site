import { NextResponse } from "next/server";
import { withApiErrors } from "@/lib/api/handler.server";
import { ApiError } from "@/lib/api/errors";
import { requireSession } from "@/lib/api/session.server";
import { isBillingConfigured } from "@/lib/billing/stripe.server";
import type { BillingResponse, Plan } from "@/lib/billing/plans";

/** Plano atual, uso do mês e lista de planos (tela "Plano"). */
export const GET = withApiErrors(async () => {
  const session = await requireSession();
  if (!session.supabase) return NextResponse.json<BillingResponse>({ mode: "local" });

  const [overview, plans] = await Promise.all([
    session.supabase.rpc("billing_overview"),
    session.supabase
      .from("plans")
      .select(
        "id, name, description, price_cents, search_credits, analyses, saved_leads, features, sort",
      )
      .eq("is_public", true)
      .order("sort"),
  ]);
  const error = overview.error ?? plans.error;
  if (error) {
    if (["PGRST202", "PGRST205", "42883", "42P01"].includes(error.code ?? "")) {
      throw new ApiError(
        "Os planos ainda não foram criados no banco: rode supabase/migrations/0004_billing.sql no Supabase.",
        503,
        "MIGRATION",
      );
    }
    throw error;
  }

  return NextResponse.json<BillingResponse>(
    {
      mode: "supabase",
      billingEnabled: isBillingConfigured,
      ...overview.data!,
      plans: (plans.data ?? []) as Plan[],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
});
