import "server-only";

import { NextResponse } from "next/server";
import { ApiError, UNEXPECTED_ERROR_MESSAGE, type ApiErrorBody } from "./errors";

export function jsonError(status: number, error: string, code = "API_ERROR", ref?: string) {
  return NextResponse.json<ApiErrorBody>({ error, code, ...(ref ? { ref } : {}) }, { status });
}

/**
 * Envolve um Route Handler: qualquer exceção vira JSON no formato padrão.
 * - ApiError → status e mensagem dele
 * - qualquer outra coisa → 500 genérico + `ref` (o detalhe fica só no log do servidor)
 */
export function withApiErrors<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof ApiError) return jsonError(err.status, err.message, err.code);
      const ref = crypto.randomUUID().slice(0, 8);
      console.error(`[api] erro inesperado ref=${ref}`, err);
      return jsonError(500, UNEXPECTED_ERROR_MESSAGE, "INTERNAL", ref);
    }
  };
}
