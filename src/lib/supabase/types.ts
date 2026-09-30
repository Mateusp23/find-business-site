import type { Business, LeadStatus, SiteAnalysis } from "@/types/lead";

/** Tipos das tabelas (espelham supabase/migrations/0001_init.sql). */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          avatar_url: string | null;
          service_id: string;
          theme: ThemePreference;
          templates: { id: string; body: string }[];
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      leads: {
        Row: {
          user_id: string;
          place_id: string;
          business: Business;
          niche: string;
          city: string;
          uf: string;
          status: LeadStatus;
          notes: string;
          saved_at: string;
          last_contact_at: string | null;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["leads"]["Row"], "updated_at">;
        Update: Partial<Database["public"]["Tables"]["leads"]["Row"]>;
        Relationships: [];
      };
      site_analyses: {
        Row: { user_id: string; analysis_id: string; data: SiteAnalysis; analyzed_at: string };
        Insert: Database["public"]["Tables"]["site_analyses"]["Row"];
        Update: Partial<Database["public"]["Tables"]["site_analyses"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type ThemePreference = "system" | "light" | "dark";
