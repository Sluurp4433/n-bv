export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.15'
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          edit_window_hours: number
          id: number
          retention_months: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          edit_window_hours?: number
          id?: number
          retention_months?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          edit_window_hours?: number
          id?: number
          retention_months?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: number
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: never
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: never
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      logbook_entries: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
          created_by: string | null
          entry_at: string
          id: string
          location: string | null
          search: unknown
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          entry_at?: string
          id?: string
          location?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          entry_at?: string
          id?: string
          location?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      observation_vehicles: {
        Row: {
          created_at: string
          observation_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          observation_id: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          observation_id?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      observations: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          location: string | null
          notes: string | null
          observed_at: string
          priority: string
          search: unknown
          type: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          observed_at?: string
          priority?: string
          type?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          observed_at?: string
          priority?: string
          type?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          avatar: Json | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          personal_color: string | null
          role: Database['public']['Enums']['user_role']
          updated_at: string
        }
        Insert: {
          active?: boolean
          avatar?: Json | null
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          personal_color?: string | null
          role?: Database['public']['Enums']['user_role']
          updated_at?: string
        }
        Update: {
          active?: boolean
          avatar?: Json | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          personal_color?: string | null
          role?: Database['public']['Enums']['user_role']
          updated_at?: string
        }
        Relationships: []
      }
      shifts: {
        Row: {
          capacity: number
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          location: string | null
          notes: string | null
          starts_at: string
          title: string | null
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          location?: string | null
          notes?: string | null
          starts_at: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          starts_at?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shift_bookings: {
        Row: {
          created_at: string
          id: string
          shift_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          shift_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          shift_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'shift_bookings_shift_id_fkey'
            columns: ['shift_id']
            isOneToOne: false
            referencedRelation: 'shifts'
            referencedColumns: ['id']
          },
        ]
      }
      vehicles: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          id: string
          make: string | null
          model: string | null
          notes: string | null
          registration_normalized: string | null
          registration_number: string
          updated_at: string
          vehicle_type: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          make?: string | null
          model?: string | null
          notes?: string | null
          registration_number: string
          updated_at?: string
          vehicle_type?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          make?: string | null
          model?: string | null
          notes?: string | null
          registration_number?: string
          updated_at?: string
          vehicle_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      vehicle_overview: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          id: string | null
          last_observed: string | null
          make: string | null
          model: string | null
          notes: string | null
          observation_count: number | null
          registration_normalized: string | null
          registration_number: string | null
          updated_at: string | null
          vehicle_type: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      dashboard_stats: { Args: Record<string, never>; Returns: Json }
      gdpr_purge: { Args: { dry_run?: boolean }; Returns: Json }
      is_active_member: { Args: { uid?: string }; Returns: boolean }
      is_admin: { Args: { uid?: string }; Returns: boolean }
      normalize_regnr: { Args: { input: string }; Returns: string }
      search_all: {
        Args: { q: string }
        Returns: {
          occurred_at: string
          rank: number
          result_id: string
          result_type: string
          snippet: string
          subtitle: string
          title: string
        }[]
      }
      within_edit_window: { Args: { created: string }; Returns: boolean }
    }
    Enums: {
      user_role: 'medlem' | 'admin'
    }
    CompositeTypes: Record<string, never>
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update']
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T]

export type Profile = Tables<'profiles'>
export type Observation = Tables<'observations'>
export type LogbookEntry = Tables<'logbook_entries'>
export type Vehicle = Tables<'vehicles'>
export type Shift = Tables<'shifts'>
export type ShiftBooking = Tables<'shift_bookings'>
export type VehicleOverview = PublicSchema['Views']['vehicle_overview']['Row']
export type AuditLog = Tables<'audit_logs'>
export type AppSettings = Tables<'app_settings'>
export type UserRole = Enums<'user_role'>
export type SearchResult = PublicSchema['Functions']['search_all']['Returns'][number]
