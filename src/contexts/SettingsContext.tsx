import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { LocalSettings } from '../types/database';
import {
  settingsService,
  DEFAULT_LOCAL_SETTINGS,
  DEFAULT_MESSAGE_TEMPLATE,
} from '../services/settingsService';
import { setAppLanguage } from '../lib/i18n';
import { getPendingAttendanceCount } from '../lib/offlineQueue';
import { attendanceService } from '../services/attendanceService';
import { useAuth } from './AuthContext';

interface SettingsContextType {
  settings: LocalSettings;
  effectiveAppName: string;
  effectivePrimaryColor: string;
  effectiveLanguage: 'en' | 'ur';
  effectiveMessageTemplate: string;
  updateSettings: (updates: Partial<LocalSettings>) => void;
  toggleDarkMode: () => void;
  toggleLanguage: () => void;
  pendingOfflineCount: number;
  syncNow: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<LocalSettings>(() =>
    typeof localStorage !== 'undefined' ? settingsService.getDeviceSettings() : DEFAULT_LOCAL_SETTINGS
  );
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);

  const applyTheme = useCallback((next: LocalSettings) => {
    const primary = next.primary_color || '#2563EB';
    document.documentElement.style.setProperty('--color-primary', primary);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', primary);

    if (next.dark_mode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    setAppLanguage(next.language || 'en');
  }, []);

  useEffect(() => {
    applyTheme(settings);
  }, [settings, applyTheme]);

  const flushAndRefresh = useCallback(async () => {
    if (user && typeof navigator !== 'undefined' && navigator.onLine) {
      const synced = await attendanceService.flushOfflineQueue(user.id);
      if (synced > 0) {
        queryClient.invalidateQueries({ queryKey: ['attendance'] });
        queryClient.invalidateQueries({ queryKey: ['attendance_range'] });
        queryClient.invalidateQueries({ queryKey: ['user_attendance_date'] });
      }
    }
    const count = await getPendingAttendanceCount();
    setPendingOfflineCount(count);
  }, [user, queryClient]);

  useEffect(() => {
    flushAndRefresh();

    const interval = setInterval(async () => {
      const count = await getPendingAttendanceCount();
      setPendingOfflineCount(count);
    }, 3000);

    const handleOnline = () => {
      flushAndRefresh();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
    };
  }, [flushAndRefresh]);

  const updateSettings = (updates: Partial<LocalSettings>) => {
    const updated = settingsService.saveDeviceSettings(updates);
    setSettings(updated);
    applyTheme(updated);
  };

  const toggleDarkMode = () => {
    updateSettings({ dark_mode: !settings.dark_mode });
  };

  const toggleLanguage = () => {
    const nextLang = settings.language === 'en' ? 'ur' : 'en';
    updateSettings({ language: nextLang });
  };

  const syncNow = async () => {
    await flushAndRefresh();
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        effectiveAppName: settings.app_display_name || 'Hazri Book',
        effectivePrimaryColor: settings.primary_color || '#2563EB',
        effectiveLanguage: settings.language || 'en',
        effectiveMessageTemplate: settings.message_template || DEFAULT_MESSAGE_TEMPLATE,
        updateSettings,
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
