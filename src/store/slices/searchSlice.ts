import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Presence, SearchParams } from "@/types/lead";

export type PresenceFilter = "todos" | Exclude<Presence, "com_site">;

interface SearchState {
  /** Últimos valores do formulário (o formulário em si é do React Hook Form). */
  form: SearchParams;
  /** Parâmetros da última busca enviada: é o que o RTK Query usa como chave de cache. */
  submitted: SearchParams | null;
  filter: PresenceFilter;
  /** Esconde empresas que já têm site bom (com_site). */
  hideWithSite: boolean;
}

const initialState: SearchState = {
  form: { uf: "", city: "", niche: "", limit: 20 },
  submitted: null,
  filter: "todos",
  hideWithSite: true,
};

const searchSlice = createSlice({
  name: "search",
  initialState,
  reducers: {
    submitSearch(state, action: PayloadAction<SearchParams>) {
      state.form = action.payload;
      state.submitted = action.payload;
      state.filter = "todos";
    },
    setFilter(state, action: PayloadAction<PresenceFilter>) {
      state.filter = action.payload;
    },
    setHideWithSite(state, action: PayloadAction<boolean>) {
      state.hideWithSite = action.payload;
    },
  },
});

export const { submitSearch, setFilter, setHideWithSite } = searchSlice.actions;
export default searchSlice.reducer;
