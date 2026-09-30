import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { DEFAULT_TEMPLATES, type MessageTemplate } from "@/lib/templates";
import { SERVICES } from "@/lib/catalog";
import type { ThemePreference } from "@/lib/supabase/types";

export interface SettingsState {
  /** Nome usado nas mensagens ({nome}). Com login, é o nome do perfil. */
  userName: string;
  serviceId: string;
  theme: ThemePreference;
  templates: MessageTemplate[];
}

export const initialSettings: SettingsState = {
  userName: "",
  serviceId: SERVICES[0].id,
  theme: "dark",
  templates: DEFAULT_TEMPLATES,
};

/** Junta os modelos salvos (só os editados) com os padrões do código. */
export function mergeTemplates(saved: { id: string; body: string }[] | undefined): MessageTemplate[] {
  return DEFAULT_TEMPLATES.map((t) => {
    const s = saved?.find((x) => x.id === t.id);
    return s ? { ...t, body: s.body } : t;
  });
}

/** Só o que foi editado vai para o banco (novos modelos do código aparecem sozinhos). */
export function templateOverrides(templates: MessageTemplate[]) {
  return templates
    .filter((t) => DEFAULT_TEMPLATES.find((d) => d.id === t.id)?.body !== t.body)
    .map(({ id, body }) => ({ id, body }));
}

const settingsSlice = createSlice({
  name: "settings",
  initialState: initialSettings,
  reducers: {
    hydrateSettings(state, action: PayloadAction<Partial<SettingsState>>) {
      return { ...state, ...action.payload };
    },
    setUserName(state, action: PayloadAction<string>) {
      state.userName = action.payload;
    },
    setServiceId(state, action: PayloadAction<string>) {
      state.serviceId = action.payload;
    },
    setThemePreference(state, action: PayloadAction<ThemePreference>) {
      state.theme = action.payload;
    },
    updateTemplate(state, action: PayloadAction<{ id: string; body: string }>) {
      const t = state.templates.find((t) => t.id === action.payload.id);
      if (t) t.body = action.payload.body;
    },
    resetTemplate(state, action: PayloadAction<string>) {
      const original = DEFAULT_TEMPLATES.find((t) => t.id === action.payload);
      const t = state.templates.find((t) => t.id === action.payload);
      if (original && t) t.body = original.body;
    },
  },
});

export const {
  hydrateSettings,
  setUserName,
  setServiceId,
  setThemePreference,
  updateTemplate,
  resetTemplate,
} = settingsSlice.actions;
export default settingsSlice.reducer;
