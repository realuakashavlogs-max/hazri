export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'user' | 'admin';
  is_blocked: boolean;
  created_at: string;
};

export type AppSettings = {
  id: number; // always 1
  app_name: string;
  primary_color: string;
  logo_url: string | null;
  default_language: 'en' | 'ur';
  default_message_template: string | null;
  updated_at: string;
};

export type DefaultStatus = {
  id: string;
  key: string;
  label_en: string;
  label_ur: string;
  color: string;
  counts_as_present: boolean;
  notify_parents: boolean;
  sort_order: number;
};

export type UserSettings = {
  user_id: string;
  language: 'en' | 'ur' | null;
  primary_color: string | null;
  dark_mode: boolean;
  app_display_name: string | null;
  message_template: string | null;
  updated_at: string;
};

export type ClassItem = {
  id: string;
  user_id: string;
  name: string;
  section: string | null;
  is_archived: boolean;
  created_at: string;
};

export type Student = {
  id: string;
  user_id: string;
  class_id: string;
  name: string;
  roll_no: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
};

export type AttendanceStatus = {
  id: string;
  user_id: string;
  key: string;
  label_en: string;
  label_ur: string;
  color: string;
  counts_as_present: boolean;
  notify_parents: boolean;
  sort_order: number;
};

export type AttendanceRecord = {
  id: string;
  user_id: string;
  student_id: string;
  class_id: string;
  attendance_date: string; // YYYY-MM-DD
  status_id: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminUserOverview = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'user' | 'admin';
  is_blocked: boolean;
  created_at: string;
  classes_count?: number;
  students_count?: number;
};

export type PendingAttendanceWrite = {
  id: string; // local IndexedDB key: `${student_id}_${attendance_date}`
  user_id: string;
  class_id: string;
  student_id: string;
  attendance_date: string;
  status_id: string;
  note: string | null;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; email: string };
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
        Relationships: [];
      };
      app_settings: {
        Row: AppSettings;
        Insert: Partial<AppSettings> & { id?: number };
        Update: Partial<Omit<AppSettings, 'id'>>;
        Relationships: [];
      };
      default_statuses: {
        Row: DefaultStatus;
        Insert: Partial<DefaultStatus> & {
          key: string;
          label_en: string;
          label_ur: string;
          color: string;
          counts_as_present: boolean;
          sort_order: number;
        };
        Update: Partial<Omit<DefaultStatus, 'id'>>;
        Relationships: [];
      };
      user_settings: {
        Row: UserSettings;
        Insert: Partial<UserSettings> & { user_id: string };
        Update: Partial<Omit<UserSettings, 'user_id'>>;
        Relationships: [];
      };
      classes: {
        Row: ClassItem;
        Insert: Partial<ClassItem> & { user_id: string; name: string };
        Update: Partial<Omit<ClassItem, 'id' | 'user_id' | 'created_at'>>;
        Relationships: [];
      };
      students: {
        Row: Student;
        Insert: Partial<Student> & { user_id: string; class_id: string; name: string };
        Update: Partial<Omit<Student, 'id' | 'user_id' | 'created_at'>>;
        Relationships: [];
      };
      attendance_statuses: {
        Row: AttendanceStatus;
        Insert: Partial<AttendanceStatus> & {
          user_id: string;
          key: string;
          label_en: string;
          label_ur: string;
          color: string;
        };
        Update: Partial<Omit<AttendanceStatus, 'id' | 'user_id'>>;
        Relationships: [];
      };
      attendance_records: {
        Row: AttendanceRecord;
        Insert: Partial<AttendanceRecord> & {
          user_id: string;
          student_id: string;
          class_id: string;
          attendance_date: string;
          status_id: string;
        };
        Update: Partial<Omit<AttendanceRecord, 'id' | 'user_id' | 'created_at'>>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_user_overview: {
        Args: Record<PropertyKey, never>;
        Returns: AdminUserOverview[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
