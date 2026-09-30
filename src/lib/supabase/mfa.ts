import type { SupabaseClient } from "@supabase/supabase-js";

/** true quando a conta tem 2FA ativo e a sessão ainda não passou pelo código. */
export async function needsMfaVerification(supabase: SupabaseClient) {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.nextLevel === "aal2" && data.currentLevel !== "aal2";
}

/** Traduz erros de 2FA do Supabase. */
export function mfaErrorMessage(error: { code?: string; message: string }) {
  switch (error.code) {
    case "mfa_verification_failed":
    case "mfa_challenge_expired":
      return "Código inválido ou expirado. Confira o horário do celular e tente o código novo.";
    case "mfa_totp_enroll_not_enabled":
    case "mfa_totp_verify_not_enabled":
      return "O 2FA por app autenticador está desativado no Supabase (Authentication → Multi-Factor).";
    case "too_many_enrolled_mfa_factors":
      return "Limite de autenticadores atingido. Remova um antes de adicionar outro.";
    case "insufficient_aal":
      return "Por segurança, confirme o código do 2FA antes de fazer isso.";
    case "mfa_factor_name_conflict":
      return "Já existe um autenticador com esse nome.";
    case "over_request_rate_limit":
      return "Muitas tentativas seguidas. Espere alguns minutos.";
  }
  return error.message;
}
