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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          active: boolean
          capacity: number
          category: string
          description: string
          duration_min: number
          id: string
          name: string
          price: number
          slots: string[]
          sort_order: number
        }
        Insert: {
          active?: boolean
          capacity?: number
          category?: string
          description?: string
          duration_min?: number
          id?: string
          name: string
          price: number
          slots?: string[]
          sort_order?: number
        }
        Update: {
          active?: boolean
          capacity?: number
          category?: string
          description?: string
          duration_min?: number
          id?: string
          name?: string
          price?: number
          slots?: string[]
          sort_order?: number
        }
        Relationships: []
      }
      activity_bookings: {
        Row: {
          activity_id: string
          booking_id: string
          created_at: string
          date: string
          id: string
          people: number
          slot: string
          status: string
          total: number
          user_id: string
        }
        Insert: {
          activity_id: string
          booking_id: string
          created_at?: string
          date: string
          id?: string
          people: number
          slot: string
          status?: string
          total: number
          user_id: string
        }
        Update: {
          activity_id?: string
          booking_id?: string
          created_at?: string
          date?: string
          id?: string
          people?: number
          slot?: string
          status?: string
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_bookings_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_bookings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          clock_in: string
          clock_out: string | null
          id: string
          user_id: string
        }
        Insert: {
          clock_in?: string
          clock_out?: string | null
          id?: string
          user_id?: string
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          address: string
          adults: number | null
          cancelled_at: string | null
          check_in: string
          check_out: string
          checked_in_at: string | null
          checked_out_at: string | null
          children: number | null
          coming_from: string
          created_at: string
          email: string
          going_to: string
          gst: number
          guest_name: string
          guest_photo_path: string | null
          guests: number
          id: string
          id_back_path: string | null
          id_front_path: string | null
          id_number: string
          id_type: string
          nationality: string
          nights: number
          notes: string
          phone: string
          purpose: string
          room_number: string
          room_type_id: string
          source: string
          status: string
          subtotal: number
          total: number
          user_id: string
          vehicle_number: string
          visa_number: string
        }
        Insert: {
          address?: string
          adults?: number | null
          cancelled_at?: string | null
          check_in: string
          check_out: string
          checked_in_at?: string | null
          checked_out_at?: string | null
          children?: number | null
          coming_from?: string
          created_at?: string
          email?: string
          going_to?: string
          gst: number
          guest_name: string
          guest_photo_path?: string | null
          guests?: number
          id?: string
          id_back_path?: string | null
          id_front_path?: string | null
          id_number?: string
          id_type?: string
          nationality?: string
          nights: number
          notes?: string
          phone?: string
          purpose?: string
          room_number?: string
          room_type_id: string
          source?: string
          status?: string
          subtotal: number
          total: number
          user_id: string
          vehicle_number?: string
          visa_number?: string
        }
        Update: {
          address?: string
          adults?: number | null
          cancelled_at?: string | null
          check_in?: string
          check_out?: string
          checked_in_at?: string | null
          checked_out_at?: string | null
          children?: number | null
          coming_from?: string
          created_at?: string
          email?: string
          going_to?: string
          gst?: number
          guest_name?: string
          guest_photo_path?: string | null
          guests?: number
          id?: string
          id_back_path?: string | null
          id_front_path?: string | null
          id_number?: string
          id_type?: string
          nationality?: string
          nights?: number
          notes?: string
          phone?: string
          purpose?: string
          room_number?: string
          room_type_id?: string
          source?: string
          status?: string
          subtotal?: number
          total?: number
          user_id?: string
          vehicle_number?: string
          visa_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      folio_charges: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          created_by: string
          description: string
          id: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          created_by?: string
          description: string
          id?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folio_charges_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      hk_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          kind: string
          notes: string
          room_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          kind?: string
          notes?: string
          room_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          kind?: string
          notes?: string
          room_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "hk_tasks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string
          from_date: string
          id: string
          reason: string
          status: string
          to_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_date: string
          id?: string
          reason?: string
          status?: string
          to_date: string
          user_id?: string
        }
        Update: {
          created_at?: string
          from_date?: string
          id?: string
          reason?: string
          status?: string
          to_date?: string
          user_id?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          available: boolean
          category: string
          created_at: string
          description: string
          id: string
          is_veg: boolean
          name: string
          price: number
          sort_order: number
        }
        Insert: {
          available?: boolean
          category: string
          created_at?: string
          description?: string
          id?: string
          is_veg?: boolean
          name: string
          price: number
          sort_order?: number
        }
        Update: {
          available?: boolean
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_veg?: boolean
          name?: string
          price?: number
          sort_order?: number
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          menu_item_id: string
          name: string
          order_id: string
          price: number
          qty: number
        }
        Insert: {
          id?: string
          menu_item_id: string
          name: string
          order_id: string
          price: number
          qty: number
        }
        Update: {
          id?: string
          menu_item_id?: string
          name?: string
          order_id?: string
          price?: number
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          booking_id: string
          created_at: string
          gst: number
          id: string
          notes: string
          room_number: string
          status: string
          subtotal: number
          total: number
          user_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          gst: number
          id?: string
          notes?: string
          room_number?: string
          status?: string
          subtotal: number
          total: number
          user_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          gst?: number
          id?: string
          notes?: string
          room_number?: string
          status?: string
          subtotal?: number
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          created_by: string
          id: string
          kind: string
          method: string
          note: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          method?: string
          note?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          method?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      room_types: {
        Row: {
          created_at: string
          description: string
          id: string
          max_guests: number
          name: string
          price_per_night: number
          sort_order: number
          total_rooms: number
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          max_guests?: number
          name: string
          price_per_night: number
          sort_order?: number
          total_rooms?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          max_guests?: number
          name?: string
          price_per_night?: number
          sort_order?: number
          total_rooms?: number
        }
        Relationships: []
      }
      rooms: {
        Row: {
          hk_status: string
          id: string
          note: string
          number: string
          room_type_id: string
          updated_at: string
        }
        Insert: {
          hk_status?: string
          id?: string
          note?: string
          number: string
          room_type_id: string
          updated_at?: string
        }
        Update: {
          hk_status?: string
          id?: string
          note?: string
          number?: string
          room_type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          end_date: string
          id: string
          multiplier: number
          name: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          multiplier?: number
          name: string
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          multiplier?: number
          name?: string
          start_date?: string
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          kind: string
          message: string
          room_number: string
          status: string
          user_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          kind: string
          message: string
          room_number?: string
          status?: string
          user_id?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          kind?: string
          message?: string
          room_number?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string
          date: string
          end_time: string
          id: string
          note: string
          start_time: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          end_time: string
          id?: string
          note?: string
          start_time: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          note?: string
          start_time?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activity_slots_used: {
        Args: { _activity_id: string; _date: string }
        Returns: {
          slot: string
          used: number
        }[]
      }
      book_activity: {
        Args: {
          _activity_id: string
          _booking_id: string
          _date: string
          _people: number
          _slot: string
        }
        Returns: string
      }
      can_housekeeping: { Args: { _user_id: string }; Returns: boolean }
      can_kitchen: { Args: { _user_id: string }; Returns: boolean }
      claim_first_admin: { Args: never; Returns: boolean }
      grant_staff_role: {
        Args: { _email: string; _role: Database["public"]["Enums"]["app_role"] }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_any_staff: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      list_staff: {
        Args: never
        Returns: {
          email: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      place_order: {
        Args: { _booking_id: string; _items: Json; _notes: string }
        Returns: string
      }
      revoke_staff_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      staff_directory: {
        Args: never
        Returns: {
          email: string
          roles: string[]
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "front_desk" | "kitchen" | "housekeeping" | "finance"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "front_desk", "kitchen", "housekeeping", "finance"],
    },
  },
} as const
