import "server-only";

import { ApiError } from "./api/errors";
import type { Business, SearchParams, SearchResponse } from "@/types/lead";
import { demoSearch } from "./demo.server";
import { classifyWebsite, normalize, parseBrazilianPhone, scoreBusiness } from "./classify";

const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const PAGE_SIZE = 20; // máximo por página na Places API (New)
const MAX_RESULTS = 60; // teto da Text Search: 3 páginas de 20

/**
 * Campos pedidos ao Google. `websiteUri`, telefone e avaliações fazem a chamada
 * cair no SKU "Text Search Enterprise" (1.000 chamadas grátis/mês).
 * Não peça campos que não usa: cada campo pode subir o SKU.
 */
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "places.primaryTypeDisplayName",
  "places.businessStatus",
  "nextPageToken",
].join(",");

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  addressComponents?: { longText: string; shortText: string; types: string[] }[];
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  primaryTypeDisplayName?: { text: string };
  businessStatus?: string;
}

interface GoogleResponse {
  places?: GooglePlace[];
  nextPageToken?: string;
  error?: { message: string; status: string };
}

export class PlacesError extends ApiError {
  constructor(message: string, status: number) {
    super(message, status, "PLACES");
  }
}

function toBusiness(p: GooglePlace): Business {
  const { presence, detail } = classifyWebsite(p.websiteUri ?? null);
  const phone = p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null;
  const { e164, isMobile } = parseBrazilianPhone(
    p.nationalPhoneNumber ?? null,
    p.internationalPhoneNumber ?? null,
  );
  const rating = p.rating ?? null;
  const reviewCount = p.userRatingCount ?? 0;
  const { score, reasons } = scoreBusiness({
    presence,
    presenceDetail: detail,
    rating,
    reviewCount,
    hasPhone: Boolean(phone),
    isMobile,
  });

  return {
    placeId: p.id,
    name: p.displayName?.text ?? "Sem nome",
    category: p.primaryTypeDisplayName?.text ?? null,
    address: p.formattedAddress ?? null,
    phone,
    phoneE164: e164,
    isMobile,
    website: p.websiteUri ?? null,
    rating,
    reviewCount,
    mapsUrl: p.googleMapsUri ?? null,
    presence,
    presenceDetail: detail,
    score,
    reasons,
  };
}

/** A Text Search às vezes traz empresas de cidades vizinhas; filtramos pela cidade pedida. */
function isInCity(p: GooglePlace, city: string) {
  const target = normalize(city);
  const locality = p.addressComponents?.find(
    (c) => c.types.includes("administrative_area_level_2") || c.types.includes("locality"),
  );
  if (locality) return normalize(locality.longText) === target;
  return p.formattedAddress ? normalize(p.formattedAddress).includes(target) : true;
}

export async function searchPlaces(params: SearchParams): Promise<SearchResponse> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    // Sem chave (faturamento do Google ainda não ativo): responde com dados de exemplo.
    return demoSearch(params);
  }

  const limit = Math.min(Math.max(params.limit, PAGE_SIZE), MAX_RESULTS);
  const query = `${params.niche} em ${params.city} - ${params.uf}`;

  const collected: GooglePlace[] = [];
  let pageToken: string | undefined;
  let apiCalls = 0;

  do {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: "pt-BR",
        regionCode: "BR",
        pageSize: PAGE_SIZE,
        ...(pageToken ? { pageToken } : {}),
      }),
      cache: "no-store",
    });
    apiCalls++;

    const data = (await res.json()) as GoogleResponse;
    if (!res.ok || data.error) {
      const message = data.error?.message ?? res.statusText;
      if (/billing/i.test(message)) {
        throw new PlacesError(
          "A chave do Google existe, mas o faturamento do projeto não está ativo. Ative o faturamento ou apague GOOGLE_PLACES_API_KEY do .env para usar o modo demonstração.",
          402,
        );
      }
      if (/not been used|disabled|API_KEY_SERVICE_BLOCKED|not authorized/i.test(message)) {
        throw new PlacesError(
          "A chave do Google não tem acesso à Places API (New). Ative essa API no projeto e confira as restrições da chave.",
          403,
        );
      }
      throw new PlacesError(`Google Places: ${message}`, res.status || 502);
    }

    collected.push(...(data.places ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken && collected.length < limit);

  const seen = new Set<string>();
  const kept: Business[] = [];
  for (const p of collected) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    if (p.businessStatus && p.businessStatus !== "OPERATIONAL") continue;
    if (!isInCity(p, params.city)) continue;
    kept.push(toBusiness(p));
  }

  kept.sort((a, b) => b.score - a.score);

  return {
    query,
    businesses: kept.slice(0, limit),
    apiCalls,
    discarded: seen.size - kept.length,
  };
}
