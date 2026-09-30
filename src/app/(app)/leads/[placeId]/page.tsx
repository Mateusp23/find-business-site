"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Chip, Skeleton, TextArea, buttonVariants } from "@heroui/react";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  AtSign,
  MapPin,
  MessageCircle,
  Phone,
  SearchX,
  Smartphone,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { SiteAnalysisPanel } from "@/components/analysis/SiteAnalysisPanel";
import { ActivityTimeline, AddNoteForm } from "@/components/leads/ActivityTimeline";
import { FollowUpBadge } from "@/components/leads/FollowUpBadge";
import { FollowUpPicker } from "@/components/leads/FollowUpPicker";
import { MessageModal, type LeadContext } from "@/components/modals/MessageModal";
import { SitePromptModal } from "@/components/modals/SitePromptModal";
import { SelectField } from "@/components/ui/fields";
import { PRESENCE_LABEL } from "@/lib/classify";
import { applyAnalysis, canAnalyze } from "@/lib/effective";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadActivities } from "@/store/slices/activitiesSlice";
import { runAnalysis } from "@/store/slices/analysisSlice";
import {
  LEAD_STATUS,
  removeLead,
  setFollowUp,
  setLeadNotes,
  setLeadStatus,
} from "@/store/slices/leadsSlice";
import type { LeadStatus } from "@/types/lead";

const STATUS_OPTIONS = LEAD_STATUS.map((s) => ({ id: s.id, label: s.label }));
const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

