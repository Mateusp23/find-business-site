"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@heroui/react";
import { ShieldCheck } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { FormTextField, SubmitButton } from "@/components/form";
import { SelectField } from "@/components/ui/fields";
import { notify } from "@/lib/notify";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { mfaErrorMessage } from "@/lib/supabase/mfa";
import { mfaCodeSchema, type MfaCodeInput, type MfaCodeValues } from "@/lib/validation/schemas";

interface Factor {
  id: string;
  friendly_name?: string;
}

/** Segunda etapa do login: código de 6 dígitos do app autenticador. */
export function VerifyMfaForm({ next }: { next: string }) {
  const router = useRouter();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [factorId, setFactorId] = useState("");
  const { control, handleSubmit, reset, formState } = useForm<MfaCodeInput, unknown, MfaCodeValues>(
    {
      resolver: zodResolver(mfaCodeSchema),
      defaultValues: { code: "" },
    },
  );

  useEffect(() => {
    getSupabaseBrowser()!
      .auth.mfa.listFactors()
      .then(({ data, error }) => {
        if (error) return notify.error("Não foi possível carregar o 2FA", mfaErrorMessage(error));
        const verified = (data?.totp ?? []).filter((f) => f.status === "verified");
        setFactors(verified);
        setFactorId(verified[0]?.id ?? "");
      });
  }, []);

  const onSubmit = handleSubmit(async ({ code }) => {
    const { error } = await getSupabaseBrowser()!.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) {
      reset({ code: "" });
      return notify.error("Não foi possível confirmar", mfaErrorMessage(error));
    }
    notify.success("Verificação concluída");
    router.replace(next);
    router.refresh();
  });

  const signOut = async () => {
    await getSupabaseBrowser()?.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return (
    <AuthCard
      title="Verificação em duas etapas"
      description="Abra o app autenticador (Google Authenticator, Authy, 1Password...) e digite o código de 6 números."
      footer={
        <Button variant="ghost" size="sm" onPress={signOut}>
          Entrar com outra conta
        </Button>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        {factors && factors.length > 1 && (
          <SelectField
            label="Autenticador"
            value={factorId}
            options={factors.map((f, i) => ({
              id: f.id,
              label: f.friendly_name || `Autenticador ${i + 1}`,
            }))}
            onChange={setFactorId}
          />
        )}
        <FormTextField
          control={control}
          name="code"
          label="Código"
          placeholder="123 456"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          isRequired
        />
        <SubmitButton
          isSubmitting={formState.isSubmitting}
          isDisabled={!factorId}
          icon={<ShieldCheck className="size-4" />}
        >
          Confirmar
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
