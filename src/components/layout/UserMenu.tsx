"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Tooltip } from "@heroui/react";
import { HardDrive, LogOut } from "lucide-react";
import { useGetBillingQuery } from "@/store/api/findBusinessApi";
import { useAppSelector } from "@/store/hooks";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { UserAvatar } from "./UserAvatar";

/** Rodapé da barra lateral: quem está logado + sair. No modo local, avisa que não há conta. */
export function UserMenu() {
  const router = useRouter();
  const { mode, user } = useAppSelector((s) => s.session);
  const name = useAppSelector((s) => s.settings.userName);
  const { data: billing } = useGetBillingQuery(undefined, { skip: mode !== "supabase" || !user });
  const planName = billing?.mode === "supabase" ? billing.plan.name : null;

  if (mode === "local") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-surface-secondary px-3 py-2.5 text-xs text-muted">
        <HardDrive className="size-4 shrink-0" />
        <span>Modo local: dados só neste navegador</span>
      </div>
    );
  }
  if (!user) return null;

  const signOut = async () => {
    await getSupabaseBrowser()?.auth.signOut();
    router.replace("/login?aviso=saiu");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2 rounded-xl bg-surface-secondary p-2">
      <Link
        href="/perfil"
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 hover:bg-default"
      >
        <UserAvatar name={name || user.name} email={user.email} src={user.avatarUrl} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{name || user.name || "Sem nome"}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
      </Link>
      {planName && (
        <Link
          href="/plano"
          className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-soft-foreground hover:opacity-80"
          title="Ver plano e uso do mês"
        >
          {planName}
        </Link>
      )}
      <Tooltip delay={300}>
        <Button isIconOnly size="sm" variant="ghost" aria-label="Sair da conta" onPress={signOut}>
          <LogOut className="size-4" />
        </Button>
        <Tooltip.Content>Sair</Tooltip.Content>
      </Tooltip>
    </div>
  );
}
