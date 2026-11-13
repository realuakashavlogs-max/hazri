import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const AdminNav: React.FC<{ title?: string; subtitle?: string }> = ({
  title,
  subtitle,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h1 className="text-[22px] sm:text-2xl font-extrabold text-[var(--color-text)] flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-amber-500 shrink-0" />
          <span>{title || t('admin.title')}</span>
        </h1>
        {subtitle && (
          <p className="text-sm text-[var(--color-muted)]">{subtitle}</p>
        )}
      </div>
    </div>
  );
};
