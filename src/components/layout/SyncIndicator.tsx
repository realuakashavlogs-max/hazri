import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { useTranslation } from 'react-i18next';

export const SyncIndicator: React.FC = () => {
  const { pendingOfflineCount, syncNow } = useSettings();
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      await syncNow();
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOnline) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
        <CloudOff className="w-3.5 h-3.5 shrink-0" />
        <span>
          {pendingOfflineCount > 0
            ? `${t('sync.offline')} • ${t('sync.pending', { count: pendingOfflineCount })}`
            : t('sync.offline')}
        </span>
      </span>
    );
  }

  if (pendingOfflineCount > 0) {
    return (
      <button
        type="button"
        onClick={handleSync}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[32px] rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
      >
        <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
        <span>{t('sync.pending', { count: pendingOfflineCount })}</span>
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#16A34A]/10 text-[#16A34A] dark:bg-emerald-950/50 dark:text-emerald-300 border border-[#16A34A]/20">
      <Cloud className="w-3.5 h-3.5 shrink-0" />
      <span>{t('sync.synced')}</span>
    </span>
  );
};
