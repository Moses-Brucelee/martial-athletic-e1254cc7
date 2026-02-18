export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      billing_customers: {
        Row: {
          billing_provider: string
          created_at: string
          id: string
          provider_customer_id: string
          stripe_customer_id: string
          user_id: string
        }
        Insert: {
          billing_provider: string
          created_at?: string
          id?: string
          provider_customer_id: string
          stripe_customer_id: string
          user_id: string
        }
        Update: {
          billing_provider?: string
          created_at?: string
          id?: string
          provider_customer_id?: string
          stripe_customer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_customers_billing_provider_fkey"
            columns: ["billing_provider"]
            isOneToOne: false
            referencedRelation: "billing_providers"
            referencedColumns: ["key"]
          },
        ]
      }
      billing_provider_rules: {
        Row: {
          billing_provider: string
          country_codes: string[] | null
          created_at: string
          currency_codes: string[] | null
          id: string
          is_active: boolean
          priority: number
          risk_level: string | null
        }
        Insert: {
          billing_provider: string
          country_codes?: string[] | null
          created_at?: string
          currency_codes?: string[] | null
          id?: string
          is_active?: boolean
          priority: number
          risk_level?: string | null
        }
        Update: {
          billing_provider?: string
          country_codes?: string[] | null
          created_at?: string
          currency_codes?: string[] | null
          id?: string
          is_active?: boolean
          priority?: number
          risk_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_provider_rules_billing_provider_fkey"
            columns: ["billing_provider"]
            isOneToOne: false
            referencedRelation: "billing_providers"
            referencedColumns: ["key"]
          },
        ]
      }
      billing_providers: {
        Row: {
          created_at: string
          is_active: boolean
          is_default: boolean
          key: string
          priority_weight: number
          supports_once_off: boolean
          supports_payouts: boolean
          supports_recurring_webhooks: boolean
          supports_refunds: boolean
          supports_split_payments: boolean
          supports_subscriptions: boolean
          transaction_fee_fixed: number | null
          transaction_fee_percent: number | null
        }
        Insert: {
          created_at?: string
          is_active?: boolean
          is_default?: boolean
          key: string
          priority_weight?: number
          supports_once_off?: boolean
          supports_payouts?: boolean
          supports_recurring_webhooks?: boolean
          supports_refunds?: boolean
          supports_split_payments?: boolean
          supports_subscriptions?: boolean
          transaction_fee_fixed?: number | null
          transaction_fee_percent?: number | null
        }
        Update: {
          created_at?: string
          is_active?: boolean
          is_default?: boolean
          key?: string
          priority_weight?: number
          supports_once_off?: boolean
          supports_payouts?: boolean
          supports_recurring_webhooks?: boolean
          supports_refunds?: boolean
          supports_split_payments?: boolean
          supports_subscriptions?: boolean
          transaction_fee_fixed?: number | null
          transaction_fee_percent?: number | null
        }
        Relationships: []
      }
      billing_regions: {
        Row: {
          code: string
          created_at: string
          fallback_providers: string[]
          primary_provider: string
        }
        Insert: {
          code: string
          created_at?: string
          fallback_providers?: string[]
          primary_provider: string
        }
        Update: {
          code?: string
          created_at?: string
          fallback_providers?: string[]
          primary_provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_regions_primary_provider_fkey"
            columns: ["primary_provider"]
            isOneToOne: false
            referencedRelation: "billing_providers"
            referencedColumns: ["key"]
          },
        ]
      }
      billing_routing_log: {
        Row: {
          country: string | null
          created_at: string
          fallback_used: boolean
          id: string
          idempotency_key: string | null
          region_code: string | null
          required_capability: string | null
          routing_reason: string
          selected_provider: string
          user_id: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          fallback_used?: boolean
          id?: string
          idempotency_key?: string | null
          region_code?: string | null
          required_capability?: string | null
          routing_reason: string
          selected_provider: string
          user_id?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          fallback_used?: boolean
          id?: string
          idempotency_key?: string | null
          region_code?: string | null
          required_capability?: string | null
          routing_reason?: string
          selected_provider?: string
          user_id?: string | null
        }
        Relationships: []
      }
      competition_teams: {
        Row: {
          competition_id: string
          created_at: string
          division: string | null
          id: string
          team_name: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          division?: string | null
          id?: string
          team_name: string
        }
        Update: {
          competition_id?: string
          created_at?: string
          division?: string | null
          id?: string
          team_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_workouts: {
        Row: {
          competition_id: string
          created_at: string
          id: string
          measurement_type: string
          name: string | null
          workout_number: number
        }
        Insert: {
          competition_id: string
          created_at?: string
          id?: string
          measurement_type?: string
          name?: string | null
          workout_number: number
        }
        Update: {
          competition_id?: string
          created_at?: string
          id?: string
          measurement_type?: string
          name?: string | null
          workout_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "competition_workouts_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          created_at: string
          created_by: string
          date: string | null
          divisions: string | null
          host_gym: string | null
          id: string
          name: string
          status: string
          type: string | null
          updated_at: string
          venue: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          date?: string | null
          divisions?: string | null
          host_gym?: string | null
          id?: string
          name: string
          status?: string
          type?: string | null
          updated_at?: string
          venue?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          date?: string | null
          divisions?: string | null
          host_gym?: string | null
          id?: string
          name?: string
          status?: string
          type?: string | null
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      country_region_map: {
        Row: {
          country_code: string
          region_code: string
        }
        Insert: {
          country_code: string
          region_code: string
        }
        Update: {
          country_code?: string
          region_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "country_region_map_region_code_fkey"
            columns: ["region_code"]
            isOneToOne: false
            referencedRelation: "billing_regions"
            referencedColumns: ["code"]
          },
        ]
      }
      pricing_features: {
        Row: {
          created_at: string
          id: string
          included: boolean
          label: string
          sort_order: number
          tier_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          included?: boolean
          label: string
          sort_order?: number
          tier_id: string
        }
        Update: {
          created_at?: string
          id?: string
          included?: boolean
          label?: string
          sort_order?: number
          tier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_features_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_tiers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_popular: boolean
          is_public: boolean
          key: string
          name: string
          period: string
          price: string
          price_monthly_cents: number | null
          price_yearly_cents: number | null
          sort_order: number
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_popular?: boolean
          is_public?: boolean
          key: string
          name: string
          period?: string
          price?: string
          price_monthly_cents?: number | null
          price_yearly_cents?: number | null
          sort_order?: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_popular?: boolean
          is_public?: boolean
          key?: string
          name?: string
          period?: string
          price?: string
          price_monthly_cents?: number | null
          price_yearly_cents?: number | null
          sort_order?: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          about_me: string | null
          affiliation: string | null
          age: number | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          full_name: string | null
          gender: string | null
          id: string
          profile_completed: boolean
          subscription_tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          about_me?: string | null
          affiliation?: string | null
          age?: number | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          profile_completed?: boolean
          subscription_tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          about_me?: string | null
          affiliation?: string | null
          age?: number | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          profile_completed?: boolean
          subscription_tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_health_status: {
        Row: {
          billing_provider: string
          last_checked_at: string
          status: string
          ttl_seconds: number
        }
        Insert: {
          billing_provider: string
          last_checked_at?: string
          status?: string
          ttl_seconds?: number
        }
        Update: {
          billing_provider?: string
          last_checked_at?: string
          status?: string
          ttl_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "provider_health_status_billing_provider_fkey"
            columns: ["billing_provider"]
            isOneToOne: true
            referencedRelation: "billing_providers"
            referencedColumns: ["key"]
          },
        ]
      }
      region_supported_currencies: {
        Row: {
          currency_code: string
          is_default: boolean
          region_code: string
        }
        Insert: {
          currency_code: string
          is_default?: boolean
          region_code: string
        }
        Update: {
          currency_code?: string
          is_default?: boolean
          region_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "region_supported_currencies_region_code_fkey"
            columns: ["region_code"]
            isOneToOne: false
            referencedRelation: "billing_regions"
            referencedColumns: ["code"]
          },
        ]
      }
      subscription_events: {
        Row: {
          billing_provider: string
          created_at: string
          event_type: string
          id: string
          idempotency_key: string | null
          payload: Json
          processed_at: string | null
          processing_error: string | null
          provider_event_id: string
          stripe_api_version: string | null
        }
        Insert: {
          billing_provider: string
          created_at?: string
          event_type: string
          id?: string
          idempotency_key?: string | null
          payload: Json
          processed_at?: string | null
          processing_error?: string | null
          provider_event_id: string
          stripe_api_version?: string | null
        }
        Update: {
          billing_provider?: string
          created_at?: string
          event_type?: string
          id?: string
          idempotency_key?: string | null
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          provider_event_id?: string
          stripe_api_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_billing_provider_fkey"
            columns: ["billing_provider"]
            isOneToOne: false
            referencedRelation: "billing_providers"
            referencedColumns: ["key"]
          },
        ]
      }
      tier_prices: {
        Row: {
          billing_interval: string
          billing_provider: string
          created_at: string
          currency_code: string
          id: string
          is_active: boolean
          provider_price_id: string
          tier_id: string
        }
        Insert: {
          billing_interval: string
          billing_provider: string
          created_at?: string
          currency_code?: string
          id?: string
          is_active?: boolean
          provider_price_id: string
          tier_id: string
        }
        Update: {
          billing_interval?: string
          billing_provider?: string
          created_at?: string
          currency_code?: string
          id?: string
          is_active?: boolean
          provider_price_id?: string
          tier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tier_prices_billing_provider_fkey"
            columns: ["billing_provider"]
            isOneToOne: false
            referencedRelation: "billing_providers"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "tier_prices_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          billing_interval: string
          billing_provider: string
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          provider_subscription_id: string
          routing_rule_id: string | null
          schema_version: number
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          tier_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_interval?: string
          billing_provider: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          provider_subscription_id: string
          routing_rule_id?: string | null
          schema_version?: number
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          tier_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_interval?: string
          billing_provider?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          provider_subscription_id?: string
          routing_rule_id?: string | null
          schema_version?: number
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          tier_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_billing_provider_fkey"
            columns: ["billing_provider"]
            isOneToOne: false
            referencedRelation: "billing_providers"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "user_subscriptions_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
