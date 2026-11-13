import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  variant?: 'classes' | 'students' | 'attendance' | 'users';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  variant = 'classes',
}) => {
  return (
    <div className="text-center py-12 px-6 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm">
      <div className="mx-auto mb-4 w-20 h-20 flex items-center justify-center rounded-full bg-primary/10 text-primary">
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-12 h-12"
          aria-hidden="true"
        >
          {variant === 'students' || variant === 'users' ? (
            <>
              <circle cx="24" cy="22" r="8" stroke="currentColor" strokeWidth="2.5" />
              <path
                d="M10 48C10 40.268 16.268 34 24 34C31.732 34 38 40.268 38 48"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="44" cy="25" r="6" stroke="currentColor" strokeWidth="2.5" opacity="0.6" />
              <path
                d="M40 36C46.5 36.8 52 41.5 52 48"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.6"
              />
            </>
          ) : (
            <>
              <rect
                x="12"
                y="10"
                width="40"
                height="44"
                rx="6"
                stroke="currentColor"
                strokeWidth="2.5"
              />
              <path d="M22 10V54" stroke="currentColor" strokeWidth="2.5" opacity="0.45" />
              <path
                d="M28 24L33 29L43 19"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M28 38H43"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.6"
              />
            </>
          )}
        </svg>
      </div>
      <h3 className="text-base font-bold text-[var(--color-text)] mb-1">{title}</h3>
      <p className="text-sm text-[var(--color-muted)] max-w-sm mx-auto mb-5 leading-relaxed">
        {description}
      </p>
      {action}
    </div>
  );
};
