import type { Presence } from "@/types/lead";

/** Domínios que indicam que o "site" é na verdade uma rede social ou link de bio. */
const SOCIAL_DOMAINS = [
  "instagram.com",
  "facebook.com",
  "fb.com",
  "fb.me",
  "m.facebook.com",
  "tiktok.com",
  "linkedin.com",
  "youtube.com",
  "twitter.com",
  "x.com",
  "wa.me",
  "whatsapp.com",
  "api.whatsapp.com",
  "linktr.ee",
  "linktree.com",
  "beacons.ai",
  "bio.link",
  "linkin.bio",
  "taplink.cc",
  "campsite.bio",
  "lnk.bio",
  "ifood.com.br",
];

/** Construtores gratuitos / subdomínios genéricos: sinal de site amador. */
const WEAK_BUILDER_DOMAINS = [
  "sites.google.com",
  "business.site",
  "negocio.site",
  "wixsite.com",
  "webnode.page",
  "webnode.com.br",
  "blogspot.com",
  "wordpress.com",
  "godaddysites.com",
  "ueniweb.com",
  "carrd.co",
  "my.canva.site",
  "canva.site",
  "site123.me",
  "weebly.com",
  "jimdosite.com",
  "yolasite.com",
  "strikingly.com",
  "negocio.site",
  "vercel.app",
  "netlify.app",
  "github.io",
];

function hostMatches(host: string, domain: string) {
  return host === domain || host.endsWith(`.${domain}`);
}

export function classifyWebsite(website: string | null): {
  presence: Presence;
  detail: string | null;
} {
  if (!website) {
    return { presence: "sem_site", detail: "Nenhum site cadastrado no Google Maps" };
  }

  let url: URL;
  try {
    url = new URL(website.startsWith("http") ? website : `https://${website}`);
  } catch {
    return { presence: "site_fraco", detail: "Link de site inválido no Google" };
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  const social = SOCIAL_DOMAINS.find((d) => hostMatches(host, d));
  if (social) {
    return { presence: "so_rede_social", detail: `Link do Google aponta para ${social}` };
  }

  const builder = WEAK_BUILDER_DOMAINS.find((d) => hostMatches(host, d));
  if (builder) {
    return { presence: "site_fraco", detail: `Site em construtor gratuito (${builder})` };
  }

  if (url.protocol === "http:") {
    return { presence: "site_fraco", detail: "Site sem HTTPS (aparece como “não seguro”)" };
  }

  return { presence: "com_site", detail: host };
}

/**
 * Detecta celular brasileiro (provável WhatsApp) e devolve o número em formato
 * internacional só com dígitos, pronto para `wa.me`.
 */
export function parseBrazilianPhone(
  national: string | null,
  international: string | null,
): { e164: string | null; isMobile: boolean } {
  const raw = (international ?? national ?? "").replace(/\D/g, "");
  if (!raw) return { e164: null, isMobile: false };

  const withCountry = raw.startsWith("55") && raw.length >= 12 ? raw : `55${raw.replace(/^0/, "")}`;
  // 55 + DDD(2) + número(8 ou 9)
  const local = withCountry.slice(4);
  const isMobile = local.length === 9 && local.startsWith("9");
  return { e164: withCountry, isMobile };
}

const PRESENCE_BASE: Record<Presence, number> = {
  sem_site: 50,
  so_rede_social: 45,
  site_fraco: 35,
  com_site: 5,
};

export const PRESENCE_LABEL: Record<Presence, string> = {
  sem_site: "Sem site",
  so_rede_social: "Só rede social",
  site_fraco: "Site fraco",
  com_site: "Tem site",
};

/**
 * Pontuação de oportunidade (0–100): quanto maior, mais a empresa precisa do
 * serviço E mais chance de fechar (tem movimento, reputação e contato fácil).
 */
export function scoreBusiness(input: {
  presence: Presence;
  presenceDetail: string | null;
  rating: number | null;
  reviewCount: number;
  hasPhone: boolean;
  isMobile: boolean;
  /** Nota do site (0–100) vinda da análise do PageSpeed, quando existir. */
  siteQuality?: number | null;
}): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = PRESENCE_BASE[input.presence];
  // Site analisado: quanto pior a nota, maior a oportunidade (25 a 50 pontos de base).
  if (input.presence === "site_fraco" && typeof input.siteQuality === "number") {
    score = 25 + Math.round((100 - input.siteQuality) * 0.25);
  }

  if (input.presence !== "com_site" && input.presenceDetail) {
    reasons.push(input.presenceDetail);
  }

  if (input.reviewCount > 0) {
    // 1 avaliação ≈ 3 pts, 10 ≈ 10 pts, 100+ ≈ 20 pts
    score += Math.min(20, Math.round(Math.log10(input.reviewCount + 1) * 10));
    if (input.reviewCount >= 20) {
      reasons.push(`${input.reviewCount} avaliações: já tem movimento`);
    }
  }

  if (input.rating !== null) {
    if (input.rating >= 4.5) {
      score += 10;
      reasons.push(`Nota ${input.rating.toFixed(1)}: reputação boa para mostrar no site`);
    } else if (input.rating >= 4) score += 7;
    else if (input.rating >= 3.5) score += 4;
  }

  if (input.hasPhone) {
    score += 10;
    if (input.isMobile) {
      score += 5;
      reasons.push("Celular no Google: provável WhatsApp");
    } else {
      reasons.push("Telefone fixo: pode não ter WhatsApp");
    }
  } else {
    reasons.push("Sem telefone no Google");
  }

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

/** Remove acentos e caixa para comparar nomes de cidade. */
export function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
