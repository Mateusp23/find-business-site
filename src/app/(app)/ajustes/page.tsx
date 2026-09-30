"use client";

import Link from "next/link";
import { Card, Chip } from "@heroui/react";
import { useGetHealthQuery } from "@/store/api/findBusinessApi";
import { useAppSelector } from "@/store/hooks";

function StatusChip({ ok, optional }: { ok: boolean | undefined; optional?: boolean }) {
  if (ok === undefined) return <Chip size="sm">verificando…</Chip>;
  if (!ok && optional) return <Chip size="sm">Não configurada</Chip>;
  return (
    <Chip size="sm" variant="soft" color={ok ? "success" : "danger"}>
      {ok ? "Configurada" : "Faltando"}
    </Chip>
  );
}

export default function AjustesPage() {
  const mode = useAppSelector((s) => s.session.mode);
  const { data: health } = useGetHealthQuery();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Ajustes</h1>
        <p className="text-muted">Status das integrações.</p>
      </header>

      <p className="text-sm text-muted">
        Nome, serviço padrão e tema ficam em{" "}
        <Link href="/perfil" className="text-accent hover:underline">
          Perfil
        </Link>
        .
      </p>

      <Card>
        <Card.Header>
          <Card.Title>Integrações</Card.Title>
          <Card.Description>
            As chaves ficam no arquivo <code>.env.local</code> e nunca vão para o navegador.
          </Card.Description>
        </Card.Header>
        <Card.Content className="gap-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Supabase</p>
              <p className="text-muted">
                NEXT_PUBLIC_SUPABASE_URL e chave pública · login e dados na nuvem. Sem ele, modo local
              </p>
            </div>
            <StatusChip ok={mode === "supabase"} optional />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Google Places API</p>
              <p className="text-muted">
                GOOGLE_PLACES_API_KEY · busca de empresas. Sem ela, a busca roda em modo demonstração
              </p>
            </div>
            <StatusChip ok={health?.googlePlaces} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">PageSpeed Insights (opcional)</p>
              <p className="text-muted">
                PAGESPEED_API_KEY · análise de sites. Sem chave funciona, com limite diário baixo
              </p>
            </div>
            <StatusChip ok={health?.pagespeed} optional />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">OpenAI (em breve)</p>
              <p className="text-muted">OPENAI_API_KEY · mensagens personalizadas com IA</p>
            </div>
            <StatusChip ok={health?.openai} optional />
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
