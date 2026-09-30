import { Chip } from "@heroui/react";
import { CalendarClock } from "lucide-react";
import { followUpState } from "@/lib/followUp";
import type { LeadStatus } from "@/types/lead";

const COLOR = { overdue: "danger", today: "warning", soon: "accent", later: "default" } as const;

/** Etiqueta do próximo contato: "Atrasado 2 dias", "Retornar hoje", "Retornar em 3 dias"... */
export function FollowUpBadge({ on, status }: { on: string | null; status: LeadStatus }) {
  const state = followUpState(on, status);
  if (!state) return null;
  return (
    <Chip size="sm" variant="soft" color={COLOR[state.kind]}>
      <CalendarClock className="size-3" />
      {state.label}
    </Chip>
  );
}
