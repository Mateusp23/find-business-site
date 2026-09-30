/**
 * Formato padrão de erro de TODAS as rotas /api:
 *   { error: "mensagem para o usuário", code: "CODIGO", ref?: "a1b2c3d4" }
 * `ref` só aparece em erro inesperado (500) e identifica a linha no log do servidor.
 */
export interface ApiErrorBody {
  error: string;
  code: string;
  ref?: string;
}

/** Erro "esperado" (validação, serviço externo fora, limite...). A mensagem vai para o usuário. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code = "API_ERROR",
    /** Cabeçalhos extras da resposta (ex.: Retry-After no 429). */
    public headers: Record<string, string> = {},
  ) {
    super(message);
  }
}

export const UNEXPECTED_ERROR_MESSAGE = "Erro inesperado no servidor. Tente de novo em instantes.";
