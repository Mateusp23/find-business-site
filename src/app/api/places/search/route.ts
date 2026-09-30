import { NextResponse } from "next/server";
import { jsonError, withApiErrors } from "@/lib/api/handler.server";
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

  return NextResponse.json(await searchPlaces(params), {
    headers: { "Cache-Control": "no-store" },
  });
});
