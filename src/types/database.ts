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
          created_at: string;
          display_name: string | null;
          avatar_url: string | null;
          couple_id: string | null;
        };
        Insert: {
          id: string;
          created_at?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          couple_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          couple_id?: string | null;
        };
        Relationships: [];
      };
      couples: {
        Row: {
          id: string;
          created_at: string;
          user1_id: string;
          user2_id: string | null;
          invite_code: string;
          anniversary_date: string | null;
          meet_date: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user1_id: string;
          user2_id?: string | null;
          invite_code: string;
          anniversary_date?: string | null;
          meet_date?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          user1_id?: string;
          user2_id?: string | null;
          invite_code?: string;
          anniversary_date?: string | null;
          meet_date?: string | null;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          created_at: string;
          couple_id: string;
          sender_id: string;
          content: string;
          message_type: "text" | "touch" | "presence";
        };
        Insert: {
          id?: string;
          created_at?: string;
          couple_id: string;
          sender_id: string;
          content: string;
          message_type?: "text" | "touch" | "presence";
        };
        Update: {
          id?: string;
          created_at?: string;
          couple_id?: string;
          sender_id?: string;
          content?: string;
          message_type?: "text" | "touch" | "presence";
        };
        Relationships: [];
      };
      daily_answers: {
        Row: {
          id: string;
          created_at: string;
          question_id: string;
          couple_id: string;
          user_id: string;
          answer: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          question_id: string;
          couple_id: string;
          user_id: string;
          answer: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          question_id?: string;
          couple_id?: string;
          user_id?: string;
          answer?: string;
        };
        Relationships: [];
      };
      shared_notes: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          couple_id: string;
          author_id: string;
          title: string;
          content: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          couple_id: string;
          author_id: string;
          title: string;
          content: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          couple_id?: string;
          author_id?: string;
          title?: string;
          content?: string;
        };
        Relationships: [];
      };
      presence_events: {
        Row: {
          id: string;
          created_at: string;
          couple_id: string;
          user_id: string;
          event_type:
            | "thinking_of_you"
            | "silent_mode"
            | "studying"
            | "sleeping"
            | "missing_you"
            | "heartbeat";
          message: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          couple_id: string;
          user_id: string;
          event_type:
            | "thinking_of_you"
            | "silent_mode"
            | "studying"
            | "sleeping"
            | "missing_you"
            | "heartbeat";
          message?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          couple_id?: string;
          user_id?: string;
          event_type?:
            | "thinking_of_you"
            | "silent_mode"
            | "studying"
            | "sleeping"
            | "missing_you"
            | "heartbeat";
          message?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Couple = Database["public"]["Tables"]["couples"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type DailyAnswer =
  Database["public"]["Tables"]["daily_answers"]["Row"];
export type SharedNote = Database["public"]["Tables"]["shared_notes"]["Row"];
export type PresenceEvent =
  Database["public"]["Tables"]["presence_events"]["Row"];

