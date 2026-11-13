/** Tipos e textos dos planos, usados no navegador e no servidor (sem segredos aqui). */

export type PlanId = "gratis" | "pro" | "agencia";
export const PAID_PLAN_IDS = ["pro", "agencia"] as const;
export type PaidPlanId = (typeof PAID_PLAN_IDS)[number];
export const isPaidPlan = (id: string): id is PaidPlanId =>
  (PAID_PLAN_IDS as readonly string[]).includes(id);

/** Linha da tabela public.plans (migração 0004). Limites null = ilimitado. */
export type Plan = {
  id: PlanId;
  name: string;
  description: string;
  price_cents: number;
  search_credits: number | null;
  analyses: number | null;
  saved_leads: number | null;
  features: string[];
  sort: number;
};

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export type BillingOverview = {
  mode: "supabase";
  /** Pagamentos configurados no servidor (Stripe + chave secreta do Supabase). */
  billingEnabled: boolean;
  /** Plano que vale agora (assinatura vencida ou cancelada volta para o Grátis). */
  plan: Plan;
  plans: Plan[];
  subscription: {
    plan_id: PlanId;
    status: SubscriptionStatus;
    provider: "none" | "stripe" | "manual";
    has_customer: boolean;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  } | null;
  usage: { searches: number; analyses: number; saved_leads: number };
  period: { start: string; resets_at: string };
};

export type BillingResponse = BillingOverview | { mode: "local" };

/** 1 crédito = 1 página de 20 resultados do Google. */
export const RESULTS_PER_CREDIT = 20;
export const creditsForLimit = (limit: number) =>
  Math.max(1, Math.ceil(limit / RESULTS_PER_CREDIT));

export const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  active: "Ativa",
  trialing: "Em teste",
  past_due: "Pagamento pendente",
  canceled: "Cancelada",
  incomplete: "Aguardando pagamento",
  incomplete_expired: "Expirada",
  unpaid: "Não paga",
  paused: "Pausada",
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const formatPrice = (cents: number) => brl.format(cents / 100).replace(/,00$/, "");

export const formatLimit = (value: number | null) =>
  value === null ? "Ilimitado" : value.toLocaleString("pt-BR");

/** Erro de limite do plano (busca, análise ou leads salvos). */
export class PlanLimitError extends Error {
  readonly code = "PLAN_LIMIT";
  constructor(message: string) {
    super(message);
    this.name = "PlanLimitError";
  }
}

export const isPlanLimitError = (err: unknown): err is PlanLimitError =>
  err instanceof PlanLimitError ||
  (typeof err === "object" && err !== null && (err as { code?: unknown }).code === "PLAN_LIMIT");
