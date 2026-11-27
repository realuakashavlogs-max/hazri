import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTranslation } from 'react-i18next';
import { Download, RefreshCw, Share, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_STORAGE_KEY = 'hazri_pwa_install_dismissed_v1';

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    nav.standalone === true
  );
}

function isIosSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isOtherBrowser = /crios|fxios|edgios|opios/.test(ua);
  const isSafari = /safari/.test(ua) && !isOtherBrowser;
  return isIos && isSafari;
}

export const PwaSupportBanner: React.FC = () => {
  const { t } = useTranslation();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISS_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [showIosHint, setShowIosHint] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      // Periodically check for updated app bundles in long-lived PWA sessions
      setInterval(() => {
        registration.update().catch(() => {});
      }, 60 * 60 * 1000);
    },
  });

  useEffect(() => {
    if (isStandaloneMode()) return;

    if (isIosSafari() && !dismissed) {
      setShowIosHint(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setShowIosHint(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [dismissed]);

  const handleDismiss = () => {
    setDismissed(true);
    setShowIosHint(false);
    setInstallPrompt(null);
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, '1');
    } catch {
      // Ignore storage errors
    }
  };

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  if (needRefresh) {
    return (
      <div
        role="status"
        className="fixed bottom-20 sm:bottom-5 inset-x-4 sm:inset-x-auto sm:end-5 z-40 sm:max-w-sm bg-[var(--color-surface)] border border-primary/40 shadow-xl rounded-2xl p-3.5 flex items-center justify-between gap-3 print:hidden"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <RefreshCw className="w-5 h-5 text-primary shrink-0" />
          <p className="text-xs sm:text-sm font-semibold text-[var(--color-text)]">
            {t('pwa.update_ready')}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => updateServiceWorker(true)}
            className="min-h-[38px] px-3 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90"
          >
            {t('pwa.update_cta')}
          </button>
          <button
            type="button"
            onClick={() => setNeedRefresh(false)}
            aria-label={t('common.dismiss')}
            className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl text-[var(--color-muted)] hover:text-[var(--color-text)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (dismissed || isStandaloneMode()) return null;

  if (installPrompt) {
    return (
      <div className="fixed bottom-20 sm:bottom-5 inset-x-4 sm:inset-x-auto sm:end-5 z-40 sm:max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl rounded-2xl p-3.5 flex items-center justify-between gap-3 print:hidden">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-bold text-[var(--color-text)]">
            {t('pwa.install_title')}
          </p>
          <p className="text-[11px] text-[var(--color-muted)]">
            {t('pwa.install_android_desc')}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('pwa.install_cta')}</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label={t('common.dismiss')}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-[var(--color-muted)] hover:text-[var(--color-text)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (showIosHint) {
    return (
      <div className="fixed bottom-20 sm:bottom-5 inset-x-4 sm:inset-x-auto sm:end-5 z-40 sm:max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl rounded-2xl p-3.5 flex items-start justify-between gap-3 print:hidden">
        <div className="flex items-start gap-2.5 min-w-0">
          <Share className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-[var(--color-text)]">
              {t('pwa.ios_title')}
            </p>
            <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
              {t('pwa.ios_steps')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t('common.dismiss')}
          className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl text-[var(--color-muted)] hover:text-[var(--color-text)] shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return null;
};
