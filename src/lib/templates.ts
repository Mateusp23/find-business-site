import type { Business, Presence, SiteAnalysis } from "@/types/lead";
import { PRESENCE_LABEL } from "./classify";

export interface MessageTemplate {
  id: string;
  label: string;
  body: string;
}

/**
 * Variáveis disponíveis nos modelos:
 * {empresa} {nome} {servico} {cidade} {nicho} {situacao} {reputacao}
 */
export const TEMPLATE_VARIABLES = [
  { key: "empresa", hint: "Nome da empresa" },
  { key: "nome", hint: "Seu nome (Perfil)" },
  { key: "servico", hint: "Seu serviço, ex.: criação de sites" },
  { key: "cidade", hint: "Cidade da busca" },
  { key: "nicho", hint: "Tipo de empresa buscado" },
  { key: "situacao", hint: "Frase sobre a presença digital (muda por categoria)" },
  { key: "reputacao", hint: "Ex.: nota 4.8 com 60 avaliações" },
  { key: "diagnostico", hint: "Problemas do site encontrados na análise (fase 2)" },
];

export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: "direto",
    label: "Direto e curto",
    body: `Olá! Falo com a {empresa}? 😊

Me chamo {nome}. Encontrei vocês no Google Maps e {situacao}.

Trabalho com {servico} e queria te mostrar rapidinho como ficaria a página de vocês. Posso te mandar um exemplo, sem compromisso?`,
  },
  {
    id: "reputacao",
    label: "Usando a reputação",
    body: `Olá, tudo bem? Aqui é {nome}.

Vi a {empresa} no Google, {reputacao}. Dá pra ver que os clientes gostam do trabalho de vocês!

Só que {situacao}, e quem pesquisa "{nicho} em {cidade}" acaba indo para quem aparece com site.

Trabalho com {servico}. Posso te mostrar uma ideia de como ficaria?`,
  },
  {
    id: "consultivo",
    label: "Consultivo",
    body: `Olá! Aqui é {nome}, trabalho com {servico} na região de {cidade}.

Estava pesquisando {nicho} no Google e encontrei a {empresa}. Uma pergunta rápida: hoje os clientes novos chegam mais por indicação ou pela internet?

Pergunto porque {situacao}, e tenho algumas ideias simples para trazer mais contatos pelo Google. Posso te contar?`,
  },
  {
    id: "previa",
    label: "Com prévia pronta",
    body: `Olá! Aqui é {nome}.

Encontrei a {empresa} no Google Maps e {situacao}. Tomei a liberdade de montar uma prévia de como poderia ficar o site de vocês:

[cole o link da prévia aqui]

Se gostar, eu ajusto com a cara da empresa. Sem compromisso!`,
  },
  {
    id: "diagnostico",
    label: "Diagnóstico do site",
    body: `Olá! Aqui é {nome}, trabalho com {servico}.

Encontrei a {empresa} no Google e fiz uma análise rápida do site: {diagnostico}.

Isso costuma fazer o cliente desistir antes de entrar em contato. Posso te mandar o relatório completo e uma sugestão de como resolver? É sem compromisso.`,
  },
  {
    id: "followup",
    label: "Follow-up",
    body: `Oi! Passando só pra saber se conseguiu ver minha mensagem sobre o site da {empresa}. 🙂

Se não for o momento, sem problema, é só me avisar. Se quiser, te mando a prévia pra dar uma olhada quando puder.`,
  },
];

const SITUACAO: Record<Presence, string> = {
  sem_site: "vi que vocês ainda não têm um site",
  so_rede_social: "vi que o link de vocês no Google leva só para as redes sociais",
  site_fraco: "vi que o site atual poderia estar trazendo muito mais clientes",
  com_site: "dei uma olhada no site de vocês",
};

export interface MessageContext {
  business: Business;
  userName: string;
  servicePitch: string;
  city: string;
  niche: string;
  analysis?: SiteAnalysis;
}

/** "o site de vocês não se adapta à tela do celular e demora 7,2 segundos para abrir" */
export function diagnosisPhrase(analysis: SiteAnalysis | undefined): string {
  const pitches = analysis?.issues.slice(0, 2).map((i) => i.pitch) ?? [];
  if (pitches.length === 0) return "o site de vocês poderia estar trazendo muito mais clientes";
  return `o site de vocês ${pitches.join(" e ")}`;
}

