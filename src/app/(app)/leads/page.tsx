"use client";

import { useMemo, useState } from "react";
import { Button, buttonVariants } from "@heroui/react";
import { ArrowRight, CalendarClock, Star } from "lucide-react";
import Link from "next/link";
import { LeadCard } from "@/components/search/LeadCard";
import { MessageModal, type LeadContext } from "@/components/modals/MessageModal";
import { SitePromptModal } from "@/components/modals/SitePromptModal";
import { SelectField } from "@/components/ui/fields";
import { FollowUpBadge } from "@/components/leads/FollowUpBadge";
import { followUpState, isDue } from "@/lib/followUp";
import { applyAnalysis } from "@/lib/effective";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { runAnalysis } from "@/store/slices/analysisSlice";
import { LEAD_STATUS, removeLead, setLeadStatus } from "@/store/slices/leadsSlice";
import type { LeadStatus, SavedLead } from "@/types/lead";

const STATUS_OPTIONS = LEAD_STATUS.map((s) => ({ id: s.id, label: s.label }));
type StatusFilter = LeadStatus | "todos" | "retornar";

export default function LeadsPage() {
  const dispatch = useAppDispatch();
  const byId = useAppSelector((s) => s.leads.byId);
  const analyses = useAppSelector((s) => s.analysis.byId);
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [messageLead, setMessageLead] = useState<LeadContext | null>(null);
  const [promptLead, setPromptLead] = useState<LeadContext | null>(null);

  const leads = useMemo(
    () =>
      Object.values(byId)
        .map((l) => {
          const entry = analyses[l.business.placeId];
          const business = applyAnalysis(
            l.business,
            entry?.status === "done" ? entry.data : undefined,
          );
          return { ...l, business, followUp: followUpState(l.nextFollowUpOn, l.status) };
        })
        // Quem precisa de retorno hoje (ou está atrasado) vem primeiro; depois, maior nota.
        .sort(
          (a, b) =>
            Number(isDue(b.followUp)) - Number(isDue(a.followUp)) ||
            (a.followUp?.days ?? 999) - (b.followUp?.days ?? 999) ||
            b.business.score - a.business.score ||
            b.savedAt.localeCompare(a.savedAt),
        ),
    [byId, analyses],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: leads.length, retornar: 0 };
    for (const l of leads) {
      c[l.status] = (c[l.status] ?? 0) + 1;
      if (isDue(l.followUp)) c.retornar++;
    }
    return c;
  }, [leads]);
  const visible =
    status === "todos"
      ? leads
      : status === "retornar"
        ? leads.filter((l) => isDue(l.followUp))
        : leads.filter((l) => l.status === status);

  const ctx = (l: SavedLead): LeadContext => ({
    business: l.business,
    city: l.city,
    uf: l.uf,
    niche: l.niche,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Leads salvos</h1>
        <p className="text-muted">
          Seu funil de prospecção. Ao mandar mensagem, o lead vai para “Contatado” e o retorno é
          agendado sozinho.
        </p>
      </header>

      {leads.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-separator py-20 text-center text-muted">
          <Star className="size-8" />
          <p>Nenhum lead salvo ainda.</p>
          <Link href="/" className="text-accent underline-offset-4 hover:underline">
            Buscar empresas
          </Link>
        </div>
      ) : (
        <>
          {counts.retornar > 0 && status !== "retornar" && (
            <button
              type="button"
              onClick={() => setStatus("retornar")}
              className="flex w-full items-center gap-3 rounded-2xl bg-warning-soft p-4 text-left text-sm text-warning-soft-foreground"
            >
              <CalendarClock className="size-5 shrink-0" />
              <span className="flex-1">
                <strong>
                  {counts.retornar} {counts.retornar === 1 ? "lead precisa" : "leads precisam"} de
                  retorno hoje
                </strong>{" "}
                (incluindo atrasados).
              </span>
              <span className="font-medium">Ver</span>
            </button>
          )}

          <div className="flex flex-wrap gap-2">
            {(["todos", "retornar", ...LEAD_STATUS.map((s) => s.id)] as StatusFilter[]).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={status === s ? "primary" : "tertiary"}
                onPress={() => setStatus(s)}
              >
                {s === "todos"
                  ? "Todos"
                  : s === "retornar"
                    ? "Retornar hoje"
                    : LEAD_STATUS.find((x) => x.id === s)?.label}
                <span className="opacity-70">{counts[s] ?? 0}</span>
              </Button>
            ))}
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            {visible.map((l) => (
              <LeadCard
                key={l.business.placeId}
                business={l.business}
                isSaved
                analysis={analyses[l.business.placeId]}
                onAnalyze={() =>
                  dispatch(runAnalysis({ id: l.business.placeId, url: l.business.website! }))
                }
                onMessage={() => setMessageLead(ctx(l))}
                onPrompt={() => setPromptLead(ctx(l))}
                onToggleSave={() => dispatch(removeLead(l.business.placeId))}
                href={`/leads/${encodeURIComponent(l.business.placeId)}`}
                badges={<FollowUpBadge on={l.nextFollowUpOn} status={l.status} />}
                footer={
                  <div className="mt-2 flex w-full items-end gap-3 border-t border-separator pt-4">
                    <SelectField
                      className="flex-1"
                      label="Etapa"
                      value={l.status}
                      options={STATUS_OPTIONS}
                      onChange={(v) =>
                        dispatch(
                          setLeadStatus({ placeId: l.business.placeId, status: v as LeadStatus }),
                        )
                      }
                    />
                    <Link
                      href={`/leads/${encodeURIComponent(l.business.placeId)}`}
                      className={buttonVariants({ variant: "tertiary" })}
                    >
                      Detalhes
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                }
              />
            ))}
          </div>
        </>
      )}

      <MessageModal lead={messageLead} onClose={() => setMessageLead(null)} />
      <SitePromptModal lead={promptLead} onClose={() => setPromptLead(null)} />
    </div>
  );
}
