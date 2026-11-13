"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { RevenuePoint } from "@/lib/sales";
import { money } from "@/lib/sales";

const tooltipStyle = { background: "var(--surface)", border: "1px solid var(--separator)", borderRadius: 12, color: "var(--foreground)" };
const axis = { tick: { fill: "var(--muted)", fontSize: 11 }, axisLine: false, tickLine: false };
const compactMoney = (cents: number) => new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(cents / 100);

export function RevenueChart({ points }: { points: RevenuePoint[] }) {
  return (
    <div className="h-72 w-full min-w-0" role="img" aria-label="Faturamento estimado por mês, dividido em vendas pontuais e mensalidades. Os valores também estão em Ver dados dos gráficos.">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={points} margin={{ top: 12, right: 0, bottom: 0, left: 0 }} accessibilityLayer>
          <CartesianGrid vertical={false} stroke="var(--separator)" strokeDasharray="3 3" />
          <XAxis dataKey="label" {...axis} minTickGap={24} />
          <YAxis {...axis} tickFormatter={compactMoney} width={48} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-secondary)" }} formatter={(value) => money(Number(value))} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} formatter={(label) => <span className="text-foreground">{label}</span>} />
          <Bar dataKey="upfront" name="Vendas pontuais" stackId="revenue" fill="var(--accent)" maxBarSize={36} isAnimationActive={false} />
          <Bar dataKey="recurring" name="Mensalidades" stackId="revenue" fill="var(--success-soft-foreground)" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ProspectingChart({ points }: { points: RevenuePoint[] }) {
  return (
    <div className="h-64 w-full min-w-0" role="img" aria-label="Leads salvos e abordados por mês. Os valores também estão em Ver dados dos gráficos.">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={points} margin={{ top: 12, right: 0, bottom: 0, left: -16 }} accessibilityLayer>
          <CartesianGrid vertical={false} stroke="var(--separator)" strokeDasharray="3 3" />
          <XAxis dataKey="label" {...axis} minTickGap={24} />
          <YAxis {...axis} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-secondary)" }} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} formatter={(label) => <span className="text-foreground">{label}</span>} />
          <Bar dataKey="saved" name="Leads salvos" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
          <Bar dataKey="contacted" name="Leads abordados" fill="var(--muted)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PipelineChart({ data }: { data: { label: string; count: number }[] }) {
  return (
    <div className="h-72 w-full min-w-0" role="img" aria-label={data.map((d) => `${d.label}: ${d.count}`).join(". ")}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart layout="vertical" data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }} accessibilityLayer>
          <XAxis type="number" {...axis} allowDecimals={false} />
          <YAxis type="category" dataKey="label" {...axis} width={112} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-secondary)" }} />
          <Bar dataKey="count" name="Leads" fill="var(--accent)" radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
