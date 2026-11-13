import type { LocalSettings } from '../types/database';

const LOCAL_SETTINGS_KEY = 'hazri_device_settings_v1';

export const DEFAULT_MESSAGE_TEMPLATE =
  'Mohtaram walidain, aap ke bachay {student_name} ki class {class_name} mein {date} ko hazri {status} mark hui. Shukriya, {app_name}';
export const DEFAULT_URDU_MESSAGE_TEMPLATE =
  'محترم والدین، آپ کے بچے {student_name} کی کلاس {class_name} میں {date} کو حاضری {status} درج کی گئی۔ شکریہ، {app_name}';
export const LEGACY_ENGLISH_MESSAGE_TEMPLATE =
  'Dear Parent, your child {student_name} of class {class_name} was marked {status} on {date}. Regards, {app_name}';

export const DEFAULT_LOCAL_SETTINGS: LocalSettings = {
  language: (localStorage.getItem('hazri_language') as 'en' | 'ur') || 'en',
  primary_color: '#2563EB',
  dark_mode: false,
  app_display_name: 'Hazri Book',
  message_template: DEFAULT_MESSAGE_TEMPLATE,
};

export const settingsService = {
  getDeviceSettings(): LocalSettings {
    try {
      const stored = localStorage.getItem(LOCAL_SETTINGS_KEY);
      if (!stored) return DEFAULT_LOCAL_SETTINGS;
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_LOCAL_SETTINGS,
        ...parsed,
        language: parsed.language === 'ur' ? 'ur' : 'en',
        primary_color: parsed.primary_color || '#2563EB',
        dark_mode: Boolean(parsed.dark_mode),
        app_display_name: parsed.app_display_name || 'Hazri Book',
        message_template: parsed.message_template || DEFAULT_MESSAGE_TEMPLATE,
      };
    } catch {
      return DEFAULT_LOCAL_SETTINGS;
    }
  },

  saveDeviceSettings(updates: Partial<LocalSettings>): LocalSettings {
    const current = this.getDeviceSettings();
    const merged: LocalSettings = {
      ...current,
      ...updates,
    };
    try {
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(merged));
      localStorage.setItem('hazri_language', merged.language);
    } catch {
      // Ignore storage quota errors
    }
    return merged;
  },
};
