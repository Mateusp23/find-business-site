"use client";

import Link from "next/link";
import { Button, Card, Chip, buttonVariants } from "@heroui/react";
import {
  Check,
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
  Smartphone,
  Sparkles,
  Star,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import { PRESENCE_LABEL } from "@/lib/classify";
import { canAnalyze } from "@/lib/effective";
import { SiteAnalysisPanel } from "@/components/analysis/SiteAnalysisPanel";
import type { AnalysisEntry } from "@/store/slices/analysisSlice";
import type { Business, Presence } from "@/types/lead";

const PRESENCE_COLOR: Record<Presence, "warning" | "danger" | "accent" | "default"> = {
  sem_site: "warning",
  so_rede_social: "accent",
  site_fraco: "danger",
  com_site: "default",
};

interface LeadCardProps {
  business: Business;
  isSaved: boolean;
  onMessage: () => void;
  onPrompt: () => void;
  onToggleSave: () => void;
  analysis?: AnalysisEntry;
  onAnalyze?: () => void;
  /** Link da página do lead (deixa o nome clicável). */
  href?: string;
  /** Etiquetas extras ao lado de "Sem site" / nota (ex.: próximo contato). */
  badges?: React.ReactNode;
  /** Conteúdo extra no rodapé do card (ex.: status do pipeline na tela de leads). */
  footer?: React.ReactNode;
}

export function LeadCard({
  business: b,
  isSaved,
  onMessage,
  onPrompt,
  onToggleSave,
  analysis,
  onAnalyze,
  href,
  badges,
  footer,
}: LeadCardProps) {
  return (
    <Card className="gap-4">
      <Card.Header className="flex-row items-start justify-between gap-4">
        <div className="min-w-0">
          <Card.Title className="truncate text-base">
            {href ? (
              <Link href={href} className="hover:text-accent hover:underline">
                {b.name}
              </Link>
            ) : (
              b.name
            )}
          </Card.Title>
          {b.category && <Card.Description>{b.category}</Card.Description>}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-3xl leading-none font-semibold text-accent tabular-nums">
            {b.score}
          </div>
          <div className="mt-1 text-[10px] tracking-wider text-muted uppercase">Oportunidade</div>
        </div>
      </Card.Header>

      <Card.Content className="gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Chip size="sm" variant="soft" color={PRESENCE_COLOR[b.presence]}>
            {PRESENCE_LABEL[b.presence]}
          </Chip>
          {b.rating !== null && (
            <Chip size="sm" variant="tertiary">
              <Star className="size-3" />
              {b.rating.toFixed(1)} · {b.reviewCount}
            </Chip>
          )}
          {badges}
        </div>

        <div className="space-y-1.5 text-sm text-muted">
          {b.address && (
            <p className="flex gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              <span>{b.address}</span>
            </p>
          )}
          {b.phone && (
            <p className="flex items-center gap-2">
              {b.isMobile ? <Smartphone className="size-4" /> : <Phone className="size-4" />}
              <span>{b.phone}</span>
              <span className="text-xs">({b.isMobile ? "celular" : "fixo"})</span>
            </p>
          )}
          {b.website && (
            <p className="flex items-center gap-2">
              <ExternalLink className="size-4 shrink-0" />
              <a
                href={b.website}
                target="_blank"
                rel="noreferrer"
                className="truncate underline-offset-2 hover:text-foreground hover:underline"
              >
                {b.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
              </a>
            </p>
          )}
        </div>

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

        {onAnalyze && canAnalyze(b) && <SiteAnalysisPanel entry={analysis} onAnalyze={onAnalyze} />}
      </Card.Content>

      <Card.Footer className="flex-wrap gap-2">
        <Button size="sm" onPress={onMessage}>
          <MessageCircle className="size-4" />
          Mensagem
        </Button>
        <Button size="sm" variant="tertiary" onPress={onPrompt}>
          <Sparkles className="size-4" />
          Prompt do site
        </Button>
        <Button size="sm" variant="ghost" onPress={onToggleSave}>
          {isSaved ? (
            <BookmarkCheck className="size-4 text-accent" />
          ) : (
            <Bookmark className="size-4" />
          )}
          {isSaved ? "Salvo" : "Salvar"}
        </Button>
        {b.mapsUrl && (
          <a
            href={b.mapsUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ size: "sm", variant: "ghost" })}
          >
            <MapPin className="size-4" />
            Maps
          </a>
        )}
        {footer}
      </Card.Footer>
    </Card>
  );
}
