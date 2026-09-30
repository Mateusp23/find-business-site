import type { LeadStatus } from "@/types/lead";

/** Dias até o follow-up automático depois de mandar mensagem. */
export const AUTO_FOLLOW_UP_DAYS = 3;

/** Etapas em que ainda faz sentido lembrar de retornar. */
export const ACTIVE_STATUSES: LeadStatus[] = ["novo", "contatado", "respondeu", "proposta"];

const pad = (n: number) => String(n).padStart(2, "0");

/** Data local de hoje como "AAAA-MM-DD" (o follow-up é por dia, sem hora). */
export function todayISO(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDaysISO(dateISO: string, days: number) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return todayISO(date);
}

/** Diferença em dias entre duas datas "AAAA-MM-DD" (b - a). */
export function daysBetween(a: string, b: string) {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export type FollowUpKind = "overdue" | "today" | "soon" | "later";

export interface FollowUpState {
  kind: FollowUpKind;
  /** Dias a partir de hoje (negativo = atrasado). */
  days: number;
  label: string;
}

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

export function formatDateISO(dateISO: string) {
  const [y, m, d] = dateISO.split("-").map(Number);
  return dateFmt.format(new Date(y, m - 1, d)).replace(".", "");
}

/** Situação do próximo contato de um lead (null se não há ou se o lead já foi fechado/perdido). */
export function followUpState(
  on: string | null | undefined,
  status: LeadStatus,
  today = todayISO(),
): FollowUpState | null {
  if (!on || !ACTIVE_STATUSES.includes(status)) return null;
  const days = daysBetween(today, on);
  if (days < 0) {
    const n = -days;
    return { kind: "overdue", days, label: `Atrasado ${n} ${n === 1 ? "dia" : "dias"}` };
  }
  if (days === 0) return { kind: "today", days, label: "Retornar hoje" };
  if (days === 1) return { kind: "soon", days, label: "Retornar amanhã" };
  if (days <= 7) return { kind: "soon", days, label: `Retornar em ${days} dias` };
  return { kind: "later", days, label: `Retornar em ${formatDateISO(on)}` };
}

/** true se o lead precisa de atenção hoje (atrasado ou para hoje). */
export const isDue = (s: FollowUpState | null) => s?.kind === "overdue" || s?.kind === "today";
