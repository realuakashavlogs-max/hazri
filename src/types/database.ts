export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AttendanceStatusKey = 'present' | 'absent' | 'late' | 'leave';

export type AuthUser = {
  id: string;
  email: string;
  full_name: string | null;
};

export type ClassItem = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type Student = {
  id: string;
  user_id: string;
  class_id: string;
  name: string;
  roll_no: string | null;
  parent_phone: string | null;
  created_at: string;
};

export type AttendanceRecord = {
  id: string;
  user_id: string;
  student_id: string;
  class_id: string;
  attendance_date: string; // YYYY-MM-DD
  status: AttendanceStatusKey;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type PendingAttendanceWrite = {
  id: string; // local IndexedDB key: `${student_id}_${attendance_date}`
  user_id: string;
  class_id: string;
  student_id: string;
  attendance_date: string;
  status: AttendanceStatusKey;
  note: string | null;
  updated_at: string;
};

export type LocalSettings = {
  language: 'en' | 'ur';
  primary_color: string;
  dark_mode: boolean;
  app_display_name: string;
  message_template: string;
};

export type Database = {
  public: {
    Tables: {
      classes: {
        Row: ClassItem;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          name?: string;
        };
        Relationships: [];
      };
      students: {
        Row: Student;
        Insert: {
          id?: string;
          user_id: string;
          class_id: string;
          name: string;
          roll_no?: string | null;
          parent_phone?: string | null;
          created_at?: string;
        };
        Update: {
          class_id?: string;
          name?: string;
          roll_no?: string | null;
          parent_phone?: string | null;
        };
        Relationships: [];
      };
      attendance_statuses: {
        Row: {
          id: string;
          user_id: string;
          key: AttendanceStatusKey;
          label_en: string;
          label_ur: string;
          color: string;
          counts_as_present: boolean;
          notify_parents: boolean;
          sort_order: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          key: AttendanceStatusKey;
          label_en: string;
          label_ur: string;
          color: string;
          counts_as_present?: boolean;
          notify_parents?: boolean;
          sort_order?: number;
        };
        Update: {
          label_en?: string;
          label_ur?: string;
          color?: string;
          counts_as_present?: boolean;
          notify_parents?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      attendance_records: {
        Row: Omit<AttendanceRecord, 'status'> & { status_id: string };
        Insert: {
          id?: string;
          user_id: string;
          student_id: string;
          class_id: string;
          attendance_date: string;
          status_id: string;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          class_id?: string;
          attendance_date?: string;
          status_id?: string;
          note?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
        Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
