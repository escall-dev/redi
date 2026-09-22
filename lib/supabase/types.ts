export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ProfileSex = "male" | "female" | "prefer_not_to_say"
export type ProfileUsageRole = "cycle_tracker" | "supporter" | "both"

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          display_name: string | null
          avatar_url: string | null
          sex: ProfileSex | null
          usage_role: ProfileUsageRole | null
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
          sex?: ProfileSex | null
          usage_role?: ProfileUsageRole | null
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
          sex?: ProfileSex | null
          usage_role?: ProfileUsageRole | null
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
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent: string | null
          device_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent?: string | null
          device_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          user_agent?: string | null
          device_name?: string | null
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
      get_all_push_subscriptions_for_admin_test: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
          updated_at: string
        }[]
      }
      delete_expired_push_subscription_admin: {
        Args: {
          target_id: string
        }
        Returns: boolean
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
