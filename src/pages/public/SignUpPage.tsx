import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { BookOpenCheck, AlertCircle, MailCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const signupSchema = z
  .object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignUpFormValues = z.infer<typeof signupSchema>;

export const SignUpPage: React.FC = () => {
  const { signUp } = useAuth();
  const { appSettings } = useSettings();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: SignUpFormValues) => {
    try {
      setServerError(null);
      const { needsEmailConfirmation } = await signUp(
        values.email,
        values.password,
        values.fullName
      );
      if (needsEmailConfirmation) {
        setConfirmationEmail(values.email);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setServerError(err.message || 'Failed to create account. Please try again.');
    }
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
          {confirmationEmail ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center mx-auto mb-4">
                <MailCheck className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">
                {t('auth.check_email_title')}
              </h2>
              <p className="text-sm text-[var(--color-muted)] mb-6 leading-relaxed">
                {t('auth.check_email_desc', { email: confirmationEmail })}
              </p>
              <Link to="/login">
                <Button className="w-full" size="lg">{t('auth.login')}</Button>
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-[var(--color-text)] mb-5">
                {t('auth.signup')}
              </h2>

              {serverError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-[#DC2626] dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  label={t('auth.full_name')}
                  placeholder="e.g. Ustadh Ahmad"
                  error={errors.fullName?.message}
                  {...register('fullName')}
                />

                <Input
                  label={t('auth.email')}
                  type="email"
                  placeholder="you@example.com"
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

                <Input
                  label={t('auth.confirm_password')}
                  type="password"
                  placeholder="••••••••"
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />

                <Button type="submit" className="w-full mt-2" size="lg" isLoading={isSubmitting}>
                  {t('auth.signup')}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-[var(--color-muted)]">
                  {t('auth.have_account')}{' '}
                  <Link to="/login" className="font-bold text-primary hover:underline">
                    {t('auth.login')}
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
