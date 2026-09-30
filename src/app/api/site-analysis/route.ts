import { NextResponse } from "next/server";
import { jsonError, withApiErrors } from "@/lib/api/handler.server";
import { analyzeSite } from "@/lib/pagespeed.server";

// O PageSpeed leva de 10 a 40 segundos por site.
export const maxDuration = 60;

export const GET = withApiErrors(async (request: Request) => {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) return jsonError(400, "Informe o endereço do site.", "VALIDATION");
  return NextResponse.json(await analyzeSite(url));
});
