import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Business, LeadStatus, SavedLead } from "@/types/lead";

export interface LeadsState {
  /** Indexado por placeId. */
  byId: Record<string, SavedLead>;
}

const initialState: LeadsState = { byId: {} };

export const LEAD_STATUS: { id: LeadStatus; label: string }[] = [
  { id: "novo", label: "Novo" },
  { id: "contatado", label: "Contatado" },
  { id: "respondeu", label: "Respondeu" },
  { id: "proposta", label: "Proposta enviada" },
  { id: "fechado", label: "Fechado" },
  { id: "perdido", label: "Perdido" },
];

const leadsSlice = createSlice({
  name: "leads",
  initialState,
  reducers: {
    hydrateLeads(_state, action: PayloadAction<LeadsState>) {
      return action.payload;
    },
    saveLead(
      state,
      action: PayloadAction<{ business: Business; niche: string; city: string; uf: string }>,
    ) {
      const { business, niche, city, uf } = action.payload;
      const existing = state.byId[business.placeId];
      state.byId[business.placeId] = existing
        ? { ...existing, business }
        : {
            business,
            niche,
            city,
            uf,
            status: "novo",
            notes: "",
            savedAt: new Date().toISOString(),
            lastContactAt: null,
          };
    },
    /** Volta um lead removido exatamente como estava (botão "Desfazer" do toast). */
    restoreLead(state, action: PayloadAction<SavedLead>) {
      state.byId[action.payload.business.placeId] = action.payload;
    },
    removeLead(state, action: PayloadAction<string>) {
      delete state.byId[action.payload];
    },
    setLeadStatus(state, action: PayloadAction<{ placeId: string; status: LeadStatus }>) {
      const lead = state.byId[action.payload.placeId];
      if (lead) lead.status = action.payload.status;
    },
    setLeadNotes(state, action: PayloadAction<{ placeId: string; notes: string }>) {
      const lead = state.byId[action.payload.placeId];
      if (lead) lead.notes = action.payload.notes;
    },
    /** Chamado ao abrir o WhatsApp: marca o contato e avança "novo" → "contatado". */
    markContacted(state, action: PayloadAction<string>) {
      const lead = state.byId[action.payload];
      if (!lead) return;
      lead.lastContactAt = new Date().toISOString();
      if (lead.status === "novo") lead.status = "contatado";
    },
  },
});

export const { hydrateLeads, saveLead, restoreLead, removeLead, setLeadStatus, setLeadNotes, markContacted } =
  leadsSlice.actions;
export default leadsSlice.reducer;
