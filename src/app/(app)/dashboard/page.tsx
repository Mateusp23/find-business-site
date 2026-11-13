"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button, Card, Chip, Input, Label, Skeleton, TextField, buttonVariants } from "@heroui/react";
import { ArrowRight, CalendarClock, Search, TrendingUp } from "lucide-react";
import { SelectField } from "@/components/ui/fields";
import { SaleModal } from "@/components/leads/SaleModal";
import { dateLabel, isCivilDate, localDay, money, recurringActive, salesDashboard, timestampDay } from "@/lib/sales";
import { followUpState, isDue } from "@/lib/followUp";
import { useAppSelector } from "@/store/hooks";
import { LEAD_STATUS } from "@/store/slices/leadsSlice";

const chartLoading = () => <Skeleton className="h-72 w-full rounded-xl" />;
const RevenueChart = dynamic(() => import("@/components/dashboard/DashboardCharts").then((m) => m.RevenueChart), { ssr: false, loading: chartLoading });
const PipelineChart = dynamic(() => import("@/components/dashboard/DashboardCharts").then((m) => m.PipelineChart), { ssr: false, loading: chartLoading });
const ProspectingChart = dynamic(() => import("@/components/dashboard/DashboardCharts").then((m) => m.ProspectingChart), { ssr: false, loading: chartLoading });
const PERIODS = [
  { id: "month", label: "Este mês" }, { id: "30", label: "Últimos 30 dias" },
  { id: "90", label: "Últimos 90 dias" }, { id: "year", label: "Este ano" },
  { id: "all", label: "Todo o período" }, { id: "custom", label: "Personalizado" },
];

