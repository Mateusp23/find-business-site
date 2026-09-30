"use client";

import { Button, Card, TextArea } from "@heroui/react";
import { RotateCcw } from "lucide-react";
import { DEFAULT_TEMPLATES, TEMPLATE_VARIABLES } from "@/lib/templates";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { resetTemplate, updateTemplate } from "@/store/slices/settingsSlice";

export default function MensagensPage() {
  const dispatch = useAppDispatch();
  const templates = useAppSelector((s) => s.settings.templates);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Modelos de mensagem</h1>
        <p className="text-muted">
          Edite os textos usados no botão “Mensagem”. As alterações são salvas automaticamente.
        </p>
      </header>

      <Card variant="secondary">
        <Card.Content className="gap-2">
          <p className="text-sm font-medium">Variáveis disponíveis</p>
          <ul className="grid gap-1 text-sm text-muted sm:grid-cols-2">
            {TEMPLATE_VARIABLES.map((v) => (
              <li key={v.key}>
                <code className="rounded bg-default px-1.5 py-0.5 text-xs text-foreground">
                  {`{${v.key}}`}
                </code>{" "}
                {v.hint}
              </li>
            ))}
          </ul>
        </Card.Content>
      </Card>

      {templates.map((t) => {
        const isDefault = DEFAULT_TEMPLATES.find((d) => d.id === t.id)?.body === t.body;
        return (
          <Card key={t.id}>
            <Card.Header className="flex-row items-center justify-between">
              <Card.Title>{t.label}</Card.Title>
              {!isDefault && (
                <Button size="sm" variant="ghost" onPress={() => dispatch(resetTemplate(t.id))}>
                  <RotateCcw className="size-3.5" />
                  Restaurar original
                </Button>
              )}
            </Card.Header>
            <Card.Content>
              <TextArea
                aria-label={`Modelo ${t.label}`}
                rows={8}
                fullWidth
                value={t.body}
                onChange={(e) => dispatch(updateTemplate({ id: t.id, body: e.target.value }))}
              />
            </Card.Content>
          </Card>
        );
      })}
    </div>
  );
}
