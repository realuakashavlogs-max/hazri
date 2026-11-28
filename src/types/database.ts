export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AttendanceStatusKey = 'present' | 'absent' | 'late' | 'leave';
export type DailyResultKey =
  | 'excellent'
  | 'very_good'
  | 'good'
  | 'needs_improvement'
  | 'not_satisfactory';

export type UserRole = 'user' | 'admin';

export type AuthUser = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url?: string | null;
  role?: UserRole;
};

export type MessagingChannel =
  | 'whatsapp_manual'
  | 'whatsapp_api'
  | 'telegram'
  | 'sms'
  | 'email';

export type PreferredContactChannel = 'whatsapp' | 'telegram' | 'sms' | 'email';

export type MessageGenerationSource =
  | 'ai_verified'
  | 'verified_composer'
  | 'teacher_edited';

export type MessageApprovalStatus = 'draft' | 'approved' | 'rejected';

export type MessageSendMode = 'manual' | 'automatic';

export type MessageDeliveryStatus =
  | 'draft'
  | 'ready_for_manual_send'
  | 'opened_in_whatsapp'
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'blocked';

export type VerifiedDailyFacts = {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  recordDate: string;
  hasAttendanceRecord: boolean;
  attendanceStatus: AttendanceStatusKey | null;
  hasPerformanceRecord: boolean;
  sabaqListened: boolean | null;
  sabaqLines: number | null;
  sabqiListened: boolean | null;
  sabqiLines: number | null;
  manzilListened: boolean | null;
  manzilLines: number | null;
};

export type ProviderAvailability = {
  whatsapp_api: boolean;
  telegram: boolean;
  sms: boolean;
  email: boolean;
  ai_llm: boolean;
  edgeFunctionReachable: boolean;
};

