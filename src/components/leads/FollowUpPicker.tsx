"use client";

import { Button, Input, Label, TextField } from "@heroui/react";
import { AUTO_FOLLOW_UP_DAYS, addDaysISO, todayISO } from "@/lib/followUp";

const QUICK = [
  { label: "Hoje", days: 0 },
  { label: "Amanhã", days: 1 },
  { label: `${AUTO_FOLLOW_UP_DAYS} dias`, days: AUTO_FOLLOW_UP_DAYS },
  { label: "1 semana", days: 7 },
  { label: "2 semanas", days: 14 },
];

/** Escolha da data do próximo contato: atalhos + calendário do navegador. */
export function FollowUpPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (on: string | null) => void;
}) {
  const today = todayISO();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {QUICK.map((q) => {
          const on = addDaysISO(today, q.days);
          return (
            <Button
              key={q.label}
              size="sm"
              variant={value === on ? "primary" : "tertiary"}
              onPress={() => onChange(on)}
            >
              {q.label}
            </Button>
          );
        })}
      </div>
      <div className="flex items-end gap-2">
        <TextField
          fullWidth
          className="flex-1"
          value={value ?? ""}
          onChange={(v) => onChange(v || null)}
        >
          <Label>Data</Label>
          <Input type="date" min={today} />
        </TextField>
        {value && (
          <Button variant="ghost" onPress={() => onChange(null)}>
            Remover
          </Button>
        )}
      </div>
    </div>
  );
}
