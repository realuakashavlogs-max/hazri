import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { FileQuestion, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="w-full max-w-md text-center bg-[var(--color-surface)] rounded-3xl shadow-xl border border-[var(--color-border)] p-8">
        <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
          <FileQuestion className="w-10 h-10" />
        </div>
        <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-1">404</p>
        <h1 className="text-xl font-bold text-[var(--color-text)] mb-2">
          {t('common.not_found_title')}
        </h1>
        <p className="text-sm text-[var(--color-muted)] mb-6">{t('common.not_found_desc')}</p>
        <Link to="/dashboard">
          <Button className="w-full gap-2" size="lg">
            <Home className="w-4 h-4" />
            <span>{t('common.back_home')}</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};
