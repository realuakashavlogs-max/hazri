import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { Student } from '../types/database';

const LOCAL_STUDENTS_KEY = 'hazri_local_students';

function getLocalStudents(): Student[] {
  const data = localStorage.getItem(LOCAL_STUDENTS_KEY);
  if (!data) {
    const initial: Student[] = [
      {
        id: 'std_101',
        user_id: 'teacher_demo_01',
        class_id: 'cls_01',
        name: 'Muhammad Ali',
        roll_no: '101',
        parent_name: 'Tariq Ali',
        parent_phone: '923001234567',
        notes: 'Punctual and active',
        is_archived: false,
        created_at: new Date().toISOString(),
      },
      {
        id: 'std_102',
        user_id: 'teacher_demo_01',
        class_id: 'cls_01',
        name: 'Fatima Zahra',
        roll_no: '102',
        parent_name: 'Zahid Hussain',
        parent_phone: '923007654321',
        notes: 'Class monitor',
        is_archived: false,
        created_at: new Date().toISOString(),
      },
      {
        id: 'std_103',
        user_id: 'teacher_demo_01',
        class_id: 'cls_01',
        name: 'Zainab Bibi',
        roll_no: '103',
        parent_name: 'Rashid Khan',
        parent_phone: '923214567890',
        notes: '',
        is_archived: false,
        created_at: new Date().toISOString(),
      },
      {
        id: 'std_201',
        user_id: 'teacher_demo_01',
        class_id: 'cls_02',
        name: 'Usman Farooq',
        roll_no: '01',
        parent_name: 'Farooq Azam',
        parent_phone: '923123456780',
        notes: 'Hifz 15 Paras',
        is_archived: false,
        created_at: new Date().toISOString(),
      },
    ];
    localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(data);
}

function saveLocalStudents(students: Student[]) {
  localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(students));
}

export const studentsService = {
  async getStudents(userId: string, classId?: string): Promise<Student[]> {
    if (!isSupabaseConfigured) {
      let list = getLocalStudents().filter((s) => s.user_id === userId || userId.startsWith('demo_'));
      if (classId) {
        list = list.filter((s) => s.class_id === classId);
      }
      return list;
    }

    let query = supabase
      .from('students')
      .select('*')
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
    userId: string;
    classId: string;
    name: string;
    rollNo?: string;
    parentName?: string;
    parentPhone?: string;
    notes?: string;
  }): Promise<Student> {
    if (!isSupabaseConfigured) {
      const students = getLocalStudents();
      const newStudent: Student = {
        id: 'std_' + Date.now(),
        user_id: params.userId,
        class_id: params.classId,
        name: params.name,
        roll_no: params.rollNo || null,
        parent_name: params.parentName || null,
        parent_phone: params.parentPhone || null,
        notes: params.notes || null,
        is_archived: false,
        created_at: new Date().toISOString(),
      };
      students.push(newStudent);
      saveLocalStudents(students);
      return newStudent;
    }

    const { data, error } = await supabase
      .from('students')
      .insert({
        user_id: params.userId,
        class_id: params.classId,
        name: params.name,
        roll_no: params.rollNo || null,
        parent_name: params.parentName || null,
        parent_phone: params.parentPhone || null,
        notes: params.notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async bulkCreateStudents(params: {
    userId: string;
    classId: string;
    rawText: string;
  }): Promise<number> {
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
        user_id: params.userId,
        class_id: params.classId,
        name,
        roll_no: rollNo,
        parent_phone: phone,
      };
    });

    if (parsed.length === 0) return 0;

    if (!isSupabaseConfigured) {
      const students = getLocalStudents();
      const newItems: Student[] = parsed.map((p, idx) => ({
        id: 'std_bulk_' + Date.now() + '_' + idx,
        user_id: p.user_id,
        class_id: p.class_id,
        name: p.name,
        roll_no: p.roll_no,
        parent_name: null,
        parent_phone: p.parent_phone,
        notes: null,
        is_archived: false,
        created_at: new Date().toISOString(),
      }));
      students.push(...newItems);
      saveLocalStudents(students);
      return newItems.length;
    }

    const { data, error } = await supabase.from('students').insert(parsed).select();
    if (error) throw error;
    return data?.length || 0;
  },

  async updateStudent(
    id: string,
    updates: Partial<Omit<Student, 'id' | 'user_id' | 'created_at'>>
  ): Promise<Student> {
    if (!isSupabaseConfigured) {
      const students = getLocalStudents();
      const idx = students.findIndex((s) => s.id === id);
      if (idx !== -1) {
        students[idx] = { ...students[idx], ...updates };
        saveLocalStudents(students);
        return students[idx];
      }
      throw new Error('Student not found');
    }

    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteStudent(id: string): Promise<void> {
    if (!isSupabaseConfigured) {
      const students = getLocalStudents().filter((s) => s.id !== id);
      saveLocalStudents(students);
      return;
    }

    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) throw error;
  },
};
