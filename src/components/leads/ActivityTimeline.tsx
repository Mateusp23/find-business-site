"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Skeleton } from "@heroui/react";
import {
  ArrowRightLeft,
  BookmarkPlus,
  CalendarClock,
  Gauge,
  MessageCircle,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import { FormTextField, SubmitButton } from "@/components/form";
import { formatDateISO } from "@/lib/followUp";
import { noteSchema, type NoteValues } from "@/lib/validation/schemas";
import { useAppDispatch } from "@/store/hooks";
import { activityAdded, newActivity } from "@/store/slices/activitiesSlice";
import { LEAD_STATUS } from "@/store/slices/leadsSlice";
import type { LeadActivity } from "@/types/lead";

const statusLabel = (id?: string) => LEAD_STATUS.find((s) => s.id === id)?.label ?? id ?? "";

const ICON: Record<LeadActivity["type"], LucideIcon> = {
  saved: BookmarkPlus,
  message_sent: MessageCircle,
  status_changed: ArrowRightLeft,
  note: StickyNote,
  follow_up_set: CalendarClock,
  analysis: Gauge,
};

function describe(a: LeadActivity): { title: string; detail?: string } {
  const d = a.data;
  switch (a.type) {
    case "saved":
      return { title: "Lead salvo" };
    case "message_sent":
      return {
        title: "Mensagem enviada pelo WhatsApp",
        detail: d.templateLabel ? `Modelo: ${d.templateLabel}` : undefined,
      };
    case "status_changed":
      return { title: `Etapa: ${statusLabel(d.from)} → ${statusLabel(d.to)}` };
    case "note":
      return { title: "Anotação", detail: d.text };
    case "follow_up_set":
      return d.on
        ? {
            title: `Próximo contato: ${formatDateISO(d.on)}`,
            detail: d.auto ? "Agendado automaticamente após a mensagem" : undefined,
          }
        : { title: "Próximo contato removido" };
    case "analysis":
      return {
        title: `Site analisado: nota ${d.quality}/100`,
        detail: d.isWeak ? "Site fraco" : "Site em bom estado",
      };
  }
}

const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
const fullFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

function relative(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return "agora";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return fullFmt.format(new Date(iso));
}

/** Formulário para adicionar uma anotação ao histórico. */
export function AddNoteForm({ placeId }: { placeId: string }) {
  const dispatch = useAppDispatch();
  const { control, handleSubmit, reset, formState } = useForm<NoteValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { text: "" },
  });
  const onSubmit = handleSubmit(({ text }) => {
    dispatch(activityAdded(newActivity(placeId, "note", { text })));
    reset();
  });
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <FormTextField
        control={control}
        name="text"
        label="Nova anotação"
        placeholder="Ex.: Falei com a dona, pediu para retornar depois do dia 10"
        className="flex-1"
      />
      <SubmitButton
        isSubmitting={formState.isSubmitting}
        fullWidth={false}
        variant="secondary"
        className="sm:mt-7"
      >
        Adicionar
      </SubmitButton>
    </form>
  );
}

export function ActivityTimeline({
  items,
  isLoading,
}: {
  items: LeadActivity[];
  isLoading: boolean;
}) {
  if (isLoading && items.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-xl" />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return <p className="text-sm text-muted">Nenhuma atividade registrada ainda.</p>;
  }
  return (
    <ol className="relative space-y-5 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-separator">
      {items.map((a) => {
        const Icon = ICON[a.type];
        const { title, detail } = describe(a);
        return (
          <li key={a.id} className="relative flex gap-3">
            <span className="z-10 grid size-8 shrink-0 place-items-center rounded-full bg-surface-secondary text-muted ring-4 ring-surface">
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 pt-1">
              <p className="text-sm font-medium">{title}</p>
              {detail && (
                <p
                  className={`mt-0.5 text-sm text-muted ${a.type === "note" ? "whitespace-pre-wrap" : ""}`}
                >
                  {detail}
                </p>
              )}
              <time dateTime={a.createdAt} title={fullFmt.format(new Date(a.createdAt))} className="text-xs text-muted">
                {relative(a.createdAt)}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
