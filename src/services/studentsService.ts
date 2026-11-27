import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { PreferredContactChannel, Student } from '../types/database';

function ensureConfigured() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured');
  }
}

const CORE_STUDENT_COLUMNS = 'id, user_id, class_id, name, roll_no, parent_phone, created_at';
const EXTENDED_STUDENT_COLUMNS =
  'id, user_id, class_id, name, roll_no, parent_phone, messaging_consent, consent_updated_at, preferred_channel, telegram_chat_id, parent_email, created_at';

function isMissingColumnError(err: any): boolean {
  const code = String(err?.code || '');
  const msg = String(err?.message || '');
  return (
    code === '42703' ||
    code === 'PGRST204' ||
    /column .* does not exist|could not find the .* column/i.test(msg)
  );
}

export const studentsService = {
  async getStudents(userId: string, classId?: string): Promise<Student[]> {
    ensureConfigured();

    let query = supabase
      .from('students')
      .select(EXTENDED_STUDENT_COLUMNS)
      .eq('user_id', userId)
      .order('roll_no', { ascending: true })
      .order('name', { ascending: true });

    if (classId) {
      query = query.eq('class_id', classId);
    }

    const { data, error } = await query;
    if (error && isMissingColumnError(error)) {
      let fallback = supabase
        .from('students')
        .select(CORE_STUDENT_COLUMNS)
        .eq('user_id', userId)
        .order('roll_no', { ascending: true })
        .order('name', { ascending: true });
      if (classId) fallback = fallback.eq('class_id', classId);
      const res = await fallback;
      if (res.error) throw res.error;
      return (res.data || []) as Student[];
    }
    if (error) throw error;
    return (data || []) as Student[];
  },

  async createStudent(params: {
    classId: string;
    name: string;
    rollNo?: string;
    parentPhone?: string;
    messagingConsent?: boolean;
    preferredChannel?: PreferredContactChannel;
    telegramChatId?: string;
    parentEmail?: string;
  }): Promise<Student> {
    ensureConfigured();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Please sign in again before adding students.');

    const basePayload = {
      user_id: user.id,
      class_id: params.classId,
      name: params.name,
      roll_no: params.rollNo || null,
      parent_phone: params.parentPhone || null,
    };

    const extendedPayload = {
      ...basePayload,
      messaging_consent: Boolean(params.messagingConsent),
      consent_updated_at: params.messagingConsent ? new Date().toISOString() : null,
      preferred_channel: params.preferredChannel || 'whatsapp',
      telegram_chat_id: params.telegramChatId?.trim() || null,
      parent_email: params.parentEmail?.trim() || null,
    };

    const { data, error } = await supabase
      .from('students')
      .insert(extendedPayload)
      .select(EXTENDED_STUDENT_COLUMNS)
      .single();

    if (error && isMissingColumnError(error)) {
      const fallback = await supabase
        .from('students')
        .insert(basePayload)
        .select(CORE_STUDENT_COLUMNS)
        .single();
      if (fallback.error) throw fallback.error;
      return fallback.data as Student;
    }

    if (error) throw error;
    return data as Student;
  },

  async bulkCreateStudents(params: {
    classId: string;
    rawText: string;
  }): Promise<number> {
    ensureConfigured();

    const lines = params.rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Please sign in again before adding students.');

    const parsed = lines.map((line) => {
      const parts = line.split(',').map((p) => p.trim());
      const hasRoll = parts.length > 1 && /^\d+$/.test(parts[0]);
      const rollNo = hasRoll ? parts[0] : null;
      const name = hasRoll ? parts[1] : parts[0];
      const phone = parts.length > 2 ? parts[2] : null;
      return {
        user_id: user.id,
        class_id: params.classId,
        name,
        roll_no: rollNo,
        parent_phone: phone,
      };
    });

    if (parsed.length === 0) return 0;

    const { data, error } = await supabase
      .from('students')
      .insert(parsed)
      .select(CORE_STUDENT_COLUMNS);
    if (error) throw error;
    return data?.length || 0;
  },

  async updateStudent(
    id: string,
    updates: Partial<
      Pick<
        Student,
        | 'class_id'
        | 'name'
        | 'roll_no'
        | 'parent_phone'
        | 'messaging_consent'
        | 'consent_updated_at'
        | 'preferred_channel'
        | 'telegram_chat_id'
        | 'parent_email'
      >
    >
  ): Promise<Student> {
    ensureConfigured();

    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', id)
      .select(EXTENDED_STUDENT_COLUMNS)
      .single();

    if (error && isMissingColumnError(error)) {
      const {
        messaging_consent: _mc,
        consent_updated_at: _cu,
        preferred_channel: _pc,
        telegram_chat_id: _tg,
        parent_email: _pe,
        ...coreUpdates
      } = updates;
      if (Object.keys(coreUpdates).length === 0) {
        const res = await supabase
          .from('students')
          .select(CORE_STUDENT_COLUMNS)
          .eq('id', id)
          .single();
        if (res.error) throw res.error;
        return res.data as Student;
      }
      const fallback = await supabase
        .from('students')
        .update(coreUpdates)
        .eq('id', id)
        .select(CORE_STUDENT_COLUMNS)
        .single();
      if (fallback.error) throw fallback.error;
      return fallback.data as Student;
    }

    if (error) throw error;
    return data as Student;
  },

  async deleteStudent(id: string): Promise<void> {
    ensureConfigured();

    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) throw error;
  },
};
