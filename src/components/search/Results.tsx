"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Skeleton, Spinner, Switch } from "@heroui/react";
import { Gauge, SearchX } from "lucide-react";
import { LeadCard } from "./LeadCard";
import { MessageModal, type LeadContext } from "@/components/modals/MessageModal";
import { SitePromptModal } from "@/components/modals/SitePromptModal";
import { PRESENCE_LABEL } from "@/lib/classify";
import { applyAnalysis, canAnalyze } from "@/lib/effective";
import { notify } from "@/lib/notify";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { runAnalysis } from "@/store/slices/analysisSlice";
import { removeLead, saveLead } from "@/store/slices/leadsSlice";
import { setFilter, setHideWithSite, type PresenceFilter } from "@/store/slices/searchSlice";
import type { Business, SearchParams, SearchResponse } from "@/types/lead";

const FILTERS: PresenceFilter[] = ["todos", "sem_site", "so_rede_social", "site_fraco"];
/** O PageSpeed é lento e tem limite por minuto: 2 análises por vez. */
const CONCURRENCY = 2;

interface ResultsProps {
  params: SearchParams;
  data: SearchResponse | undefined;
  isLoading: boolean;
  error: string | null;
}

export function Results({ params, data, isLoading, error }: ResultsProps) {
  const dispatch = useAppDispatch();
  const filter = useAppSelector((s) => s.search.filter);
  const hideWithSite = useAppSelector((s) => s.search.hideWithSite);
  const saved = useAppSelector((s) => s.leads.byId);
  const analyses = useAppSelector((s) => s.analysis.byId);

  const [messageLead, setMessageLead] = useState<LeadContext | null>(null);
  const [promptLead, setPromptLead] = useState<LeadContext | null>(null);
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);

  // Empresas já com o resultado da análise de site aplicado (reclassificação + nova nota).
  const all = useMemo(() => {
    const list = (data?.businesses ?? []).map((b) => {
      const entry = analyses[b.placeId];
      return applyAnalysis(b, entry?.status === "done" ? entry.data : undefined);
    });
    return list.sort((a, b) => b.score - a.score);
  }, [data, analyses]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      todos: 0,
      sem_site: 0,
      so_rede_social: 0,
      site_fraco: 0,
    };
    for (const b of all) {
      if (b.presence === "com_site") continue;
      c.todos++;
      c[b.presence]++;
    }
    return c;
  }, [all]);

  const pending = all.filter((b) => canAnalyze(b) && !analyses[b.placeId]);

  const analyze = (b: Business) => dispatch(runAnalysis({ id: b.placeId, url: b.website! }));

  /** Analisa todos os sites pendentes com um único toast de progresso e um resumo no fim. */
  const analyzeAll = async () => {
    const queue = [...pending];
    const total = queue.length;
    let done = 0;
    let weak = 0;
    let failed = 0;
    setBatch({ done: 0, total });
    const toastId = notify.loading(`Analisando ${total} ${total === 1 ? "site" : "sites"}...`, {
      description: "Cada site leva de 10 a 40 segundos.",
    });

    const worker = async () => {
      for (let b = queue.shift(); b; b = queue.shift()) {
        const result = await dispatch(
          runAnalysis({ id: b.placeId, url: b.website!, silent: true }),
        );
        done++;
        if (runAnalysis.fulfilled.match(result)) {
          if (result.payload.isWeak) weak++;
        } else {
          failed++;
        }
        setBatch({ done, total });
        notify.update(toastId, `Analisando sites: ${done} de ${total}`);
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    setBatch(null);

    const parts = [`${weak} ${weak === 1 ? "site fraco" : "sites fracos"}`];
    if (failed) parts.push(`${failed} não ${failed === 1 ? "abriu" : "abriram"} para análise`);
    notify.update(toastId, `Análise concluída: ${total - failed} de ${total} sites`, {
      description: parts.join(" · "),
      variant: failed === total ? "danger" : weak > 0 ? "warning" : "success",
      done: true,
    });
  };

  const visible = all.filter((b) => {
    if (filter !== "todos") return b.presence === filter;
    return hideWithSite ? b.presence !== "com_site" : true;
  });

  // O motivo do erro aparece no toast (store/feedback.ts); aqui só o estado vazio.
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-separator py-16 text-center text-muted">
        <SearchX className="size-8" />
        <p>A busca não trouxe resultados. Ajuste os filtros e tente de novo.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-72 rounded-3xl" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const ctx = (b: Business): LeadContext => ({
    business: b,
    city: params.city,
    uf: params.uf,
    niche: params.niche,
  });

  return (
    <section className="space-y-5">
      {data.demo && (
        <Alert status="warning">
          <Alert.Content>
            <Alert.Title>Modo demonstração</Alert.Title>
            <Alert.Description>
              Sem GOOGLE_PLACES_API_KEY, a busca mostra empresas fictícias. A análise de site
              funciona de verdade, e você também pode testar qualquer endereço em “Analisar site”.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "primary" : "tertiary"}
            onPress={() => dispatch(setFilter(f))}
          >
            {f === "todos" ? "Todos" : PRESENCE_LABEL[f]}
            <span className="opacity-70">{counts[f]}</span>
          </Button>
        ))}
        <Switch
          className="ml-auto flex-row items-center gap-2"
          size="sm"
          isSelected={!hideWithSite}
          onChange={(v) => dispatch(setHideWithSite(!v))}
        >
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Content>
            <span className="text-sm text-muted">Mostrar quem já tem site</span>
          </Switch.Content>
        </Switch>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          “{data.query}” · {all.length} empresas encontradas · {data.apiCalls}{" "}
          {data.apiCalls === 1 ? "chamada" : "chamadas"} ao Google
          {data.discarded > 0 && ` · ${data.discarded} descartadas (outra cidade ou fechadas)`}
        </p>
        {(pending.length > 0 || batch) && (
          <Button size="sm" variant="tertiary" isDisabled={Boolean(batch)} onPress={analyzeAll}>
            {batch ? <Spinner size="sm" color="current" /> : <Gauge className="size-4" />}
            {batch
              ? `Analisando sites ${batch.done}/${batch.total}...`
              : `Analisar ${pending.length} ${pending.length === 1 ? "site" : "sites"}`}
          </Button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-separator py-16 text-center text-muted">
          <SearchX className="size-8" />
          <p>Nenhuma oportunidade com esse filtro.</p>
          {pending.length > 0 && filter === "site_fraco" && (
            <p className="text-xs">Analise os sites para descobrir quais são fracos.</p>
          )}
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {visible.map((b) => {
            const isSaved = Boolean(saved[b.placeId]);
            return (
              <LeadCard
                key={b.placeId}
                business={b}
                isSaved={isSaved}
                analysis={analyses[b.placeId]}
                onAnalyze={() => analyze(b)}
                onMessage={() => setMessageLead(ctx(b))}
                onPrompt={() => setPromptLead(ctx(b))}
                onToggleSave={() => dispatch(isSaved ? removeLead(b.placeId) : saveLead(ctx(b)))}
              />
            );
          })}
        </div>
      )}

      <MessageModal lead={messageLead} onClose={() => setMessageLead(null)} />
      <SitePromptModal lead={promptLead} onClose={() => setPromptLead(null)} />
    </section>
  );
}
