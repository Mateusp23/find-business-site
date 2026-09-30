"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Tooltip } from "@heroui/react";
import { HardDrive, LogOut } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { UserAvatar } from "./UserAvatar";

/** Rodapé da barra lateral: quem está logado + sair. No modo local, avisa que não há conta. */
export function UserMenu() {
  const router = useRouter();
  const { mode, user } = useAppSelector((s) => s.session);
  const name = useAppSelector((s) => s.settings.userName);

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
      <Link href="/perfil" className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 hover:bg-default">
        <UserAvatar name={name || user.name} email={user.email} src={user.avatarUrl} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{name || user.name || "Sem nome"}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
      </Link>
      <Tooltip delay={300}>
        <Button isIconOnly size="sm" variant="ghost" aria-label="Sair da conta" onPress={signOut}>
          <LogOut className="size-4" />
        </Button>
        <Tooltip.Content>Sair</Tooltip.Content>
      </Tooltip>
    </div>
  );
}
