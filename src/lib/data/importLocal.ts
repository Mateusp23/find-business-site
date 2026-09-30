import { localAdapter } from "./local";
import type { DataAdapter, UserData } from "./types";
import { templateOverrides } from "@/store/slices/settingsSlice";
import type { SessionUser } from "@/lib/supabase/session";
import type { SiteAnalysis } from "@/types/lead";

const FLAG = "fb:imported:v1";

/**
 * No primeiro login neste navegador, leva para a conta o que foi salvo antes
 * no modo local (leads, análises, nome e modelos editados). Roda uma única vez
 * por navegador, para não misturar dados se outra pessoa entrar depois.
 */
export async function importLocalData(
  remote: DataAdapter,
  remoteData: UserData,
  user: SessionUser,
): Promise<{ leads: number; analyses: number; total: number }> {
  let flag: string | null = null;
  try {
    flag = window.localStorage.getItem(FLAG);
  } catch {
    return { leads: 0, analyses: 0, total: 0 };
  }
  if (flag) return { leads: 0, analyses: 0, total: 0 };

  const local = await localAdapter.load();

  const leads = Object.values(local.leads.byId).filter(
    (l) => !remoteData.leads.byId[l.business.placeId],
  );
  const analyses = Object.entries(local.analysis.byId)
    .filter(([id, e]) => e.status === "done" && !remoteData.analysis.byId[id])
    .map(([id, e]) => [id, (e as { data: SiteAnalysis }).data] as [string, SiteAnalysis]);

  await remote.saveLeads(leads);
  await remote.saveAnalyses(analyses);
  // Histórico dos leads importados (depois dos leads, por causa da chave estrangeira).
  for (const l of leads) {
    const history = await localAdapter.listActivities(l.business.placeId);
    for (const a of [...history].reverse()) await remote.addActivity(a);
  }

  const localTemplates = templateOverrides(local.settings.templates ?? []);
  const remoteTemplates = templateOverrides(remoteData.settings.templates ?? []);
  const needsName = !remoteData.settings.userName && Boolean(local.settings.userName);
  if ((localTemplates.length > 0 && remoteTemplates.length === 0) || needsName) {
    await remote.saveSettings({
      userName: remoteData.settings.userName || local.settings.userName || user.name,
      serviceId: remoteData.settings.serviceId ?? local.settings.serviceId ?? "site",
      theme: remoteData.settings.theme ?? local.settings.theme ?? "dark",
      templates: remoteTemplates.length
        ? remoteData.settings.templates!
        : local.settings.templates!,
    });
  }

  try {
    window.localStorage.setItem(FLAG, user.id);
  } catch {
    /* ignora */
  }
  return { leads: leads.length, analyses: analyses.length, total: leads.length + analyses.length };
}
