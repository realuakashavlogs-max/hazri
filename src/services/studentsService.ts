import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { Student } from '../types/database';

function ensureConfigured() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured');
  }
}

export const studentsService = {
  async getStudents(userId: string, classId?: string): Promise<Student[]> {
    ensureConfigured();

    let query = supabase
      .from('students')
      .select('id, user_id, class_id, name, roll_no, parent_phone, created_at')
      .eq('user_id', userId)
      .order('roll_no', { ascending: true })
      .order('name', { ascending: true });

    if (classId) {
      query = query.eq('class_id', classId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async createStudent(params: {
    classId: string;
    name: string;
    rollNo?: string;
    parentPhone?: string;
  }): Promise<Student> {
    ensureConfigured();

    const { data, error } = await supabase
      .from('students')
      .insert({
        class_id: params.classId,
        name: params.name,
        roll_no: params.rollNo || null,
        parent_phone: params.parentPhone || null,
      })
      .select('id, user_id, class_id, name, roll_no, parent_phone, created_at')
      .single();

    if (error) throw error;
    return data;
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

    const parsed = lines.map((line) => {
      const parts = line.split(',').map((p) => p.trim());
      const hasRoll = parts.length > 1 && /^\d+$/.test(parts[0]);
      const rollNo = hasRoll ? parts[0] : null;
      const name = hasRoll ? parts[1] : parts[0];
      const phone = parts.length > 2 ? parts[2] : null;
      return {
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
      .select('id, user_id, class_id, name, roll_no, parent_phone, created_at');
    if (error) throw error;
    return data?.length || 0;
  },

  async updateStudent(
    id: string,
    updates: Partial<Pick<Student, 'class_id' | 'name' | 'roll_no' | 'parent_phone'>>
  ): Promise<Student> {
    ensureConfigured();

    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', id)
      .select('id, user_id, class_id, name, roll_no, parent_phone, created_at')
      .single();

    if (error) throw error;
    return data;
  },

  async deleteStudent(id: string): Promise<void> {
    ensureConfigured();

    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) throw error;
  },
};
