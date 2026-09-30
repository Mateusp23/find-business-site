import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { findBusinessApi } from "../api/findBusinessApi";
import { apiErrorMessage } from "@/lib/errors";
import type { SiteAnalysis } from "@/types/lead";

export type AnalysisEntry =
  | { status: "loading" }
  | { status: "done"; data: SiteAnalysis }
  | { status: "error"; error: string };

export interface AnalysisState {
  /** Indexado por placeId (ou pela própria URL, na página "Analisar site"). */
  byId: Record<string, AnalysisEntry>;
}

const initialState: AnalysisState = { byId: {} };

/** Mantém só as análises mais recentes no localStorage. */
export const MAX_STORED_ANALYSES = 300;

export const runAnalysis = createAsyncThunk<
  SiteAnalysis,
  /** silent: não mostra toast (usado na análise em lote, que mostra um resumo). */
  { id: string; url: string; silent?: boolean },
  { rejectValue: string }
>("analysis/run", async ({ url }, { dispatch, rejectWithValue }) => {
  const request = dispatch(findBusinessApi.endpoints.analyzeSite.initiate(url));
  try {
    return await request.unwrap();
  } catch (err) {
    return rejectWithValue(apiErrorMessage(err as Parameters<typeof apiErrorMessage>[0]));
  } finally {
    request.unsubscribe();
  }
});

const analysisSlice = createSlice({
  name: "analysis",
  initialState,
  reducers: {
    hydrateAnalysis(_state, action: PayloadAction<AnalysisState>) {
      return action.payload;
    },
    clearAnalysis(state, action: PayloadAction<string>) {
      delete state.byId[action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(runAnalysis.pending, (state, action) => {
        state.byId[action.meta.arg.id] = { status: "loading" };
      })
      .addCase(runAnalysis.fulfilled, (state, action) => {
        state.byId[action.meta.arg.id] = { status: "done", data: action.payload };
      })
      .addCase(runAnalysis.rejected, (state, action) => {
        state.byId[action.meta.arg.id] = {
          status: "error",
          error: action.payload ?? action.error.message ?? "Erro na análise",
        };
      });
  },
});

export const { hydrateAnalysis, clearAnalysis } = analysisSlice.actions;
export default analysisSlice.reducer;

/** Só os resultados concluídos vão para o localStorage (carregando/erro não). */
export function serializableAnalysis(state: AnalysisState): AnalysisState {
  const done = Object.entries(state.byId)
    .filter(([, e]) => e.status === "done")
    .sort(([, a], [, b]) =>
      (b as { data: SiteAnalysis }).data.analyzedAt.localeCompare(
        (a as { data: SiteAnalysis }).data.analyzedAt,
      ),
    )
    .slice(0, MAX_STORED_ANALYSES);
  return { byId: Object.fromEntries(done) };
}
