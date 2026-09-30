import { createAction, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { SessionUser } from "@/lib/supabase/session";

export interface SessionState {
  /** "local": sem Supabase configurado (sem login, dados no navegador). */
  mode: "local" | "supabase";
  user: SessionUser | null;
  /** Carregamento dos dados do usuário (leads, análises, perfil). */
  dataStatus: "idle" | "loading" | "ready" | "error";
}

/** Limpa leads, análises e ajustes da memória (tratado no reducer raiz). */
export const signedOut = createAction("session/signedOut");

const initialState: SessionState = { mode: "local", user: null, dataStatus: "idle" };

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<SessionUser | null>) {
      state.user = action.payload;
    },
    setDataStatus(state, action: PayloadAction<SessionState["dataStatus"]>) {
      state.dataStatus = action.payload;
    },
  },
  extraReducers: (b) => {
    b.addCase(signedOut, (state) => {
      state.user = null;
      state.dataStatus = "idle";
    });
  },
});

export const { setUser, setDataStatus } = sessionSlice.actions;
export default sessionSlice.reducer;
