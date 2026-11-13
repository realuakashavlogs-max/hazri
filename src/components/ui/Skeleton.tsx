import React from 'react';

export const SkeletonCard: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)] space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 rounded-md" />
              <div className="w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
            <div className="w-14 h-5 bg-slate-200 dark:bg-slate-700 rounded-md" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div className="h-11 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            <div className="h-11 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            <div className="h-11 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            <div className="h-11 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
};
