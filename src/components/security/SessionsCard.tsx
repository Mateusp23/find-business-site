"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@heroui/react";
import { LogOut, MonitorSmartphone } from "lucide-react";
import { notify } from "@/lib/notify";
import { getSupabaseBrowser } from "@/lib/supabase/client";

/** Encerra a sessão em todos os aparelhos (útil se esqueceu logado em outro computador). */
export function SessionsCard() {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);

  const signOutEverywhere = async () => {
    const { error } = await getSupabaseBrowser()!.auth.signOut({ scope: "global" });
    if (error) return notify.error("Não foi possível encerrar as sessões", error);
    router.replace("/login?aviso=saiu-todos");
    router.refresh();
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title>Sessões</Card.Title>
        <Card.Description>
          Esqueceu a conta aberta em outro computador ou celular? Encerre todas as sessões de uma
          vez. Você vai precisar entrar de novo aqui também.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        {confirm ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted">Sair de todos os aparelhos agora?</span>
            <Button variant="danger" onPress={signOutEverywhere}>
              <LogOut className="size-4" />
              Sim, sair de todos
            </Button>
            <Button variant="ghost" onPress={() => setConfirm(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Button variant="tertiary" className="self-start" onPress={() => setConfirm(true)}>
            <MonitorSmartphone className="size-4" />
            Sair de todos os dispositivos
          </Button>
        )}
      </Card.Content>
    </Card>
  );
}
