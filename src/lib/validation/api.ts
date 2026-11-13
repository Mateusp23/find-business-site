import { z } from "zod";

/** Entradas das rotas /api, validadas no servidor (nunca confie no que vem do navegador). */
const text = (max: number, msg: string) =>
  z.string().trim().min(1, msg).max(max, "Texto muito longo.");

export const apiSearchSchema = z.object({
  uf: z
    .string()
    .regex(/^[A-Za-z]{2}$/, "UF inválida.")
    .transform((v) => v.toUpperCase()),
  city: text(80, "Informe a cidade."),
  niche: text(80, "Informe o tipo de empresa."),
  limit: z.coerce
    .number()
    .pipe(z.union([z.literal(20), z.literal(40), z.literal(60)]))
    .catch(20),
});

export const apiSiteAnalysisSchema = z.object({
  url: z.string().trim().min(1, "Informe o endereço do site.").max(2048, "Endereço muito longo."),
});

export const apiUfSchema = z.string().regex(/^[A-Za-z]{2}$/, "UF inválida.");

export const apiCheckoutSchema = z.object({
  planId: z.enum(["pro", "agencia"], "Plano inválido."),
});

export const apiBillingSyncSchema = z.object({
  sessionId: z
    .string()
    .regex(/^cs_[A-Za-z0-9_]{10,200}$/, "Sessão de pagamento inválida.")
    .optional(),
});