export default function DashboardPage() {
  const byId = useAppSelector((s) => s.leads.byId);
  const dataStatus = useAppSelector((s) => s.session.dataStatus);
  const leads = useMemo(() => Object.values(byId), [byId]);
  const [today] = useState(() => localDay());
  const [period, setPeriod] = useState("month");
  const [customStart, setCustomStart] = useState(`${today.slice(0, 7)}-01`);
  const [customEnd, setCustomEnd] = useState(today);
  const [query, setQuery] = useState("");
  const [saleLeadId, setSaleLeadId] = useState<string | null>(null);
  const earliest = leads.reduce((min, l) => {
    const day = l.sale?.closedOn && l.sale.closedOn < timestampDay(l.savedAt) ? l.sale.closedOn : timestampDay(l.savedAt);
    return day < min ? day : min;
  }, today);
  let start = `${today.slice(0, 7)}-01`;
  let end = today;
  if (period === "year") start = `${today.slice(0, 4)}-01-01`;
  if (period === "all") start = earliest < "2000-01-01" ? "2000-01-01" : earliest;
  if (period === "30" || period === "90") {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() - Number(period) + 1);
    start = localDay(d);
  }
  if (period === "custom") { start = customStart; end = customEnd; }
  const validRange = isCivilDate(start) && isCivilDate(end) && start >= "2000-01-01" && start <= end && end <= today;
  const stats = useMemo(() => salesDashboard(leads, validRange ? start : today, validRange ? end : today), [leads, start, end, today, validRange]);
  const pipeline = LEAD_STATUS.map((s) => ({ label: s.label, count: stats.cohort.filter((l) => l.status === s.id).length }));
  const due = leads.filter((l) => isDue(followUpState(l.nextFollowUpOn, l.status))).length;
  const visibleSales = stats.sales.filter((l) => `${l.business.name} ${l.city}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2"><h1 className="text-3xl font-bold tracking-tight">Dashboard</h1><p className="text-muted">Da primeira abordagem à receita recorrente.</p></div>
        <Link href="/leads" className={buttonVariants({ variant: "tertiary" })}>Gerenciar leads <ArrowRight className="size-4" /></Link>
      </header>

      <section aria-label="Filtro de período" className="flex flex-wrap items-end gap-3">
        <SelectField className="w-full sm:w-52" label="Período" value={period} onChange={setPeriod} options={PERIODS} />
        {period === "custom" && <>
          <TextField value={customStart} onChange={setCustomStart} className="min-w-0 flex-1 sm:max-w-48"><Label>De</Label><Input type="date" min="2000-01-01" max={customEnd || today} /></TextField>
          <TextField value={customEnd} onChange={setCustomEnd} className="min-w-0 flex-1 sm:max-w-48"><Label>Até</Label><Input type="date" min={customStart || "2000-01-01"} max={today} /></TextField>
        </>}
        {validRange && <p className="pb-2 text-sm text-muted" aria-live="polite">{dateLabel(start)} a {dateLabel(end)}</p>}
      </section>
      {!validRange ? <p role="alert" className="text-sm text-danger">Selecione um intervalo válido entre 2000 e hoje, com a data final igual ou posterior à inicial.</p>
      : dataStatus === "error" ? <Card><Card.Content><p>Não foi possível carregar seus dados. Recarregue a página para tentar novamente.</p></Card.Content></Card>
      : dataStatus !== "ready" ? <div aria-label="Carregando dashboard" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
      : <>
        {leads.length === 0 && <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-accent-soft p-5 text-accent-soft-foreground"><div><p className="font-medium">Seu próximo resultado começa com um lead.</p><p className="mt-1 text-sm">Salve empresas, registre os contatos e feche vendas para acompanhar os números aqui.</p></div><Link href="/" className={buttonVariants()}>Buscar empresas <Search className="size-4" /></Link></div>}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Faturamento estimado" value={money(stats.revenue)} detail="Pontual + mensalidades no período" />
          <Metric label="Receita recorrente mensal" value={money(stats.mrr)} detail={`Contratos ativos em ${dateLabel(end)}`} />
          <Metric label="Leads abordados" value={String(stats.contacted)} detail="Último contato registrado no período" />
          <Metric label="Vendas fechadas" value={String(stats.sales.length)} detail={`${stats.saved} leads salvos no período`} />
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-3">
          <Card className="min-w-0 xl:col-span-2">
            <Card.Header><Card.Title>Faturamento ao longo do tempo</Card.Title><Card.Description>Valor pontual no fechamento e mensalidades no aniversário do contrato.</Card.Description></Card.Header>
            <Card.Content>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm"><span className="text-muted">Pontual <strong className="ml-1 font-medium text-foreground tabular-nums">{money(stats.upfront)}</strong></span><span className="text-muted">Mensalidades <strong className="ml-1 font-medium text-foreground tabular-nums">{money(stats.recurring)}</strong></span></div>
              <RevenueChart points={stats.points} />
              {stats.revenue === 0 && <p className="text-sm text-muted">Nenhum faturamento estimado neste período. Registre os valores ao fechar uma venda.</p>}
            </Card.Content>
          </Card>
          <Card className="min-w-0">
            <Card.Header><Card.Title>Seu funil</Card.Title><Card.Description>Etapa atual dos leads salvos no período.</Card.Description></Card.Header>
            <Card.Content><PipelineChart data={pipeline} /><p className="text-sm text-muted">Conversão da carteira <strong className="float-right text-foreground tabular-nums">{stats.conversion.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</strong></p><p className="text-xs text-muted">Leads deste período que estão na etapa Fechado.</p></Card.Content>
          </Card>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-3">
          <Card className="min-w-0 xl:col-span-2"><Card.Header><Card.Title>Ritmo de prospecção</Card.Title><Card.Description>Novos leads e abordagens, agrupados por mês.</Card.Description></Card.Header><Card.Content><ProspectingChart points={stats.points} /><p className="text-xs text-muted">Cada lead abordado aparece uma vez, no mês do último contato conhecido. Abrir o WhatsApp registra o contato; não confirma entrega ou resposta.</p></Card.Content></Card>
          <Card><Card.Header><Card.Title>Próximos passos</Card.Title><Card.Description>Situação atual de toda a carteira.</Card.Description></Card.Header><Card.Content>
            <div className="flex items-center gap-3"><CalendarClock className="size-5 text-warning" /><p className="text-sm"><strong className="tabular-nums">{due}</strong> {due === 1 ? "lead para retornar" : "leads para retornar"} hoje ou atrasados</p></div>
            <Link href="/leads" className="text-sm font-medium text-foreground underline decoration-muted underline-offset-4">Ver leads e próximos contatos <ArrowRight className="inline size-4" /></Link>
            {stats.missingSales.length > 0 && <div className="border-t border-separator pt-4"><p className="text-sm">{stats.missingSales.length} {stats.missingSales.length === 1 ? "lead fechado sem valores registrados." : "leads fechados sem valores registrados."}</p><p className="mt-1 text-xs text-muted">Eles ainda não entram no faturamento estimado.</p><Button className="mt-3" size="sm" variant="tertiary" onPress={() => setSaleLeadId(stats.missingSales[0].business.placeId)}>Completar uma venda</Button></div>}
            <p className="border-t border-separator pt-4 text-xs text-muted">Os números refletem os leads salvos. Excluir um lead também remove sua venda dos indicadores.</p>
          </Card.Content></Card>
        </div>

        <Card id="vendas" className="min-w-0">
          <Card.Header className="flex-row flex-wrap items-center justify-between gap-4"><div className="space-y-1"><Card.Title>Controle de vendas</Card.Title><Card.Description>Fechamentos entre {dateLabel(start)} e {dateLabel(end)}. Edite os valores ou encerre a recorrência.</Card.Description></div><TextField aria-label="Buscar venda por empresa ou cidade" value={query} onChange={setQuery} className="w-full sm:w-64"><Input placeholder="Buscar empresa ou cidade" /></TextField></Card.Header>
          <Card.Content>
            {visibleSales.length === 0 ? <div className="py-10 text-center"><TrendingUp className="mx-auto mb-3 size-7 text-muted" /><p className="text-sm text-muted">{query ? "Nenhuma venda corresponde à busca." : "Nenhuma venda fechada neste período."}</p><Link href="/leads" className="mt-3 inline-block text-sm text-foreground underline decoration-muted underline-offset-4">Registrar uma venda em um lead</Link></div> :
            <div className="relative overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Vendas fechadas no período selecionado</caption><thead><tr className="border-b border-separator text-xs text-muted">{["Empresa", "Fechamento", "Valor pontual", "Mensalidade", "Recorrência", ""].map((label) => <th key={label} scope="col" className="px-3 py-3 font-medium first:pl-0">{label || <span className="sr-only">Ações</span>}</th>)}</tr></thead><tbody>{visibleSales.map((lead) => {
              const sale = lead.sale!;
              return <tr key={lead.business.placeId} className="border-b border-separator last:border-0"><td className="min-w-40 py-4 pr-3"><Link href={`/leads/${encodeURIComponent(lead.business.placeId)}`} className="font-medium hover:underline">{lead.business.name}</Link><p className="mt-1 text-xs text-muted">{lead.city} · {lead.uf}</p></td><td className="whitespace-nowrap px-3 py-4">{dateLabel(sale.closedOn)}</td><td className="whitespace-nowrap px-3 py-4 tabular-nums">{money(sale.amountCents)}</td><td className="whitespace-nowrap px-3 py-4 tabular-nums">{money(sale.monthlyCents)}</td><td className="px-3 py-4"><Chip size="sm" variant="soft" color={recurringActive(sale, end) ? "success" : "default"}>{sale.monthlyCents === 0 ? "Sem mensalidade" : recurringActive(sale, end) ? "Ativa" : "Encerrada"}</Chip></td><td className="px-3 py-4 text-right"><Button size="sm" variant="tertiary" aria-label={`Editar venda de ${lead.business.name}`} onPress={() => setSaleLeadId(lead.business.placeId)}>Editar</Button></td></tr>;
            })}</tbody><tfoot><tr className="border-t border-separator font-medium"><td colSpan={2} className="py-4">Total dos fechamentos exibidos</td><td className="whitespace-nowrap px-3 py-4 tabular-nums">{money(visibleSales.reduce((sum, l) => sum + l.sale!.amountCents, 0))}</td><td className="whitespace-nowrap px-3 py-4 tabular-nums">{money(visibleSales.reduce((sum, l) => sum + l.sale!.monthlyCents, 0))}</td><td colSpan={2} /></tr></tfoot></table></div>}
          </Card.Content>
        </Card>

        <details className="rounded-xl border border-separator p-4 text-sm"><summary className="cursor-pointer font-medium">Ver dados dos gráficos e critérios de cálculo</summary><div className="mt-4 space-y-4 text-muted"><p>Faturamento estimado = valores pontuais fechados no período + mensalidades previstas até a data final. A primeira mensalidade conta no fechamento; nos meses sem aquele dia, conta no último dia do mês. O fim da recorrência é inclusivo. Não há conciliação de pagamentos.</p><p>A receita recorrente mensal considera todos os contratos ativos na data final, inclusive fechados antes do filtro. A lista de vendas mostra apenas os fechamentos no intervalo.</p><div className="relative overflow-x-auto"><table className="w-full text-left"><caption className="sr-only">Dados mensais dos gráficos</caption><thead><tr>{["Mês", "Pontual", "Mensalidades", "Salvos", "Abordados"].map((label) => <th key={label} className="p-2 font-medium text-foreground" scope="col">{label}</th>)}</tr></thead><tbody>{stats.points.map((p) => <tr key={p.month}><td className="whitespace-nowrap p-2">{p.label}</td><td className="whitespace-nowrap p-2">{money(p.upfront)}</td><td className="whitespace-nowrap p-2">{money(p.recurring)}</td><td className="p-2">{p.saved}</td><td className="p-2">{p.contacted}</td></tr>)}</tbody></table></div></div></details>
      </>}
      <SaleModal lead={saleLeadId ? byId[saleLeadId] ?? null : null} onClose={() => setSaleLeadId(null)} />
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <Card className="min-w-0"><Card.Content><p className="text-sm text-muted">{label}</p><p className="text-2xl font-semibold tracking-tight break-words tabular-nums">{value}</p><p className="text-xs text-muted">{detail}</p></Card.Content></Card>;
}
