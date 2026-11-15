import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { BookOpenCheck, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const LoginPage: React.FC = () => {
  const { user, loading, signInWithGoogle } = useAuth();
  const { effectiveAppName } = useSettings();
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleGoogleSignIn = async () => {
    try {
      setServerError(null);
      setGoogleLoading(true);
      await signInWithGoogle();
    } catch (err: any) {
      setServerError(err.message || 'Google sign-in could not be started. Please try again.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white mx-auto shadow-md mb-3 overflow-hidden">
            <BookOpenCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--color-text)]">
            {effectiveAppName || 'Hazri Book'} • حاضری بک
          </h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">{t('tagline')}</p>
        </div>

        <div className="bg-[var(--color-surface)] rounded-3xl shadow-xl border border-[var(--color-border)] p-6 sm:p-8">
          <h2 className="text-xl font-bold text-[var(--color-text)] mb-3">
            Sign in to your account
          </h2>
          <p className="text-sm text-[var(--color-muted)] mb-5">
            Use your Google account to access your own classes, students, and attendance records.
          </p>

          {serverError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-[#DC2626] dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-bg)] disabled:opacity-60 font-semibold flex items-center justify-center gap-3 transition-colors"
          >
            <span aria-hidden="true" className="font-extrabold text-lg"><span className="text-blue-600">G</span></span>
            {googleLoading ? 'Connecting to Google…' : 'Continue with Google'}
          </button>
        </div>
      </div>
    </div>
  );
};
