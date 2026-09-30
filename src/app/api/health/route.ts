import { NextResponse } from "next/server";
import { withApiErrors } from "@/lib/api/handler.server";

/** Informa quais integrações estão configuradas (sem expor as chaves). */
export const GET = withApiErrors(async () =>
  NextResponse.json({
    googlePlaces: Boolean(process.env.GOOGLE_PLACES_API_KEY),
    pagespeed: Boolean(process.env.PAGESPEED_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
  }),
);
