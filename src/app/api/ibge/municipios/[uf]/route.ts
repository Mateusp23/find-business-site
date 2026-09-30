import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { jsonError, withApiErrors } from "@/lib/api/handler.server";
import type { Municipio } from "@/types/lead";

export const GET = withApiErrors(
  async (_req: Request, ctx: RouteContext<"/api/ibge/municipios/[uf]">) => {
    const { uf } = await ctx.params;
    if (!/^[A-Za-z]{2}$/.test(uf)) return jsonError(400, "UF inválida.", "VALIDATION");

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
