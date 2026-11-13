import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  colorHex?: string;
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  colorHex = '#2563EB',
  icon,
}) => {
  return (
    <div
      className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all duration-150 shadow-sm"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[var(--color-muted)]">{title}</span>
        {icon && (
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${colorHex}18`, color: colorHex }}
          >
            {icon}
          </div>
        )}
      </div>
      <div className="text-2xl font-extrabold tracking-tight" style={{ color: colorHex }}>
        {value}
      </div>
      {subtitle && <p className="text-xs text-[var(--color-muted)] mt-1">{subtitle}</p>}
    </div>
  );
};
