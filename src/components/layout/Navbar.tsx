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
  Eye,
  X,
  WifiOff,
  ShieldCheck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NavbarProps {
  isAdminShell?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ isAdminShell = false }) => {
  const { user, signOut, inspectedUser, setInspectedUser } = useAuth();
  const {
    settings,
    appSettings,
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
        {/* Left: Brand + Logo + Sync / Admin Badge */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            to={isAdminShell ? '/admin' : '/dashboard'}
            className="flex items-center gap-2.5 min-w-0"
          >
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
              {appSettings.logo_url ? (
                <img
                  src={appSettings.logo_url}
                  alt={effectiveAppName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <BookOpenCheck className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-[var(--color-text)] truncate">
                  {effectiveAppName || t('app_name')}
                </span>
                {isAdminShell && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                    <ShieldCheck className="w-3 h-3" />
                    <span>{t('admin.badge')}</span>
                  </span>
                )}
              </div>
            </div>
          </Link>

          <div className="hidden xs:block sm:block">
            <SyncIndicator />
          </div>
        </div>

        {/* Right: Sync (on small mobile), Language, Dark Mode, Admin shortcut (desktop/tablet), Logout */}
        <div className="flex items-center gap-1">
          <div className="sm:hidden me-1">
            <SyncIndicator />
          </div>

          {user?.role === 'admin' && !isAdminShell && (
            <Link
              to="/admin"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 min-h-[44px] rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors me-1"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{t('nav.admin')}</span>
            </Link>
          )}

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

      {/* Read-only Admin Inspection Banner */}
      {inspectedUser && (
        <div className="bg-primary text-white px-4 py-2 text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Eye className="w-4 h-4 shrink-0" />
            <span className="truncate">
              Read-only inspection: {inspectedUser.full_name || inspectedUser.email} ({inspectedUser.email})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setInspectedUser(null)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>
        </div>
      )}
    </header>
  );
};
