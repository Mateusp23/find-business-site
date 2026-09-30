import type { AuthError } from "@supabase/supabase-js";

/** Traduz os erros do Supabase Auth para mensagens em português. */
export function authErrorMessage(error: Pick<AuthError, "message" | "code"> | null | undefined) {
  if (!error) return "";
  switch (error.code) {
    case "invalid_credentials":
      return "E-mail ou senha incorretos.";
    case "email_not_confirmed":
      return "Confirme seu e-mail antes de entrar. Procure o link na sua caixa de entrada (e no spam).";
    case "user_already_exists":
    case "email_exists":
      return "Já existe uma conta com esse e-mail. Tente entrar ou recuperar a senha.";
    case "weak_password":
      return "Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.";
    case "same_password":
      return "A nova senha precisa ser diferente da atual.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";
    case "email_address_invalid":
      return "Esse e-mail não é válido.";
    case "signup_disabled":
      return "Novos cadastros estão desativados.";
    case "provider_disabled":
      return "Esse método de login não está ativado no Supabase.";
    case "session_expired":
    case "session_not_found":
      return "Sua sessão expirou. Entre novamente.";
  }
  if (/fetch|network/i.test(error.message)) return "Sem conexão com o servidor. Verifique sua internet.";
  return error.message;
}
