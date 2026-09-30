import { z } from "zod";

// Mensagens padrão do Zod em português (as específicas abaixo têm prioridade).
z.config(z.locales.ptBR?.() ?? z.locales.pt());

export const MIN_PASSWORD = 8;

// ─────────────────────────────────────────────────────────────
// Peças reutilizáveis
// ─────────────────────────────────────────────────────────────
export const emailField = z
  .string()
  .trim()
  .min(1, "Digite seu e-mail.")
  .pipe(z.email("Digite um e-mail válido."));

/** Senha nova: regras de criação. */
export const newPasswordField = z
  .string()
  .min(MIN_PASSWORD, `A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`)
  .max(72, "A senha pode ter no máximo 72 caracteres.")
  .regex(/[a-zà-ÿ]/i, "Use pelo menos uma letra.")
  .regex(/\d/, "Use pelo menos um número.")
  .refine(
    (v) => !COMMON_PASSWORDS.has(v.toLowerCase()),
    "Essa senha é muito comum. Escolha outra.",
  );

/** Senhas mais usadas no Brasil (lista curta; o Supabase Pro também checa senhas vazadas). */
const COMMON_PASSWORDS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "12345678a",
  "senha123",
  "senha1234",
  "password1",
  "qwerty123",
  "abc12345",
  "brasil123",
  "mudar123",
  "admin123",
  "11223344a",
  "a1234567",
]);

/** Senha nova + confirmação (use com .refine(passwordsMatch, passwordMismatch)). */
const passwordPair = {
  password: newPasswordField,
  confirm: z.string().min(1, "Repita a senha."),
};
const passwordsMatch = (d: { password: string; confirm: string }) => d.password === d.confirm;
const passwordMismatch = { path: ["confirm"], message: "As senhas não são iguais." };

// ─────────────────────────────────────────────────────────────
// Conta
// ─────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Digite sua senha."),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Digite seu nome.").max(80, "Nome muito longo."),
    email: emailField,
    ...passwordPair,
  })
  .refine(passwordsMatch, passwordMismatch);
export type SignupValues = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({ email: emailField });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

/** Usado em "redefinir senha" (link do e-mail) e em "trocar senha" (perfil). */
export const newPasswordSchema = z.object(passwordPair).refine(passwordsMatch, passwordMismatch);
export type NewPasswordValues = z.infer<typeof newPasswordSchema>;

// ─────────────────────────────────────────────────────────────
// Busca e análise
// ─────────────────────────────────────────────────────────────
export const searchSchema = z.object({
  uf: z.string().length(2, "Escolha o estado."),
  city: z.string().trim().min(1, "Escolha a cidade."),
  niche: z.string().trim().min(2, "Digite o tipo de empresa."),
  serviceId: z.string().min(1),
  limit: z.coerce.number<number>().int().min(20).max(60),
});
export type SearchValues = z.infer<typeof searchSchema>;

/** Aceita "empresa.com.br" (sem https://) e normaliza para uma URL completa. */
export const siteUrlSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "Digite o endereço do site.")
    .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
    .pipe(z.url({ protocol: /^https?$/, hostname: /\./, error: "Endereço de site inválido." })),
});
export type SiteUrlInput = z.input<typeof siteUrlSchema>;
export type SiteUrlValues = z.output<typeof siteUrlSchema>;

// ─────────────────────────────────────────────────────────────
// Perfil (salvo automaticamente a cada mudança válida)
// ─────────────────────────────────────────────────────────────
export const profileSchema = z.object({
  userName: z.string().trim().min(2, "Digite seu nome.").max(80, "Nome muito longo."),
  serviceId: z.string().min(1),
  theme: z.enum(["dark", "light", "system"]),
});
export type ProfileValues = z.infer<typeof profileSchema>;

// ─────────────────────────────────────────────────────────────
// Leads
// ─────────────────────────────────────────────────────────────
export const noteSchema = z.object({
  text: z.string().trim().min(1, "Escreva a anotação.").max(1000, "Máximo de 1.000 caracteres."),
});
export type NoteValues = z.infer<typeof noteSchema>;

// ─────────────────────────────────────────────────────────────
// Verificação em duas etapas (2FA)
// ─────────────────────────────────────────────────────────────
export const mfaCodeSchema = z.object({
  code: z
    .string()
    .transform((v) => v.replace(/\s/g, ""))
    .pipe(z.string().regex(/^\d{6}$/, "Digite os 6 números que aparecem no app.")),
});
export type MfaCodeInput = z.input<typeof mfaCodeSchema>;
export type MfaCodeValues = z.output<typeof mfaCodeSchema>;
