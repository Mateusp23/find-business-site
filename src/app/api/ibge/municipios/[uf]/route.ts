import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { withApiErrors } from "@/lib/api/handler.server";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api/rateLimit.server";
import { requireSession } from "@/lib/api/session.server";
import { apiUfSchema } from "@/lib/validation/api";
import type { Municipio } from "@/types/lead";

export const GET = withApiErrors(
  async (request: Request, ctx: RouteContext<"/api/ibge/municipios/[uf]">) => {
    const session = await requireSession();
    const uf = apiUfSchema.parse((await ctx.params).uf);
    await enforceRateLimit(session, RATE_LIMITS.cities, request);

    const res = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf.toUpperCase()}/municipios?orderBy=nome`,
      { next: { revalidate: 86400 } },
    ).catch(() => null);
    if (!res?.ok)
      throw new ApiError("O IBGE está fora do ar. Tente de novo em instantes.", 502, "IBGE");

    const data = (await res.json()) as Municipio[];
    return NextResponse.json(data.map(({ id, nome }) => ({ id, nome })));
  },
);