export function fillTemplate(body: string, ctx: MessageContext) {
  const { business: b } = ctx;
  const reputacao =
    b.rating !== null && b.reviewCount > 0
      ? `nota ${b.rating.toFixed(1)} com ${b.reviewCount} ${b.reviewCount === 1 ? "avaliação" : "avaliações"}`
      : "bem posicionada no Maps";

  const values: Record<string, string> = {
    empresa: b.name,
    nome: ctx.userName || "[seu nome]",
    servico: ctx.servicePitch,
    cidade: ctx.city,
    nicho: ctx.niche.toLowerCase(),
    situacao:
      b.presence === "site_fraco" && ctx.analysis?.issues.length
        ? `vi que ${diagnosisPhrase(ctx.analysis)}`
        : SITUACAO[b.presence],
    reputacao,
    diagnostico: diagnosisPhrase(ctx.analysis),
  };

  return body.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

export function whatsappUrl(phoneE164: string | null, text: string) {
  const encoded = encodeURIComponent(text);
  return phoneE164
    ? `https://wa.me/${phoneE164}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}

/** Prompt para colar em Lovable / v0 / Claude e gerar a prévia do site. */
export function buildSitePrompt(ctx: {
  business: Business;
  city: string;
  uf: string;
  niche: string;
  analysis?: SiteAnalysis;
}) {
  const { business: b } = ctx;
  const reputation =
    b.rating !== null ? `nota ${b.rating.toFixed(1)} com ${b.reviewCount} avaliações` : "sem avaliações";
  const whatsapp = b.phoneE164 && b.isMobile ? `https://wa.me/${b.phoneE164}` : null;

  return `Crie um site institucional moderno, rápido e responsivo (mobile first) para a empresa abaixo.

## Empresa
- Nome: ${b.name}
- Segmento: ${b.category ?? ctx.niche}
- Cidade: ${ctx.city} - ${ctx.uf}
- Endereço: ${b.address ?? "não informado"}
- Telefone: ${b.phone ?? "não informado"}${whatsapp ? `\n- WhatsApp: ${whatsapp}` : ""}
- Reputação no Google: ${reputation}
- Presença atual: ${PRESENCE_LABEL[b.presence]}${b.website ? ` (${b.website})` : ""}
- Ficha no Google Maps: ${b.mapsUrl ?? "não disponível"}

${
    ctx.analysis?.issues.length
      ? `## Problemas do site atual (nota ${ctx.analysis.quality}/100 no PageSpeed, celular)\n${ctx.analysis.issues.map((i) => `- ${i.label}`).join("\n")}\nO novo site precisa resolver todos esses pontos.\n\n`
      : ""
  }## Objetivo do site
Transformar quem pesquisa "${ctx.niche.toLowerCase()} em ${ctx.city}" no Google em contato no ${whatsapp ? "WhatsApp" : "telefone"}. O botão de contato deve aparecer no topo, no meio e no fim da página, e fixo no celular.

## Estrutura
1. Hero: título com o benefício principal para o cliente de ${ctx.niche.toLowerCase()}, subtítulo citando ${ctx.city} e botão de contato.
2. Serviços: 4 a 6 cards com os serviços típicos de ${ctx.niche.toLowerCase()}, com ícones.
3. Diferenciais: 3 motivos para escolher a ${b.name}${b.rating && b.rating >= 4 ? `, destacando a nota ${b.rating.toFixed(1)} no Google` : ""}.
4. Depoimentos: 3 depoimentos de exemplo, marcados claramente como "exemplo" para substituir pelos reais.
5. Sobre: parágrafo curto e humano sobre a empresa.
6. Localização: endereço, mapa do Google incorporado e horário de atendimento (placeholder).
7. Rodapé: contatos, redes sociais (placeholder) e CTA final.

## Estilo
- Visual profissional e confiável, adequado ao segmento.
- Paleta de 2 cores + neutros, tipografia legível, bastante espaço em branco.
- Textos em português do Brasil, tom próximo e direto, sem jargão.

## Requisitos técnicos
- Uma única página, HTML semântico, SEO local (title e meta description com "${ctx.niche} em ${ctx.city}"), dados estruturados LocalBusiness (schema.org).
- Imagens com alt text, carregamento rápido, acessível (contraste AA).
- Não invente dados como CNPJ, preços ou prêmios: use placeholders visíveis.`;
}
