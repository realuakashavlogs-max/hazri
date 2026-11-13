import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const variants = {
    primary: 'bg-primary text-white hover:opacity-95 shadow-sm',
    secondary:
      'bg-slate-100 dark:bg-slate-800 text-[var(--color-text)] hover:bg-slate-200 dark:hover:bg-slate-700',
    outline:
      'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-slate-50 dark:hover:bg-slate-800/70',
    danger: 'bg-[#DC2626] text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm',
    ghost:
      'bg-transparent text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-100 dark:hover:bg-slate-800',
  };

  const sizes = {
    sm: 'min-h-[40px] px-3.5 py-2 text-xs',
    md: 'min-h-[44px] px-4 py-2.5 text-sm',
    lg: 'min-h-[48px] px-6 py-3 text-base',
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin me-2" />
      ) : null}
      {children}
    </button>
  );
};
