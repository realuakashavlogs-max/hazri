import React, { useId, useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id, type, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || props.name || generatedId;
    const isPassword = type === 'password';
    const [showPassword, setShowPassword] = useState(false);

    const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-[var(--color-text)] mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={effectiveType}
            aria-invalid={Boolean(error)}
            className={twMerge(
              clsx(
                'w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl border transition-all duration-150',
                'bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)]',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                'placeholder:text-[var(--color-muted)]/70',
                isPassword && 'pe-11',
                error && 'border-[#DC2626] focus:ring-[#DC2626]',
                className
              )
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 end-0 flex items-center justify-center w-11 min-h-[44px] text-[var(--color-muted)] hover:text-[var(--color-text)] rounded-e-xl"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-[#DC2626] dark:text-red-400">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-xs text-[var(--color-muted)]">{helperText}</p>
        )}
      </div>
    );
  }
);
