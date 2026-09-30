"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { notify } from "@/lib/notify";
import { Alert, Button, Card, Chip, Input, Label, TextField } from "@heroui/react";
import { LogOut } from "lucide-react";
import { FormPasswordField, FormSelect, FormTextField, SubmitButton } from "@/components/form";
import {
  MIN_PASSWORD,
  newPasswordSchema,
  profileSchema,
  type NewPasswordValues,
  type ProfileValues,
} from "@/lib/validation/schemas";
import { UserAvatar } from "@/components/layout/UserAvatar";
import { SessionsCard } from "@/components/security/SessionsCard";
import { TwoFactorCard } from "@/components/security/TwoFactorCard";
import { SERVICES } from "@/lib/catalog";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/supabase/errors";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setServiceId, setThemePreference, setUserName } from "@/store/slices/settingsSlice";

const THEME_OPTIONS = [
  { id: "dark", label: "Escuro" },
  { id: "light", label: "Claro" },
  { id: "system", label: "Igual ao sistema" },
];

const PROVIDER_LABEL: Record<string, string> = {
  email: "E-mail e senha",
  google: "Google",
};

export default function PerfilPage() {
  const router = useRouter();
  const { mode, user } = useAppSelector((s) => s.session);
  const userName = useAppSelector((s) => s.settings.userName);
  const leadCount = useAppSelector((s) => Object.keys(s.leads.byId).length);

  const signOut = async () => {
    await getSupabaseBrowser()?.auth.signOut();
    router.replace("/login?aviso=saiu");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="flex items-center gap-4">
        <UserAvatar
          name={userName}
          email={user?.email ?? ""}
          src={user?.avatarUrl ?? null}
          size="lg"
        />
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold tracking-tight">{userName || "Seu perfil"}</h1>
          <p className="truncate text-muted">
            {user?.email ?? "Modo local"} · {leadCount}{" "}
            {leadCount === 1 ? "lead salvo" : "leads salvos"}
          </p>
        </div>
      </header>

      {mode === "local" && (
        <Alert status="warning">
          <Alert.Content>
            <Alert.Title>Modo local</Alert.Title>
            <Alert.Description>
              Sem Supabase configurado não há conta: tudo fica salvo só neste navegador. Quando o
              login for ativado, estes dados são levados para a sua conta no primeiro acesso.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <ProfileForm />

      {user && user.providers.length > 0 && (
        <div className="-mt-4 flex flex-wrap items-center gap-2 text-sm text-muted">
          Você entra com:
          {user.providers.map((p) => (
            <Chip key={p} size="sm">
              {PROVIDER_LABEL[p] ?? p}
            </Chip>
          ))}
        </div>
      )}

      {user?.providers.includes("email") && <ChangePasswordCard />}
      {user && <TwoFactorCard />}
      {user && <SessionsCard />}

      {user && (
        <Button variant="danger-soft" onPress={signOut}>
          <LogOut className="size-4" />
          Sair da conta
        </Button>
      )}
    </div>
  );
}

/**
 * Dados pessoais e preferências: React Hook Form + Zod, salvando sozinho a cada
 * mudança válida (sem botão "Salvar"). O Redux continua sendo a fonte da verdade.
 */
function ProfileForm() {
  const dispatch = useAppDispatch();
  const { setTheme } = useTheme();
  const user = useAppSelector((s) => s.session.user);
  const { userName, serviceId, theme } = useAppSelector((s) => s.settings);

  const { control, subscribe } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
    // `values` acompanha o Redux (ex.: quando o perfil termina de carregar do Supabase).
    values: { userName, serviceId, theme },
    resetOptions: { keepDirtyValues: true },
  });

  useEffect(() => {
    return subscribe({
      formState: { values: true },
      callback: ({ values, name, type }) => {
        // Só mudanças feitas pela pessoa (não os resets vindos do Redux).
        if (!name || type !== "change") return;
        const parsed = profileSchema.safeParse(values);
        if (!parsed.success) return; // erro aparece no campo; só salva quando estiver válido
        const v = parsed.data;
        if (name === "userName") dispatch(setUserName(v.userName));
        if (name === "serviceId") dispatch(setServiceId(v.serviceId));
        if (name === "theme") {
          setTheme(v.theme);
          dispatch(setThemePreference(v.theme));
        }
      },
    });
  }, [subscribe, dispatch, setTheme]);

  return (
    <>
      <Card>
        <Card.Header>
          <Card.Title>Dados pessoais</Card.Title>
          <Card.Description>Salvo automaticamente.</Card.Description>
        </Card.Header>
        <Card.Content className="gap-5">
          <FormTextField
            control={control}
            name="userName"
            label="Nome"
            placeholder="Ex.: Mateus"
            autoComplete="name"
            description="Aparece como {nome} nas mensagens de WhatsApp."
          />
          {user && (
            <TextField fullWidth value={user.email} isReadOnly>
              <Label>E-mail</Label>
              <Input />
            </TextField>
          )}
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>Preferências</Card.Title>
        </Card.Header>
        <Card.Content className="gap-5">
          <FormSelect
            control={control}
            name="serviceId"
            label="Serviço padrão"
            options={SERVICES.map((s) => ({ id: s.id, label: s.label }))}
          />
          <FormSelect control={control} name="theme" label="Tema" options={THEME_OPTIONS} />
        </Card.Content>
      </Card>
    </>
  );
}

function ChangePasswordCard() {
  const { control, handleSubmit, reset, formState } = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = handleSubmit(async ({ password }) => {
    const { error } = await getSupabaseBrowser()!.auth.updateUser({ password });
    if (error) return notify.error("Não foi possível trocar a senha", authErrorMessage(error));
    reset();
    notify.success("Senha alterada");
  });

  return (
    <Card>
      <Card.Header>
        <Card.Title>Trocar senha</Card.Title>
      </Card.Header>
      <Card.Content>
        <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
          <FormPasswordField
            control={control}
            name="password"
            label="Nova senha"
            autoComplete="new-password"
            description={`Mínimo de ${MIN_PASSWORD} caracteres.`}
          />
          <FormPasswordField
            control={control}
            name="confirm"
            label="Confirmar nova senha"
            autoComplete="new-password"
          />
          <SubmitButton
            isSubmitting={formState.isSubmitting}
            fullWidth={false}
            variant="secondary"
            className="self-start"
          >
            Salvar nova senha
          </SubmitButton>
        </form>
      </Card.Content>
    </Card>
  );
}
