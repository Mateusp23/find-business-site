import { createListenerMiddleware, isRejectedWithValue } from "@reduxjs/toolkit";
import { notify } from "@/lib/notify";
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
};

feedback.startListening({
  predicate: (action) =>
    isRejectedWithValue(action) &&
    (action.meta as { arg?: { endpointName?: string } }).arg?.endpointName !== undefined,
  effect: (action) => {
    const endpoint = (action.meta as { arg: { endpointName: string } }).arg.endpointName;
    const title = endpoint in API_ERROR_TITLES ? API_ERROR_TITLES[endpoint] : "Algo deu errado";
    if (title) notify.error(title, (action as { payload?: unknown }).payload);
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
    notify.error("Não foi possível analisar o site", payload ?? error.message);
  },
});
