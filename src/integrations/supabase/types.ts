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
      booking_groups: {
        Row: {
          company_id: string | null
          contact_name: string
          created_at: string
          id: string
          name: string
          notes: string
          phone: string
        }
        Insert: {
          company_id?: string | null
          contact_name?: string
          created_at?: string
          id?: string
          name: string
          notes?: string
          phone?: string
        }
        Update: {
          company_id?: string | null
          contact_name?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string
          phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_groups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_history: {
        Row: {
          action: string
          booking_id: string
          changed_by: string | null
          created_at: string
          details: string
          id: string
        }
        Insert: {
          action: string
          booking_id: string
          changed_by?: string | null
          created_at?: string
          details?: string
          id?: string
        }
        Update: {
          action?: string
          booking_id?: string
          changed_by?: string | null
          created_at?: string
          details?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
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
          company_id: string | null
          created_at: string
          discount_pct: number
          email: string
          going_to: string
          group_id: string | null
          gst: number
          guest_name: string
          guest_photo_path: string | null
          guests: number
          id: string
          id_back_path: string | null
          id_front_path: string | null
          id_number: string
          id_type: string
          id_verification: string
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
          company_id?: string | null
          created_at?: string
          discount_pct?: number
          email?: string
          going_to?: string
          group_id?: string | null
          gst: number
          guest_name: string
          guest_photo_path?: string | null
          guests?: number
          id?: string
          id_back_path?: string | null
          id_front_path?: string | null
          id_number?: string
          id_type?: string
          id_verification?: string
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
          company_id?: string | null
          created_at?: string
          discount_pct?: number
          email?: string
          going_to?: string
          group_id?: string | null
          gst?: number
          guest_name?: string
          guest_photo_path?: string | null
          guests?: number
          id?: string
          id_back_path?: string | null
          id_front_path?: string | null
          id_number?: string
          id_type?: string
          id_verification?: string
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
            foreignKeyName: "bookings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "booking_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_entries: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          id: string
          kind: string
          reason: string
          session_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string
          id?: string
          kind: string
          reason: string
          session_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          reason?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          counted: number | null
          expected: number | null
          id: string
          notes: string
          opened_at: string
          opened_by: string
          opening_float: number
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          counted?: number | null
          expected?: number | null
          id?: string
          notes?: string
          opened_at?: string
          opened_by?: string
          opening_float?: number
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          counted?: number | null
          expected?: number | null
          id?: string
          notes?: string
          opened_at?: string
          opened_by?: string
          opening_float?: number
        }
        Relationships: []
      }
      channel_reservations: {
        Row: {
          booking_id: string | null
          channel: string
          created_at: string
          error: string
          external_id: string
          id: string
          payload: Json
          status: string
        }
        Insert: {
          booking_id?: string | null
          channel: string
          created_at?: string
          error?: string
          external_id: string
          id?: string
          payload?: Json
          status?: string
        }
        Update: {
          booking_id?: string | null
          channel?: string
          created_at?: string
          error?: string
          external_id?: string
          id?: string
          payload?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_reservations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          active: boolean
          billing_address: string
          contact_person: string
          created_at: string
          credit_limit: number
          discount_pct: number
          email: string
          gstin: string
          id: string
          name: string
          phone: string
        }
        Insert: {
          active?: boolean
          billing_address?: string
          contact_person?: string
          created_at?: string
          credit_limit?: number
          discount_pct?: number
          email?: string
          gstin?: string
          id?: string
          name: string
          phone?: string
        }
        Update: {
          active?: boolean
          billing_address?: string
          contact_person?: string
          created_at?: string
          credit_limit?: number
          discount_pct?: number
          email?: string
          gstin?: string
          id?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      consents: {
        Row: {
          accepted: boolean
          booking_id: string | null
          created_at: string
          id: string
          policy: string
          recorded_by: string
          user_id: string
          version: string
        }
        Insert: {
          accepted?: boolean
          booking_id?: string | null
          created_at?: string
          id?: string
          policy: string
          recorded_by?: string
          user_id: string
          version: string
        }
        Update: {
          accepted?: boolean
          booking_id?: string | null
          created_at?: string
          id?: string
          policy?: string
          recorded_by?: string
          user_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "consents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      deposits: {
        Row: {
          amount: number
          booking_id: string
          created_by: string
          deduction: number
          deduction_reason: string
          id: string
          method: string
          received_at: string
          refund_method: string
          refunded_amount: number
          refunded_at: string | null
          status: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_by?: string
          deduction?: number
          deduction_reason?: string
          id?: string
          method?: string
          received_at?: string
          refund_method?: string
          refunded_amount?: number
          refunded_at?: string | null
          status?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_by?: string
          deduction?: number
          deduction_reason?: string
          id?: string
          method?: string
          received_at?: string
          refund_method?: string
          refunded_amount?: number
          refunded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposits_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      document_access_log: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          path: string
          user_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          path: string
          user_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          path?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          amount: number
          client_name: string
          company_id: string | null
          created_at: string
          created_by: string | null
          end_time: string
          event_date: string
          gst: number
          guests: number
          id: string
          kind: string
          notes: string
          package: string
          paid: number
          phone: string
          start_time: string
          status: string
          title: string
          total: number
          venue: string
        }
        Insert: {
          amount?: number
          client_name: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          end_time?: string
          event_date: string
          gst?: number
          guests?: number
          id?: string
          kind?: string
          notes?: string
          package?: string
          paid?: number
          phone?: string
          start_time?: string
          status?: string
          title: string
          total?: number
          venue?: string
        }
        Update: {
          amount?: number
          client_name?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          end_time?: string
          event_date?: string
          gst?: number
          guests?: number
          id?: string
          kind?: string
          notes?: string
          package?: string
          paid?: number
          phone?: string
          start_time?: string
          status?: string
          title?: string
          total?: number
          venue?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          bill_no: string
          category: string
          created_at: string
          created_by: string
          date: string
          description: string
          gst: number
          id: string
          paid: boolean
          vendor: string
        }
        Insert: {
          amount: number
          bill_no?: string
          category: string
          created_at?: string
          created_by: string
          date?: string
          description?: string
          gst?: number
          id?: string
          paid?: boolean
          vendor?: string
        }
        Update: {
          amount?: number
          bill_no?: string
          category?: string
          created_at?: string
          created_by?: string
          date?: string
          description?: string
          gst?: number
          id?: string
          paid?: boolean
          vendor?: string
        }
        Relationships: []
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
      ingredients: {
        Row: {
          cost_per_unit: number
          created_at: string
          id: string
          min_stock: number
          name: string
          stock: number
          supplier_id: string | null
          unit: string
        }
        Insert: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          min_stock?: number
          name: string
          stock?: number
          supplier_id?: string | null
          unit?: string
        }
        Update: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          min_stock?: number
          name?: string
          stock?: number
          supplier_id?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
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
      minibar_items: {
        Row: {
          active: boolean
          category: string
          created_at: string
          id: string
          name: string
          price: number
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          name: string
          price: number
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          name?: string
          price?: number
        }
        Relationships: []
      }
      night_audits: {
        Row: {
          activity_revenue: number
          arrivals: number
          audit_date: string
          closed_at: string | null
          closed_by: string | null
          collected: number
          created_at: string
          departures: number
          discrepancies: string
          extras_revenue: number
          food_revenue: number
          id: string
          in_house: number
          no_shows: number
          occupied_rooms: number
          other_revenue: number
          outstanding: number
          payments: number
          refunds: number
          room_revenue: number
          run_by: string
          status: string
          taxes: number
          total_rooms: number
        }
        Insert: {
          activity_revenue?: number
          arrivals: number
          audit_date: string
          closed_at?: string | null
          closed_by?: string | null
          collected: number
          created_at?: string
          departures: number
          discrepancies?: string
          extras_revenue: number
          food_revenue?: number
          id?: string
          in_house: number
          no_shows: number
          occupied_rooms: number
          other_revenue?: number
          outstanding?: number
          payments?: number
          refunds?: number
          room_revenue: number
          run_by: string
          status?: string
          taxes?: number
          total_rooms: number
        }
        Update: {
          activity_revenue?: number
          arrivals?: number
          audit_date?: string
          closed_at?: string | null
          closed_by?: string | null
          collected?: number
          created_at?: string
          departures?: number
          discrepancies?: string
          extras_revenue?: number
          food_revenue?: number
          id?: string
          in_house?: number
          no_shows?: number
          occupied_rooms?: number
          other_revenue?: number
          outstanding?: number
          payments?: number
          refunds?: number
          room_revenue?: number
          run_by?: string
          status?: string
          taxes?: number
          total_rooms?: number
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
      recipe_items: {
        Row: {
          id: string
          ingredient_id: string
          menu_item_id: string
          qty: number
        }
        Insert: {
          id?: string
          ingredient_id: string
          menu_item_id: string
          qty: number
        }
        Update: {
          id?: string
          ingredient_id?: string
          menu_item_id?: string
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      resort_settings: {
        Row: {
          early_checkin_fee: number
          early_checkin_from: string
          id: number
          late_checkout_fee: number
          late_checkout_until: string
          security_deposit: number
          updated_at: string
        }
        Insert: {
          early_checkin_fee?: number
          early_checkin_from?: string
          id?: number
          late_checkout_fee?: number
          late_checkout_until?: string
          security_deposit?: number
          updated_at?: string
        }
        Update: {
          early_checkin_fee?: number
          early_checkin_from?: string
          id?: number
          late_checkout_fee?: number
          late_checkout_until?: string
          security_deposit?: number
          updated_at?: string
        }
        Relationships: []
      }
      restaurant_tables: {
        Row: {
          area: string
          created_at: string
          id: string
          number: string
          seats: number
          status: string
        }
        Insert: {
          area?: string
          created_at?: string
          id?: string
          number: string
          seats?: number
          status?: string
        }
        Update: {
          area?: string
          created_at?: string
          id?: string
          number?: string
          seats?: number
          status?: string
        }
        Relationships: []
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
      stock_moves: {
        Row: {
          cost: number
          created_at: string
          created_by: string | null
          id: string
          ingredient_id: string
          kind: string
          note: string
          qty: number
          supplier_id: string | null
        }
        Insert: {
          cost?: number
          created_at?: string
          created_by?: string | null
          id?: string
          ingredient_id: string
          kind: string
          note?: string
          qty: number
          supplier_id?: string | null
        }
        Update: {
          cost?: number
          created_at?: string
          created_by?: string | null
          id?: string
          ingredient_id?: string
          kind?: string
          note?: string
          qty?: number
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_moves_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean
          category: string
          created_at: string
          gstin: string
          id: string
          name: string
          notes: string
          phone: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          gstin?: string
          id?: string
          name: string
          notes?: string
          phone?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          gstin?: string
          id?: string
          name?: string
          notes?: string
          phone?: string
        }
        Relationships: []
      }
      table_orders: {
        Row: {
          created_at: string
          created_by: string
          gst: number
          id: string
          items: Json
          notes: string
          paid: boolean
          payment_method: string
          status: string
          subtotal: number
          table_id: string
          total: number
        }
        Insert: {
          created_at?: string
          created_by: string
          gst: number
          id?: string
          items: Json
          notes?: string
          paid?: boolean
          payment_method?: string
          status?: string
          subtotal: number
          table_id: string
          total: number
        }
        Update: {
          created_at?: string
          created_by?: string
          gst?: number
          id?: string
          items?: Json
          notes?: string
          paid?: boolean
          payment_method?: string
          status?: string
          subtotal?: number
          table_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "table_orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
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
      waitlist: {
        Row: {
          check_in: string
          check_out: string
          created_at: string
          email: string
          guest_name: string
          guests: number
          id: string
          phone: string
          room_type_id: string
          status: string
          user_id: string
        }
        Insert: {
          check_in: string
          check_out: string
          created_at?: string
          email?: string
          guest_name: string
          guests?: number
          id?: string
          phone: string
          room_type_id: string
          status?: string
          user_id: string
        }
        Update: {
          check_in?: string
          check_out?: string
          created_at?: string
          email?: string
          guest_name?: string
          guests?: number
          id?: string
          phone?: string
          room_type_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
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
      apply_time_fee: {
        Args: { _booking_id: string; _kind: string }
        Returns: undefined
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
      can_finance: { Args: { _user_id: string }; Returns: boolean }
      can_housekeeping: { Args: { _user_id: string }; Returns: boolean }
      can_kitchen: { Args: { _user_id: string }; Returns: boolean }
      cash_expected: { Args: { _session_id: string }; Returns: number }
      claim_first_admin: { Args: never; Returns: boolean }
      close_cash_session: {
        Args: { _counted: number; _notes: string; _session_id: string }
        Returns: number
      }
      close_night_audit: { Args: { _date: string }; Returns: undefined }
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
      log_doc_access: {
        Args: { _booking_id: string; _path: string }
        Returns: undefined
      }
      modify_booking: {
        Args: {
          _check_in: string
          _check_out: string
          _guests: number
          _id: string
          _room_type_id: string
        }
        Returns: number
      }
      place_order: {
        Args: { _booking_id: string; _items: Json; _notes: string }
        Returns: string
      }
      place_table_order: {
        Args: { _items: Json; _notes: string; _table_id: string }
        Returns: string
      }
      revoke_staff_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      rooms_free: {
        Args: {
          _exclude?: string
          _in: string
          _out: string
          _room_type_id: string
        }
        Returns: number
      }
      run_night_audit: { Args: { _date: string }; Returns: string }
      staff_directory: {
        Args: never
        Returns: {
          email: string
          roles: string[]
          user_id: string
        }[]
      }
      waitlist_available: {
        Args: never
        Returns: {
          id: string
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
