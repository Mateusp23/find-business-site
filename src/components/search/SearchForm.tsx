"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@heroui/react";
import { Search } from "lucide-react";
import { FormComboBox, FormSelect, SubmitButton } from "@/components/form";
import { ESTADOS, LIMIT_OPTIONS, NICHES, SERVICES } from "@/lib/catalog";
import { searchSchema, type SearchValues } from "@/lib/validation/schemas";
import { useGetMunicipiosQuery } from "@/store/api/findBusinessApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { submitSearch } from "@/store/slices/searchSlice";
import { setServiceId } from "@/store/slices/settingsSlice";

const NICHE_OPTIONS = NICHES.map((n) => ({ id: n, label: n }));
const SERVICE_OPTIONS = SERVICES.map((s) => ({ id: s.id, label: s.label }));
const LIMIT_SELECT = LIMIT_OPTIONS.map((n) => ({
  id: String(n),
  label: `Até ${n} empresas (${n / 20} ${n === 20 ? "chamada" : "chamadas"})`,
}));

export function SearchForm({ isSearching }: { isSearching: boolean }) {
  const dispatch = useAppDispatch();
  const last = useAppSelector((s) => s.search.form);
  const serviceId = useAppSelector((s) => s.settings.serviceId);

  const { control, handleSubmit, setValue } = useForm<SearchValues>({
    resolver: zodResolver(searchSchema),
    // Volta com a última busca preenchida ao navegar entre as telas.
    defaultValues: { ...last, serviceId },
  });
  const uf = useWatch({ control, name: "uf" });

  const { data: municipios = [], isFetching: loadingCidades } = useGetMunicipiosQuery(uf, {
    skip: !uf,
  });

  const onSubmit = handleSubmit(({ uf, city, niche, limit }) => {
    dispatch(submitSearch({ uf, city, niche, limit }));
  });

  return (
    <Card className="p-5 md:p-7">
      <Card.Content>
        <form className="grid gap-x-5 gap-y-6 md:grid-cols-3" onSubmit={onSubmit} noValidate>
          <FormSelect
            control={control}
            name="uf"
            label="Estado"
            placeholder="Selecione o estado"
            options={ESTADOS}
            onValueChange={() => setValue("city", "")}
          />
          <FormComboBox
            key={uf /* reinicia a busca de texto ao trocar de estado */}
            control={control}
            name="city"
            label="Cidade"
            placeholder={
              !uf ? "Escolha o estado antes" : loadingCidades ? "Carregando..." : "Digite a cidade"
            }
            isDisabled={!uf || loadingCidades}
            options={municipios.map((m) => ({ id: m.nome, label: m.nome }))}
          />
          <FormComboBox
            control={control}
            name="niche"
            label="Tipo de empresa"
            placeholder="Ex.: Contabilidade"
            allowsCustomValue
            options={NICHE_OPTIONS}
          />
          <FormSelect
            control={control}
            name="serviceId"
            label="Seu serviço"
            options={SERVICE_OPTIONS}
            // O serviço é uma preferência: vale na hora para as mensagens, mesmo sem buscar.
            onValueChange={(id) => dispatch(setServiceId(id))}
          />
          <FormSelect control={control} name="limit" label="Quantidade" options={LIMIT_SELECT} />
          <div className="flex items-end">
            <SubmitButton isSubmitting={isSearching} icon={<Search className="size-4" />}>
              {isSearching ? "Buscando..." : "Encontrar oportunidades"}
            </SubmitButton>
          </div>
        </form>
      </Card.Content>
    </Card>
  );
}
