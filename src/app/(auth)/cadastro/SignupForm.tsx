"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleButton, OrDivider } from "@/components/auth/GoogleButton";
import { FormPasswordField, FormTextField, SubmitButton } from "@/components/form";
import { notify } from "@/lib/notify";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/supabase/errors";
import { MIN_PASSWORD, signupSchema, type SignupValues } from "@/lib/validation/schemas";

export function SignupForm({ next }: { next: string }) {
  const router = useRouter();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", confirm: "" },
  });

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    const { data, error } = await getSupabaseBrowser()!.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) return notify.error("Não foi possível criar a conta", authErrorMessage(error));

    // Com "Confirm email" ligado no Supabase, a sessão só existe depois do clique no e-mail.
    if (!data.session) {
      // Por segurança o Supabase não diz se o e-mail já existe; identities vazio indica isso.
      if (data.user && data.user.identities?.length === 0) {
        return notify.error(
          "Não foi possível criar a conta",
          "Já existe uma conta com esse e-mail. Tente entrar ou recuperar a senha.",
        );
      }
      return setSentTo(email);
    }
    router.replace(next);
    router.refresh();
  });

  if (sentTo) {
    return (
      <AuthCard
        title="Confirme seu e-mail"
        footer={
          <Link href="/login" className="font-medium text-accent hover:underline">
            Voltar para o login
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <MailCheck className="size-10 text-accent" />
          <p className="text-sm">
            Enviamos um link de confirmação para <strong>{sentTo}</strong>.
          </p>
          <p className="text-xs text-muted">
            Abra o e-mail e clique no link para ativar sua conta. Se não chegar em alguns minutos,
            veja a pasta de spam.
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Criar conta"
      description="Salve seus leads e acesse de qualquer computador."
      footer={
        <>
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Entrar
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
          name="name"
          label="Nome"
          placeholder="Como você assina as mensagens"
          autoComplete="name"
          autoFocus
          isRequired
        />
        <FormTextField
          control={control}
          name="email"
          label="E-mail"
          type="email"
          placeholder="voce@email.com"
          autoComplete="email"
          isRequired
        />
        <FormPasswordField
          control={control}
          name="password"
          label="Senha"
          autoComplete="new-password"
          description={`Mínimo de ${MIN_PASSWORD} caracteres.`}
        />
        <FormPasswordField
          control={control}
          name="confirm"
          label="Confirmar senha"
          autoComplete="new-password"
        />
        <SubmitButton isSubmitting={formState.isSubmitting}>Criar conta</SubmitButton>
      </form>
    </AuthCard>
  );
}
