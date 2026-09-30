import { loadFromStorage, saveToStorage, STORAGE_KEYS } from "@/store/persistence";
import type { LeadsState } from "@/store/slices/leadsSlice";
import { MAX_STORED_ANALYSES, type AnalysisState } from "@/store/slices/analysisSlice";
import { mergeTemplates, type SettingsState } from "@/store/slices/settingsSlice";
import type { LeadActivity, SiteAnalysis } from "@/types/lead";
import type { DataAdapter } from "./types";

const readLeads = () => loadFromStorage<LeadsState>(STORAGE_KEYS.leads) ?? { byId: {} };

type ActivityStore = Record<string, LeadActivity[]>;
const MAX_ACTIVITIES_PER_LEAD = 200;
const readActivities = () => loadFromStorage<ActivityStore>(STORAGE_KEYS.activities) ?? {};
const readAnalysis = () => loadFromStorage<AnalysisState>(STORAGE_KEYS.analysis) ?? { byId: {} };

function writeAnalysis(state: AnalysisState) {
  const entries = Object.entries(state.byId)
    .filter(([, e]) => e.status === "done")
    .sort(([, a], [, b]) =>
      (b as { data: SiteAnalysis }).data.analyzedAt.localeCompare(
        (a as { data: SiteAnalysis }).data.analyzedAt,
      ),
    )
    .slice(0, MAX_STORED_ANALYSES);
  saveToStorage(STORAGE_KEYS.analysis, { byId: Object.fromEntries(entries) });
}

/** Modo local: tudo no localStorage deste navegador. */
export const localAdapter: DataAdapter = {
  kind: "local",
  async load() {
    const leads = readLeads();
    // Leads salvos antes da página de detalhes não tinham "próximo contato".
    for (const l of Object.values(leads.byId)) l.nextFollowUpOn ??= null;
    const settings = loadFromStorage<Partial<SettingsState>>(STORAGE_KEYS.settings) ?? {};
    return {
      leads,
      analysis: readAnalysis(),
      settings: { ...settings, templates: mergeTemplates(settings.templates) },
    };
  },
  async saveLead(lead) {
    const s = readLeads();
    s.byId[lead.business.placeId] = lead;
    saveToStorage(STORAGE_KEYS.leads, s);
  },
  async saveLeads(leads) {
    const s = readLeads();
    for (const l of leads) s.byId[l.business.placeId] = l;
    saveToStorage(STORAGE_KEYS.leads, s);
  },
  async deleteLead(placeId) {
    const s = readLeads();
    delete s.byId[placeId];
    saveToStorage(STORAGE_KEYS.leads, s);
    const acts = readActivities();
    delete acts[placeId];
    saveToStorage(STORAGE_KEYS.activities, acts);
  },
  async listActivities(placeId) {
    return readActivities()[placeId] ?? [];
  },
  async addActivity(a) {
    const acts = readActivities();
    acts[a.placeId] = [a, ...(acts[a.placeId] ?? [])].slice(0, MAX_ACTIVITIES_PER_LEAD);
    saveToStorage(STORAGE_KEYS.activities, acts);
  },
  async saveAnalysis(id, data) {
    const s = readAnalysis();
    s.byId[id] = { status: "done", data };
    writeAnalysis(s);
  },
  async saveAnalyses(entries) {
    const s = readAnalysis();
    for (const [id, data] of entries) s.byId[id] = { status: "done", data };
    writeAnalysis(s);
  },
  async deleteAnalysis(id) {
    const s = readAnalysis();
    delete s.byId[id];
    writeAnalysis(s);
  },
  async saveSettings(settings) {
    saveToStorage(STORAGE_KEYS.settings, settings);
  },
};
