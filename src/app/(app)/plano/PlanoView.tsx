"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Chip, Skeleton } from "@heroui/react";
import { Check, CreditCard, ExternalLink, HardDrive, Sparkles } from "lucide-react";
import { UsageMeter } from "@/components/billing/UsageMeter";
import {
  RESULTS_PER_CREDIT,
  SUBSCRIPTION_STATUS_LABEL,
  formatPrice,
  isPaidPlan,
  type BillingOverview,
  type Plan,
} from "@/lib/billing/plans";
import { notify } from "@/lib/notify";
import {
  useGetBillingQuery,
  useOpenBillingPortalMutation,
  useStartCheckoutMutation,
  useSyncBillingMutation,
} from "@/store/api/findBusinessApi";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" });
const shortDate = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(
    new Date(`${iso}T12:00:00Z`),
  );

const ACTIVE = new Set(["active", "trialing", "past_due"]);

export function PlanoView({
  checkout,
  sessionId,
  fromPortal,
}: {
  checkout: string | null;
  sessionId: string | null;
  fromPortal: boolean;
}) {
  const router = useRouter();
  const { data, isLoading, refetch } = useGetBillingQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [sync] = useSyncBillingMutation();
  const [startCheckout] = useStartCheckoutMutation();
  const [openPortal] = useOpenBillingPortalMutation();
  /** Botão que está esperando o Stripe (para mostrar o carregando só nele). */
  const [pending, setPending] = useState<string | null>(null);

  // Volta do checkout / portal do Stripe: atualiza a assinatura na hora e limpa a URL.
  const handledReturn = useRef(false);
  useEffect(() => {
    if (handledReturn.current) return;
    if (!checkout && !fromPortal) return;
    handledReturn.current = true;
    (async () => {
      if (checkout === "cancelado") {
        notify.info("Pagamento cancelado", { description: "Nada foi cobrado." });
      } else if (checkout === "sucesso" && sessionId) {
        const toastId = notify.loading("Confirmando pagamento...");
        try {
          const r = await sync({ sessionId }).unwrap();
          notify.update(toastId, r.synced ? "Assinatura ativada" : "Pagamento em processamento", {
            description: r.synced
              ? "Seu plano já foi atualizado. Bom trabalho!"
              : "Assim que o pagamento for confirmado, o plano muda sozinho.",
            variant: r.synced ? "success" : "default",
            done: true,
          });
        } catch {
          notify.dismiss(toastId); // o erro já aparece no toast padrão
        }
      } else if (fromPortal) {
        await sync({})
          .unwrap()
          .catch(() => undefined);
      }
      refetch();
      router.replace("/plano");
    })();
  }, [checkout, sessionId, fromPortal, sync, refetch, router]);

  const goTo = async (key: string, request: () => Promise<{ url: string }>) => {
    setPending(key);
    try {
      const { url } = await request();
      window.location.assign(url);
    } catch {
      setPending(null); // erro já virou toast em store/feedback.ts
    }
  };
  const subscribe = (plan: Plan) => {
    if (!isPaidPlan(plan.id)) return;
    const id = plan.id;
    goTo(plan.id, () => startCheckout(id).unwrap());
  };
  const manage = () => goTo("portal", () => openPortal().unwrap());

  if (isLoading || !data) {
    return (
      <Shell>
        <Skeleton className="h-64 rounded-3xl" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-80 rounded-3xl" />
          ))}
        </div>
      </Shell>
    );
  }

  if (data.mode === "local") {
    return (
      <Shell>
        <Card>
          <Card.Content className="flex-row items-center gap-3 text-sm text-muted">
            <HardDrive className="size-5 shrink-0" />
            Modo local (sem Supabase): não há login, planos nem limites. Configure o Supabase para
            usar os planos.
          </Card.Content>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      {!data.billingEnabled && (
        <Alert status="warning">
          <Alert.Content>
            <Alert.Title>Pagamentos ainda não ativados</Alert.Title>
            <Alert.Description>
              Os limites dos planos já valem. Para vender assinaturas, configure o Stripe no
              servidor (STRIPE_SECRET_KEY, preços e SUPABASE_SECRET_KEY; veja o README).
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}
      <CurrentPlan data={data} onManage={manage} managing={pending === "portal"} />
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Planos</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {data.plans.map((plan) => (
            <PlanOption
              key={plan.id}
              plan={plan}
              data={data}
              pending={pending}
              onSubscribe={subscribe}
              onManage={manage}
            />
          ))}
        </div>
        <p className="text-xs text-muted">
          Pagamento seguro pelo Stripe. Cancele quando quiser: o plano continua até o fim do período
          pago. 1 crédito de busca = 1 página de {RESULTS_PER_CREDIT} empresas do Google.
        </p>
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Plano</h1>
        <p className="text-muted">Seu plano, o uso do mês e a assinatura.</p>
      </header>
      {children}
    </div>
  );
}

function CurrentPlan({
  data,
  onManage,
  managing,
}: {
  data: BillingOverview;
  onManage: () => void;
  managing: boolean;
}) {
  const { plan, subscription: sub, usage, period } = data;
  const paid = sub?.provider === "stripe" && ACTIVE.has(sub.status);
  const end = sub?.current_period_end ? dateFmt.format(new Date(sub.current_period_end)) : null;

  let renewal = "Plano gratuito, sem cobrança.";
  if (sub?.provider === "manual") renewal = "Plano liberado manualmente.";
  else if (paid && end) {
    renewal = sub.cancel_at_period_end
      ? `Cancelada: o plano ${plan.name} vale até ${end}. Depois volta para o Grátis.`
      : `Renova em ${end}.`;
  }

  return (
    <Card>
      <Card.Header className="flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <Card.Title className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent" />
            Plano {plan.name}
          </Card.Title>
          <Card.Description>{renewal}</Card.Description>
        </div>
        {sub && sub.provider !== "none" && (
          <Chip
            size="sm"
            variant="soft"
            color={
              sub.status === "past_due" || sub.cancel_at_period_end
                ? "warning"
                : ACTIVE.has(sub.status)
                  ? "success"
                  : "default"
            }
          >
            {sub.cancel_at_period_end && ACTIVE.has(sub.status)
              ? "Cancelamento agendado"
              : SUBSCRIPTION_STATUS_LABEL[sub.status]}
          </Chip>
        )}
      </Card.Header>
      <Card.Content className="gap-4">
        {sub?.status === "past_due" && (
          <Alert status="warning">
            <Alert.Content>
              <Alert.Title>Pagamento pendente</Alert.Title>
              <Alert.Description>
                A última cobrança não passou. Atualize o cartão em “Gerenciar assinatura” para não
                voltar ao plano Grátis.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <UsageMeter
            label="Créditos de busca"
            used={usage.searches}
            limit={plan.search_credits}
            hint={`Renova em ${shortDate(period.resets_at)}`}
          />
          <UsageMeter
            label="Análises de site"
            used={usage.analyses}
            limit={plan.analyses}
            hint={`Renova em ${shortDate(period.resets_at)}`}
          />
          <UsageMeter
            label="Leads salvos"
            used={usage.saved_leads}
            limit={plan.saved_leads}
            hint="Total, não renova"
          />
        </div>
        {sub?.has_customer && sub.provider !== "manual" && data.billingEnabled && (
          <Button variant="tertiary" className="self-start" onPress={onManage} isPending={managing}>
            <CreditCard className="size-4" />
            Gerenciar assinatura
            <ExternalLink className="size-3.5 text-muted" />
          </Button>
        )}
      </Card.Content>
    </Card>
  );
}

function PlanOption({
  plan,
  data,
  pending,
  onSubscribe,
  onManage,
}: {
  plan: Plan;
  data: BillingOverview;
  pending: string | null;
  onSubscribe: (plan: Plan) => void;
  onManage: () => void;
}) {
  const sub = data.subscription;
  const isCurrent = data.plan.id === plan.id;
  const hasPaid = sub?.provider === "stripe" && ACTIVE.has(sub.status);
  const isManual = sub?.provider === "manual";
  const highlight = plan.id === "pro";

  let action: React.ReactNode;
  if (isCurrent) {
    action = (
      <Button variant="tertiary" fullWidth isDisabled>
        Seu plano atual
      </Button>
    );
  } else if (isManual || (plan.id === "gratis" && sub?.cancel_at_period_end)) {
    // Cancelamento já agendado: volta ao Grátis sozinho no fim do período.
    action = null;
  } else if (hasPaid) {
    // Trocar de plano ou voltar ao Grátis (cancelar) é no portal do Stripe.
    action = (
      <Button
        variant={plan.id === "gratis" ? "ghost" : "secondary"}
        fullWidth
        onPress={onManage}
        isPending={pending === "portal"}
        isDisabled={!data.billingEnabled || (pending !== null && pending !== "portal")}
      >
        {plan.id === "gratis" ? "Cancelar assinatura" : `Mudar para ${plan.name}`}
      </Button>
    );
  } else if (isPaidPlan(plan.id)) {
    action = (
      <Button
        variant={highlight ? "primary" : "secondary"}
        fullWidth
        onPress={() => onSubscribe(plan)}
        isPending={pending === plan.id}
        isDisabled={!data.billingEnabled || (pending !== null && pending !== plan.id)}
      >
        Assinar {plan.name}
      </Button>
    );
  }

  return (
    <Card className={highlight ? "ring-2 ring-accent" : undefined}>
      <Card.Header className="gap-2">
        <div className="flex items-center justify-between gap-2">
          <Card.Title>{plan.name}</Card.Title>
          {highlight && (
            <Chip size="sm" variant="soft" color="accent">
              Mais escolhido
            </Chip>
          )}
        </div>
        <p className="text-3xl font-bold tracking-tight">
          {formatPrice(plan.price_cents)}
          {plan.price_cents > 0 && <span className="text-sm font-normal text-muted"> /mês</span>}
        </p>
        <Card.Description>{plan.description}</Card.Description>
      </Card.Header>
      <Card.Content className="flex-1">
        <ul className="space-y-2 text-sm">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </Card.Content>
      {action && <Card.Footer>{action}</Card.Footer>}
    </Card>
  );
}
