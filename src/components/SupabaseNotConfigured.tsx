import React from 'react';
import { AlertTriangle, BookOpenCheck } from 'lucide-react';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../lib/supabaseClient';

export const SupabaseNotConfigured: React.FC = () => {
  const missingUrl = !SUPABASE_URL || !SUPABASE_URL.startsWith('https://');
  const missingKey = !SUPABASE_ANON_KEY;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="w-full max-w-md bg-[var(--color-surface)] rounded-3xl shadow-xl border border-[var(--color-border)] p-6 sm:p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
          <BookOpenCheck className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold mb-3">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Setup Required</span>
        </div>

        <h1 className="text-xl font-extrabold text-[var(--color-text)] mb-2">
          Supabase not configured
        </h1>

        <p className="text-sm text-[var(--color-muted)] leading-relaxed mb-5">
          Authentication and cloud sessions require your Supabase project environment variables.
          No demo or offline login mode is enabled.
        </p>

        <div className="text-start rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] p-4 space-y-2 text-xs">
          <p className="font-bold text-[var(--color-text)]">Required Environment Variables:</p>
          <div className="flex items-center justify-between font-mono">
            <span>VITE_SUPABASE_URL</span>
            <span className={missingUrl ? 'text-[#DC2626] font-bold' : 'text-[#16A34A] font-bold'}>
              {missingUrl ? 'Missing / Invalid' : 'Set'}
            </span>
          </div>
          <div className="flex items-center justify-between font-mono">
            <span>VITE_SUPABASE_ANON_KEY</span>
            <span className={missingKey ? 'text-[#DC2626] font-bold' : 'text-[#16A34A] font-bold'}>
              {missingKey ? 'Missing' : 'Set'}
            </span>
          </div>
        </div>

        <p className="text-xs text-[var(--color-muted)] mt-5 leading-relaxed">
          Add <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
          <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> to <code className="font-mono">.env</code>{' '}
          (local) or your Cloudflare Worker build/environment variables and redeploy.
        </p>
      </div>
    </div>
  );
};
