"use client";

import { useMemo, useState } from "react";
import { Button, TextArea } from "@heroui/react";
import { Star } from "lucide-react";
import Link from "next/link";
import { LeadCard } from "@/components/search/LeadCard";
import { MessageModal, type LeadContext } from "@/components/modals/MessageModal";
import { SitePromptModal } from "@/components/modals/SitePromptModal";
import { SelectField } from "@/components/ui/fields";
import { applyAnalysis } from "@/lib/effective";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { runAnalysis } from "@/store/slices/analysisSlice";
import {
  LEAD_STATUS,
  removeLead,
  setLeadNotes,
  setLeadStatus,
} from "@/store/slices/leadsSlice";
import type { LeadStatus, SavedLead } from "@/types/lead";

const STATUS_OPTIONS = LEAD_STATUS.map((s) => ({ id: s.id, label: s.label }));
type StatusFilter = LeadStatus | "todos";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

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
          const business = applyAnalysis(l.business, entry?.status === "done" ? entry.data : undefined);
          return { ...l, business };
        })
        .sort((a, b) => b.business.score - a.business.score || b.savedAt.localeCompare(a.savedAt)),
    [byId, analyses],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: leads.length };
    for (const l of leads) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [leads]);
  const visible = status === "todos" ? leads : leads.filter((l) => l.status === status);

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
          Seu funil de prospecção. Ao abrir o WhatsApp, o lead passa sozinho para “Contatado”.
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
          <div className="flex flex-wrap gap-2">
            {(["todos", ...LEAD_STATUS.map((s) => s.id)] as StatusFilter[]).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={status === s ? "primary" : "tertiary"}
                onPress={() => setStatus(s)}
              >
                {s === "todos" ? "Todos" : LEAD_STATUS.find((x) => x.id === s)?.label}
                <span className="opacity-70">{counts[s] ?? 0}</span>
              </Button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
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
                footer={
                  <div className="mt-2 grid w-full gap-3 border-t border-separator pt-4">
                    <div className="flex items-end gap-3">
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
                      <p className="pb-2 text-xs text-muted">
                        {l.niche} · {l.city}
                        {l.lastContactAt &&
                          ` · contato em ${dateFmt.format(new Date(l.lastContactAt))}`}
                      </p>
                    </div>
                    <TextArea
                      aria-label="Anotações"
                      placeholder="Anotações: com quem falou, o que ficou combinado..."
                      rows={2}
                      fullWidth
                      value={l.notes}
                      onChange={(e) =>
                        dispatch(setLeadNotes({ placeId: l.business.placeId, notes: e.target.value }))
                      }
                    />
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
