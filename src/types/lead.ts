/** Situação digital da empresa, derivada do campo `websiteUri` do Google. */
export type Presence = "sem_site" | "so_rede_social" | "site_fraco" | "com_site";

/** Empresa retornada pela busca, já normalizada e classificada. */
export interface Business {
  placeId: string;
  name: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  /** Telefone em formato internacional só com dígitos (ex.: 5551999998888). */
  phoneE164: string | null;
  isMobile: boolean;
  website: string | null;
  rating: number | null;
  reviewCount: number;
  mapsUrl: string | null;
  presence: Presence;
  /** Motivo técnico da classificação (ex.: "Link aponta para instagram.com"). */
  presenceDetail: string | null;
  score: number;
  reasons: string[];
}

export interface SearchParams {
  uf: string;
  city: string;
  niche: string;
  /** Máximo de empresas a buscar (20, 40 ou 60 — limite da API do Google). */
  limit: number;
}

export interface SearchResponse {
  query: string;
  businesses: Business[];
  /** Quantas chamadas pagas ao Google esta busca consumiu. */
  apiCalls: number;
  /** Resultados descartados por estarem fora da cidade ou fechados. */
  discarded: number;
  /** true quando não há chave do Google e os dados são fictícios. */
  demo?: boolean;
}

export type LeadStatus =
  | "novo"
  | "contatado"
  | "respondeu"
  | "proposta"
  | "fechado"
  | "perdido";

export interface SavedLead {
  business: Business;
  niche: string;
  city: string;
  uf: string;
  status: LeadStatus;
  notes: string;
  savedAt: string;
  lastContactAt: string | null;
  /** Próximo contato combinado (data "AAAA-MM-DD", sem hora). */
  nextFollowUpOn: string | null;
}

export type LeadActivityType =
  | "saved"
  | "message_sent"
  | "status_changed"
  | "note"
  | "follow_up_set"
  | "analysis";

/** Uma linha do histórico de um lead. `data` varia por tipo (veja LeadActivityData). */
export interface LeadActivity {
  id: string;
  placeId: string;
  type: LeadActivityType;
  data: LeadActivityData;
  createdAt: string;
}

export interface LeadActivityData {
  /** message_sent */
  templateId?: string;
  templateLabel?: string;
  channel?: "whatsapp";
  /** status_changed */
  from?: LeadStatus;
  to?: LeadStatus;
  /** note */
  text?: string;
  /** follow_up_set (null = removido) */
  on?: string | null;
  auto?: boolean;
  /** analysis */
  quality?: number;
  isWeak?: boolean;
}

export interface Municipio {
  id: number;
  nome: string;
}

/** Resultado da análise do site (PageSpeed Insights / Lighthouse, versão celular). */
export interface SiteAnalysis {
  url: string;
  finalUrl: string;
  analyzedAt: string;
  /** Notas 0–100 do Lighthouse. */
  scores: {
    performance: number | null;
    seo: number | null;
    accessibility: number | null;
    bestPractices: number | null;
  };
  /** Tempo até o conteúdo principal aparecer no celular, em segundos. */
  lcpSeconds: number | null;
  checks: {
    https: boolean | null;
    mobileFriendly: boolean | null;
    hasMetaDescription: boolean | null;
    hasTitle: boolean | null;
  };
  /** Nota geral 0–100 que o Find Business calcula a partir das notas acima. */
  quality: number;
  isWeak: boolean;
  /** Problemas encontrados, do mais grave para o menos grave. */
  issues: SiteIssue[];
}

export interface SiteIssue {
  /** Texto curto para o card: "Lento no celular (7,2 s)". */
  label: string;
  /** Trecho para encaixar depois de "o site de vocês": "demora 7,2 segundos para abrir no celular". */
  pitch: string;
}
