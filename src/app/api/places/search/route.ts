import { NextResponse } from "next/server";
import { jsonError, withApiErrors } from "@/lib/api/handler.server";
import { searchPlaces } from "@/lib/places.server";
import type { SearchParams } from "@/types/lead";

export const POST = withApiErrors(async (request: Request) => {
  const body = (await request.json().catch(() => null)) as Partial<SearchParams> | null;
  if (!body) return jsonError(400, "Requisição inválida.", "BAD_REQUEST");

  const { uf, city, niche } = body;
  const limit = Number(body.limit ?? 20);
  if (!uf || !city || !niche) {
    return jsonError(400, "Informe estado, cidade e tipo de empresa.", "VALIDATION");
  }
  return NextResponse.json(await searchPlaces({ uf, city, niche, limit }));
});
