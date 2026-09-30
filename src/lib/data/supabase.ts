import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { mergeTemplates, templateOverrides } from "@/store/slices/settingsSlice";
import type { SavedLead } from "@/types/lead";
import type { DataAdapter } from "./types";

type LeadRow = Database["public"]["Tables"]["leads"]["Insert"];

const toRow = (userId: string, l: SavedLead): LeadRow => ({
  user_id: userId,
  place_id: l.business.placeId,
  business: l.business,
  niche: l.niche,
  city: l.city,
  uf: l.uf,
  status: l.status,
  notes: l.notes,
  saved_at: l.savedAt,
  last_contact_at: l.lastContactAt,
});

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

/** Dados no Supabase, protegidos por RLS (cada usuário só vê os próprios). */
export function supabaseAdapter(supabase: SupabaseClient<Database>, userId: string): DataAdapter {
  return {
    kind: "supabase",
    async load() {
      const [profile, leads, analyses] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("leads").select("*").order("saved_at", { ascending: false }),
        supabase
          .from("site_analyses")
          .select("*")
          .order("analyzed_at", { ascending: false })
          .limit(500),
      ]);
      check(profile.error);
      check(leads.error);
      check(analyses.error);

      const p = profile.data;
      return {
        leads: {
          byId: Object.fromEntries(
            (leads.data ?? []).map((r) => [
              r.place_id,
              {
                business: r.business,
                niche: r.niche,
                city: r.city,
                uf: r.uf,
                status: r.status,
                notes: r.notes,
                savedAt: r.saved_at,
                lastContactAt: r.last_contact_at,
              } satisfies SavedLead,
            ]),
          ),
        },
        analysis: {
          byId: Object.fromEntries(
            (analyses.data ?? []).map((r) => [r.analysis_id, { status: "done" as const, data: r.data }]),
          ),
        },
        settings: p
          ? {
              userName: p.full_name,
              serviceId: p.service_id,
              theme: p.theme,
              templates: mergeTemplates(p.templates),
            }
          : {},
      };
    },
    async saveLead(lead) {
      check((await supabase.from("leads").upsert(toRow(userId, lead))).error);
    },
    async saveLeads(leads) {
      if (leads.length === 0) return;
      check((await supabase.from("leads").upsert(leads.map((l) => toRow(userId, l)))).error);
    },
    async deleteLead(placeId) {
      check((await supabase.from("leads").delete().eq("place_id", placeId)).error);
    },
    async saveAnalysis(id, data) {
      check(
        (
          await supabase
            .from("site_analyses")
            .upsert({ user_id: userId, analysis_id: id, data, analyzed_at: data.analyzedAt })
        ).error,
      );
    },
    async saveAnalyses(entries) {
      if (entries.length === 0) return;
      const rows = entries.map(([id, data]) => ({
        user_id: userId,
        analysis_id: id,
        data,
        analyzed_at: data.analyzedAt,
      }));
      check((await supabase.from("site_analyses").upsert(rows)).error);
    },
    async deleteAnalysis(id) {
      check((await supabase.from("site_analyses").delete().eq("analysis_id", id)).error);
    },
    async saveSettings(settings) {
      check(
        (
          await supabase
            .from("profiles")
            .update({
              full_name: settings.userName,
              service_id: settings.serviceId,
              theme: settings.theme,
              templates: templateOverrides(settings.templates),
            })
            .eq("id", userId)
        ).error,
      );
    },
  };
}
