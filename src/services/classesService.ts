import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { ClassItem } from '../types/database';

const LOCAL_CLASSES_KEY = 'hazri_local_classes';

function getLocalClasses(): ClassItem[] {
  const data = localStorage.getItem(LOCAL_CLASSES_KEY);
  if (!data) {
    const initial: ClassItem[] = [
      {
        id: 'cls_01',
        user_id: 'teacher_demo_01',
        name: 'Class 5 - Green',
        section: 'Morning Batch',
        is_archived: false,
        created_at: new Date().toISOString(),
      },
      {
        id: 'cls_02',
        user_id: 'teacher_demo_01',
        name: 'Hifz Batch A',
        section: 'Tahfiz Section',
        is_archived: false,
        created_at: new Date().toISOString(),
      },
    ];
    localStorage.setItem(LOCAL_CLASSES_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(data);
}

function saveLocalClasses(classes: ClassItem[]) {
  localStorage.setItem(LOCAL_CLASSES_KEY, JSON.stringify(classes));
}

export const classesService = {
  async getClasses(userId: string): Promise<ClassItem[]> {
    if (!isSupabaseConfigured) {
      return getLocalClasses().filter((c) => c.user_id === userId || userId.startsWith('demo_'));
    }

    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('user_id', userId)
      .order('is_archived', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createClass(params: {
    userId: string;
    name: string;
    section?: string;
  }): Promise<ClassItem> {
    if (!isSupabaseConfigured) {
      const classes = getLocalClasses();
      const newClass: ClassItem = {
        id: 'cls_' + Date.now(),
        user_id: params.userId,
        name: params.name,
        section: params.section || null,
        is_archived: false,
        created_at: new Date().toISOString(),
      };
      classes.push(newClass);
      saveLocalClasses(classes);
      return newClass;
    }

    const { data, error } = await supabase
      .from('classes')
      .insert({
        user_id: params.userId,
        name: params.name,
        section: params.section || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateClass(
    id: string,
    updates: Partial<Pick<ClassItem, 'name' | 'section' | 'is_archived'>>
  ): Promise<ClassItem> {
    if (!isSupabaseConfigured) {
      const classes = getLocalClasses();
      const idx = classes.findIndex((c) => c.id === id);
      if (idx !== -1) {
        classes[idx] = { ...classes[idx], ...updates };
        saveLocalClasses(classes);
        return classes[idx];
      }
      throw new Error('Class not found');
    }

    const { data, error } = await supabase
      .from('classes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async setArchived(id: string, isArchived: boolean): Promise<void> {
    await this.updateClass(id, { is_archived: isArchived });
  },

  async deleteClass(id: string): Promise<void> {
    if (!isSupabaseConfigured) {
      const classes = getLocalClasses().filter((c) => c.id !== id);
      saveLocalClasses(classes);
      return;
    }

    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (error) throw error;
  },
};
