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
          attendance_files: Json
          attendees_count: number
          challenges: string
          cost_evidence: string | null
          created_at: string
          date: string
          deleted_at: string | null
          description: string
          end_date: string | null
          expense_records: Json
          goal_id: string | null
          id: string
          is_draft: boolean
          location: string
          photo_captions: Json
          photos: string[]
          project_id: string
          project_role_snapshot: string | null
          results: string
          setor_responsavel: string | null
          team_involved: string[]
          type: Database["public"]["Enums"]["activity_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: string[]
          attendance_files?: Json
          attendees_count?: number
          challenges: string
          cost_evidence?: string | null
          created_at?: string
          date: string
          deleted_at?: string | null
          description: string
          end_date?: string | null
          expense_records?: Json
          goal_id?: string | null
          id?: string
          is_draft?: boolean
          location: string
          photo_captions?: Json
          photos?: string[]
          project_id: string
          project_role_snapshot?: string | null
          results: string
          setor_responsavel?: string | null
          team_involved?: string[]
          type: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: string[]
          attendance_files?: Json
          attendees_count?: number
          challenges?: string
          cost_evidence?: string | null
          created_at?: string
          date?: string
          deleted_at?: string | null
          description?: string
          end_date?: string | null
          expense_records?: Json
          goal_id?: string | null
          id?: string
          is_draft?: boolean
          location?: string
          photo_captions?: Json
          photos?: string[]
          project_id?: string
          project_role_snapshot?: string | null
          results?: string
          setor_responsavel?: string | null
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
      activity_narratives: {
        Row: {
          activity_id: string
          ai_model: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          edited_at: string | null
          edited_by: string | null
          generation_prompt_summary: string | null
          id: string
          metadata: Json | null
          narrative_text: string
          project_id: string
          status: string
          target_reports: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          ai_model?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          edited_at?: string | null
          edited_by?: string | null
          generation_prompt_summary?: string | null
          id?: string
          metadata?: Json | null
          narrative_text?: string
          project_id: string
          status?: string
          target_reports?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          ai_model?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          edited_at?: string | null
          edited_by?: string | null
          generation_prompt_summary?: string | null
          id?: string
          metadata?: Json | null
          narrative_text?: string
          project_id?: string
          status?: string
          target_reports?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_narratives_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: true
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_feedback: {
        Row: {
          ai_model: string | null
          ai_output: string
          created_at: string
          entity_id: string
          entity_type: string
          feedback: string
          id: string
          metadata: Json | null
          user_correction: string | null
          user_id: string
        }
        Insert: {
          ai_model?: string | null
          ai_output: string
          created_at?: string
          entity_id: string
          entity_type: string
          feedback: string
          id?: string
          metadata?: Json | null
          user_correction?: string | null
          user_id: string
        }
        Update: {
          ai_model?: string | null
          ai_output?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          feedback?: string
          id?: string
          metadata?: Json | null
          user_correction?: string | null
          user_id?: string
        }
        Relationships: []
      }
      asana_config: {
        Row: {
          created_at: string
          created_by: string
          enable_create_tasks: boolean
          enable_import_tasks: boolean
          enable_notifications: boolean
          enable_sync_status: boolean
          id: string
          project_gid: string
          updated_at: string
          workspace_gid: string
        }
        Insert: {
          created_at?: string
          created_by: string
          enable_create_tasks?: boolean
          enable_import_tasks?: boolean
          enable_notifications?: boolean
          enable_sync_status?: boolean
          id?: string
          project_gid?: string
          updated_at?: string
          workspace_gid?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          enable_create_tasks?: boolean
          enable_import_tasks?: boolean
          enable_notifications?: boolean
          enable_sync_status?: boolean
          id?: string
          project_gid?: string
          updated_at?: string
          workspace_gid?: string
        }
        Relationships: []
      }
      asana_task_mappings: {
        Row: {
          asana_task_gid: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          project_id: string
          synced_at: string
          user_id: string
        }
        Insert: {
          asana_task_gid: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          project_id: string
          synced_at?: string
          user_id: string
        }
        Update: {
          asana_task_gid?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          project_id?: string
          synced_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string
          entity_name: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id: string
          entity_name?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string
          entity_name?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      automation_alerts: {
        Row: {
          alert_type: string
          created_at: string
          description: string
          email_error: string | null
          email_sent: boolean
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          project_id: string | null
          run_id: string | null
          severity: string
          target_email: string | null
          target_user_id: string
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          description?: string
          email_error?: string | null
          email_sent?: boolean
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          project_id?: string | null
          run_id?: string | null
          severity?: string
          target_email?: string | null
          target_user_id: string
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          description?: string
          email_error?: string | null
          email_sent?: boolean
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          project_id?: string | null
          run_id?: string | null
          severity?: string
          target_email?: string | null
          target_user_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_alerts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "automation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          alerts_generated: number
          emails_sent: number
          errors: string[] | null
          finished_at: string | null
          id: string
          metadata: Json | null
          run_type: string
          started_at: string
          status: string
        }
        Insert: {
          alerts_generated?: number
          emails_sent?: number
          errors?: string[] | null
          finished_at?: string | null
          id?: string
          metadata?: Json | null
          run_type?: string
          started_at?: string
          status?: string
        }
        Update: {
          alerts_generated?: number
          emails_sent?: number
          errors?: string[] | null
          finished_at?: string | null
          id?: string
          metadata?: Json | null
          run_type?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      budget_adjustment_items: {
        Row: {
          adjustment_id: string
          created_at: string
          description: string
          executed_amount: number
          id: string
          is_new_item: boolean
          item_number: string
          justification: string
          meta_group: string
          new_quantity: number
          new_specification: string
          new_total: number
          new_unit_measure: string
          new_unit_value: number
          original_quantity: number
          original_total: number
          original_unit_measure: string
          original_unit_value: number
          price_average: number
          price_ref_1: string
          price_ref_1_value: number
          price_ref_2: string
          price_ref_2_value: number
          price_ref_3: string
          price_ref_3_value: number
          proposal: string
          sort_order: number
          specification: string
          updated_at: string
        }
        Insert: {
          adjustment_id: string
          created_at?: string
          description?: string
          executed_amount?: number
          id?: string
          is_new_item?: boolean
          item_number?: string
          justification?: string
          meta_group?: string
          new_quantity?: number
          new_specification?: string
          new_total?: number
          new_unit_measure?: string
          new_unit_value?: number
          original_quantity?: number
          original_total?: number
          original_unit_measure?: string
          original_unit_value?: number
          price_average?: number
          price_ref_1?: string
          price_ref_1_value?: number
          price_ref_2?: string
          price_ref_2_value?: number
          price_ref_3?: string
          price_ref_3_value?: number
          proposal?: string
          sort_order?: number
          specification?: string
          updated_at?: string
        }
        Update: {
          adjustment_id?: string
          created_at?: string
          description?: string
          executed_amount?: number
          id?: string
          is_new_item?: boolean
          item_number?: string
          justification?: string
          meta_group?: string
          new_quantity?: number
          new_specification?: string
          new_total?: number
          new_unit_measure?: string
          new_unit_value?: number
          original_quantity?: number
          original_total?: number
          original_unit_measure?: string
          original_unit_value?: number
          price_average?: number
          price_ref_1?: string
          price_ref_1_value?: number
          price_ref_2?: string
          price_ref_2_value?: number
          price_ref_3?: string
          price_ref_3_value?: number
          proposal?: string
          sort_order?: number
          specification?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_adjustment_items_adjustment_id_fkey"
            columns: ["adjustment_id"]
            isOneToOne: false
            referencedRelation: "budget_adjustments"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_adjustments: {
        Row: {
          created_at: string
          id: string
          notes: string
          project_id: string
          ra_balance: number
          ra_justification: string
          ra_schedule: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string
          project_id: string
          ra_balance?: number
          ra_justification?: string
          ra_schedule?: string
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string
          project_id?: string
          ra_balance?: number
          ra_justification?: string
          ra_schedule?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_adjustments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channel_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          channel_type: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_archived: boolean
          name: string
          project_id: string | null
          updated_at: string
        }
        Insert: {
          channel_type?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          channel_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_system: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          content?: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_system?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_system?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          content_snapshot: Json
          created_at: string
          document_id: string
          id: string
          version_number: number
        }
        Insert: {
          content_snapshot: Json
          created_at?: string
          document_id: string
          id?: string
          version_number?: number
        }
        Update: {
          content_snapshot?: Json
          created_at?: string
          document_id?: string
          id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: Json
          created_at: string
          created_by: string
          id: string
          layout_config: Json
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by: string
          id?: string
          layout_config?: Json
          project_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string
          id?: string
          layout_config?: Json
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          document: string | null
          email: string | null
          event_id: string
          id: string
          name: string
          phone: string | null
          registered_at: string
          status: string
          user_id: string | null
        }
        Insert: {
          document?: string | null
          email?: string | null
          event_id: string
          id?: string
          name: string
          phone?: string | null
          registered_at?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          document?: string | null
          email?: string | null
          event_id?: string
          id?: string
          name?: string
          phone?: string | null
          registered_at?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string
          cover_image_url: string | null
          created_at: string
          description: string
          event_date: string
          event_end_date: string | null
          id: string
          location: string
          max_participants: number | null
          project_id: string | null
          settings: Json
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string
          event_date: string
          event_end_date?: string | null
          id?: string
          location?: string
          max_participants?: number | null
          project_id?: string | null
          settings?: Json
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string
          event_date?: string
          event_end_date?: string | null
          id?: string
          location?: string
          max_participants?: number | null
          project_id?: string | null
          settings?: Json
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      form_digest_config: {
        Row: {
          created_at: string
          created_by: string
          form_id: string
          frequency: string
          id: string
          is_active: boolean
          last_sent_at: string | null
          recipients: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          form_id: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          recipients?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          form_id?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          recipients?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_digest_config_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: true
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_fields: {
        Row: {
          created_at: string
          description: string
          form_id: string
          id: string
          label: string
          options: Json
          required: boolean
          settings: Json
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          form_id: string
          id?: string
          label?: string
          options?: Json
          required?: boolean
          settings?: Json
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          form_id?: string
          id?: string
          label?: string
          options?: Json
          required?: boolean
          settings?: Json
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_notifications: {
        Row: {
          created_at: string
          email_sent: boolean
          form_id: string
          form_response_id: string
          form_title: string
          id: string
          is_read: boolean
          recipient_user_id: string
          respondent_email: string | null
          respondent_name: string | null
        }
        Insert: {
          created_at?: string
          email_sent?: boolean
          form_id: string
          form_response_id: string
          form_title?: string
          id?: string
          is_read?: boolean
          recipient_user_id: string
          respondent_email?: string | null
          respondent_name?: string | null
        }
        Update: {
          created_at?: string
          email_sent?: boolean
          form_id?: string
          form_response_id?: string
          form_title?: string
          id?: string
          is_read?: boolean
          recipient_user_id?: string
          respondent_email?: string | null
          respondent_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_notifications_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_notifications_form_response_id_fkey"
            columns: ["form_response_id"]
            isOneToOne: false
            referencedRelation: "form_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      form_responses: {
        Row: {
          answers: Json
          form_id: string
          id: string
          respondent_email: string | null
          respondent_name: string | null
          submitted_at: string
        }
        Insert: {
          answers?: Json
          form_id: string
          id?: string
          respondent_email?: string | null
          respondent_name?: string | null
          submitted_at?: string
        }
        Update: {
          answers?: Json
          form_id?: string
          id?: string
          respondent_email?: string | null
          respondent_name?: string | null
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          category: string
          closes_at: string | null
          created_at: string
          description: string
          id: string
          project_id: string | null
          public_slug: string | null
          settings: Json
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          closes_at?: string | null
          created_at?: string
          description?: string
          id?: string
          project_id?: string | null
          public_slug?: string | null
          settings?: Json
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          closes_at?: string | null
          created_at?: string
          description?: string
          id?: string
          project_id?: string | null
          public_slug?: string | null
          settings?: Json
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          emission_date: string
          file_name: string
          file_url: string
          id: string
          observations: string | null
          project_id: string
          reference_month: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emission_date: string
          file_name?: string
          file_url: string
          id?: string
          observations?: string | null
          project_id: string
          reference_month: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emission_date?: string
          file_name?: string
          file_url?: string
          id?: string
          observations?: string | null
          project_id?: string
          reference_month?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      justification_reports: {
        Row: {
          attachment_files: Json
          attachments_section: string
          created_at: string
          deleted_at: string | null
          executed_actions_section: string
          future_actions_section: string
          id: string
          is_draft: boolean
          justification_section: string
          new_deadline_date: string | null
          object_section: string
          project_id: string
          requested_deadline_section: string
          section_docs: Json
          section_photos: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          attachment_files?: Json
          attachments_section?: string
          created_at?: string
          deleted_at?: string | null
          executed_actions_section?: string
          future_actions_section?: string
          id?: string
          is_draft?: boolean
          justification_section?: string
          new_deadline_date?: string | null
          object_section?: string
          project_id: string
          requested_deadline_section?: string
          section_docs?: Json
          section_photos?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          attachment_files?: Json
          attachments_section?: string
          created_at?: string
          deleted_at?: string | null
          executed_actions_section?: string
          future_actions_section?: string
          id?: string
          is_draft?: boolean
          justification_section?: string
          new_deadline_date?: string | null
          object_section?: string
          project_id?: string
          requested_deadline_section?: string
          section_docs?: Json
          section_photos?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "justification_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      login_reminders: {
        Row: {
          email_message_id: string | null
          first_login_at: string | null
          id: string
          notified_admins_at: string | null
          sent_at: string
          sent_by: string
          user_email: string
          user_id: string
          user_name: string
        }
        Insert: {
          email_message_id?: string | null
          first_login_at?: string | null
          id?: string
          notified_admins_at?: string | null
          sent_at?: string
          sent_by: string
          user_email: string
          user_id: string
          user_name: string
        }
        Update: {
          email_message_id?: string | null
          first_login_at?: string | null
          id?: string
          notified_admins_at?: string | null
          sent_at?: string
          sent_by?: string
          user_email?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      performance_config: {
        Row: {
          created_at: string
          created_by: string
          id: string
          stale_draft_threshold_hours: number
          updated_at: string
          wip_limit: number
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          stale_draft_threshold_hours?: number
          updated_at?: string
          wip_limit?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          stale_draft_threshold_hours?: number
          updated_at?: string
          wip_limit?: number
        }
        Relationships: []
      }
      performance_snapshots: {
        Row: {
          avg_cycle_time_hours: number | null
          avg_lead_time_hours: number | null
          created_at: string
          id: string
          metadata: Json | null
          project_id: string
          rejection_rate: number | null
          sla_compliance_rate: number | null
          snapshot_month: string
          total_activities: number
          total_reports: number
          workflows_completed: number
          workflows_pending: number
        }
        Insert: {
          avg_cycle_time_hours?: number | null
          avg_lead_time_hours?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          project_id: string
          rejection_rate?: number | null
          sla_compliance_rate?: number | null
          snapshot_month: string
          total_activities?: number
          total_reports?: number
          workflows_completed?: number
          workflows_pending?: number
        }
        Update: {
          avg_cycle_time_hours?: number | null
          avg_lead_time_hours?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          project_id?: string
          rejection_rate?: number | null
          sla_compliance_rate?: number | null
          snapshot_month?: string
          total_activities?: number
          total_reports?: number
          workflows_completed?: number
          workflows_pending?: number
        }
        Relationships: []
      }
      proactive_summaries: {
        Row: {
          ai_model: string | null
          created_at: string
          generated_at: string
          id: string
          metadata: Json | null
          project_id: string
          summary_text: string
          summary_type: string
        }
        Insert: {
          ai_model?: string | null
          created_at?: string
          generated_at?: string
          id?: string
          metadata?: Json | null
          project_id: string
          summary_text: string
          summary_type?: string
        }
        Update: {
          ai_model?: string | null
          created_at?: string
          generated_at?: string
          id?: string
          metadata?: Json | null
          project_id?: string
          summary_text?: string
          summary_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "proactive_summaries_project_id_fkey"
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
          first_login_at: string | null
          id: string
          last_login_at: string | null
          lgpd_consent_at: string | null
          login_attempts_without_change: number
          mfa_exempt_until: string | null
          must_change_password: boolean
          name: string
          password_changed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          first_login_at?: string | null
          id?: string
          last_login_at?: string | null
          lgpd_consent_at?: string | null
          login_attempts_without_change?: number
          mfa_exempt_until?: string | null
          must_change_password?: boolean
          name: string
          password_changed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          first_login_at?: string | null
          id?: string
          last_login_at?: string | null
          lgpd_consent_at?: string | null
          login_attempts_without_change?: number
          mfa_exempt_until?: string | null
          must_change_password?: boolean
          name?: string
          password_changed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_budget_lines: {
        Row: {
          category: Database["public"]["Enums"]["budget_category"]
          created_at: string
          description: string
          id: string
          planned_amount: number
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["budget_category"]
          created_at?: string
          description?: string
          id?: string
          planned_amount?: number
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["budget_category"]
          created_at?: string
          description?: string
          id?: string
          planned_amount?: number
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      project_expenses: {
        Row: {
          activity_id: string | null
          amount: number
          budget_line_id: string | null
          category: Database["public"]["Enums"]["budget_category"]
          created_at: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          project_id: string
          receipt_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          amount?: number
          budget_line_id?: string | null
          category?: Database["public"]["Enums"]["budget_category"]
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          project_id: string
          receipt_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          amount?: number
          budget_line_id?: string | null
          category?: Database["public"]["Enums"]["budget_category"]
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          project_id?: string
          receipt_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_expenses_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_expenses_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "project_budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_report_templates: {
        Row: {
          created_at: string
          created_by: string
          id: string
          project_id: string
          report_data: Json
          report_type: string | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          project_id: string
          report_data?: Json
          report_type?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          project_id?: string
          report_data?: Json
          report_type?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_report_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_report_templates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_risks: {
        Row: {
          category: Database["public"]["Enums"]["risk_category"]
          contingency_plan: string
          created_at: string
          description: string
          due_date: string | null
          id: string
          impact: Database["public"]["Enums"]["risk_impact"]
          metadata: Json | null
          mitigation_plan: string
          probability: Database["public"]["Enums"]["risk_probability"]
          project_id: string
          resolved_at: string | null
          responsible: string | null
          status: Database["public"]["Enums"]["risk_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["risk_category"]
          contingency_plan?: string
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          impact?: Database["public"]["Enums"]["risk_impact"]
          metadata?: Json | null
          mitigation_plan?: string
          probability?: Database["public"]["Enums"]["risk_probability"]
          project_id: string
          resolved_at?: string | null
          responsible?: string | null
          status?: Database["public"]["Enums"]["risk_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["risk_category"]
          contingency_plan?: string
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          impact?: Database["public"]["Enums"]["risk_impact"]
          metadata?: Json | null
          mitigation_plan?: string
          probability?: Database["public"]["Enums"]["risk_probability"]
          project_id?: string
          resolved_at?: string | null
          responsible?: string | null
          status?: Database["public"]["Enums"]["risk_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_risks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_team_members: {
        Row: {
          added_by: string
          created_at: string
          id: string
          project_id: string
          team_member_id: string
        }
        Insert: {
          added_by: string
          created_at?: string
          id?: string
          project_id: string
          team_member_id: string
        }
        Update: {
          added_by?: string
          created_at?: string
          id?: string
          project_id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_team_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_members_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
      report_diary_links: {
        Row: {
          activity_id: string
          author_id: string
          created_at: string
          id: string
          report_id: string
          report_type: string
        }
        Insert: {
          activity_id: string
          author_id: string
          created_at?: string
          id?: string
          report_id: string
          report_type?: string
        }
        Update: {
          activity_id?: string
          author_id?: string
          created_at?: string
          id?: string
          report_id?: string
          report_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_diary_links_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      report_performance_tracking: {
        Row: {
          calculated_cycle_time: number | null
          calculated_lead_time: number | null
          created_at: string
          id: string
          performance_status: string
          priority: number
          project_id: string
          published_at: string | null
          reopen_count: number
          report_id: string
          report_type: Database["public"]["Enums"]["sla_report_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          calculated_cycle_time?: number | null
          calculated_lead_time?: number | null
          created_at?: string
          id?: string
          performance_status?: string
          priority?: number
          project_id: string
          published_at?: string | null
          reopen_count?: number
          report_id: string
          report_type: Database["public"]["Enums"]["sla_report_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          calculated_cycle_time?: number | null
          calculated_lead_time?: number | null
          created_at?: string
          id?: string
          performance_status?: string
          priority?: number
          project_id?: string
          published_at?: string | null
          reopen_count?: number
          report_id?: string
          report_type?: Database["public"]["Enums"]["sla_report_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      report_sla_config: {
        Row: {
          created_at: string
          created_by: string
          default_days: number
          default_hours: number
          escalation_days: number
          escalation_hours: number
          id: string
          is_active: boolean
          report_type: Database["public"]["Enums"]["sla_report_type"]
          updated_at: string
          warning_days: number
          warning_hours: number
        }
        Insert: {
          created_at?: string
          created_by: string
          default_days?: number
          default_hours?: number
          escalation_days?: number
          escalation_hours?: number
          id?: string
          is_active?: boolean
          report_type: Database["public"]["Enums"]["sla_report_type"]
          updated_at?: string
          warning_days?: number
          warning_hours?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          default_days?: number
          default_hours?: number
          escalation_days?: number
          escalation_hours?: number
          id?: string
          is_active?: boolean
          report_type?: Database["public"]["Enums"]["sla_report_type"]
          updated_at?: string
          warning_days?: number
          warning_hours?: number
        }
        Relationships: []
      }
      report_sla_tracking: {
        Row: {
          blocked_at: string | null
          created_at: string
          deadline_at: string
          escalated_at: string | null
          id: string
          project_id: string
          report_id: string
          report_type: Database["public"]["Enums"]["sla_report_type"]
          status: Database["public"]["Enums"]["sla_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          blocked_at?: string | null
          created_at?: string
          deadline_at: string
          escalated_at?: string | null
          id?: string
          project_id: string
          report_id: string
          report_type: Database["public"]["Enums"]["sla_report_type"]
          status?: Database["public"]["Enums"]["sla_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          blocked_at?: string | null
          created_at?: string
          deadline_at?: string
          escalated_at?: string | null
          id?: string
          project_id?: string
          report_id?: string
          report_type?: Database["public"]["Enums"]["sla_report_type"]
          status?: Database["public"]["Enums"]["sla_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      report_templates: {
        Row: {
          created_at: string
          created_by: string
          export_config: Json
          id: string
          is_active: boolean
          name: string
          structure: Json
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          export_config?: Json
          id?: string
          is_active?: boolean
          name: string
          structure?: Json
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          export_config?: Json
          id?: string
          is_active?: boolean
          name?: string
          structure?: Json
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      report_workflow_history: {
        Row: {
          changed_by: string
          created_at: string
          from_status: Database["public"]["Enums"]["workflow_status"] | null
          id: string
          notes: string | null
          to_status: Database["public"]["Enums"]["workflow_status"]
          workflow_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["workflow_status"] | null
          id?: string
          notes?: string | null
          to_status: Database["public"]["Enums"]["workflow_status"]
          workflow_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["workflow_status"] | null
          id?: string
          notes?: string | null
          to_status?: Database["public"]["Enums"]["workflow_status"]
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_workflow_history_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "report_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      report_workflows: {
        Row: {
          assigned_to: string | null
          created_at: string
          escalated_at: string | null
          escalation_level: number
          id: string
          notes: string | null
          project_id: string
          report_id: string
          report_type: Database["public"]["Enums"]["sla_report_type"]
          status: Database["public"]["Enums"]["workflow_status"]
          status_changed_at: string
          status_changed_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          escalated_at?: string | null
          escalation_level?: number
          id?: string
          notes?: string | null
          project_id: string
          report_id: string
          report_type: Database["public"]["Enums"]["sla_report_type"]
          status?: Database["public"]["Enums"]["workflow_status"]
          status_changed_at?: string
          status_changed_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          escalated_at?: string | null
          escalation_level?: number
          id?: string
          notes?: string | null
          project_id?: string
          report_id?: string
          report_type?: Database["public"]["Enums"]["sla_report_type"]
          status?: Database["public"]["Enums"]["workflow_status"]
          status_changed_at?: string
          status_changed_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      retrospectives: {
        Row: {
          action_items: Json
          created_at: string
          id: string
          project_id: string
          sprint_id: string | null
          to_improve: string
          type: string
          updated_at: string
          user_id: string
          went_well: string
        }
        Insert: {
          action_items?: Json
          created_at?: string
          id?: string
          project_id: string
          sprint_id?: string | null
          to_improve?: string
          type?: string
          updated_at?: string
          user_id: string
          went_well?: string
        }
        Update: {
          action_items?: Json
          created_at?: string
          id?: string
          project_id?: string
          sprint_id?: string | null
          to_improve?: string
          type?: string
          updated_at?: string
          user_id?: string
          went_well?: string
        }
        Relationships: [
          {
            foreignKeyName: "retrospectives_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retrospectives_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      short_links: {
        Row: {
          click_count: number | null
          created_at: string | null
          created_by: string
          id: string
          original_url: string
          slug: string
        }
        Insert: {
          click_count?: number | null
          created_at?: string | null
          created_by: string
          id?: string
          original_url: string
          slug: string
        }
        Update: {
          click_count?: number | null
          created_at?: string | null
          created_by?: string
          id?: string
          original_url?: string
          slug?: string
        }
        Relationships: []
      }
      sprint_items: {
        Row: {
          activity_id: string | null
          assignee_name: string | null
          completed_at: string | null
          created_at: string
          description: string
          id: string
          project_id: string
          sprint_id: string
          status: Database["public"]["Enums"]["sprint_item_status"]
          story_points: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          assignee_name?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string
          id?: string
          project_id: string
          sprint_id: string
          status?: Database["public"]["Enums"]["sprint_item_status"]
          story_points?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          assignee_name?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string
          id?: string
          project_id?: string
          sprint_id?: string
          status?: Database["public"]["Enums"]["sprint_item_status"]
          story_points?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprint_items_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_items_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      sprints: {
        Row: {
          created_at: string
          end_date: string
          goal: string
          id: string
          metadata: Json | null
          name: string
          project_id: string
          start_date: string
          status: Database["public"]["Enums"]["sprint_status"]
          updated_at: string
          user_id: string
          velocity_completed: number
          velocity_planned: number
        }
        Insert: {
          created_at?: string
          end_date: string
          goal?: string
          id?: string
          metadata?: Json | null
          name: string
          project_id: string
          start_date: string
          status?: Database["public"]["Enums"]["sprint_status"]
          updated_at?: string
          user_id: string
          velocity_completed?: number
          velocity_planned?: number
        }
        Update: {
          created_at?: string
          end_date?: string
          goal?: string
          id?: string
          metadata?: Json | null
          name?: string
          project_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["sprint_status"]
          updated_at?: string
          user_id?: string
          velocity_completed?: number
          velocity_planned?: number
        }
        Relationships: [
          {
            foreignKeyName: "sprints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          modified_by_email: string | null
          modified_by_name: string | null
          new_data: Json | null
          old_data: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          modified_by_email?: string | null
          modified_by_name?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          modified_by_email?: string | null
          modified_by_name?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          created_by: string
          document: string | null
          email: string | null
          function_role: string
          id: string
          name: string
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          document?: string | null
          email?: string | null
          function_role: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          document?: string | null
          email?: string | null
          function_role?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      team_reports: {
        Row: {
          additional_sections: Json | null
          attachments_title: string | null
          created_at: string
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
      user_permissions: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          permission: Database["public"]["Enums"]["app_permission"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission: Database["public"]["Enums"]["app_permission"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["app_permission"]
          user_id?: string
        }
        Relationships: []
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
      webhook_config: {
        Row: {
          created_at: string
          created_by: string
          events: string[]
          id: string
          is_active: boolean
          name: string
          project_id: string | null
          secret: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by: string
          events?: string[]
          id?: string
          is_active?: boolean
          name: string
          project_id?: string | null
          secret?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string
          events?: string[]
          id?: string
          is_active?: boolean
          name?: string
          project_id?: string | null
          secret?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_config_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          event: string
          id: string
          payload: Json | null
          response_body: string | null
          response_status: number | null
          sent_at: string
          webhook_id: string
        }
        Insert: {
          event: string
          id?: string
          payload?: Json | null
          response_body?: string | null
          response_status?: number | null
          sent_at?: string
          webhook_id: string
        }
        Update: {
          event?: string
          id?: string
          payload?: Json | null
          response_body?: string | null
          response_status?: number | null
          sent_at?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhook_config"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_notifications: {
        Row: {
          changed_by_name: string | null
          created_at: string
          from_status: string | null
          id: string
          is_read: boolean
          notes: string | null
          project_id: string
          recipient_user_id: string
          report_id: string
          report_type: string
          to_status: string
          workflow_id: string
        }
        Insert: {
          changed_by_name?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          is_read?: boolean
          notes?: string | null
          project_id: string
          recipient_user_id: string
          report_id: string
          report_type: string
          to_status: string
          workflow_id: string
        }
        Update: {
          changed_by_name?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          is_read?: boolean
          notes?: string | null
          project_id?: string
          recipient_user_id?: string
          report_id?: string
          report_type?: string
          to_status?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_notifications_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "report_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_role_level: { Args: { _user_id: string }; Returns: number }
      has_permission: {
        Args: {
          _permission: Database["public"]["Enums"]["app_permission"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_channel_creator: {
        Args: { _channel_id: string; _user_id: string }
        Returns: boolean
      }
      is_channel_member: {
        Args: { _channel_id: string; _user_id: string }
        Returns: boolean
      }
      is_project_collaborator: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_project_owner: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_project_team_member_user: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      populate_default_permissions: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      validate_workflow_transition: {
        Args: {
          _current_status: Database["public"]["Enums"]["workflow_status"]
          _new_status: Database["public"]["Enums"]["workflow_status"]
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
      app_permission:
        | "dashboard"
        | "diary"
        | "report_object"
        | "report_team"
        | "team_management"
        | "diary_create"
        | "diary_edit"
        | "diary_delete"
        | "report_object_create"
        | "report_object_edit"
        | "report_object_delete"
        | "report_team_create"
        | "report_team_edit"
        | "report_team_delete"
        | "team_management_create"
        | "team_management_edit"
        | "team_management_delete"
        | "user_management"
        | "user_management_create"
        | "user_management_edit"
        | "user_management_delete"
        | "system_logs"
        | "settings_edit"
        | "project_create"
        | "project_delete"
        | "forms_view"
        | "forms_create"
        | "forms_edit"
        | "forms_delete"
        | "forms_export"
        | "events_view"
        | "events_create"
        | "events_edit"
        | "events_delete"
      app_role:
        | "user"
        | "admin"
        | "super_admin"
        | "oficineiro"
        | "analista"
        | "usuario"
        | "coordenador"
        | "voluntario"
      budget_category:
        | "pessoal"
        | "material"
        | "servicos"
        | "infraestrutura"
        | "comunicacao"
        | "transporte"
        | "alimentacao"
        | "capacitacao"
        | "equipamentos"
        | "outros"
      risk_category:
        | "financeiro"
        | "operacional"
        | "cronograma"
        | "equipe"
        | "externo"
        | "legal"
        | "tecnico"
        | "outro"
      risk_impact:
        | "insignificante"
        | "menor"
        | "moderado"
        | "maior"
        | "catastrofico"
      risk_probability:
        | "muito_baixa"
        | "baixa"
        | "media"
        | "alta"
        | "muito_alta"
      risk_status:
        | "identificado"
        | "em_analise"
        | "mitigando"
        | "aceito"
        | "resolvido"
        | "materializado"
      sla_report_type: "report_object" | "report_team" | "justification"
      sla_status: "no_prazo" | "atencao" | "atrasado" | "bloqueado"
      sprint_item_status: "todo" | "in_progress" | "done" | "blocked"
      sprint_status: "planning" | "active" | "completed" | "cancelled"
      workflow_status:
        | "rascunho"
        | "em_revisao"
        | "aprovado"
        | "publicado"
        | "devolvido"
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
      app_permission: [
        "dashboard",
        "diary",
        "report_object",
        "report_team",
        "team_management",
        "diary_create",
        "diary_edit",
        "diary_delete",
        "report_object_create",
        "report_object_edit",
        "report_object_delete",
        "report_team_create",
        "report_team_edit",
        "report_team_delete",
        "team_management_create",
        "team_management_edit",
        "team_management_delete",
        "user_management",
        "user_management_create",
        "user_management_edit",
        "user_management_delete",
        "system_logs",
        "settings_edit",
        "project_create",
        "project_delete",
        "forms_view",
        "forms_create",
        "forms_edit",
        "forms_delete",
        "forms_export",
        "events_view",
        "events_create",
        "events_edit",
        "events_delete",
      ],
      app_role: [
        "user",
        "admin",
        "super_admin",
        "oficineiro",
        "analista",
        "usuario",
        "coordenador",
        "voluntario",
      ],
      budget_category: [
        "pessoal",
        "material",
        "servicos",
        "infraestrutura",
        "comunicacao",
        "transporte",
        "alimentacao",
        "capacitacao",
        "equipamentos",
        "outros",
      ],
      risk_category: [
        "financeiro",
        "operacional",
        "cronograma",
        "equipe",
        "externo",
        "legal",
        "tecnico",
        "outro",
      ],
      risk_impact: [
        "insignificante",
        "menor",
        "moderado",
        "maior",
        "catastrofico",
      ],
      risk_probability: ["muito_baixa", "baixa", "media", "alta", "muito_alta"],
      risk_status: [
        "identificado",
        "em_analise",
        "mitigando",
        "aceito",
        "resolvido",
        "materializado",
      ],
      sla_report_type: ["report_object", "report_team", "justification"],
      sla_status: ["no_prazo", "atencao", "atrasado", "bloqueado"],
      sprint_item_status: ["todo", "in_progress", "done", "blocked"],
      sprint_status: ["planning", "active", "completed", "cancelled"],
      workflow_status: [
        "rascunho",
        "em_revisao",
        "aprovado",
        "publicado",
        "devolvido",
      ],
    },
  },
} as const
