export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          bio: string | null;
          avatar_url: string | null;
          city: string | null;
          website: string | null;
          country: string | null;
          lat: number | null;
          lng: number | null;
          is_public: boolean;
          is_verified: boolean;
          is_admin: boolean;
          preferred_city: string | null;
          preferences: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          full_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          city?: string | null;
          website?: string | null;
          country?: string | null;
          lat?: number | null;
          lng?: number | null;
          is_public?: boolean;
          is_verified?: boolean;
          is_admin?: boolean;
          preferred_city?: string | null;
          preferences?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          full_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          city?: string | null;
          website?: string | null;
          country?: string | null;
          lat?: number | null;
          lng?: number | null;
          is_public?: boolean;
          is_verified?: boolean;
          is_admin?: boolean;
          preferred_city?: string | null;
          preferences?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          creator_id: string | null;
          title: string;
          slug: string;
          description: string | null;
          category: string | null;
          visibility: string;
          source_url: string | null;
          source_name: string | null;
          starts_at: string;
          ends_at: string | null;
          timezone: string;
          venue_name: string | null;
          address_line: string | null;
          city: string | null;
          region: string | null;
          country: string | null;
          latitude: number | null;
          longitude: number | null;
          geom: Json | null;
          location: Json | null;
          cover_image_url: string | null;
          price_label: string | null;
          external_id: string | null;
          normalized_hash: string | null;
          search_document: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          creator_id?: string | null;
          title: string;
          slug: string;
          description?: string | null;
          category?: string | null;
          visibility?: string;
          source_url?: string | null;
          source_name?: string | null;
          starts_at: string;
          ends_at?: string | null;
          timezone?: string;
          venue_name?: string | null;
          address_line?: string | null;
          city?: string | null;
          region?: string | null;
          country?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          geom?: Json | null;
          location?: Json | null;
          cover_image_url?: string | null;
          price_label?: string | null;
          external_id?: string | null;
          normalized_hash?: string | null;
          search_document?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          creator_id?: string | null;
          title?: string;
          slug?: string;
          description?: string | null;
          category?: string | null;
          visibility?: string;
          source_url?: string | null;
          source_name?: string | null;
          starts_at?: string;
          ends_at?: string | null;
          timezone?: string;
          venue_name?: string | null;
          address_line?: string | null;
          city?: string | null;
          region?: string | null;
          country?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          geom?: Json | null;
          location?: Json | null;
          cover_image_url?: string | null;
          price_label?: string | null;
          external_id?: string | null;
          normalized_hash?: string | null;
          search_document?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      event_rsvps: {
        Row: {
          user_id: string;
          event_id: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          event_id: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          event_id?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          }
        ];
      };
      event_saves: {
        Row: {
          user_id: string;
          event_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          event_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          event_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_saves_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          }
        ];
      };
      chat_rooms: {
        Row: {
          id: string;
          type: string;
          event_id: string | null;
          created_by: string | null;
          title: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type?: string;
          event_id?: string | null;
          created_by?: string | null;
          title?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          event_id?: string | null;
          created_by?: string | null;
          title?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      chat_room_members: {
        Row: {
          room_id: string;
          user_id: string;
          role: string;
          last_read_at: string | null;
          created_at: string;
        };
        Insert: {
          room_id: string;
          user_id: string;
          role?: string;
          last_read_at?: string | null;
          created_at?: string;
        };
        Update: {
          room_id?: string;
          user_id?: string;
          role?: string;
          last_read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          room_id: string;
          sender_id: string | null;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          sender_id?: string | null;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          sender_id?: string | null;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      friendships: {
        Row: {
          requester_id: string;
          addressee_id: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          requester_id: string;
          addressee_id: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          requester_id?: string;
          addressee_id?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      direct_messages: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          receiver_id?: string;
          content?: string;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          data: Json | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          data?: Json | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          body?: string | null;
          data?: Json | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      ingestion_sources: {
        Row: {
          id: string;
          name: string;
          kind: string;
          feed_url: string | null;
          city: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          kind: string;
          feed_url?: string | null;
          city?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          kind?: string;
          feed_url?: string | null;
          city?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      event_posts: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          image_url: string;
          caption: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          image_url: string;
          caption?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          user_id?: string;
          image_url?: string;
          caption?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_posts_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          }
        ];
      };
      ingestion_runs: {
        Row: {
          id: string;
          source_id: string | null;
          status: string;
          items_seen: number | null;
          items_created: number | null;
          items_updated: number | null;
          error_message: string | null;
          started_at: string;
          finished_at: string | null;
        };
        Insert: {
          id?: string;
          source_id?: string | null;
          status?: string;
          items_seen?: number | null;
          items_created?: number | null;
          items_updated?: number | null;
          error_message?: string | null;
          started_at?: string;
          finished_at?: string | null;
        };
        Update: {
          id?: string;
          source_id?: string | null;
          status?: string;
          items_seen?: number | null;
          items_created?: number | null;
          items_updated?: number | null;
          error_message?: string | null;
          started_at?: string;
          finished_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      cleanup_old_events: {
        Args: { days_old?: number };
        Returns: { deleted_count: number }[];
      };
      is_admin: {
        Args: { user_uuid: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Convenience types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Event = Database["public"]["Tables"]["events"]["Row"];
export type EventRsvp = Database["public"]["Tables"]["event_rsvps"]["Row"];
export type EventSave = Database["public"]["Tables"]["event_saves"]["Row"];
export type ChatRoom = Database["public"]["Tables"]["chat_rooms"]["Row"];
export type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];
export type Friendship = Database["public"]["Tables"]["friendships"]["Row"];
export type DirectMessage = Database["public"]["Tables"]["direct_messages"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type EventPost = Database["public"]["Tables"]["event_posts"]["Row"];