export type MessagingSettings = {
  id: number;
  auto_send_enabled: boolean;
  require_approval_before_send: boolean;
  ai_urdu_enabled: boolean;
  whatsapp_api_enabled: boolean;
  telegram_api_enabled: boolean;
  sms_api_enabled: boolean;
  email_api_enabled: boolean;
  updated_by: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ParentMessage = {
  id: string;
  user_id: string;
  student_id: string;
  class_id: string;
  record_date: string;
  channel: MessagingChannel;
  recipient_masked: string | null;
  message_urdu: string;
  facts_snapshot: VerifiedDailyFacts | Json;
  generated_by: MessageGenerationSource;
  approval_status: MessageApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
  send_mode: MessageSendMode;
  delivery_status: MessageDeliveryStatus;
  provider_message_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
};

export type ClassType = 'hifz' | 'nazira' | 'school_time' | 'other';
export type ClassSession = 'morning' | 'evening';

export type ClassItem = {
  id: string;
  user_id: string;
  name: string;
  class_type: ClassType;
  session_time: ClassSession | null;
  created_at: string;
};

export type Student = {
  id: string;
  user_id: string;
  class_id: string;
  name: string;
  roll_no: string | null;
  parent_phone: string | null;
  messaging_consent?: boolean;
  consent_updated_at?: string | null;
  preferred_channel?: PreferredContactChannel;
  telegram_chat_id?: string | null;
  parent_email?: string | null;
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

export type StudentDailyPerformance = {
  id: string;
  user_id: string;
  student_id: string;
  class_id: string;
  record_date: string; // YYYY-MM-DD
  attendance_status: AttendanceStatusKey;

  // Sabaq (New Lesson)
  sabaq_listened: boolean;
  sabaq_lines: number;
  sabaq_completed: boolean;
  sabaq_surah: string | null;
  sabaq_start_ayah: number | null;
  sabaq_end_ayah: number | null;
  sabaq_start_page: number | null;
  sabaq_end_page: number | null;
  sabaq_para: number | null;
  sabaq_grade: string | null;
  sabaq_remarks: string | null;

  // Sabqi (Recent Revision)
  sabqi_listened: boolean;
  sabqi_lines: number;
  sabqi_details: string | null;
  sabqi_start_page: number | null;
  sabqi_end_page: number | null;
  sabqi_completed: boolean;
  sabqi_remarks: string | null;

  // Manzil (Old Memorization Revision)
  manzil_listened: boolean;
  manzil_lines: number;
  manzil_details: string | null;
  manzil_para: number | null;
  manzil_start_page: number | null;
  manzil_end_page: number | null;
  manzil_completed: boolean;
  manzil_remarks: string | null;

  // Mistakes Record
  total_mistakes: number;
  major_mistakes: number;
  minor_mistakes: number;
  atak_count: number;
  repeated_mistakes: number;

  // Result & Notes
  daily_result: DailyResultKey;
  incomplete_reason: string | null;
  teacher_remarks: string | null;

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

export type StudentDailyPerformanceInput = Omit<
  StudentDailyPerformance,
  'id' | 'created_at' | 'updated_at'
>;

export type PendingPerformanceWrite = StudentDailyPerformanceInput & {
  id: string; // local IndexedDB key: `${user_id}_${student_id}_${record_date}`
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
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: UserRole;
          is_blocked: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: UserRole;
          is_blocked?: boolean;
          created_at?: string;
        };
        Update: {
          full_name?: string | null;
        };
        Relationships: [];
      };
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
          messaging_consent?: boolean;
          consent_updated_at?: string | null;
          preferred_channel?: PreferredContactChannel;
          telegram_chat_id?: string | null;
          parent_email?: string | null;
          created_at?: string;
        };
        Update: {
          class_id?: string;
          name?: string;
          roll_no?: string | null;
          parent_phone?: string | null;
          messaging_consent?: boolean;
          consent_updated_at?: string | null;
          preferred_channel?: PreferredContactChannel;
          telegram_chat_id?: string | null;
          parent_email?: string | null;
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
      student_daily_performance: {
        Row: StudentDailyPerformance;
        Insert: {
          id?: string;
          user_id: string;
          student_id: string;
          class_id: string;
          record_date: string;
          attendance_status: AttendanceStatusKey;
          sabaq_listened?: boolean;
          sabaq_lines?: number;
          sabaq_completed?: boolean;
          sabaq_surah?: string | null;
          sabaq_start_ayah?: number | null;
          sabaq_end_ayah?: number | null;
          sabaq_start_page?: number | null;
          sabaq_end_page?: number | null;
          sabaq_para?: number | null;
          sabaq_grade?: string | null;
          sabaq_remarks?: string | null;
          sabqi_listened?: boolean;
          sabqi_lines?: number;
          sabqi_details?: string | null;
          sabqi_start_page?: number | null;
          sabqi_end_page?: number | null;
          sabqi_completed?: boolean;
          sabqi_remarks?: string | null;
          manzil_listened?: boolean;
          manzil_lines?: number;
          manzil_details?: string | null;
          manzil_start_page?: number | null;
          manzil_end_page?: number | null;
          manzil_completed?: boolean;
          manzil_remarks?: string | null;
          total_mistakes?: number;
          major_mistakes?: number;
          minor_mistakes?: number;
          atak_count?: number;
          repeated_mistakes?: number;
          daily_result?: DailyResultKey;
          incomplete_reason?: string | null;
          teacher_remarks?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<StudentDailyPerformanceInput> & { updated_at?: string };
        Relationships: [];
      };
      messaging_settings: {
        Row: MessagingSettings;
        Insert: {
          id?: number;
          auto_send_enabled?: boolean;
          require_approval_before_send?: boolean;
          ai_urdu_enabled?: boolean;
          whatsapp_api_enabled?: boolean;
          telegram_api_enabled?: boolean;
          sms_api_enabled?: boolean;
          email_api_enabled?: boolean;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          auto_send_enabled?: boolean;
          require_approval_before_send?: boolean;
          ai_urdu_enabled?: boolean;
          whatsapp_api_enabled?: boolean;
          telegram_api_enabled?: boolean;
          sms_api_enabled?: boolean;
          email_api_enabled?: boolean;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      parent_messages: {
        Row: ParentMessage;
        Insert: {
          id?: string;
          user_id: string;
          student_id: string;
          class_id: string;
          record_date: string;
          channel: MessagingChannel;
          recipient_masked?: string | null;
          message_urdu: string;
          facts_snapshot: Json;
          generated_by?: MessageGenerationSource;
          approval_status?: MessageApprovalStatus;
          approved_by?: string | null;
          approved_at?: string | null;
          send_mode?: MessageSendMode;
          delivery_status?: MessageDeliveryStatus;
          provider_message_id?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
          sent_at?: string | null;
        };
        Update: {
          channel?: MessagingChannel;
          recipient_masked?: string | null;
          message_urdu?: string;
          facts_snapshot?: Json;
          generated_by?: MessageGenerationSource;
          approval_status?: MessageApprovalStatus;
          approved_by?: string | null;
          approved_at?: string | null;
          send_mode?: MessageSendMode;
          delivery_status?: MessageDeliveryStatus;
          provider_message_id?: string | null;
          error_message?: string | null;
          updated_at?: string;
          sent_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_dashboard_overview: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          email: string;
          full_name: string | null;
          role: string;
          is_blocked: boolean;
          created_at: string;
          classes_count: number;
          students_count: number;
          attendance_count: number;
          performance_count: number;
        }[];
      };
      admin_dashboard_overview_v2: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          email: string;
          full_name: string | null;
          role: string;
          is_blocked: boolean;
          created_at: string;
          last_sign_in_at: string | null;
          is_active: boolean;
          classes_count: number;
          students_count: number;
          attendance_count: number;
          performance_count: number;
        }[];
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
