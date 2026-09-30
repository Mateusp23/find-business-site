import "server-only";

import type { Business, SearchParams, SearchResponse } from "@/types/lead";
import { classifyWebsite, scoreBusiness } from "./classify";

/**
 * Modo demonstração: usado enquanto não há GOOGLE_PLACES_API_KEY.
 * Empresas FICTÍCIAS, sem telefone real (o WhatsApp abre sem destinatário).
 * Os sites apontam para páginas públicas de teste, então a análise de site funciona de verdade.
 */
const SURNAMES = [
  "Almeida",
  "Brasil",
  "Central",
  "Costa",
  "Rocha",
  "Moura",
  "Nogueira",
  "Prado",
  "Ribeiro",
  "Souza",
  "Teixeira",
  "Vieira",
];

const SAMPLES: {
  website: string | null;
  rating: number | null;
  reviews: number;
  mobile: boolean;
}[] = [
  { website: null, rating: 4.8, reviews: 62, mobile: true },
  { website: null, rating: 4.6, reviews: 23, mobile: true },
  { website: "https://www.instagram.com/", rating: 5, reviews: 9, mobile: true },
  { website: null, rating: 3.9, reviews: 4, mobile: false },
  { website: "http://example.com/", rating: 4.4, reviews: 31, mobile: false },
  { website: "https://sites.google.com/view/exemplo", rating: 4.1, reviews: 12, mobile: true },
  { website: "https://example.org/", rating: 4.7, reviews: 88, mobile: false },
  { website: "https://linktr.ee/", rating: null, reviews: 0, mobile: true },
  { website: "https://nextjs.org/", rating: 4.9, reviews: 140, mobile: false },
  { website: null, rating: 4.2, reviews: 17, mobile: false },
];

export function demoSearch(params: SearchParams): SearchResponse {
  const businesses: Business[] = SAMPLES.map((s, i) => {
    const { presence, detail } = classifyWebsite(s.website);
    const { score, reasons } = scoreBusiness({
      presence,
      presenceDetail: detail,
      rating: s.rating,
      reviewCount: s.reviews,
      hasPhone: true,
      isMobile: s.mobile,
    });
    return {
      placeId: `demo-${i}`,
      name: `${params.niche} ${SURNAMES[i % SURNAMES.length]} (exemplo)`,
      category: params.niche,
      address: `Rua Exemplo, ${100 + i * 37} - ${params.city} - ${params.uf}`,
      phone: s.mobile ? "(00) 90000-0000" : "(00) 3000-0000",
      phoneE164: null,
      isMobile: s.mobile,
      website: s.website,
      rating: s.rating,
      reviewCount: s.reviews,
      mapsUrl: null,
      presence,
      presenceDetail: detail,
      score,
      reasons,
    };
  }).sort((a, b) => b.score - a.score);

  return {
    query: `${params.niche} em ${params.city} - ${params.uf}`,
    businesses,
    apiCalls: 0,
    discarded: 0,
    demo: true,
  };
}
