import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { getDataAdapter } from "@/lib/data";
import { errorMessage } from "@/lib/notify";
import type { LeadActivity, LeadActivityData, LeadActivityType } from "@/types/lead";
import { signedOut } from "./sessionSlice";

interface LeadHistory {
  status: "idle" | "loading" | "ready" | "error";
  items: LeadActivity[];
}

export interface ActivitiesState {
  /** Histórico carregado sob demanda (só quando a página do lead abre). */
  byPlaceId: Record<string, LeadHistory>;
}

const initialState: ActivitiesState = { byPlaceId: {} };

/** Cria uma atividade com id gerado no navegador (a interface mostra na hora). */
export function newActivity(
  placeId: string,
  type: LeadActivityType,
  data: LeadActivityData = {},
): LeadActivity {
  return { id: crypto.randomUUID(), placeId, type, data, createdAt: new Date().toISOString() };
}

export const loadActivities = createAsyncThunk<LeadActivity[], string, { rejectValue: string }>(
  "activities/load",
  async (placeId, { rejectWithValue }) => {
    const adapter = getDataAdapter();
    if (!adapter) return [];
    try {
      return await adapter.listActivities(placeId);
    } catch (err) {
      return rejectWithValue(errorMessage(err));
    }
  },
);

const byNewest = (a: LeadActivity, b: LeadActivity) => b.createdAt.localeCompare(a.createdAt);

const activitiesSlice = createSlice({
  name: "activities",
  initialState,
  reducers: {
    /** Nova linha no histórico (o middleware de persistência grava no banco). */
    activityAdded(state, action: PayloadAction<LeadActivity>) {
      const a = action.payload;
      const h = (state.byPlaceId[a.placeId] ??= { status: "idle", items: [] });
      h.items = [a, ...h.items.filter((x) => x.id !== a.id)].sort(byNewest);
    },
    /** Some da tela se o banco recusou a gravação. */
    activityRemoved(state, action: PayloadAction<{ placeId: string; id: string }>) {
      const h = state.byPlaceId[action.payload.placeId];
      if (h) h.items = h.items.filter((x) => x.id !== action.payload.id);
    },
  },
  extraReducers: (b) => {
    b.addCase(loadActivities.pending, (state, { meta }) => {
      const h = (state.byPlaceId[meta.arg] ??= { status: "idle", items: [] });
      h.status = "loading";
    })
      .addCase(loadActivities.fulfilled, (state, { meta, payload }) => {
        const h = (state.byPlaceId[meta.arg] ??= { status: "idle", items: [] });
        // Junta com o que foi criado enquanto carregava (sem duplicar).
        const ids = new Set(payload.map((x) => x.id));
        h.items = [...payload, ...h.items.filter((x) => !ids.has(x.id))].sort(byNewest);
        h.status = "ready";
      })
      .addCase(loadActivities.rejected, (state, { meta }) => {
        const h = (state.byPlaceId[meta.arg] ??= { status: "idle", items: [] });
        h.status = "error";
      })
      .addCase(signedOut, () => initialState);
  },
});

export const { activityAdded, activityRemoved } = activitiesSlice.actions;
export default activitiesSlice.reducer;
