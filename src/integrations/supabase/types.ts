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
      alerts: {
        Row: {
          alert_type: string
          created_at: string
          description: string
          doctor_id: string
          id: string
          patient_id: string
          related_id: string | null
          related_type: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          description?: string
          doctor_id: string
          id?: string
          patient_id: string
          related_id?: string | null
          related_type?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          description?: string
          doctor_id?: string
          id?: string
          patient_id?: string
          related_id?: string | null
          related_type?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_checkins: {
        Row: {
          appointment_id: string
          called_at: string | null
          checked_in_at: string
          clinic_id: string | null
          completed_at: string | null
          doctor_id: string
          estimated_wait_minutes: number | null
          id: string
          patient_id: string
          queue_number: number | null
          status: string
        }
        Insert: {
          appointment_id: string
          called_at?: string | null
          checked_in_at?: string
          clinic_id?: string | null
          completed_at?: string | null
          doctor_id: string
          estimated_wait_minutes?: number | null
          id?: string
          patient_id: string
          queue_number?: number | null
          status?: string
        }
        Update: {
          appointment_id?: string
          called_at?: string | null
          checked_in_at?: string
          clinic_id?: string | null
          completed_at?: string | null
          doctor_id?: string
          estimated_wait_minutes?: number | null
          id?: string
          patient_id?: string
          queue_number?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_checkins_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_checkins_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_checkins_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_type: string
          cancellation_reason: string | null
          clinic_id: string | null
          created_at: string
          doctor_id: string
          duration_minutes: number
          id: string
          notes: string | null
          patient_id: string
          rebook_from: string | null
          scheduled_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          appointment_type?: string
          cancellation_reason?: string | null
          clinic_id?: string | null
          created_at?: string
          doctor_id: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_id: string
          rebook_from?: string | null
          scheduled_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          appointment_type?: string
          cancellation_reason?: string | null
          clinic_id?: string | null
          created_at?: string
          doctor_id?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_id?: string
          rebook_from?: string | null
          scheduled_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_rebook_from_fkey"
            columns: ["rebook_from"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_invites: {
        Row: {
          accepted_at: string | null
          clinic_id: string
          created_at: string
          email: string
          id: string
          invite_code: string
          invited_by: string
          role: Database["public"]["Enums"]["clinic_role"]
          status: string
        }
        Insert: {
          accepted_at?: string | null
          clinic_id: string
          created_at?: string
          email: string
          id?: string
          invite_code?: string
          invited_by: string
          role?: Database["public"]["Enums"]["clinic_role"]
          status?: string
        }
        Update: {
          accepted_at?: string | null
          clinic_id?: string
          created_at?: string
          email?: string
          id?: string
          invite_code?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["clinic_role"]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_invites_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_members: {
        Row: {
          clinic_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["clinic_role"]
          user_id: string
        }
        Insert: {
          clinic_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["clinic_role"]
          user_id: string
        }
        Update: {
          clinic_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["clinic_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_members_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          bed_count: number | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          opd_capacity: number | null
          phone: string | null
          specialties: string[] | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          bed_count?: number | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          opd_capacity?: number | null
          phone?: string | null
          specialties?: string[] | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          bed_count?: number | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          opd_capacity?: number | null
          phone?: string | null
          specialties?: string[] | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      doctor_availability: {
        Row: {
          appointment_types: string[]
          clinic_id: string | null
          created_at: string
          day_of_week: number
          doctor_id: string
          end_time: string
          id: string
          is_active: boolean
          max_patients: number | null
          slot_duration_minutes: number
          start_time: string
          updated_at: string
        }
        Insert: {
          appointment_types?: string[]
          clinic_id?: string | null
          created_at?: string
          day_of_week: number
          doctor_id: string
          end_time: string
          id?: string
          is_active?: boolean
          max_patients?: number | null
          slot_duration_minutes?: number
          start_time: string
          updated_at?: string
        }
        Update: {
          appointment_types?: string[]
          clinic_id?: string | null
          created_at?: string
          day_of_week?: number
          doctor_id?: string
          end_time?: string
          id?: string
          is_active?: boolean
          max_patients?: number | null
          slot_duration_minutes?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_availability_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          adherence_pct: number | null
          completed_at: string | null
          created_at: string
          doctor_id: string
          enrolled_at: string
          id: string
          patient_id: string
          program_id: string
          status: string
        }
        Insert: {
          adherence_pct?: number | null
          completed_at?: string | null
          created_at?: string
          doctor_id: string
          enrolled_at?: string
          id?: string
          patient_id: string
          program_id: string
          status?: string
        }
        Update: {
          adherence_pct?: number | null
          completed_at?: string | null
          created_at?: string
          doctor_id?: string
          enrolled_at?: string
          id?: string
          patient_id?: string
          program_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_suggestions: {
        Row: {
          appointment_id: string
          booked_appointment_id: string | null
          created_at: string
          doctor_id: string
          id: string
          patient_id: string
          reason: string | null
          status: string
          suggested_date: string | null
        }
        Insert: {
          appointment_id: string
          booked_appointment_id?: string | null
          created_at?: string
          doctor_id: string
          id?: string
          patient_id: string
          reason?: string | null
          status?: string
          suggested_date?: string | null
        }
        Update: {
          appointment_id?: string
          booked_appointment_id?: string | null
          created_at?: string
          doctor_id?: string
          id?: string
          patient_id?: string
          reason?: string | null
          status?: string
          suggested_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_suggestions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_suggestions_booked_appointment_id_fkey"
            columns: ["booked_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_suggestions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      food_logs: {
        Row: {
          created_at: string
          doctor_id: string
          food_items: Json
          id: string
          logged_at: string
          meal_type: string
          notes: string | null
          patient_id: string
          raw_message: string | null
          source: string
          total_calories: number | null
          total_carbs: number | null
          total_fat: number | null
          total_protein: number | null
        }
        Insert: {
          created_at?: string
          doctor_id: string
          food_items?: Json
          id?: string
          logged_at?: string
          meal_type?: string
          notes?: string | null
          patient_id: string
          raw_message?: string | null
          source?: string
          total_calories?: number | null
          total_carbs?: number | null
          total_fat?: number | null
          total_protein?: number | null
        }
        Update: {
          created_at?: string
          doctor_id?: string
          food_items?: Json
          id?: string
          logged_at?: string
          meal_type?: string
          notes?: string | null
          patient_id?: string
          raw_message?: string | null
          source?: string
          total_calories?: number | null
          total_carbs?: number | null
          total_fat?: number | null
          total_protein?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "food_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_results: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          notes: string | null
          patient_id: string
          reference_range: string | null
          result_value: string
          status: string
          test_name: string
          tested_at: string
          unit: string | null
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          notes?: string | null
          patient_id: string
          reference_range?: string | null
          result_value: string
          status?: string
          test_name: string
          tested_at?: string
          unit?: string | null
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          reference_range?: string | null
          result_value?: string
          status?: string
          test_name?: string
          tested_at?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      link_requests: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          linked_patient_id: string | null
          message: string | null
          patient_name: string
          patient_user_id: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          linked_patient_id?: string | null
          message?: string | null
          patient_name: string
          patient_user_id: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          linked_patient_id?: string | null
          message?: string | null
          patient_name?: string
          patient_user_id?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_requests_linked_patient_id_fkey"
            columns: ["linked_patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          category: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_id: string | null
          related_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_id?: string | null
          related_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          related_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      patient_doctor_links: {
        Row: {
          doctor_name: string | null
          doctor_user_id: string
          id: string
          patient_user_id: string
          requested_at: string
          responded_at: string | null
          status: string
        }
        Insert: {
          doctor_name?: string | null
          doctor_user_id: string
          id?: string
          patient_user_id: string
          requested_at?: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          doctor_name?: string | null
          doctor_user_id?: string
          id?: string
          patient_user_id?: string
          requested_at?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      patient_documents: {
        Row: {
          category: string
          created_at: string
          doctor_id: string
          file_name: string
          file_path: string
          file_size_bytes: number | null
          file_type: string | null
          id: string
          notes: string | null
          patient_id: string
          uploaded_by: string
        }
        Insert: {
          category?: string
          created_at?: string
          doctor_id: string
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          uploaded_by: string
        }
        Update: {
          category?: string
          created_at?: string
          doctor_id?: string
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_vault_codes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          patient_user_id: string
          vault_code: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          patient_user_id: string
          vault_code?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          patient_user_id?: string
          vault_code?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          age: number | null
          clinic_id: string | null
          conditions: string[] | null
          consent_given_at: string | null
          consent_ip: string | null
          created_at: string
          doctor_id: string
          emergency_contact: string | null
          full_name: string
          gender: string | null
          id: string
          language_preference: string | null
          last_check_in: string | null
          medications: string[] | null
          patient_user_id: string | null
          phone: string
          status: string
          updated_at: string
        }
        Insert: {
          age?: number | null
          clinic_id?: string | null
          conditions?: string[] | null
          consent_given_at?: string | null
          consent_ip?: string | null
          created_at?: string
          doctor_id: string
          emergency_contact?: string | null
          full_name: string
          gender?: string | null
          id?: string
          language_preference?: string | null
          last_check_in?: string | null
          medications?: string[] | null
          patient_user_id?: string | null
          phone?: string
          status?: string
          updated_at?: string
        }
        Update: {
          age?: number | null
          clinic_id?: string | null
          conditions?: string[] | null
          consent_given_at?: string | null
          consent_ip?: string | null
          created_at?: string
          doctor_id?: string
          emergency_contact?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          language_preference?: string | null
          last_check_in?: string | null
          medications?: string[] | null
          patient_user_id?: string | null
          phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          doctor_code: string | null
          full_name: string
          id: string
          phone: string | null
          specialties: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          doctor_code?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          specialties?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          doctor_code?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          specialties?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string
          description: string | null
          doctor_id: string
          duration_days: number
          id: string
          is_active: boolean
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          doctor_id: string
          duration_days?: number
          id?: string
          is_active?: boolean
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          doctor_id?: string
          duration_days?: number
          id?: string
          is_active?: boolean
          name?: string
          type?: string
          updated_at?: string
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vitals: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          notes: string | null
          patient_id: string
          recorded_at: string
          unit: string | null
          value_numeric: number | null
          value_text: string
          vital_type: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          notes?: string | null
          patient_id: string
          recorded_at?: string
          unit?: string | null
          value_numeric?: number | null
          value_text: string
          vital_type: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          recorded_at?: string
          unit?: string | null
          value_numeric?: number | null
          value_text?: string
          vital_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vitals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_clinic_ids: { Args: { _user_id: string }; Returns: string[] }
      has_clinic_role: {
        Args: {
          _clinic_id: string
          _role: Database["public"]["Enums"]["clinic_role"]
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
      is_clinic_member: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "doctor" | "patient"
      clinic_role: "owner" | "admin" | "doctor" | "nurse" | "staff"
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
      app_role: ["doctor", "patient"],
      clinic_role: ["owner", "admin", "doctor", "nurse", "staff"],
    },
  },
} as const
