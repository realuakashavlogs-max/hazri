import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { ClassItem } from '../types/database';

function ensureConfigured() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured');
  }
}

export const classesService = {
  async getClasses(userId: string): Promise<ClassItem[]> {
    ensureConfigured();

    const { data, error } = await supabase
      .from('classes')
      .select('id, user_id, name, created_at')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createClass(params: { name: string }): Promise<ClassItem> {
    ensureConfigured();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Please sign in again before creating a class.');

    const { data, error } = await supabase
      .from('classes')
      .insert({
        user_id: user.id,
        name: params.name,
      })
      .select('id, user_id, name, created_at')
      .single();

    if (error) throw error;
    return data;
  },

  async updateClass(id: string, updates: { name: string }): Promise<ClassItem> {
    ensureConfigured();

    const { data, error } = await supabase
      .from('classes')
      .update({ name: updates.name })
      .eq('id', id)
      .select('id, user_id, name, created_at')
      .single();

    if (error) throw error;
    return data;
  },

  async deleteClass(id: string): Promise<void> {
    ensureConfigured();

    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (error) throw error;
  },
};
