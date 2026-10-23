import type { BillingOverview, Plan, PlanId, SubscriptionStatus } from "@/lib/billing/plans";
import type {
  Business,
  LeadActivityData,
  LeadActivityType,
  LeadStatus,
  SiteAnalysis,
} from "@/types/lead";

/** Tipos das tabelas (espelham supabase/migrations). */
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
      plans: {
        Row: Plan & { is_public: boolean; created_at: string };
        Insert: Partial<Plan>;
        Update: Partial<Plan>;
        Relationships: [];
      };
      subscriptions: {
        Row: {
          user_id: string;
          plan_id: PlanId;
          status: SubscriptionStatus;
          provider: "none" | "stripe" | "manual";
          customer_id: string | null;
          subscription_id: string | null;
          price_id: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["subscriptions"]["Row"]> & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Row"]>;
        Relationships: [];
      };
      usage: {
        Row: { user_id: string; period: string; searches: number; analyses: number };
        Insert: { user_id: string; period: string };
        Update: { searches?: number; analyses?: number };
        Relationships: [];
      };
      billing_events: {
        Row: { id: string; type: string; received_at: string };
        Insert: { id: string; type: string };
        Update: { type?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      check_rate_limit: {
        Args: { p_bucket: string; p_limit: number; p_window_seconds: number };
        Returns: { allowed: boolean; remaining: number; reset_at: string };
      };
      consume_quota: {
        Args: { p_kind: QuotaKind; p_amount?: number };
        Returns: {
          allowed: boolean;
          used: number;
          limit: number | null;
          plan: PlanId;
          plan_name: string;
          resets_at: string;
        };
      };
      refund_quota: {
        Args: { p_user: string; p_kind: QuotaKind; p_amount: number };
        Returns: undefined;
      };
      billing_overview: {
        Args: Record<string, never>;
        Returns: Omit<BillingOverview, "mode" | "billingEnabled" | "plans">;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type ThemePreference = "system" | "light" | "dark";

export type QuotaKind = "search" | "analysis";
