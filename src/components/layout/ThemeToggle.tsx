"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Button, Tooltip } from "@heroui/react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useAppDispatch } from "@/store/hooks";
import { setThemePreference } from "@/store/slices/settingsSlice";
import type { ThemePreference } from "@/lib/supabase/types";

const ORDER: ThemePreference[] = ["dark", "light", "system"];
const LABEL: Record<ThemePreference, string> = {
  dark: "Tema escuro",
  light: "Tema claro",
  system: "Tema do sistema",
};
const ICON = { dark: Moon, light: Sun, system: Monitor };

/** true só no navegador (o tema salvo não é conhecido no servidor). */
const useMounted = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

/** Alterna escuro → claro → sistema. Salva no perfil (ou no navegador, no modo local). */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const dispatch = useAppDispatch();
  const mounted = useMounted();
  const current = (mounted ? theme : "dark") as ThemePreference;
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  const Icon = ICON[current] ?? Moon;

  return (
    <Tooltip delay={300}>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label={`${LABEL[current]}. Trocar para ${LABEL[next].toLowerCase()}`}
        onPress={() => {
          setTheme(next);
          dispatch(setThemePreference(next));
        }}
      >
        <Icon className="size-4" />
      </Button>
      <Tooltip.Content>{LABEL[current]}</Tooltip.Content>
    </Tooltip>
  );
}
