import type {
  Business,
  LeadActivityData,
  LeadActivityType,
  LeadStatus,
  SiteAnalysis,
} from "@/types/lead";

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
          next_follow_up_on: string | null;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["leads"]["Row"], "updated_at">;
        Update: Partial<Database["public"]["Tables"]["leads"]["Row"]>;
        Relationships: [];
      };
      lead_activities: {
        Row: {
          id: string;
          user_id: string;
          place_id: string;
          type: LeadActivityType;
          data: LeadActivityData;
          created_at: string;
        };
        Insert: Database["public"]["Tables"]["lead_activities"]["Row"];
        Update: Partial<Database["public"]["Tables"]["lead_activities"]["Row"]>;
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
    Functions: {
      check_rate_limit: {
        Args: { p_bucket: string; p_limit: number; p_window_seconds: number };
        Returns: { allowed: boolean; remaining: number; reset_at: string };
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type ThemePreference = "system" | "light" | "dark";
