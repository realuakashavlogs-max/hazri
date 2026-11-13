import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { UserSettings, AppSettings } from '../types/database';

const LOCAL_USER_SETTINGS = 'hazri_user_settings_v2';
const LOCAL_APP_SETTINGS = 'hazri_app_settings_v2';

export const DEFAULT_MESSAGE_TEMPLATE =
  'Dear Parent, your child {student_name} of class {class_name} was marked {status} on {date}. Regards, {app_name}';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: 1,
  app_name: 'Hazri Book',
  primary_color: '#2563EB',
  logo_url: null,
  default_language: 'en',
  default_message_template: DEFAULT_MESSAGE_TEMPLATE,
  updated_at: new Date().toISOString(),
};

export const settingsService = {
  async getUserSettings(userId: string): Promise<UserSettings> {
    const defaultUserSettings: UserSettings = {
      user_id: userId,
      language: (localStorage.getItem('hazri_language') as 'en' | 'ur') || null,
      primary_color: null,
      dark_mode: false,
      app_display_name: null,
      message_template: null,
      updated_at: new Date().toISOString(),
    };

    if (!isSupabaseConfigured) {
      const stored = localStorage.getItem(`${LOCAL_USER_SETTINGS}_${userId}`);
      return stored ? { ...defaultUserSettings, ...JSON.parse(stored) } : defaultUserSettings;
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return defaultUserSettings;
    return data;
  },

  async updateUserSettings(
    userId: string,
    updates: Partial<Omit<UserSettings, 'user_id'>>
  ): Promise<UserSettings> {
    const updated = {
      ...updates,
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    if (!isSupabaseConfigured) {
      const current = await this.getUserSettings(userId);
      const merged = { ...current, ...updated };
      localStorage.setItem(`${LOCAL_USER_SETTINGS}_${userId}`, JSON.stringify(merged));
      return merged;
    }

    const { data, error } = await supabase
      .from('user_settings')
      .upsert(updated)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAppSettings(): Promise<AppSettings> {
    if (!isSupabaseConfigured) {
      const stored = localStorage.getItem(LOCAL_APP_SETTINGS);
      if (!stored) return DEFAULT_APP_SETTINGS;
      return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(stored) };
    }

    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) return DEFAULT_APP_SETTINGS;
    return { ...DEFAULT_APP_SETTINGS, ...data };
  },

  async updateAppSettings(
    updates: Partial<Omit<AppSettings, 'id'>>
  ): Promise<AppSettings> {
    const updated = {
      ...updates,
      id: 1,
      updated_at: new Date().toISOString(),
    };

    if (!isSupabaseConfigured) {
      const current = await this.getAppSettings();
      const merged = { ...current, ...updated };
      localStorage.setItem(LOCAL_APP_SETTINGS, JSON.stringify(merged));
      return merged;
    }

    const { data, error } = await supabase
      .from('app_settings')
      .upsert(updated)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async uploadLogo(file: File): Promise<string> {
    if (!isSupabaseConfigured) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(file);
      });
    }

    const ext = file.name.split('.').pop() || 'png';
    const filePath = `logo/logo_${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('app-assets')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('app-assets').getPublicUrl(filePath);
    return data.publicUrl;
  },
};
