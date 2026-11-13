import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { UserSettings, AppSettings } from '../types/database';
import {
  settingsService,
  DEFAULT_APP_SETTINGS,
  DEFAULT_MESSAGE_TEMPLATE,
} from '../services/settingsService';
import { useAuth } from './AuthContext';
import { setAppLanguage } from '../lib/i18n';
import { getPendingAttendanceCount } from '../lib/offlineQueue';
import { attendanceService } from '../services/attendanceService';

interface SettingsContextType {
  settings: UserSettings;
  appSettings: AppSettings;
  effectiveAppName: string;
  effectivePrimaryColor: string;
  effectiveLanguage: 'en' | 'ur';
  effectiveMessageTemplate: string;
  updateSettings: (updates: Partial<Omit<UserSettings, 'user_id'>>) => Promise<void>;
  refreshAppSettings: () => Promise<void>;
  toggleDarkMode: () => void;
  toggleLanguage: () => void;
  pendingOfflineCount: number;
  syncNow: () => Promise<void>;
}

const defaultUserSettings: UserSettings = {
  user_id: '',
  language: null,
  primary_color: null,
  dark_mode: false,
  app_display_name: null,
  message_template: null,
  updated_at: new Date().toISOString(),
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { effectiveUserId } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultUserSettings);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);

  const applyTheme = useCallback((userSet: UserSettings, globalSet: AppSettings) => {
    const primary = userSet.primary_color || globalSet.primary_color || '#2563EB';
    document.documentElement.style.setProperty('--color-primary', primary);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', primary);

    if (userSet.dark_mode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const lang = userSet.language || globalSet.default_language || 'en';
    setAppLanguage(lang);
  }, []);

  const refreshAppSettings = useCallback(async () => {
    const g = await settingsService.getAppSettings();
    setAppSettings(g);
    applyTheme(settings, g);
  }, [applyTheme, settings]);

  // Load global app_settings (anon readable for login/signup branding + defaults)
  useEffect(() => {
    let mounted = true;
    settingsService.getAppSettings().then((g) => {
      if (!mounted) return;
      setAppSettings(g);
      applyTheme(settings, g);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Load user_settings when authenticated
  useEffect(() => {
    if (!effectiveUserId) {
      setSettings(defaultUserSettings);
      return;
    }

    let mounted = true;
    async function loadSettings() {
      const [userData, globalData] = await Promise.all([
        settingsService.getUserSettings(effectiveUserId),
        settingsService.getAppSettings(),
      ]);
      if (!mounted) return;
      setAppSettings(globalData);
      setSettings(userData);
      applyTheme(userData, globalData);
    }
    loadSettings();
    return () => {
      mounted = false;
    };
  }, [effectiveUserId, applyTheme]);

  // Offline queue monitoring & Auto-flush on online
  useEffect(() => {
    async function checkQueue() {
      const count = await getPendingAttendanceCount();
      setPendingOfflineCount(count);
    }
    checkQueue();

    const interval = setInterval(checkQueue, 5000);

    const handleOnline = async () => {
      const synced = await attendanceService.flushOfflineQueue();
      if (synced > 0) {
        checkQueue();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const updateSettings = async (updates: Partial<Omit<UserSettings, 'user_id'>>) => {
    if (!effectiveUserId) return;
    const updated = await settingsService.updateUserSettings(effectiveUserId, updates);
    setSettings(updated);
    applyTheme(updated, appSettings);
  };

  const effectiveLanguage: 'en' | 'ur' =
    settings.language || appSettings.default_language || 'en';
  const effectiveAppName =
    settings.app_display_name || appSettings.app_name || 'Hazri Book';
  const effectivePrimaryColor =
    settings.primary_color || appSettings.primary_color || '#2563EB';
  const effectiveMessageTemplate =
    settings.message_template ||
    appSettings.default_message_template ||
    DEFAULT_MESSAGE_TEMPLATE;

  const toggleDarkMode = () => {
    updateSettings({ dark_mode: !settings.dark_mode });
  };

  const toggleLanguage = () => {
    const nextLang = effectiveLanguage === 'en' ? 'ur' : 'en';
    if (!effectiveUserId) {
      setAppLanguage(nextLang);
      setSettings((prev) => ({ ...prev, language: nextLang }));
      return;
    }
    updateSettings({ language: nextLang });
  };

  const syncNow = async () => {
    await attendanceService.flushOfflineQueue();
    const count = await getPendingAttendanceCount();
    setPendingOfflineCount(count);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        appSettings,
        effectiveAppName,
        effectivePrimaryColor,
        effectiveLanguage,
        effectiveMessageTemplate,
        updateSettings,
        refreshAppSettings,
        toggleDarkMode,
        toggleLanguage,
        pendingOfflineCount,
        syncNow,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
