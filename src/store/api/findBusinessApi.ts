import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BillingResponse, PaidPlanId } from "@/lib/billing/plans";
import type { Municipio, SearchParams, SearchResponse, SiteAnalysis } from "@/types/lead";

export interface Health {
  googlePlaces: boolean;
  pagespeed: boolean;
  openai: boolean;
  /** Stripe + webhook + chave secreta do Supabase. */
  billing: boolean;
}

/** Todas as chamadas às rotas internas do Next (/api/*) passam por aqui. */
export const findBusinessApi = createApi({
  reducerPath: "findBusinessApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  // Resultados de busca ficam em cache por 1h: voltar à tela não gasta outra chamada ao Google.
  keepUnusedDataFor: 3600,
  tagTypes: ["Billing"],
  endpoints: (build) => ({
    getMunicipios: build.query<Municipio[], string>({
      query: (uf) => `ibge/municipios/${uf}`,
      keepUnusedDataFor: 86400,
    }),
    searchBusinesses: build.query<SearchResponse, SearchParams>({
      query: (params) => ({ url: "places/search", method: "POST", body: params }),
    }),
    /** PageSpeed Insights (versão celular). Leva de 10 a 40 s por site. */
    analyzeSite: build.query<SiteAnalysis, string>({
      query: (url) => ({ url: "site-analysis", params: { url } }),
      keepUnusedDataFor: 86400,
    }),
    getHealth: build.query<Health, void>({
      query: () => "health",
    }),
    /** Plano atual, uso do mês e planos disponíveis. */
    getBilling: build.query<BillingResponse, void>({
      query: () => "billing",
      providesTags: ["Billing"],
      keepUnusedDataFor: 300,
    }),
    /** Devolve a URL do checkout do Stripe. */
    startCheckout: build.mutation<{ url: string }, PaidPlanId>({
      query: (planId) => ({ url: "billing/checkout", method: "POST", body: { planId } }),
    }),
    /** Devolve a URL do portal do Stripe (cartão, faturas, troca de plano, cancelamento). */
    openBillingPortal: build.mutation<{ url: string }, void>({
      query: () => ({ url: "billing/portal", method: "POST", body: {} }),
    }),
    /** Atualiza a assinatura na volta do checkout/portal (sem esperar o webhook). */
    syncBilling: build.mutation<{ synced: boolean; status?: string }, { sessionId?: string }>({
      query: (body) => ({ url: "billing/sync", method: "POST", body }),
      invalidatesTags: ["Billing"],
    }),
  }),
});

export const {
  useGetMunicipiosQuery,
  useSearchBusinessesQuery,
  useGetHealthQuery,
  useGetBillingQuery,
  useStartCheckoutMutation,
  useOpenBillingPortalMutation,
  useSyncBillingMutation,
  useLazyAnalyzeSiteQuery,
} = findBusinessApi;
