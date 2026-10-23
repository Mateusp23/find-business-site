import { NextResponse } from "next/server";
import { creditsForLimit } from "@/lib/billing/plans";
import { jsonError, withApiErrors } from "@/lib/api/handler.server";
import { consumeQuota, refundQuota } from "@/lib/api/quota.server";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api/rateLimit.server";
import { requireSession } from "@/lib/api/session.server";
import { searchPlaces } from "@/lib/places.server";
import { apiSearchSchema } from "@/lib/validation/api";

export const POST = withApiErrors(async (request: Request) => {
  const session = await requireSession();
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object")
    return jsonError(400, "Requisição inválida.", "BAD_REQUEST");

  const params = apiSearchSchema.parse(body);
  await enforceRateLimit(session, RATE_LIMITS.search, request);

  // Modo demonstração (sem chave do Google) não gasta créditos do plano.
  const isDemo = !process.env.GOOGLE_PLACES_API_KEY;
  // Reserva 1 crédito por página de 20; devolve o que o Google não usou (ou tudo, se falhar).
  const credits = isDemo ? 0 : creditsForLimit(params.limit);
  const charged = credits > 0 && (await consumeQuota(session, "search", credits));

  try {
    const result = await searchPlaces(params);
    if (charged && result.apiCalls < credits) {
      await refundQuota(session, "search", credits - result.apiCalls);
    }
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (charged) await refundQuota(session, "search", credits);
    throw err;
  }
});
