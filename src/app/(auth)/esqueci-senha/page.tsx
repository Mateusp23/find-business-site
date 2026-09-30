"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { LocalModeNotice } from "@/components/auth/LocalModeNotice";
import { FormTextField, SubmitButton } from "@/components/form";
import { notify } from "@/lib/notify";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { authErrorMessage } from "@/lib/supabase/errors";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/lib/validation/schemas";

export default function EsqueciSenhaPage() {
  const [sent, setSent] = useState(false);
  const { control, handleSubmit, formState, getValues } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  if (!isSupabaseConfigured) return <LocalModeNotice />;

  const onSubmit = handleSubmit(async ({ email }) => {
    const { error } = await getSupabaseBrowser()!.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
    });
    if (error) return notify.error("Não foi possível enviar o link", authErrorMessage(error));
    setSent(true);
  });

  return (
    <AuthCard
      title="Recuperar senha"
      description={sent ? undefined : "Enviaremos um link para você criar uma nova senha."}
      footer={
        <Link href="/login" className="font-medium text-accent hover:underline">
          Voltar para o login
        </Link>
      }
    >
      {sent ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <MailCheck className="size-10 text-accent" />
          <p className="text-sm">
            Se existir uma conta com <strong>{getValues("email")}</strong>, o link chega em
            instantes.
          </p>
          <p className="text-xs text-muted">Confira também a pasta de spam.</p>
        </div>
      ) : (
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
          <SubmitButton isSubmitting={formState.isSubmitting}>Enviar link</SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
