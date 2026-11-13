import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Ban, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const BlockedPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="w-full max-w-md text-center bg-[var(--color-surface)] rounded-3xl shadow-xl border border-red-200 dark:border-red-900/50 p-8">
        <div className="w-20 h-20 rounded-full bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center mx-auto mb-4">
          <Ban className="w-10 h-10" />
        </div>

        <h1 className="text-xl font-bold text-[var(--color-text)] mb-2">
          {t('auth.blocked_title')}
        </h1>

        <p className="text-sm text-[var(--color-muted)] mb-2 leading-relaxed">
          {t('auth.blocked_desc')}
        </p>

        {user && (
          <p className="text-xs text-[var(--color-muted)] mb-6 font-mono">
            Account: {user.email}
          </p>
        )}

        <Button variant="danger" size="lg" onClick={signOut} className="w-full gap-2">
          <LogOut className="w-4 h-4 rtl:-scale-x-100" />
          <span>{t('auth.logout')}</span>
        </Button>
      </div>
    </div>
  );
};
