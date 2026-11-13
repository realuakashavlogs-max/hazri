import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { SyncIndicator } from './SyncIndicator';
import {
  BookOpenCheck,
  Moon,
  Sun,
  Globe,
  LogOut,
  WifiOff,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const Navbar: React.FC = () => {
  const { signOut } = useAuth();
  const {
    settings,
    effectiveAppName,
    effectiveLanguage,
    toggleDarkMode,
    toggleLanguage,
  } = useSettings();
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-[var(--color-surface)]/95 backdrop-blur-md border-b border-[var(--color-border)]">
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: Brand + Sync Indicator */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
              <BookOpenCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-base text-[var(--color-text)] truncate block">
                {effectiveAppName || t('app_name')}
              </span>
            </div>
          </Link>

          <div className="hidden xs:block sm:block">
            <SyncIndicator />
          </div>
        </div>

        {/* Right: Sync (small mobile), Language, Dark Mode, Logout */}
        <div className="flex items-center gap-1">
          <div className="sm:hidden me-1">
            <SyncIndicator />
          </div>

          <button
            type="button"
            onClick={toggleLanguage}
            aria-label="Toggle language"
            title={effectiveLanguage === 'ur' ? 'Switch to English' : 'اردو میں تبدیل کریں'}
            className="min-w-[44px] min-h-[44px] px-2.5 flex items-center justify-center gap-1 rounded-xl text-xs font-bold text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Globe className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">
              {effectiveLanguage === 'ur' ? 'EN' : 'اردو'}
            </span>
          </button>

          <button
            type="button"
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
            title={t('settings.dark_mode')}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {settings.dark_mode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={signOut}
            aria-label={t('auth.logout')}
            title={t('auth.logout')}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[var(--color-muted)] hover:text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="w-4 h-4 rtl:-scale-x-100" />
          </button>
        </div>
      </div>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-50 dark:bg-amber-950/60 border-t border-amber-200 dark:border-amber-800 px-4 py-2 text-xs font-semibold text-amber-800 dark:text-amber-200 flex items-center justify-center gap-2">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>{t('sync.offline_banner')}</span>
        </div>
      )}
    </header>
  );
};
