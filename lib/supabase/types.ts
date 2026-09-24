export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ProfileSex = "male" | "female" | "prefer_not_to_say"
export type ProfileUsageRole = "cycle_tracker" | "supporter" | "both"
export type NotificationEventStatus = "pending" | "sent" | "failed" | "cancelled"
export type CycleReminderType =
  | "period_upcoming"
  | "period_expected"
  | "fertile_window"
  | "ovulation"
  | "cycle_transition"
  | "missed_period"
export type PartnerRelationshipStatus = "pending" | "active" | "revoked" | "declined" | "expired"
export type PartnerInvitationStatus = "pending" | "accepted" | "declined" | "expired" | "cancelled"

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
      notification_preferences: {
        Row: {
          user_id: string
          personal_reminders: boolean
          personal_updates: boolean
          partner_daily_notes: boolean
          partner_cycle_updates: boolean
          partner_activity: boolean
          partner_connection: boolean
          shared_reminders: boolean
          shared_updates: boolean
          system_notifications: boolean
          security_notifications: boolean
          period_reminders: boolean
          fertile_window_reminders: boolean
          ovulation_reminders: boolean
          cycle_transition_reminders: boolean
          missed_period_reminders: boolean
          reminder_days_before: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          personal_reminders?: boolean
          personal_updates?: boolean
          partner_daily_notes?: boolean
          partner_cycle_updates?: boolean
          partner_activity?: boolean
          partner_connection?: boolean
          shared_reminders?: boolean
          shared_updates?: boolean
          system_notifications?: boolean
          security_notifications?: boolean
          period_reminders?: boolean
          fertile_window_reminders?: boolean
          ovulation_reminders?: boolean
          cycle_transition_reminders?: boolean
          missed_period_reminders?: boolean
          reminder_days_before?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          personal_reminders?: boolean
          personal_updates?: boolean
          partner_daily_notes?: boolean
          partner_cycle_updates?: boolean
          partner_activity?: boolean
          partner_connection?: boolean
          shared_reminders?: boolean
          shared_updates?: boolean
          system_notifications?: boolean
          security_notifications?: boolean
          period_reminders?: boolean
          fertile_window_reminders?: boolean
          ovulation_reminders?: boolean
          cycle_transition_reminders?: boolean
          missed_period_reminders?: boolean
          reminder_days_before?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_events: {
        Row: {
          id: string
          user_id: string
          cycle_id: string | null
          type: CycleReminderType
          scheduled_for: string
          sent_at: string | null
          status: NotificationEventStatus
          title: string
          body: string
          url: string
          metadata: Json
          read_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          cycle_id?: string | null
          type: CycleReminderType
          scheduled_for: string
          sent_at?: string | null
          status?: NotificationEventStatus
          title: string
          body: string
          url?: string
          metadata?: Json
          read_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          cycle_id?: string | null
          type?: CycleReminderType
          scheduled_for?: string
          sent_at?: string | null
          status?: NotificationEventStatus
          title?: string
          body?: string
          url?: string
          metadata?: Json
          read_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_relationships: {
        Row: {
          id: string
          owner_user_id: string
          supporter_user_id: string | null
          status: PartnerRelationshipStatus
          created_at: string
          accepted_at: string | null
          revoked_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          owner_user_id: string
          supporter_user_id?: string | null
          status?: PartnerRelationshipStatus
          created_at?: string
          accepted_at?: string | null
          revoked_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          owner_user_id?: string
          supporter_user_id?: string | null
          status?: PartnerRelationshipStatus
          created_at?: string
          accepted_at?: string | null
          revoked_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      partner_sharing_preferences: {
        Row: {
          id: string
          relationship_id: string
          owner_user_id: string
          cycle_estimates: boolean
          period_status: boolean
          cycle_preferences: boolean
          daily_notes: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          relationship_id: string
          owner_user_id: string
          cycle_estimates?: boolean
          period_status?: boolean
          cycle_preferences?: boolean
          daily_notes?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          relationship_id?: string
          owner_user_id?: string
          cycle_estimates?: boolean
          period_status?: boolean
          cycle_preferences?: boolean
          daily_notes?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_sharing_preferences_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: true
            referencedRelation: "partner_relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_invitations: {
        Row: {
          id: string
          relationship_id: string
          inviter_user_id: string
          token_hash: string
          expires_at: string
          status: PartnerInvitationStatus
          created_at: string
          accepted_at: string | null
          declined_at: string | null
          cancelled_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          relationship_id: string
          inviter_user_id: string
          token_hash: string
          expires_at: string
          status?: PartnerInvitationStatus
          created_at?: string
          accepted_at?: string | null
          declined_at?: string | null
          cancelled_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          relationship_id?: string
          inviter_user_id?: string
          token_hash?: string
          expires_at?: string
          status?: PartnerInvitationStatus
          created_at?: string
          accepted_at?: string | null
          declined_at?: string | null
          cancelled_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_invitations_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "partner_relationships"
            referencedColumns: ["id"]
          },
        ]
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
