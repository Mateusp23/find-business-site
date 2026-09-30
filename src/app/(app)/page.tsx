"use client";

import { skipToken } from "@reduxjs/toolkit/query";
import { SearchForm } from "@/components/search/SearchForm";
import { Results } from "@/components/search/Results";
import { useSearchBusinessesQuery } from "@/store/api/findBusinessApi";
import { useAppSelector } from "@/store/hooks";
import { apiErrorMessage } from "@/lib/errors";

export default function SearchPage() {
  const submitted = useAppSelector((s) => s.search.submitted);
  const { data, isFetching, error } = useSearchBusinessesQuery(submitted ?? skipToken);

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="space-y-4 text-center">
        <span className="inline-block rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
          Prospecção no Google Maps
        </span>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Encontre empresas <span className="text-accent">sem site</span>
        </h1>
        <p className="mx-auto max-w-xl text-muted">
          Escolha a cidade e o nicho. Buscamos os negócios reais do Google Maps e ranqueamos por
          quem mais precisa do seu serviço.
        </p>
      </header>

      <SearchForm isSearching={isFetching} />

      {submitted && (
        <Results
          params={submitted}
          data={data}
          isLoading={isFetching}
          error={error ? apiErrorMessage(error) : null}
        />
      )}
    </div>
  );
}
