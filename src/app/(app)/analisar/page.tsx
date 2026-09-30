"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@heroui/react";
import { Gauge } from "lucide-react";
import { SiteAnalysisResult } from "@/components/analysis/SiteAnalysisPanel";
import { FormTextField, SubmitButton } from "@/components/form";
import { siteUrlSchema, type SiteUrlInput, type SiteUrlValues } from "@/lib/validation/schemas";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { runAnalysis } from "@/store/slices/analysisSlice";

/** Id usado no slice de análises para sites digitados à mão (não vêm do Google). */
const manualId = (url: string) => `url:${url.trim().toLowerCase().replace(/\/$/, "")}`;

export default function AnalisarPage() {
  const dispatch = useAppDispatch();
  const [currentId, setCurrentId] = useState<string | null>(null);
  const entry = useAppSelector((s) => (currentId ? s.analysis.byId[currentId] : undefined));
  const isLoading = entry?.status === "loading";

  const { control, handleSubmit } = useForm<SiteUrlInput, unknown, SiteUrlValues>({
    resolver: zodResolver(siteUrlSchema),
    defaultValues: { url: "" },
  });

  const onSubmit = handleSubmit(({ url }) => {
    const id = manualId(url);
    setCurrentId(id);
    dispatch(runAnalysis({ id, url }));
  });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Analisar site</h1>
        <p className="text-muted">
          Teste qualquer endereço com o PageSpeed do Google (versão celular). É a mesma análise
          usada nos cards da busca.
        </p>
      </header>

      <Card>
        <Card.Content>
          <form
            className="flex flex-col gap-4 sm:flex-row sm:items-start"
            onSubmit={onSubmit}
            noValidate
          >
            <FormTextField
              control={control}
              name="url"
              label="Endereço do site"
              type="url"
              inputMode="url"
              placeholder="www.empresa.com.br"
              description="Sem “https://” também funciona."
              className="flex-1"
            />
            <SubmitButton
              isSubmitting={isLoading}
              fullWidth={false}
              className="sm:mt-7"
              icon={<Gauge className="size-4" />}
            >
              {isLoading ? "Analisando..." : "Analisar"}
            </SubmitButton>
          </form>
        </Card.Content>
      </Card>

      {isLoading && (
        <p className="text-center text-sm text-muted">
          O Google está abrindo o site num celular simulado. Leva de 10 a 40 segundos.
        </p>
      )}
      {entry?.status === "done" && (
        <div className="space-y-3">
          <p className="truncate text-sm text-muted">{entry.data.finalUrl}</p>
          <SiteAnalysisResult data={entry.data} />
          {entry.data.issues.length > 0 && (
            <Card variant="secondary">
              <Card.Content className="gap-2 text-sm">
                <p className="font-medium">Como falar disso com o cliente</p>
                <ul className="list-disc space-y-1 pl-5 text-muted">
                  {entry.data.issues.map((i) => (
                    <li key={i.label}>“Vi que o site de vocês {i.pitch}.”</li>
                  ))}
                </ul>
              </Card.Content>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
