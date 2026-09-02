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
      documents: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          title: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          title: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          title?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          active: boolean
          body: string | null
          created_at: string
          created_by: string | null
          id: string
          level: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          level?: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          level?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          display_name: string
          id: number
          logo_path: string | null
          tagline: string | null
          tip_phone: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          display_name?: string
          id?: number
          logo_path?: string | null
          tagline?: string | null
          tip_phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          display_name?: string
          id?: number
          logo_path?: string | null
          tagline?: string | null
          tip_phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      sponsors: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          logo_path: string | null
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          logo_path?: string | null
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          logo_path?: string | null
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      persons: {
        Row: {
          id: string
          first_name: string | null
          last_name: string | null
          gender: string | null
          aliases: string[]
          description: string | null
          address: string | null
          city: string | null
          connections: string | null
          notes: string | null
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
          search: unknown | null
        }
        Insert: {
          id?: string
          first_name?: string | null
          last_name?: string | null
          gender?: string | null
          aliases?: string[]
          description?: string | null
          address?: string | null
          city?: string | null
          connections?: string | null
          notes?: string | null
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string | null
          last_name?: string | null
          gender?: string | null
          aliases?: string[]
          description?: string | null
          address?: string | null
          city?: string | null
          connections?: string | null
          notes?: string | null
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      observation_persons: {
        Row: { created_at: string; observation_id: string; person_id: string }
        Insert: { created_at?: string; observation_id: string; person_id: string }
        Update: { created_at?: string; observation_id?: string; person_id?: string }
        Relationships: []
      }
      person_vehicles: {
        Row: { created_at: string; person_id: string; vehicle_id: string }
        Insert: { created_at?: string; person_id: string; vehicle_id: string }
        Update: { created_at?: string; person_id?: string; vehicle_id?: string }
        Relationships: []
      }
      observation_images: {
        Row: {
          id: string
          observation_id: string
          file_path: string
          caption: string | null
          uploaded_by: string | null
          created_at: string
          search: unknown | null
        }
        Insert: {
          id?: string
          observation_id: string
          file_path: string
          caption?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          observation_id?: string
          file_path?: string
          caption?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      logbook_images: {
        Row: {
          id: string
          logbook_entry_id: string
          file_path: string
          caption: string | null
          uploaded_by: string | null
          created_at: string
          search: unknown | null
        }
        Insert: {
          id?: string
          logbook_entry_id: string
          file_path: string
          caption?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          logbook_entry_id?: string
          file_path?: string
          caption?: string | null
          uploaded_by?: string | null
          created_at?: string
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
          uses_guard_car: boolean
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
          uses_guard_car?: boolean
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
          uses_guard_car?: boolean
        }
        Relationships: []
      }
      shift_history: {
        Row: {
          ends_at: string
          recorded_at: string
          shift_id: string
          starts_at: string
          uses_guard_car: boolean
        }
        Insert: {
          ends_at: string
          recorded_at?: string
          shift_id: string
          starts_at: string
          uses_guard_car: boolean
        }
        Update: {
          ends_at?: string
          recorded_at?: string
          shift_id?: string
          starts_at?: string
          uses_guard_car?: boolean
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
          owner_name: string | null
          registration_normalized: string | null
          registration_number: string
          updated_at: string
          vehicle_type: string | null
          year_model: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          make?: string | null
          model?: string | null
          notes?: string | null
          owner_name?: string | null
          registration_number: string
          updated_at?: string
          vehicle_type?: string | null
          year_model?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          make?: string | null
          model?: string | null
          notes?: string | null
          owner_name?: string | null
          registration_number?: string
          updated_at?: string
          vehicle_type?: string | null
          year_model?: number | null
        }
        Relationships: []
      }
      fuel_gauge: {
        Row: {
          id: number
          level: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: number
          level?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: number
          level?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      search_logs: {
        Row: {
          clicked_at: string
          id: string
          query: string
          result_id: string
          result_label: string
          result_type: string
          searched_by: string | null
        }
        Insert: {
          clicked_at?: string
          id?: string
          query: string
          result_id: string
          result_label: string
          result_type: string
          searched_by?: string | null
        }
        Update: {
          clicked_at?: string
          id?: string
          query?: string
          result_id?: string
          result_label?: string
          result_type?: string
          searched_by?: string | null
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
          owner_name: string | null
          registration_normalized: string | null
          registration_number: string | null
          updated_at: string | null
          vehicle_type: string | null
          year_model: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      gdpr_purge: { Args: { dry_run?: boolean }; Returns: Json }
      is_active_member: { Args: { uid?: string }; Returns: boolean }
      lock_in_completed_shifts: { Args: Record<string, never>; Returns: number }
      is_admin: { Args: { uid?: string }; Returns: boolean }
      normalize_regnr: { Args: { input: string }; Returns: string }
      search_leaderboard: {
        Args: { limit_n?: number }
        Returns: {
          category: string
          hits: number
          label: string
        }[]
      }
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
      user_role: 'medlem' | 'admin' | 'styrelse'
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
export type DocumentRow = Tables<'documents'>
export type Announcement = Tables<'announcements'>
export type SiteSettings = Tables<'site_settings'>
export type Sponsor = Tables<'sponsors'>
export type Person = Tables<'persons'>
export type ObservationImage = Tables<'observation_images'>
export type LogbookImage = Tables<'logbook_images'>
export type UserRole = Enums<'user_role'>
export type SearchResult = PublicSchema['Functions']['search_all']['Returns'][number]
export type FuelGauge = Tables<'fuel_gauge'>
export type SearchLog = Tables<'search_logs'>
export type SearchLeaderboardRow = PublicSchema['Functions']['search_leaderboard']['Returns'][number]
