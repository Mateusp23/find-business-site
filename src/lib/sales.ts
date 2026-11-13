import type { LeadSale, SavedLead } from "@/types/lead";

export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

/** Datas civis do usuário, sem deslocamento por UTC. */
export function localDay(value = new Date()) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
export function dateLabel(day: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(`${day}T12:00:00`));
}
export const timestampDay = (iso: string) => localDay(new Date(iso));
export function isCivilDate(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = new Date(`${day}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day;
}
export const inRange = (day: string, start: string, end: string) => day >= start && day <= end;

/** Aniversário mensal, preservando o dia original inclusive depois de fevereiro. */
export function monthlyDate(closedOn: string, offset: number) {
  const [year, month, day] = closedOn.split("-").map(Number);
  const first = new Date(year, month - 1 + offset, 1, 12);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0, 12).getDate();
  first.setDate(Math.min(day, last));
  return localDay(first);
}
export function recurringActive(sale: LeadSale, on: string) {
  return sale.monthlyCents > 0 && sale.closedOn <= on && (!sale.recurringEndOn || sale.recurringEndOn >= on);
}

export interface RevenuePoint { month: string; label: string; upfront: number; recurring: number; saved: number; contacted: number }
export function salesDashboard(leads: SavedLead[], start: string, end: string) {
  const points: RevenuePoint[] = [];
  const byMonth = new Map<string, RevenuePoint>();
  const [year, month] = start.split("-").map(Number);
  const cursor = new Date(year, month - 1, 1, 12);
  while (localDay(cursor).slice(0, 7) <= end.slice(0, 7)) {
    const key = localDay(cursor).slice(0, 7);
    const point = { month: key, label: new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(cursor), upfront: 0, recurring: 0, saved: 0, contacted: 0 };
    points.push(point);
    byMonth.set(key, point);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const cohort = leads.filter((l) => inRange(timestampDay(l.savedAt), start, end));
  let upfront = 0, recurring = 0, mrr = 0, contacted = 0;
  for (const lead of leads) {
    const savedOn = timestampDay(lead.savedAt);
    if (inRange(savedOn, start, end)) byMonth.get(savedOn.slice(0, 7))!.saved++;
    if (lead.lastContactAt) {
      const day = timestampDay(lead.lastContactAt);
      if (inRange(day, start, end)) { contacted++; byMonth.get(day.slice(0, 7))!.contacted++; }
    }
    const sale = lead.sale;
    if (!sale) continue;
    if (recurringActive(sale, end)) mrr += sale.monthlyCents;
    if (inRange(sale.closedOn, start, end)) {
      upfront += sale.amountCents;
      byMonth.get(sale.closedOn.slice(0, 7))!.upfront += sale.amountCents;
    }
    if (sale.monthlyCents <= 0) continue;
    const last = sale.recurringEndOn && sale.recurringEndOn < end ? sale.recurringEndOn : end;
    const [sy, sm] = sale.closedOn.split("-").map(Number);
    // Começa perto do início do filtro; evita percorrer todo o histórico por contrato.
    const offset = Math.max(0, (year - sy) * 12 + month - sm);
    for (let i = offset; ; i++) {
      const day = monthlyDate(sale.closedOn, i);
      if (day > last) break;
      if (day < start) continue;
      recurring += sale.monthlyCents;
      byMonth.get(day.slice(0, 7))!.recurring += sale.monthlyCents;
    }
  }
  const sales = leads.filter((l) => l.sale && inRange(l.sale.closedOn, start, end))
    .sort((a, b) => b.sale!.closedOn.localeCompare(a.sale!.closedOn));
  return { points, upfront, recurring, revenue: upfront + recurring, mrr, contacted, saved: cohort.length,
    conversion: cohort.length ? cohort.filter((l) => l.status === "fechado").length / cohort.length * 100 : 0,
    cohort, sales, missingSales: leads.filter((l) => l.status === "fechado" && !l.sale),
  };
}