export default function LeadDetailPage({ params }: { params: Promise<{ placeId: string }> }) {
  const { placeId: raw } = use(params);
  const placeId = decodeURIComponent(raw);
  const router = useRouter();
  const dispatch = useAppDispatch();

  const dataStatus = useAppSelector((s) => s.session.dataStatus);
  const lead = useAppSelector((s) => s.leads.byId[placeId]);
  const analysisEntry = useAppSelector((s) => s.analysis.byId[placeId]);
  const history = useAppSelector((s) => s.activities.byPlaceId[placeId]);

  const [messageOpen, setMessageOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);

  // Histórico carrega quando os dados do usuário estão prontos (e de novo ao trocar de lead).
  useEffect(() => {
    if (dataStatus === "ready" && lead) dispatch(loadActivities(placeId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataStatus, placeId, Boolean(lead), dispatch]);

  const business = useMemo(
    () =>
      lead
        ? applyAnalysis(
            lead.business,
            analysisEntry?.status === "done" ? analysisEntry.data : undefined,
          )
        : null,
    [lead, analysisEntry],
  );

  if (!lead || !business) {
    if (dataStatus !== "ready") {
      return (
        <div className="mx-auto max-w-6xl space-y-6">
          <Skeleton className="h-10 w-72 rounded-xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      );
    }
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center text-muted">
        <SearchX className="size-10" />
        <p>Esse lead não está mais na sua lista.</p>
        <Link href="/leads" className="text-accent hover:underline">
          Voltar para os leads salvos
        </Link>
      </div>
    );
  }

  const ctx: LeadContext = { business, city: lead.city, uf: lead.uf, niche: lead.niche };
  const b = business;
  const instagramSearch = `https://www.google.com/search?q=${encodeURIComponent(
    `site:instagram.com "${b.name}" ${lead.city}`,
  )}`;

  const remove = () => {
    dispatch(removeLead(placeId));
    router.push("/leads");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Cabeçalho */}
      <div className="space-y-4">
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Leads salvos
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{b.name}</h1>
            <p className="text-muted">
              {b.category ?? lead.niche} · {lead.city} - {lead.uf}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Chip
                size="sm"
                variant="soft"
                color={b.presence === "com_site" ? "default" : "warning"}
              >
                {PRESENCE_LABEL[b.presence]}
              </Chip>
              {b.rating !== null && (
                <Chip size="sm" variant="tertiary">
                  <Star className="size-3" />
                  {b.rating.toFixed(1)} · {b.reviewCount} avaliações
                </Chip>
              )}
              <FollowUpBadge on={lead.nextFollowUpOn} status={lead.status} />
            </div>
          </div>
          <div className="text-right">
            <div className="text-5xl leading-none font-semibold text-accent tabular-nums">
              {b.score}
            </div>
            <div className="mt-1 text-xs tracking-wider text-muted uppercase">Oportunidade</div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-wrap gap-2">
          <Button onPress={() => setMessageOpen(true)}>
            <MessageCircle className="size-4" />
            Mensagem no WhatsApp
          </Button>
          {b.phoneE164 && (
            <a href={`tel:+${b.phoneE164}`} className={buttonVariants({ variant: "tertiary" })}>
              <Phone className="size-4" />
              Ligar
            </a>
          )}
          {b.mapsUrl && (
            <a
              href={b.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "tertiary" })}
            >
              <MapPin className="size-4" />
              Google Maps
            </a>
          )}
          <a
            href={instagramSearch}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "tertiary" })}
          >
            <AtSign className="size-4" />
            Procurar Instagram
          </a>
          <Button variant="tertiary" onPress={() => setPromptOpen(true)}>
            <Sparkles className="size-4" />
            Prompt do site
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <Card.Header>
              <Card.Title>Histórico</Card.Title>
              <Card.Description>
                Tudo o que aconteceu com este lead. Mensagens, etapas e análises entram sozinhas.
              </Card.Description>
            </Card.Header>
            <Card.Content className="gap-6">
              <AddNoteForm placeId={placeId} />
              <ActivityTimeline
                items={history?.items ?? []}
                isLoading={!history || history.status === "loading"}
              />
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>Dados do Google</Card.Title>
            </Card.Header>
            <Card.Content className="gap-4 text-sm">
              <dl className="grid gap-3 sm:grid-cols-2">
                {b.address && (
                  <Info icon={MapPin} label="Endereço">
                    {b.address}
                  </Info>
                )}
                {b.phone && (
                  <Info icon={b.isMobile ? Smartphone : Phone} label="Telefone">
                    {b.phone}{" "}
                    <span className="text-muted">({b.isMobile ? "celular" : "fixo"})</span>
                  </Info>
                )}
                <Info icon={ExternalLink} label="Site">
                  {b.website ? (
                    <a
                      href={b.website}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all hover:underline"
                    >
                      {b.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                    </a>
                  ) : (
                    "Não tem"
                  )}
                </Info>
                <Info icon={Star} label="Avaliações">
                  {b.rating !== null
                    ? `${b.rating.toFixed(1)} de 5 · ${b.reviewCount} avaliações`
                    : "Sem avaliações"}
                </Info>
              </dl>
              {b.reasons.length > 0 && (
                <ul className="space-y-1 rounded-xl bg-surface-secondary p-3 text-xs text-muted">
                  {b.reasons.map((r) => (
                    <li key={r} className="flex gap-2">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </Card.Content>
          </Card>

          {canAnalyze(b) && (
            <Card>
              <Card.Header>
                <Card.Title>Site atual</Card.Title>
              </Card.Header>
              <Card.Content>
                <SiteAnalysisPanel
                  entry={analysisEntry}
                  onAnalyze={() => dispatch(runAnalysis({ id: placeId, url: b.website! }))}
                />
              </Card.Content>
            </Card>
          )}
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6">
          <Card>
            <Card.Header>
              <Card.Title>Etapa</Card.Title>
            </Card.Header>
            <Card.Content className="gap-3">
              <SelectField
                label="Etapa do funil"
                value={lead.status}
                options={STATUS_OPTIONS}
                onChange={(v) => dispatch(setLeadStatus({ placeId, status: v as LeadStatus }))}
              />
              <dl className="space-y-1 text-xs text-muted">
                <div>Salvo em {dateFmt.format(new Date(lead.savedAt))}</div>
                {lead.lastContactAt && (
                  <div>Último contato em {dateFmt.format(new Date(lead.lastContactAt))}</div>
                )}
                <div>
                  Busca: {lead.niche} em {lead.city}
                </div>
              </dl>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>Próximo contato</Card.Title>
              <Card.Description>
                Depois de mandar mensagem, o retorno é agendado sozinho para daqui a alguns dias.
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <FollowUpPicker
                value={lead.nextFollowUpOn}
                onChange={(on) => dispatch(setFollowUp({ placeId, on }))}
              />
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>Anotações gerais</Card.Title>
              <Card.Description>
                Informações fixas: nome do dono, horários, preferências.
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <TextArea
                aria-label="Anotações gerais"
                rows={5}
                fullWidth
                placeholder="Ex.: Dona Marta, prefere contato à tarde"
                value={lead.notes}
                onChange={(e) => dispatch(setLeadNotes({ placeId, notes: e.target.value }))}
              />
            </Card.Content>
          </Card>

          <Button variant="danger-soft" fullWidth onPress={remove}>
            <Trash2 className="size-4" />
            Remover lead
          </Button>
        </div>
      </div>

      <MessageModal lead={messageOpen ? ctx : null} onClose={() => setMessageOpen(false)} />
      <SitePromptModal lead={promptOpen ? ctx : null} onClose={() => setPromptOpen(false)} />
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted" />
      <div className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt>
        <dd>{children}</dd>
      </div>
    </div>
  );
}
