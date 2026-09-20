export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          display_name: string | null
          avatar_url: string | null
          last_period_start: string | null
          typical_cycle_length: number | null
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          display_name?: string | null
          avatar_url?: string | null
          last_period_start?: string | null
          typical_cycle_length?: number | null
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          display_name?: string | null
          avatar_url?: string | null
          last_period_start?: string | null
          typical_cycle_length?: number | null
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      cycles: {
        Row: {
          id: string
          user_id: string
          start_date: string
          end_date: string | null
          cycle_length: number | null
          period_duration: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          start_date: string
          end_date?: string | null
          cycle_length?: number | null
          period_duration?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          start_date?: string
          end_date?: string | null
          cycle_length?: number | null
          period_duration?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      period_days: {
        Row: {
          id: string
          cycle_id: string
          user_id: string
          date: string
          flow: "light" | "medium" | "heavy"
          created_at: string
        }
        Insert: {
          id?: string
          cycle_id: string
          user_id: string
          date: string
          flow: "light" | "medium" | "heavy"
          created_at?: string
        }
        Update: {
          id?: string
          cycle_id?: string
          user_id?: string
          date?: string
          flow?: "light" | "medium" | "heavy"
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "period_days_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      symptoms: {
        Row: {
          id: string
          user_id: string
          date: string
          symptom: string
          severity: "mild" | "moderate" | "severe"
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          symptom: string
          severity: "mild" | "moderate" | "severe"
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          symptom?: string
          severity?: "mild" | "moderate" | "severe"
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      daily_notes: {
        Row: {
          id: string
          user_id: string
          date: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
