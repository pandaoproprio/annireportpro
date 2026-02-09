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
      activities: {
        Row: {
          attachments: string[]
          attendees_count: number
          challenges: string
          cost_evidence: string | null
          created_at: string
          date: string
          description: string
          end_date: string | null
          goal_id: string | null
          id: string
          location: string
          photos: string[]
          project_id: string
          results: string
          team_involved: string[]
          type: Database["public"]["Enums"]["activity_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: string[]
          attendees_count?: number
          challenges: string
          cost_evidence?: string | null
          created_at?: string
          date: string
          description: string
          end_date?: string | null
          goal_id?: string | null
          id?: string
          location: string
          photos?: string[]
          project_id: string
          results: string
          team_involved?: string[]
          type: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: string[]
          attendees_count?: number
          challenges?: string
          cost_evidence?: string | null
          created_at?: string
          date?: string
          description?: string
          end_date?: string | null
          goal_id?: string | null
          id?: string
          location?: string
          photos?: string[]
          project_id?: string
          results?: string
          team_involved?: string[]
          type?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_collaborators: {
        Row: {
          added_by: string
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          added_by: string
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          added_by?: string
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_collaborators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          end_date: string
          fomento_number: string
          funder: string
          goals: Json
          id: string
          locations: string[]
          name: string
          object: string
          organization_address: string | null
          organization_email: string | null
          organization_name: string
          organization_phone: string | null
          organization_website: string | null
          report_data: Json | null
          start_date: string
          summary: string
          team: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          fomento_number: string
          funder: string
          goals?: Json
          id?: string
          locations?: string[]
          name: string
          object: string
          organization_address?: string | null
          organization_email?: string | null
          organization_name: string
          organization_phone?: string | null
          organization_website?: string | null
          report_data?: Json | null
          start_date: string
          summary: string
          team?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          fomento_number?: string
          funder?: string
          goals?: Json
          id?: string
          locations?: string[]
          name?: string
          object?: string
          organization_address?: string | null
          organization_email?: string | null
          organization_name?: string
          organization_phone?: string | null
          organization_website?: string | null
          report_data?: Json | null
          start_date?: string
          summary?: string
          team?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_reports: {
        Row: {
          additional_sections: Json | null
          attachments_title: string | null
          created_at: string
          execution_report: string
          execution_report_title: string | null
          footer_text: string | null
          function_role: string
          id: string
          is_draft: boolean
          period_end: string
          period_start: string
          photo_captions: Json
          photos: string[]
          project_id: string
          provider_document: string
          provider_name: string
          report_title: string | null
          responsible_name: string
          team_member_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_sections?: Json | null
          attachments_title?: string | null
          created_at?: string
          execution_report: string
          execution_report_title?: string | null
          footer_text?: string | null
          function_role: string
          id?: string
          is_draft?: boolean
          period_end: string
          period_start: string
          photo_captions?: Json
          photos?: string[]
          project_id: string
          provider_document: string
          provider_name: string
          report_title?: string | null
          responsible_name: string
          team_member_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_sections?: Json | null
          attachments_title?: string | null
          created_at?: string
          execution_report?: string
          execution_report_title?: string | null
          footer_text?: string | null
          function_role?: string
          id?: string
          is_draft?: boolean
          period_end?: string
          period_start?: string
          photo_captions?: Json
          photos?: string[]
          project_id?: string
          provider_document?: string
          provider_name?: string
          report_title?: string | null
          responsible_name?: string
          team_member_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      activity_type:
        | "Execução de Meta"
        | "Reunião de Equipe"
        | "Ocorrência/Imprevisto"
        | "Divulgação/Mídia"
        | "Administrativo/Financeiro"
        | "Outras Ações"
      app_role: "user" | "admin" | "super_admin"
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
    Enums: {
      activity_type: [
        "Execução de Meta",
        "Reunião de Equipe",
        "Ocorrência/Imprevisto",
        "Divulgação/Mídia",
        "Administrativo/Financeiro",
        "Outras Ações",
      ],
      app_role: ["user", "admin", "super_admin"],
    },
  },
} as const
