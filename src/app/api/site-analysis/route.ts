import { NextResponse } from "next/server";
import { withApiErrors } from "@/lib/api/handler.server";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api/rateLimit.server";
import { requireSession } from "@/lib/api/session.server";
import { analyzeSite } from "@/lib/pagespeed.server";
import { apiSiteAnalysisSchema } from "@/lib/validation/api";

// O PageSpeed leva de 10 a 40 segundos por site.
export const maxDuration = 60;

export const GET = withApiErrors(async (request: Request) => {
  const session = await requireSession();
  const { url } = apiSiteAnalysisSchema.parse({
    url: new URL(request.url).searchParams.get("url") ?? "",
  });
  await enforceRateLimit(session, RATE_LIMITS.analysis, request);
  return NextResponse.json(await analyzeSite(url), { headers: { "Cache-Control": "no-store" } });
});
