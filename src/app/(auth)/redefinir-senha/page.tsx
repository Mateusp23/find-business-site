"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthCard } from "@/components/auth/AuthCard";
import { LocalModeNotice } from "@/components/auth/LocalModeNotice";
import { FormPasswordField, SubmitButton } from "@/components/form";
import { notify } from "@/lib/notify";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { authErrorMessage } from "@/lib/supabase/errors";
import { MIN_PASSWORD, newPasswordSchema, type NewPasswordValues } from "@/lib/validation/schemas";

/** Chega aqui pelo link do e-mail "recuperar senha" (a sessão já foi criada no /auth/callback). */
export default function RedefinirSenhaPage() {
  const router = useRouter();
  const { control, handleSubmit, formState } = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  if (!isSupabaseConfigured) return <LocalModeNotice />;

  const onSubmit = handleSubmit(async ({ password }) => {
    const supabase = getSupabaseBrowser()!;
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return notify.error("Não foi possível salvar a nova senha", authErrorMessage(error));
    await supabase.auth.signOut();
    router.replace("/login?aviso=senha-alterada");
  });

  return (
    <AuthCard title="Nova senha" description="Escolha a senha que vai usar daqui para frente.">
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <FormPasswordField
          control={control}
          name="password"
          label="Nova senha"
          autoComplete="new-password"
          autoFocus
          description={`Mínimo de ${MIN_PASSWORD} caracteres.`}
        />
        <FormPasswordField
          control={control}
          name="confirm"
          label="Confirmar nova senha"
          autoComplete="new-password"
        />
        <SubmitButton isSubmitting={formState.isSubmitting}>Salvar nova senha</SubmitButton>
      </form>
    </AuthCard>
  );
}
