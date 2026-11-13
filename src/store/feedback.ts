import { createListenerMiddleware, isAnyOf, isRejectedWithValue } from "@reduxjs/toolkit";
import { errorMessage, notify } from "@/lib/notify";
import { findBusinessApi } from "./api/findBusinessApi";
import { runAnalysis } from "./slices/analysisSlice";

/**
 * Toasts automáticos para respostas de API e ações de dados.
 * Os componentes não precisam tratar erro de API um a um: tudo que falha aparece aqui.
 */
export const feedback = createListenerMiddleware();

/** Título do toast de erro por endpoint do RTK Query. null = não avisar. */
/** Endpoint sem título aqui usa "Algo deu errado" (nenhum erro passa sem aviso). */
const API_ERROR_TITLES: Record<string, string | null> = {
  searchBusinesses: "Não foi possível buscar empresas",
  getMunicipios: "Não foi possível carregar as cidades",
  analyzeSite: null, // tratado em runAnalysis (tem o nome do site e o modo em lote)
  getHealth: "Não foi possível verificar as integrações",
  getBilling: "Não foi possível carregar o seu plano",
  startCheckout: "Não foi possível abrir o pagamento",
  openBillingPortal: "Não foi possível abrir o portal de assinatura",
  syncBilling: "Não foi possível atualizar a assinatura",
};

/** Limite do plano: aviso (não é erro) com atalho para a tela de planos. */
export function notifyPlanLimit(title: string, description: string) {
  notify.warning(title, {
    description,
    // Fora de componente (middleware do Redux): sem useRouter aqui.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    action: { label: "Ver planos", onPress: () => window.location.assign("/plano") },
  });
}

const PLAN_LIMIT_TITLES: Record<string, string> = {
  searchBusinesses: "Créditos de busca do mês esgotados",
  analyzeSite: "Análises do mês esgotadas",
};

feedback.startListening({
  predicate: (action) =>
    isRejectedWithValue(action) &&
    (action.meta as { arg?: { endpointName?: string } }).arg?.endpointName !== undefined,
  effect: (action) => {
    // Sessão caiu ou falta o código do 2FA: leva para a tela certa em vez de só avisar.
    const code = (action as { payload?: { data?: { code?: string } } }).payload?.data?.code ?? "";
    if (code === "UNAUTHORIZED" || code === "MFA_REQUIRED") {
      const next = encodeURIComponent(window.location.pathname);
      window.location.assign(
        code === "MFA_REQUIRED" ? `/verificar-2fa?next=${next}` : `/login?next=${next}`,
      );
      return;
    }
    const endpoint = (action.meta as { arg: { endpointName: string } }).arg.endpointName;
    if (code === "PLAN_LIMIT") {
      // Análise avisa em runAnalysis.rejected (tem o modo em lote).
      if (endpoint !== "analyzeSite") {
        notifyPlanLimit(
          PLAN_LIMIT_TITLES[endpoint] ?? "Limite do plano atingido",
          errorMessage((action as { payload?: unknown }).payload),
        );
      }
      return;
    }
    const title = endpoint in API_ERROR_TITLES ? API_ERROR_TITLES[endpoint] : "Algo deu errado";
    if (title) notify.error(title, (action as { payload?: unknown }).payload);
  },
});

/** Busca e análise gastam créditos: o resumo do plano é recarregado. */
feedback.startListening({
  matcher: isAnyOf(
    findBusinessApi.endpoints.searchBusinesses.matchFulfilled,
    findBusinessApi.endpoints.analyzeSite.matchFulfilled,
  ),
  effect: (_action, api) => {
    api.dispatch(findBusinessApi.util.invalidateTags(["Billing"]));
  },
});

/** Sucesso das chamadas do RTK Query iniciadas pela pessoa. */
feedback.startListening({
  matcher: findBusinessApi.endpoints.searchBusinesses.matchFulfilled,
  effect: ({ payload }) => {
    const total = payload.businesses.length;
    const opportunities = payload.businesses.filter((b) => b.presence !== "com_site").length;
    if (payload.demo) {
      notify.info(`Modo demonstração: ${total} empresas de exemplo`, {
        description: "Configure a GOOGLE_PLACES_API_KEY para buscar empresas reais.",
      });
    } else if (total === 0) {
      notify.warning("Nenhuma empresa encontrada", {
        description: "Tente outro tipo de empresa ou uma cidade vizinha.",
      });
    } else {
      const calls = `${payload.apiCalls} ${payload.apiCalls === 1 ? "chamada" : "chamadas"} ao Google`;
      notify.success(`${total} empresas encontradas`, {
        description: `${opportunities} ${opportunities === 1 ? "oportunidade" : "oportunidades"} · ${calls}`,
      });
    }
  },
});

feedback.startListening({
  actionCreator: runAnalysis.fulfilled,
  effect: ({ payload, meta }) => {
    if (meta.arg.silent) return;
    const host = payload.finalUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
    if (payload.isWeak) {
      notify.warning(`Site fraco: nota ${payload.quality}/100`, {
        description: payload.issues[0] ? `${host}: ${payload.issues[0].label}` : host,
      });
    } else {
      notify.success(`Site em bom estado: nota ${payload.quality}/100`, {
        description: host,
      });
    }
  },
});

feedback.startListening({
  actionCreator: runAnalysis.rejected,
  effect: ({ payload, error, meta }) => {
    if (meta.arg.silent) return;
    if (payload?.code === "PLAN_LIMIT") {
      notifyPlanLimit("Análises do mês esgotadas", payload.message);
      return;
    }
    notify.error("Não foi possível analisar o site", payload?.message ?? error.message);
  },
});
