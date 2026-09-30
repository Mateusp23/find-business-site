import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { Municipio, SearchParams, SearchResponse, SiteAnalysis } from "@/types/lead";

export interface Health {
  googlePlaces: boolean;
  pagespeed: boolean;
  openai: boolean;
}

/** Todas as chamadas às rotas internas do Next (/api/*) passam por aqui. */
export const findBusinessApi = createApi({
  reducerPath: "findBusinessApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  // Resultados de busca ficam em cache por 1h: voltar à tela não gasta outra chamada ao Google.
  keepUnusedDataFor: 3600,
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
  }),
});

export const {
  useGetMunicipiosQuery,
  useSearchBusinessesQuery,
  useGetHealthQuery,
  useLazyAnalyzeSiteQuery,
} = findBusinessApi;
