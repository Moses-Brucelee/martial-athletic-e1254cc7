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
      ai_poster_generations: {
        Row: {
          competition_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          competition_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      athlete_registrations: {
        Row: {
          athlete_id: string | null
          athlete_name: string
          competition_id: string
          created_at: string
          date_of_birth: string | null
          division_id: string | null
          email: string | null
          gender: string | null
          id: string
          notes: string | null
          payment_status: string
          phone: string | null
          registered_by_user_id: string | null
          registration_type: string
          status: string
          team_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          athlete_id?: string | null
          athlete_name: string
          competition_id: string
          created_at?: string
          date_of_birth?: string | null
          division_id?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          notes?: string | null
          payment_status?: string
          phone?: string | null
          registered_by_user_id?: string | null
          registration_type?: string
          status?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          athlete_id?: string | null
          athlete_name?: string
          competition_id?: string
          created_at?: string
          date_of_birth?: string | null
          division_id?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          notes?: string | null
          payment_status?: string
          phone?: string | null
          registered_by_user_id?: string | null
          registration_type?: string
          status?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_registrations_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_registrations_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_registrations_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "competition_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      athletes: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          date_of_birth: string | null
          email: string | null
          gender: string | null
          id: string
          is_synthetic: boolean
          name: string
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          date_of_birth?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          is_synthetic?: boolean
          name: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          date_of_birth?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          is_synthetic?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
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
      bouts: {
        Row: {
          bout_number: number
          bracket_id: string
          created_at: string
          id: string
          round_number: number
          status: string
          team_a_id: string | null
          team_b_id: string | null
          winner_id: string | null
        }
        Insert: {
          bout_number: number
          bracket_id: string
          created_at?: string
          id?: string
          round_number: number
          status?: string
          team_a_id?: string | null
          team_b_id?: string | null
          winner_id?: string | null
        }
        Update: {
          bout_number?: number
          bracket_id?: string
          created_at?: string
          id?: string
          round_number?: number
          status?: string
          team_a_id?: string | null
          team_b_id?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bouts_bracket_id_fkey"
            columns: ["bracket_id"]
            isOneToOne: false
            referencedRelation: "brackets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bouts_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bouts_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bouts_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      brackets: {
        Row: {
          bracket_type: string
          competition_id: string
          created_at: string
          division_id: string | null
          id: string
          name: string
        }
        Insert: {
          bracket_type?: string
          competition_id: string
          created_at?: string
          division_id?: string | null
          id?: string
          name: string
        }
        Update: {
          bracket_type?: string
          competition_id?: string
          created_at?: string
          division_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "brackets_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brackets_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "competition_divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_audit_events: {
        Row: {
          actor_id: string | null
          competition_id: string
          created_at: string
          device_id: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          ip_address: string | null
          payload: Json | null
        }
        Insert: {
          actor_id?: string | null
          competition_id: string
          created_at?: string
          device_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          payload?: Json | null
        }
        Update: {
          actor_id?: string | null
          competition_id?: string
          created_at?: string
          device_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "competition_audit_events_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_divisions: {
        Row: {
          competition_id: string
          created_at: string
          id: string
          max_athletes: number | null
          name: string
          sort_order: number
          team_size: number
        }
        Insert: {
          competition_id: string
          created_at?: string
          id?: string
          max_athletes?: number | null
          name: string
          sort_order?: number
          team_size?: number
        }
        Update: {
          competition_id?: string
          created_at?: string
          id?: string
          max_athletes?: number | null
          name?: string
          sort_order?: number
          team_size?: number
        }
        Relationships: [
          {
            foreignKeyName: "competition_divisions_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_judges: {
        Row: {
          competition_id: string
          created_at: string
          display_name: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          competition_id: string
          created_at?: string
          display_name?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          competition_id?: string
          created_at?: string
          display_name?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competition_judges_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_leaderboards: {
        Row: {
          competition_id: string
          division_id: string | null
          id: string
          overall_rank: number
          recomputed_at: string
          team_id: string
          tie_broken_by: string | null
          total_rank_sum: number
        }
        Insert: {
          competition_id: string
          division_id?: string | null
          id?: string
          overall_rank?: number
          recomputed_at?: string
          team_id: string
          tie_broken_by?: string | null
          total_rank_sum?: number
        }
        Update: {
          competition_id?: string
          division_id?: string | null
          id?: string
          overall_rank?: number
          recomputed_at?: string
          team_id?: string
          tie_broken_by?: string | null
          total_rank_sum?: number
        }
        Relationships: [
          {
            foreignKeyName: "competition_leaderboards_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_leaderboards_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "competition_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_leaderboards_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_participants: {
        Row: {
          athlete_name: string
          competition_id: string
          created_at: string
          id: string
          team_id: string
          user_id: string | null
        }
        Insert: {
          athlete_name: string
          competition_id: string
          created_at?: string
          id?: string
          team_id: string
          user_id?: string | null
        }
        Update: {
          athlete_name?: string
          competition_id?: string
          created_at?: string
          id?: string
          team_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competition_participants_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_rounds: {
        Row: {
          competition_id: string
          created_at: string
          id: string
          name: string
          round_number: number
          scheduled_end: string | null
          scheduled_start: string | null
          scoring_weight: number
          status: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          id?: string
          name: string
          round_number: number
          scheduled_end?: string | null
          scheduled_start?: string | null
          scoring_weight?: number
          status?: string
        }
        Update: {
          competition_id?: string
          created_at?: string
          id?: string
          name?: string
          round_number?: number
          scheduled_end?: string | null
          scheduled_start?: string | null
          scoring_weight?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_scores: {
        Row: {
          competition_id: string
          created_at: string
          device_id: string | null
          heat_id: string | null
          id: string
          idempotency_key: string | null
          judge_id: string | null
          load_value: number | null
          locked: boolean
          locked_at: string | null
          normalized_score: number | null
          notes: string | null
          points_awarded: number | null
          rank: number | null
          reps_completed: number | null
          review_notes: string | null
          round_id: string | null
          score: number
          team_id: string
          time_seconds: number | null
          updated_at: string
          validation_status: string | null
          video_url: string | null
          video_verified: boolean | null
          workout_id: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          device_id?: string | null
          heat_id?: string | null
          id?: string
          idempotency_key?: string | null
          judge_id?: string | null
          load_value?: number | null
          locked?: boolean
          locked_at?: string | null
          normalized_score?: number | null
          notes?: string | null
          points_awarded?: number | null
          rank?: number | null
          reps_completed?: number | null
          review_notes?: string | null
          round_id?: string | null
          score?: number
          team_id: string
          time_seconds?: number | null
          updated_at?: string
          validation_status?: string | null
          video_url?: string | null
          video_verified?: boolean | null
          workout_id: string
        }
        Update: {
          competition_id?: string
          created_at?: string
          device_id?: string | null
          heat_id?: string | null
          id?: string
          idempotency_key?: string | null
          judge_id?: string | null
          load_value?: number | null
          locked?: boolean
          locked_at?: string | null
          normalized_score?: number | null
          notes?: string | null
          points_awarded?: number | null
          rank?: number | null
          reps_completed?: number | null
          review_notes?: string | null
          round_id?: string | null
          score?: number
          team_id?: string
          time_seconds?: number | null
          updated_at?: string
          validation_status?: string | null
          video_url?: string | null
          video_verified?: boolean | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_scores_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_scores_heat_id_fkey"
            columns: ["heat_id"]
            isOneToOne: false
            referencedRelation: "heat_schedule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_scores_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "competition_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_scores_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_scores_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "competition_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_settings: {
        Row: {
          allow_remote_submissions: boolean
          auto_publish_leaderboard: boolean
          competition_id: string
          created_at: string
          id: string
          ranking_direction: string
          require_video_verification: boolean
          scoring_method: string
          scoring_model: string
          settings_json: Json | null
          setup_mode: string
          tie_breaker_policy: string
          timezone: string
          updated_at: string
        }
        Insert: {
          allow_remote_submissions?: boolean
          auto_publish_leaderboard?: boolean
          competition_id: string
          created_at?: string
          id?: string
          ranking_direction?: string
          require_video_verification?: boolean
          scoring_method?: string
          scoring_model?: string
          settings_json?: Json | null
          setup_mode?: string
          tie_breaker_policy?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          allow_remote_submissions?: boolean
          auto_publish_leaderboard?: boolean
          competition_id?: string
          created_at?: string
          id?: string
          ranking_direction?: string
          require_video_verification?: boolean
          scoring_method?: string
          scoring_model?: string
          settings_json?: Json | null
          setup_mode?: string
          tie_breaker_policy?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_settings_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: true
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_sponsors_meta: {
        Row: {
          click_count: number
          competition_id: string
          created_at: string
          id: string
          storage_path: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          click_count?: number
          competition_id: string
          created_at?: string
          id?: string
          storage_path: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          click_count?: number
          competition_id?: string
          created_at?: string
          id?: string
          storage_path?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competition_sponsors_meta_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_teams: {
        Row: {
          captain_user_id: string | null
          competition_id: string
          created_at: string
          division: string | null
          division_id: string | null
          id: string
          invite_code: string | null
          is_complete: boolean
          team_name: string
        }
        Insert: {
          captain_user_id?: string | null
          competition_id: string
          created_at?: string
          division?: string | null
          division_id?: string | null
          id?: string
          invite_code?: string | null
          is_complete?: boolean
          team_name: string
        }
        Update: {
          captain_user_id?: string | null
          competition_id?: string
          created_at?: string
          division?: string | null
          division_id?: string | null
          id?: string
          invite_code?: string | null
          is_complete?: boolean
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
          {
            foreignKeyName: "competition_teams_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "competition_divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_templates: {
        Row: {
          competition_type: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean
          name: string
          template_data: Json
        }
        Insert: {
          competition_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          template_data?: Json
        }
        Update: {
          competition_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          template_data?: Json
        }
        Relationships: []
      }
      competition_types: {
        Row: {
          created_at: string
          description: string | null
          is_active: boolean
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      competition_workouts: {
        Row: {
          competition_id: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_locked: boolean
          measurement_type: string
          name: string | null
          round_id: string | null
          scheduled_reveal_at: string | null
          scoring_type: string
          time_cap_seconds: number | null
          video_url: string | null
          visibility: string
          workout_number: number
          workout_type: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_locked?: boolean
          measurement_type?: string
          name?: string | null
          round_id?: string | null
          scheduled_reveal_at?: string | null
          scoring_type?: string
          time_cap_seconds?: number | null
          video_url?: string | null
          visibility?: string
          workout_number: number
          workout_type?: string
        }
        Update: {
          competition_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_locked?: boolean
          measurement_type?: string
          name?: string | null
          round_id?: string | null
          scheduled_reveal_at?: string | null
          scoring_type?: string
          time_cap_seconds?: number | null
          video_url?: string | null
          visibility?: string
          workout_number?: number
          workout_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_workouts_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_workouts_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "competition_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          age_category_type: string | null
          competition_type: string | null
          created_at: string
          created_by: string
          date: string | null
          description: string | null
          divisions: string | null
          end_date: string | null
          gym_id: string | null
          host_gym: string | null
          id: string
          is_synthetic: boolean
          max_age: number | null
          max_athletes: number | null
          max_teams: number | null
          min_age: number | null
          name: string
          poster_url: string | null
          registration_deadline: string | null
          season_id: string | null
          start_date: string | null
          status: string
          type: string | null
          updated_at: string
          venue: string | null
          visibility: string
          waitlist_enabled: boolean
        }
        Insert: {
          age_category_type?: string | null
          competition_type?: string | null
          created_at?: string
          created_by: string
          date?: string | null
          description?: string | null
          divisions?: string | null
          end_date?: string | null
          gym_id?: string | null
          host_gym?: string | null
          id?: string
          is_synthetic?: boolean
          max_age?: number | null
          max_athletes?: number | null
          max_teams?: number | null
          min_age?: number | null
          name: string
          poster_url?: string | null
          registration_deadline?: string | null
          season_id?: string | null
          start_date?: string | null
          status?: string
          type?: string | null
          updated_at?: string
          venue?: string | null
          visibility?: string
          waitlist_enabled?: boolean
        }
        Update: {
          age_category_type?: string | null
          competition_type?: string | null
          created_at?: string
          created_by?: string
          date?: string | null
          description?: string | null
          divisions?: string | null
          end_date?: string | null
          gym_id?: string | null
          host_gym?: string | null
          id?: string
          is_synthetic?: boolean
          max_age?: number | null
          max_athletes?: number | null
          max_teams?: number | null
          min_age?: number | null
          name?: string
          poster_url?: string | null
          registration_deadline?: string | null
          season_id?: string | null
          start_date?: string | null
          status?: string
          type?: string | null
          updated_at?: string
          venue?: string | null
          visibility?: string
          waitlist_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "competitions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitions_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      exercise_results: {
        Row: {
          completed: boolean
          created_at: string
          distance: number | null
          distance_unit: string | null
          exercise_id: string | null
          id: string
          load: number | null
          load_unit: string | null
          movement_id: string | null
          movement_name: string
          notes: string | null
          performed_at: string
          reps: number | null
          rpe: number | null
          session_id: string
          set_number: number
          skipped: boolean
          time_seconds: number | null
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          distance?: number | null
          distance_unit?: string | null
          exercise_id?: string | null
          id?: string
          load?: number | null
          load_unit?: string | null
          movement_id?: string | null
          movement_name: string
          notes?: string | null
          performed_at?: string
          reps?: number | null
          rpe?: number | null
          session_id: string
          set_number?: number
          skipped?: boolean
          time_seconds?: number | null
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          distance?: number | null
          distance_unit?: string | null
          exercise_id?: string | null
          id?: string
          load?: number | null
          load_unit?: string | null
          movement_id?: string | null
          movement_name?: string
          notes?: string | null
          performed_at?: string
          reps?: number | null
          rpe?: number | null
          session_id?: string
          set_number?: number
          skipped?: boolean
          time_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_results_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "section_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_results_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          audience: string
          description: string | null
          enabled: boolean | null
          key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          audience?: string
          description?: string | null
          enabled?: boolean | null
          key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          audience?: string
          description?: string | null
          enabled?: boolean | null
          key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      gym_default_discounts: {
        Row: {
          applies_to: string
          created_at: string
          discount_percentage: number
          discount_type: string
          gym_id: string
          id: string
          is_stackable: boolean
          metadata: Json | null
          priority: number
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          applies_to?: string
          created_at?: string
          discount_percentage: number
          discount_type: string
          gym_id: string
          id?: string
          is_stackable?: boolean
          metadata?: Json | null
          priority?: number
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          applies_to?: string
          created_at?: string
          discount_percentage?: number
          discount_type?: string
          gym_id?: string
          id?: string
          is_stackable?: boolean
          metadata?: Json | null
          priority?: number
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gym_default_discounts_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_member_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          declined_at: string | null
          email: string
          gym_id: string
          id: string
          invited_by: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          declined_at?: string | null
          email: string
          gym_id: string
          id?: string
          invited_by: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          declined_at?: string | null
          email?: string
          gym_id?: string
          id?: string
          invited_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_member_invitations_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_members: {
        Row: {
          belt_rank: string | null
          created_at: string
          gym_id: string
          id: string
          join_date: string
          metadata: Json | null
          role: string
          status: string
          team_assignment: string | null
          user_id: string
        }
        Insert: {
          belt_rank?: string | null
          created_at?: string
          gym_id: string
          id?: string
          join_date?: string
          metadata?: Json | null
          role?: string
          status?: string
          team_assignment?: string | null
          user_id: string
        }
        Update: {
          belt_rank?: string | null
          created_at?: string
          gym_id?: string
          id?: string
          join_date?: string
          metadata?: Json | null
          role?: string
          status?: string
          team_assignment?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_members_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gyms: {
        Row: {
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          metadata: Json | null
          name: string
          owner_id: string
          slug: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          metadata?: Json | null
          name: string
          owner_id: string
          slug: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          owner_id?: string
          slug?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gyms_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gyms_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      heat_assignments: {
        Row: {
          athlete_registration_id: string | null
          created_at: string
          heat_id: string
          id: string
          lane_number: number | null
          team_id: string | null
        }
        Insert: {
          athlete_registration_id?: string | null
          created_at?: string
          heat_id: string
          id?: string
          lane_number?: number | null
          team_id?: string | null
        }
        Update: {
          athlete_registration_id?: string | null
          created_at?: string
          heat_id?: string
          id?: string
          lane_number?: number | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "heat_assignments_athlete_registration_id_fkey"
            columns: ["athlete_registration_id"]
            isOneToOne: false
            referencedRelation: "athlete_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heat_assignments_heat_id_fkey"
            columns: ["heat_id"]
            isOneToOne: false
            referencedRelation: "heat_schedule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heat_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      heat_judges: {
        Row: {
          created_at: string
          heat_id: string
          id: string
          judge_id: string
        }
        Insert: {
          created_at?: string
          heat_id: string
          id?: string
          judge_id: string
        }
        Update: {
          created_at?: string
          heat_id?: string
          id?: string
          judge_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "heat_judges_heat_id_fkey"
            columns: ["heat_id"]
            isOneToOne: false
            referencedRelation: "heat_schedule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heat_judges_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "competition_judges"
            referencedColumns: ["id"]
          },
        ]
      }
      heat_schedule: {
        Row: {
          competition_id: string
          created_at: string
          heat_number: number
          id: string
          lane_count: number
          round_id: string | null
          scheduled_start: string | null
          status: string
          workout_id: string | null
        }
        Insert: {
          competition_id: string
          created_at?: string
          heat_number: number
          id?: string
          lane_count?: number
          round_id?: string | null
          scheduled_start?: string | null
          status?: string
          workout_id?: string | null
        }
        Update: {
          competition_id?: string
          created_at?: string
          heat_number?: number
          id?: string
          lane_count?: number
          round_id?: string | null
          scheduled_start?: string | null
          status?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "heat_schedule_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heat_schedule_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "competition_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heat_schedule_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "competition_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      judge_assignments: {
        Row: {
          competition_id: string
          created_at: string
          heat_id: string | null
          id: string
          judge_id: string
          lane_number: number | null
          workout_id: string | null
        }
        Insert: {
          competition_id: string
          created_at?: string
          heat_id?: string | null
          id?: string
          judge_id: string
          lane_number?: number | null
          workout_id?: string | null
        }
        Update: {
          competition_id?: string
          created_at?: string
          heat_id?: string | null
          id?: string
          judge_id?: string
          lane_number?: number | null
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "judge_assignments_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_assignments_heat_id_fkey"
            columns: ["heat_id"]
            isOneToOne: false
            referencedRelation: "heat_schedule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_assignments_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "competition_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_history: {
        Row: {
          competition_id: string
          created_at: string
          id: string
          snapshot_data: Json
          triggered_by: string | null
        }
        Insert: {
          competition_id: string
          created_at?: string
          id?: string
          snapshot_data: Json
          triggered_by?: string | null
        }
        Update: {
          competition_id?: string
          created_at?: string
          id?: string
          snapshot_data?: Json
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_history_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_items: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          external_url: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_synthetic: boolean
          price: number | null
          title: string
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          external_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_synthetic?: boolean
          price?: number | null
          title: string
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          external_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_synthetic?: boolean
          price?: number | null
          title?: string
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: []
      }
      member_discounts: {
        Row: {
          created_at: string
          created_by: string | null
          discount_amount: number | null
          discount_percentage: number | null
          discount_type: string
          gym_member_id: string
          id: string
          is_stackable: boolean
          metadata: Json | null
          priority: number
          source_id: string | null
          source_type: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          discount_type: string
          gym_member_id: string
          id?: string
          is_stackable?: boolean
          metadata?: Json | null
          priority?: number
          source_id?: string | null
          source_type: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          discount_type?: string
          gym_member_id?: string
          id?: string
          is_stackable?: boolean
          metadata?: Json | null
          priority?: number
          source_id?: string | null
          source_type?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_discounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_discounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_discounts_gym_member_id_fkey"
            columns: ["gym_member_id"]
            isOneToOne: false
            referencedRelation: "gym_members"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          created_at: string
          description: string | null
          feature_key: string
          icon_name: string
          id: string
          is_active: boolean
          label: string
          route: string
          sort_order: number
          tier_key: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          feature_key: string
          icon_name: string
          id?: string
          is_active?: boolean
          label: string
          route: string
          sort_order?: number
          tier_key: string
        }
        Update: {
          created_at?: string
          description?: string | null
          feature_key?: string
          icon_name?: string
          id?: string
          is_active?: boolean
          label?: string
          route?: string
          sort_order?: number
          tier_key?: string
        }
        Relationships: []
      }
      movements: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          date_of_birth: string | null
          display_name: string | null
          full_name: string | null
          gender: string | null
          id: string
          identity_locked_at: string | null
          identity_unlocked_by: string | null
          profile_completed: boolean
          subscription_tier: string
          tier_assigned_at: string
          tier_assigned_by: string | null
          tier_slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          about_me?: string | null
          affiliation?: string | null
          age?: number | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          identity_locked_at?: string | null
          identity_unlocked_by?: string | null
          profile_completed?: boolean
          subscription_tier?: string
          tier_assigned_at?: string
          tier_assigned_by?: string | null
          tier_slug?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          about_me?: string | null
          affiliation?: string | null
          age?: number | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          identity_locked_at?: string | null
          identity_unlocked_by?: string | null
          profile_completed?: boolean
          subscription_tier?: string
          tier_assigned_at?: string
          tier_assigned_by?: string | null
          tier_slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tier_slug_fkey"
            columns: ["tier_slug"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["key"]
          },
        ]
      }
      program_days: {
        Row: {
          created_at: string
          day_number: number
          id: string
          is_rest_day: boolean
          name: string | null
          program_id: string
          week_id: string
        }
        Insert: {
          created_at?: string
          day_number: number
          id?: string
          is_rest_day?: boolean
          name?: string | null
          program_id: string
          week_id: string
        }
        Update: {
          created_at?: string
          day_number?: number
          id?: string
          is_rest_day?: boolean
          name?: string | null
          program_id?: string
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_days_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_days_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "program_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      program_enrollments: {
        Row: {
          assigned_by: string | null
          completed_at: string | null
          created_at: string
          id: string
          program_id: string
          source: string
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          program_id: string
          source?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          program_id?: string
          source?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_weeks: {
        Row: {
          created_at: string
          id: string
          name: string | null
          notes: string | null
          program_id: string
          week_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          program_id: string
          week_number: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          program_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_weeks_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_workouts: {
        Row: {
          created_at: string
          day_id: string
          description: string | null
          display_order: number
          est_duration_minutes: number | null
          format_config: Json
          id: string
          name: string
          notes: string | null
          program_id: string
          workout_format: string
        }
        Insert: {
          created_at?: string
          day_id: string
          description?: string | null
          display_order?: number
          est_duration_minutes?: number | null
          format_config?: Json
          id?: string
          name: string
          notes?: string | null
          program_id: string
          workout_format?: string
        }
        Update: {
          created_at?: string
          day_id?: string
          description?: string | null
          display_order?: number
          est_duration_minutes?: number | null
          format_config?: Json
          id?: string
          name?: string
          notes?: string | null
          program_id?: string
          workout_format?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_workouts_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "program_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_workouts_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          category: string
          cover_url: string | null
          created_at: string
          created_by: string
          days_per_week: number
          description: string | null
          equipment: string[]
          gym_id: string | null
          id: string
          is_public: boolean
          is_synthetic: boolean
          level: string
          status: string
          title: string
          updated_at: string
          weeks_count: number
        }
        Insert: {
          category?: string
          cover_url?: string | null
          created_at?: string
          created_by: string
          days_per_week?: number
          description?: string | null
          equipment?: string[]
          gym_id?: string | null
          id?: string
          is_public?: boolean
          is_synthetic?: boolean
          level?: string
          status?: string
          title: string
          updated_at?: string
          weeks_count?: number
        }
        Update: {
          category?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string
          days_per_week?: number
          description?: string | null
          equipment?: string[]
          gym_id?: string | null
          id?: string
          is_public?: boolean
          is_synthetic?: boolean
          level?: string
          status?: string
          title?: string
          updated_at?: string
          weeks_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "programs_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
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
      scoring_events: {
        Row: {
          competition_id: string | null
          created_at: string
          event_type: string
          id: string
          judge_id: string | null
          payload: Json | null
          score_id: string | null
          team_id: string | null
        }
        Insert: {
          competition_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          judge_id?: string | null
          payload?: Json | null
          score_id?: string | null
          team_id?: string | null
        }
        Update: {
          competition_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          judge_id?: string | null
          payload?: Json | null
          score_id?: string | null
          team_id?: string | null
        }
        Relationships: []
      }
      season_competitions: {
        Row: {
          competition_id: string
          id: string
          season_id: string
        }
        Insert: {
          competition_id: string
          id?: string
          season_id: string
        }
        Update: {
          competition_id?: string
          id?: string
          season_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_competitions_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_competitions_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          id: string
          name: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          year?: number
        }
        Relationships: []
      }
      section_exercises: {
        Row: {
          created_at: string
          display_order: number
          distance: number | null
          distance_unit: string | null
          duration_seconds: number | null
          id: string
          load: number | null
          load_percent: number | null
          load_unit: string | null
          movement_id: string | null
          movement_name: string
          notes: string | null
          program_id: string
          reps: number | null
          reps_scheme: string | null
          rest_seconds: number | null
          section_id: string
          sets: number | null
          tempo: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          distance?: number | null
          distance_unit?: string | null
          duration_seconds?: number | null
          id?: string
          load?: number | null
          load_percent?: number | null
          load_unit?: string | null
          movement_id?: string | null
          movement_name: string
          notes?: string | null
          program_id: string
          reps?: number | null
          reps_scheme?: string | null
          rest_seconds?: number | null
          section_id: string
          sets?: number | null
          tempo?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          distance?: number | null
          distance_unit?: string | null
          duration_seconds?: number | null
          id?: string
          load?: number | null
          load_percent?: number | null
          load_unit?: string | null
          movement_id?: string | null
          movement_name?: string
          notes?: string | null
          program_id?: string
          reps?: number | null
          reps_scheme?: string | null
          rest_seconds?: number | null
          section_id?: string
          sets?: number | null
          tempo?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "section_exercises_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_exercises_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_exercises_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "workout_sections"
            referencedColumns: ["id"]
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
      super_users: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tier_change_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_tier_slug: string
          old_tier_slug: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_tier_slug: string
          old_tier_slug?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_tier_slug?: string
          old_tier_slug?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tier_feature_access: {
        Row: {
          created_at: string
          feature_key: string
          id: string
          tier_key: string
        }
        Insert: {
          created_at?: string
          feature_key: string
          id?: string
          tier_key: string
        }
        Update: {
          created_at?: string
          feature_key?: string
          id?: string
          tier_key?: string
        }
        Relationships: []
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
      workout_configs: {
        Row: {
          config: Json
          created_at: string
          id: string
          updated_at: string
          workout_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          updated_at?: string
          workout_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          updated_at?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_configs_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: true
            referencedRelation: "competition_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_movements: {
        Row: {
          box_height: number | null
          calories: number | null
          created_at: string
          description: string | null
          distance: number | null
          id: string
          movement_name: string
          reps: number | null
          sequence_order: number
          target_height: number | null
          unit: string | null
          video_url: string | null
          weight: number | null
          workout_id: string
        }
        Insert: {
          box_height?: number | null
          calories?: number | null
          created_at?: string
          description?: string | null
          distance?: number | null
          id?: string
          movement_name: string
          reps?: number | null
          sequence_order?: number
          target_height?: number | null
          unit?: string | null
          video_url?: string | null
          weight?: number | null
          workout_id: string
        }
        Update: {
          box_height?: number | null
          calories?: number | null
          created_at?: string
          description?: string | null
          distance?: number | null
          id?: string
          movement_name?: string
          reps?: number | null
          sequence_order?: number
          target_height?: number | null
          unit?: string | null
          video_url?: string | null
          weight?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_movements_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "competition_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_rankings: {
        Row: {
          competition_id: string
          division_id: string | null
          id: string
          normalized_score: number
          points_earned: number
          rank: number
          recomputed_at: string
          team_id: string
          workout_id: string
        }
        Insert: {
          competition_id: string
          division_id?: string | null
          id?: string
          normalized_score?: number
          points_earned?: number
          rank?: number
          recomputed_at?: string
          team_id: string
          workout_id: string
        }
        Update: {
          competition_id?: string
          division_id?: string | null
          id?: string
          normalized_score?: number
          points_earned?: number
          rank?: number
          recomputed_at?: string
          team_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_rankings_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_rankings_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "competition_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_rankings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_rankings_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "competition_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sections: {
        Row: {
          created_at: string
          display_order: number
          format_config: Json
          id: string
          name: string
          notes: string | null
          program_id: string
          section_type: string
          workout_format: string | null
          workout_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          format_config?: Json
          id?: string
          name: string
          notes?: string | null
          program_id: string
          section_type?: string
          workout_format?: string | null
          workout_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          format_config?: Json
          id?: string
          name?: string
          notes?: string | null
          program_id?: string
          section_type?: string
          workout_format?: string | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sections_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sections_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "program_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          created_at: string
          duration_seconds: number | null
          enrollment_id: string | null
          finished_at: string | null
          id: string
          notes: string | null
          program_id: string | null
          rating: number | null
          scheduled_date: string | null
          started_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          workout_id: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          enrollment_id?: string | null
          finished_at?: string | null
          id?: string
          notes?: string | null
          program_id?: string | null
          rating?: number | null
          scheduled_date?: string | null
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          workout_id?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          enrollment_id?: string | null
          finished_at?: string | null
          id?: string
          notes?: string | null
          program_id?: string | null
          rating?: number | null
          scheduled_date?: string | null
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "program_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "program_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_profiles: {
        Row: {
          affiliation: string | null
          avatar_url: string | null
          display_name: string | null
          full_name: string | null
          id: string | null
          user_id: string | null
        }
        Insert: {
          affiliation?: string | null
          avatar_url?: string | null
          display_name?: string | null
          full_name?: string | null
          id?: string | null
          user_id?: string | null
        }
        Update: {
          affiliation?: string | null
          avatar_url?: string | null
          display_name?: string | null
          full_name?: string | null
          id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_get_user_emails: {
        Args: { p_user_ids: string[] }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      admin_unlock_profile_identity: {
        Args: { p_user_id: string }
        Returns: Json
      }
      can_read_program: {
        Args: { p_program_id: string; p_user_id: string }
        Returns: boolean
      }
      current_user_email: { Args: never; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_competition_leaderboard: {
        Args: { p_competition_id: string }
        Returns: {
          division_id: string
          division_name: string
          team_id: string
          team_name: string
          total_points: number
        }[]
      }
      get_competition_status: {
        Args: { p_competition_id: string }
        Returns: string
      }
      get_season_leaderboard: {
        Args: { p_season_id: string }
        Returns: {
          team_id: string
          team_name: string
          total_points: number
        }[]
      }
      get_team_invite_code: { Args: { p_team_id: string }; Returns: string }
      has_competition_access: { Args: { p_user_id: string }; Returns: boolean }
      increment_sponsor_click: {
        Args: {
          p_competition_id: string
          p_storage_path: string
          p_website_url?: string
        }
        Returns: undefined
      }
      is_competition_gym_member: {
        Args: { p_competition_id: string; p_user_id: string }
        Returns: boolean
      }
      is_competition_judge: {
        Args: { p_competition_id: string; p_user_id: string }
        Returns: boolean
      }
      is_competition_owner: {
        Args: { p_competition_id: string; p_user_id: string }
        Returns: boolean
      }
      is_competition_registrant: {
        Args: { p_competition_id: string; p_user_id: string }
        Returns: boolean
      }
      is_gym_member_owner: {
        Args: { p_gym_member_id: string; p_user_id: string }
        Returns: boolean
      }
      is_gym_owner: {
        Args: { p_gym_id: string; p_user_id: string }
        Returns: boolean
      }
      is_program_enrolled: {
        Args: { p_program_id: string; p_user_id: string }
        Returns: boolean
      }
      is_program_owner: {
        Args: { p_program_id: string; p_user_id: string }
        Returns: boolean
      }
      is_registration_open: {
        Args: { p_competition_id: string }
        Returns: boolean
      }
      is_session_visible: {
        Args: { p_session_id: string; p_user_id: string }
        Returns: boolean
      }
      is_super_user: { Args: { p_user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recompute_competition_leaderboard: {
        Args: { p_competition_id: string }
        Returns: undefined
      }
      recompute_workout_rankings: {
        Args: { p_competition_id: string; p_workout_id: string }
        Returns: undefined
      }
      request_gym_affiliation: { Args: { p_gym_id: string }; Returns: Json }
      respond_to_gym_invitation: {
        Args: { p_accept: boolean; p_invitation_id: string }
        Returns: Json
      }
      respond_to_gym_request: {
        Args: { p_accept: boolean; p_member_id: string }
        Returns: Json
      }
      user_tier_at_least: { Args: { min_tier: string }; Returns: boolean }
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
