"use client";

import { useId, useState } from "react";
import { Button, Calendar, Popover } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { I18nProvider } from "react-aria-components";
import { CalendarDays } from "lucide-react";
import { dateLabel } from "@/lib/sales";

/** Calendário do filtro: mantém datas civis ISO, sem conversão de fuso horário. */
export function DateFilterField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min: string;
  max: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-w-40 flex-1 space-y-1.5 sm:max-w-48">
      <p id={`${id}-label`} className="text-sm">{label}</p>
      <I18nProvider locale="pt-BR">
        <Popover isOpen={open} onOpenChange={setOpen}>
          <Button
            variant="secondary"
            fullWidth
            aria-labelledby={`${id}-label ${id}-value`}
            className="h-10 justify-between rounded-field border border-separator bg-field font-normal text-field-foreground"
          >
            <span id={`${id}-value`}>{dateLabel(value)}</span>
            <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-muted" />
          </Button>
          <Popover.Content placement="bottom start">
            <Popover.Dialog aria-label={`Selecionar data: ${label}`} className="p-2">
              <Calendar
                aria-label={label === "De" ? "Data inicial" : "Data final"}
                value={parseDate(value)}
                minValue={parseDate(min)}
                maxValue={parseDate(max)}
                onChange={(date) => {
                  if (!date) return;
                  onChange(date.toString());
                  setOpen(false);
                }}
              >
                <Calendar.Header>
                  <Calendar.Heading />
                  <Calendar.NavButton slot="previous" aria-label="Mês anterior" />
                  <Calendar.NavButton slot="next" aria-label="Próximo mês" />
                </Calendar.Header>
                <Calendar.Grid>
                  <Calendar.GridHeader>
                    {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                  </Calendar.GridHeader>
                  <Calendar.GridBody>
                    {(date) => <Calendar.Cell date={date} />}
                  </Calendar.GridBody>
                </Calendar.Grid>
              </Calendar>
            </Popover.Dialog>
          </Popover.Content>
        </Popover>
      </I18nProvider>
    </div>
  );
}
