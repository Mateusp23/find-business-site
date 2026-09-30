"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TURNSTILE_ORIGIN } from "@/lib/security/csp";

/**
 * Captcha do Cloudflare Turnstile (opcional, grátis). Protege login, cadastro e
 * recuperação de senha contra robôs. Só aparece se NEXT_PUBLIC_TURNSTILE_SITE_KEY
 * estiver definida E o captcha estiver ligado no Supabase (Authentication → Attack Protection).
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
export const captchaEnabled = Boolean(SITE_KEY);

interface Turnstile {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  reset(id: string): void;
  remove(id: string): void;
}
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadScript() {
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `${TURNSTILE_ORIGIN}/turnstile/v0/api.js?render=explicit`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("Não foi possível carregar o captcha."));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Uso:
 *   const captcha = useCaptcha();
 *   ... options: { captchaToken: captcha.token ?? undefined }
 *   {captcha.widget}   // onde o desafio aparece
 *   captcha.reset()    // depois de cada tentativa (o token só vale uma vez)
 */
export function useCaptcha() {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!captchaEnabled) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: SITE_KEY,
          language: "pt-br",
          theme: "auto",
          callback: (t: string) => setToken(t),
          "expired-callback": () => setToken(null),
          "error-callback": () => setToken(null),
        });
      })
      .catch(() => setToken(null));
    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, []);

  const reset = useCallback(() => {
    setToken(null);
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
  }, []);

  return {
    enabled: captchaEnabled,
    /** true quando pode enviar (captcha resolvido ou desligado). */
    ready: !captchaEnabled || Boolean(token),
    token,
    reset,
    widget: captchaEnabled ? <div ref={ref} className="flex min-h-[65px] justify-center" /> : null,
  };
}
