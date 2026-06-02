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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      collection_items: {
        Row: {
          added_at: string
          collection_id: string
          id: string
          run_id: string
        }
        Insert: {
          added_at?: string
          collection_id: string
          id?: string
          run_id: string
        }
        Update: {
          added_at?: string
          collection_id?: string
          id?: string
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      councils: {
        Row: {
          chairman_model: string
          created_at: string
          delegates: Json
          description: string | null
          id: string
          is_default: boolean
          is_preset: boolean
          name: string
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          chairman_model: string
          created_at?: string
          delegates: Json
          description?: string | null
          id?: string
          is_default?: boolean
          is_preset?: boolean
          name: string
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          chairman_model?: string
          created_at?: string
          delegates?: Json
          description?: string | null
          id?: string
          is_default?: boolean
          is_preset?: boolean
          name?: string
          owner_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      daily_question: {
        Row: {
          aggregate_consensus: number | null
          council_id: string | null
          created_at: string
          day: string
          id: string
          participant_count: number
          published: boolean
          question_id: string
          scheduled_for: string | null
          theme: string | null
          updated_at: string
        }
        Insert: {
          aggregate_consensus?: number | null
          council_id?: string | null
          created_at?: string
          day: string
          id?: string
          participant_count?: number
          published?: boolean
          question_id: string
          scheduled_for?: string | null
          theme?: string | null
          updated_at?: string
        }
        Update: {
          aggregate_consensus?: number | null
          council_id?: string | null
          created_at?: string
          day?: string
          id?: string
          participant_count?: number
          published?: boolean
          question_id?: string
          scheduled_for?: string | null
          theme?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_question_council_id_fkey"
            columns: ["council_id"]
            isOneToOne: false
            referencedRelation: "councils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_question_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_streak: {
        Row: {
          current_streak: number
          last_day: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_day?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          last_day?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_usage: {
        Row: {
          day: string
          question_count: number
          user_id: string
        }
        Insert: {
          day?: string
          question_count?: number
          user_id: string
        }
        Update: {
          day?: string
          question_count?: number
          user_id?: string
        }
        Relationships: []
      }
      model_responses: {
        Row: {
          content: string | null
          created_at: string
          error: string | null
          id: string
          latency_ms: number | null
          model_id: string
          run_id: string
          slot: string
          status: string
          tokens_in: number | null
          tokens_out: number | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          model_id: string
          run_id: string
          slot: string
          status?: string
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Update: {
          content?: string | null
          created_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          model_id?: string
          run_id?: string
          slot?: string
          status?: string
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "model_responses_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_anonymous: boolean
          is_pro: boolean
          last_active_date: string | null
          pro_expires_at: string | null
          streak_count: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_anonymous?: boolean
          is_pro?: boolean
          last_active_date?: string | null
          pro_expires_at?: string | null
          streak_count?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_anonymous?: boolean
          is_pro?: boolean
          last_active_date?: string | null
          pro_expires_at?: string | null
          streak_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          is_editorial: boolean
          normalized_hash: string | null
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          is_editorial?: boolean
          normalized_hash?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          is_editorial?: boolean
          normalized_hash?: string | null
        }
        Relationships: []
      }
      rate_limit: {
        Row: {
          count: number
          ip_hash: string
          window_start: string
        }
        Insert: {
          count?: number
          ip_hash: string
          window_start: string
        }
        Update: {
          count?: number
          ip_hash?: string
          window_start?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string
          id: string
          parse_ok: boolean
          ranking: Json
          raw_output: string | null
          reviewer_model: string
          reviewer_slot: string
          run_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parse_ok?: boolean
          ranking: Json
          raw_output?: string | null
          reviewer_model: string
          reviewer_slot: string
          run_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parse_ok?: boolean
          ranking?: Json
          raw_output?: string | null
          reviewer_model?: string
          reviewer_slot?: string
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      runs: {
        Row: {
          completed_at: string | null
          council_id: string | null
          council_snapshot: Json
          created_at: string
          daily_question_id: string | null
          error: string | null
          expires_at: string | null
          id: string
          is_public: boolean
          mode: string
          question_id: string
          started_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          council_id?: string | null
          council_snapshot: Json
          created_at?: string
          daily_question_id?: string | null
          error?: string | null
          expires_at?: string | null
          id?: string
          is_public?: boolean
          mode?: string
          question_id: string
          started_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          council_id?: string | null
          council_snapshot?: Json
          created_at?: string
          daily_question_id?: string | null
          error?: string | null
          expires_at?: string | null
          id?: string
          is_public?: boolean
          mode?: string
          question_id?: string
          started_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "runs_council_id_fkey"
            columns: ["council_id"]
            isOneToOne: false
            referencedRelation: "councils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runs_daily_question_id_fkey"
            columns: ["daily_question_id"]
            isOneToOne: false
            referencedRelation: "daily_question"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runs_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      shares: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          og_image_url: string | null
          owner_id: string | null
          run_id: string
          slug: string
          view_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          og_image_url?: string | null
          owner_id?: string | null
          run_id: string
          slug?: string
          view_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          og_image_url?: string | null
          owner_id?: string | null
          run_id?: string
          slug?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "shares_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_secrets: {
        Row: {
          created_at: string
          has_byok: boolean
          openrouter_key_encrypted: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          has_byok?: boolean
          openrouter_key_encrypted?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          has_byok?: boolean
          openrouter_key_encrypted?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      verdicts: {
        Row: {
          body: string
          borda_scores: Json
          chairman_model: string
          consensus_score: number
          created_at: string
          disagreements: Json
          id: string
          raw_output: string | null
          run_id: string
        }
        Insert: {
          body: string
          borda_scores?: Json
          chairman_model: string
          consensus_score: number
          created_at?: string
          disagreements?: Json
          id?: string
          raw_output?: string | null
          run_id: string
        }
        Update: {
          body?: string
          borda_scores?: Json
          chairman_model?: string
          consensus_score?: number
          created_at?: string
          disagreements?: Json
          id?: string
          raw_output?: string | null
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verdicts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: true
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_ip_rate_limit: {
        Args: { p_ip_hash: string; p_limit: number; p_window_seconds: number }
        Returns: Json
      }
      create_share: { Args: { p_run_id: string }; Returns: string }
      generate_public_slug: { Args: { p_length?: number }; Returns: string }
      get_daily_question: { Args: { p_day?: string }; Returns: Json }
      get_share_meta: { Args: { p_slug: string }; Returns: Json }
      get_shared_run: { Args: { p_slug: string }; Returns: Json }
      increment_question_usage: { Args: never; Returns: Json }
      is_user_pro: { Args: { p_uid: string }; Returns: boolean }
      list_daily_questions: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      record_daily_participation: {
        Args: { p_day?: string; p_run_id: string }
        Returns: Json
      }
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
