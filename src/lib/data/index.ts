import type { DataAdapter } from "./types";

/** Adaptador ativo (local ou Supabase), trocado no login/logout pelo Providers. */
let active: DataAdapter | null = null;

export const setDataAdapter = (adapter: DataAdapter | null) => {
  active = adapter;
};
export const getDataAdapter = () => active;
