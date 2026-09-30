"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCaptcha } from "@/components/auth/Captcha";
import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleButton, OrDivider } from "@/components/auth/GoogleButton";
import { FormPasswordField, FormTextField, SubmitButton } from "@/components/form";
import { notify } from "@/lib/notify";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/supabase/errors";
import { needsMfaVerification } from "@/lib/supabase/mfa";
import { loginSchema, type LoginValues } from "@/lib/validation/schemas";

const NOTICES: Record<string, string> = {
  "senha-alterada": "Senha alterada. Entre com a nova senha.",
  saiu: "Você saiu da sua conta.",
  "saiu-todos": "Você saiu da conta em todos os dispositivos.",
};

export function LoginForm({
  next,
  initialError,
  notice,
}: {
  next: string;
  initialError: string | null;
  notice: string | null;
}) {
  const router = useRouter();
  const captcha = useCaptcha();
  const { control, handleSubmit, formState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Avisos que chegam pela URL (?erro= do /auth/callback, ?aviso= após sair/trocar senha).
  const shownNotice = useRef(false);
  useEffect(() => {
    if (shownNotice.current) return;
    shownNotice.current = true;
    if (initialError) notify.error("Não foi possível entrar", initialError);
    else if (notice && NOTICES[notice]) notify.success(NOTICES[notice]);
    if (initialError || notice) {
      window.history.replaceState(
        null,
        "",
        next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`,
      );
    }
  }, [initialError, notice, next]);

  const onSubmit = handleSubmit(async ({ email, password }) => {
    const { error } = await getSupabaseBrowser()!.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken: captcha.token ?? undefined },
    });
    captcha.reset(); // o token do captcha só vale para uma tentativa
    if (error) return notify.error("Não foi possível entrar", authErrorMessage(error));
    // Conta com 2FA: ainda falta o código do app autenticador.
    if (await needsMfaVerification(getSupabaseBrowser()!)) {
      router.replace(`/verificar-2fa?next=${encodeURIComponent(next)}`);
      return;
    }
    router.replace(next);
    router.refresh();
  });

  return (
    <AuthCard
      title="Entrar"
      description="Acesse suas buscas, leads e mensagens."
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link
            href={next === "/" ? "/cadastro" : `/cadastro?next=${encodeURIComponent(next)}`}
            className="font-medium text-accent hover:underline"
          >
            Criar conta
          </Link>
        </>
      }
    >
      <GoogleButton
        next={next}
        onError={(m) => notify.error("Não foi possível entrar com Google", m)}
      />
      <OrDivider />

      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <FormTextField
          control={control}
          name="email"
          label="E-mail"
          type="email"
          placeholder="voce@email.com"
          autoComplete="email"
          autoFocus
          isRequired
        />
        <FormPasswordField control={control} name="password" label="Senha" />
        <Link
          href="/esqueci-senha"
          className="-mt-3 self-end text-xs text-muted hover:text-foreground"
        >
          Esqueci minha senha
        </Link>
        {captcha.widget}
        <SubmitButton isSubmitting={formState.isSubmitting} isDisabled={!captcha.ready}>
          Entrar
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
