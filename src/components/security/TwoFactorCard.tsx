"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, Chip, Skeleton } from "@heroui/react";
import { Copy, KeyRound, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";
import { FormTextField, SubmitButton } from "@/components/form";
import { notify } from "@/lib/notify";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { mfaErrorMessage } from "@/lib/supabase/mfa";
import { mfaCodeSchema, type MfaCodeInput, type MfaCodeValues } from "@/lib/validation/schemas";

interface Factor {
  id: string;
  friendly_name?: string;
  created_at: string;
}

interface Enrollment {
  id: string;
  qr: string;
  secret: string;
}

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

/** O Supabase devolve o QR como SVG; garante que vire uma imagem. */
const qrSrc = (qr: string) =>
  qr.startsWith("data:") ? qr : `data:image/svg+xml;utf8,${encodeURIComponent(qr)}`;

/**
 * Verificação em duas etapas por app autenticador (TOTP).
 * Depois de ativar, todo login pede o código de 6 números, e o banco só libera os
 * dados com a sessão verificada (política RLS da migração 0003).
 */
export function TwoFactorCard() {
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [starting, setStarting] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error } = await getSupabaseBrowser()!.auth.mfa.listFactors();
    if (error) {
      notify.error("Não foi possível carregar o 2FA", mfaErrorMessage(error));
      setFactors([]);
      return;
    }
    setFactors((data?.totp ?? []).filter((f) => f.status === "verified"));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial da lista
    refresh();
  }, [refresh]);

  const start = async () => {
    const supabase = getSupabaseBrowser()!;
    setStarting(true);
    // Remove tentativas abandonadas (fatores criados e nunca confirmados).
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of list?.all ?? []) {
      if (f.factor_type === "totp" && f.status === "unverified") {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    }
    const count = factors?.length ?? 0;
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Autenticador ${count + 1} · ${new Date().toLocaleDateString("pt-BR")}`,
      issuer: "Find Business",
    });
    setStarting(false);
    if (error) return notify.error("Não foi possível iniciar o 2FA", mfaErrorMessage(error));
    setEnrollment({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const cancel = async () => {
    if (enrollment) await getSupabaseBrowser()!.auth.mfa.unenroll({ factorId: enrollment.id });
    setEnrollment(null);
  };

  const remove = async (factorId: string) => {
    const supabase = getSupabaseBrowser()!;
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setConfirmRemove(null);
    if (error) return notify.error("Não foi possível remover", mfaErrorMessage(error));
    await supabase.auth.refreshSession();
    notify.success("Autenticador removido");
    refresh();
  };

  const active = (factors?.length ?? 0) > 0;

  return (
    <Card>
      <Card.Header className="flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <Card.Title>Verificação em duas etapas (2FA)</Card.Title>
          <Card.Description>
            Além da senha, o login pede um código do app autenticador no celular. Mesmo que alguém
            descubra sua senha, não entra.
          </Card.Description>
        </div>
        {factors && (
          <Chip size="sm" variant="soft" color={active ? "success" : "default"}>
            {active ? "Ativado" : "Desativado"}
          </Chip>
        )}
      </Card.Header>
      <Card.Content className="gap-5">
        {!factors && <Skeleton className="h-16 rounded-xl" />}

        {factors && factors.length > 0 && (
          <ul className="space-y-2">
            {factors.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-secondary p-3 text-sm"
              >
                <Smartphone className="size-4 text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{f.friendly_name || "Autenticador"}</p>
                  <p className="text-xs text-muted">
                    Ativado em {dateFmt.format(new Date(f.created_at))}
                  </p>
                </div>
                {confirmRemove === f.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">Remover mesmo?</span>
                    <Button size="sm" variant="danger" onPress={() => remove(f.id)}>
                      Remover
                    </Button>
                    <Button size="sm" variant="ghost" onPress={() => setConfirmRemove(null)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" onPress={() => setConfirmRemove(f.id)}>
                    <ShieldOff className="size-4" />
                    Remover
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {enrollment ? (
          <EnrollStep
            enrollment={enrollment}
            onCancel={cancel}
            onDone={() => {
              setEnrollment(null);
              refresh();
            }}
          />
        ) : (
          factors && (
            <div className="space-y-2">
              <Button
                variant={active ? "tertiary" : "primary"}
                onPress={start}
                isDisabled={starting}
                className="self-start"
              >
                <ShieldCheck className="size-4" />
                {active ? "Adicionar outro autenticador" : "Ativar 2FA"}
              </Button>
              {active && factors.length === 1 && (
                <p className="text-xs text-muted">
                  Dica: cadastre um segundo autenticador (outro celular ou um gerenciador de
                  senhas). Se perder o celular, é ele que te deixa entrar.
                </p>
              )}
            </div>
          )
        )}
      </Card.Content>
    </Card>
  );
}

function EnrollStep({
  enrollment,
  onCancel,
  onDone,
}: {
  enrollment: Enrollment;
  onCancel: () => void;
  onDone: () => void;
}) {
  const { control, handleSubmit, reset, formState } = useForm<MfaCodeInput, unknown, MfaCodeValues>(
    {
      resolver: zodResolver(mfaCodeSchema),
      defaultValues: { code: "" },
    },
  );

  const onSubmit = handleSubmit(async ({ code }) => {
    const { error } = await getSupabaseBrowser()!.auth.mfa.challengeAndVerify({
      factorId: enrollment.id,
      code,
    });
    if (error) {
      reset({ code: "" });
      return notify.error("Código não confere", mfaErrorMessage(error));
    }
    notify.success("2FA ativado", {
      description: "A partir de agora, o login vai pedir o código do app.",
    });
    onDone();
  });

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      notify.success("Chave copiada");
    } catch (err) {
      notify.error("Não foi possível copiar", err);
    }
  };

  return (
    <div className="space-y-5 rounded-2xl border border-separator p-4 sm:p-5">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
        <li>
          Instale um app autenticador: Google Authenticator, Microsoft Authenticator, Authy ou o do
          seu gerenciador de senhas.
        </li>
        <li>No app, escolha “adicionar conta” e escaneie o QR code abaixo.</li>
        <li>Digite o código de 6 números que aparecer no app.</li>
      </ol>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="rounded-xl bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- QR em data URI gerado pelo Supabase */}
          <img
            src={qrSrc(enrollment.qr)}
            alt="QR code para o app autenticador"
            className="size-44"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-2 text-sm">
          <p className="text-muted">Não consegue escanear? Digite esta chave no app:</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 rounded-lg bg-surface-secondary px-3 py-2 font-mono text-xs break-all">
              {enrollment.secret}
            </code>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label="Copiar chave"
              onPress={copySecret}
            >
              <Copy className="size-4" />
            </Button>
          </div>
          <p className="flex items-start gap-1.5 text-xs text-muted">
            <KeyRound className="mt-0.5 size-3.5 shrink-0" />
            Não compartilhe essa chave: quem tiver ela gera os seus códigos.
          </p>
        </div>
      </div>
      <form
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-3 sm:flex-row sm:items-start"
      >
        <FormTextField
          control={control}
          name="code"
          label="Código do app"
          placeholder="123 456"
          inputMode="numeric"
          autoComplete="one-time-code"
          className="flex-1"
          isRequired
        />
        <div className="flex gap-2 sm:mt-7">
          <SubmitButton isSubmitting={formState.isSubmitting} fullWidth={false}>
            Confirmar e ativar
          </SubmitButton>
          <Button variant="ghost" onPress={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
