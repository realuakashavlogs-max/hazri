import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { BookOpenCheck, AlertCircle, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const { appSettings } = useSettings();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setServerError(null);
      await signIn(values.email, values.password);
      navigate('/dashboard');
    } catch (err: any) {
      setServerError(err.message || 'Failed to sign in. Please check your credentials.');
    }
  };

  const handleQuickDemo = (type: 'teacher' | 'admin') => {
    const email = type === 'teacher' ? 'teacher@hazribook.com' : 'realuakashavlogs@gmail.com';
    const password = type === 'teacher' ? 'Teacher123' : 'Admin123';
    setValue('email', email);
    setValue('password', password);
    onSubmit({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white mx-auto shadow-md mb-3 overflow-hidden">
            {appSettings.logo_url ? (
              <img
                src={appSettings.logo_url}
                alt={appSettings.app_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <BookOpenCheck className="w-8 h-8" />
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--color-text)]">
            {appSettings.app_name || 'Hazri Book'} • حاضری بک
          </h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">{t('tagline')}</p>
        </div>

        <div className="bg-[var(--color-surface)] rounded-3xl shadow-xl border border-[var(--color-border)] p-6 sm:p-8">
          <h2 className="text-xl font-bold text-[var(--color-text)] mb-5">
            {t('auth.login')}
          </h2>

          {!isSupabaseConfigured && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Supabase Environment Not Configured</p>
                <p className="leading-relaxed">
                  Set <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
                  <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> to connect cloud sync.
                  Running in local offline preview mode below.
                </p>
              </div>
            </div>
          )}

          {serverError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-[#DC2626] dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label={t('auth.email')}
              type="email"
              placeholder="e.g. teacher@hazribook.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label={t('auth.password')}
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-primary hover:underline py-1"
              >
                {t('auth.forgot_password')}
              </Link>
            </div>

            <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
              {t('auth.login')}
            </Button>
          </form>

          {!isSupabaseConfigured && (
            <div className="mt-6 pt-5 border-t border-[var(--color-border)]">
              <p className="text-xs font-bold text-[var(--color-muted)] mb-2.5 text-center">
                Quick 1-Tap Local Preview Accounts:
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => handleQuickDemo('teacher')}
                  type="button"
                >
                  {t('auth.demo_teacher')}
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => handleQuickDemo('admin')}
                  type="button"
                >
                  {t('auth.demo_admin')}
                </Button>
              </div>
            </div>
          )}

          <div className="mt-5 text-center">
            <p className="text-sm text-[var(--color-muted)]">
              {t('auth.no_account')}{' '}
              <Link to="/signup" className="font-bold text-primary hover:underline">
                {t('auth.signup')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
