import type { LeadsState } from "@/store/slices/leadsSlice";
import type { AnalysisState } from "@/store/slices/analysisSlice";
import type { SettingsState } from "@/store/slices/settingsSlice";
import type { LeadActivity, SavedLead, SiteAnalysis } from "@/types/lead";

export interface UserData {
  leads: LeadsState;
  analysis: AnalysisState;
  settings: Partial<SettingsState>;
}

/**
 * Onde os dados do usuário moram. Os componentes só falam com o Redux;
 * o middleware de persistência chama o adaptador ativo.
 */
export interface DataAdapter {
  kind: "local" | "supabase";
  load(): Promise<UserData>;
  saveLead(lead: SavedLead): Promise<void>;
  saveLeads(leads: SavedLead[]): Promise<void>;
  deleteLead(placeId: string): Promise<void>;
  saveAnalysis(id: string, data: SiteAnalysis): Promise<void>;
  saveAnalyses(entries: [string, SiteAnalysis][]): Promise<void>;
  deleteAnalysis(id: string): Promise<void>;
  saveSettings(settings: SettingsState): Promise<void>;
  /** Histórico de um lead, do mais recente para o mais antigo. */
  listActivities(placeId: string): Promise<LeadActivity[]>;
  addActivity(activity: LeadActivity): Promise<void>;
}
