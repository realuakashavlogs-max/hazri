import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { BookOpenCheck, AlertCircle, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const resetSchema = z
  .object({
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

export const ResetPasswordPage: React.FC = () => {
  const { updatePassword } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: ResetFormValues) => {
    try {
      setServerError(null);
      await updatePassword(values.newPassword);
      setDone(true);
      showToast('Password updated successfully!', 'success');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err: any) {
      setServerError(err.message || 'Failed to update password. Please request a new reset link.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white mx-auto shadow-md mb-3">
            <BookOpenCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--color-text)]">
            Hazri Book • حاضری بک
          </h1>
        </div>

        <div className="bg-[var(--color-surface)] rounded-3xl shadow-xl border border-[var(--color-border)] p-6 sm:p-8">
          <h2 className="text-xl font-bold text-[var(--color-text)] mb-4">
            {t('auth.reset_password')}
          </h2>

          {done ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-[#16A34A] mx-auto mb-3" />
              <p className="text-base font-semibold text-[var(--color-text)] mb-2">
                Password Updated
              </p>
              <p className="text-sm text-[var(--color-muted)] mb-5">
                You can now log in with your new password.
              </p>
              <Link to="/login">
                <Button className="w-full" size="lg">{t('auth.login')}</Button>
              </Link>
            </div>
          ) : (
            <>
              {serverError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-[#DC2626] dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  label={t('auth.new_password')}
                  type="password"
                  placeholder="••••••••"
                  error={errors.newPassword?.message}
                  {...register('newPassword')}
                />

                <Input
                  label={t('auth.confirm_password')}
                  type="password"
                  placeholder="••••••••"
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />

                <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
                  {t('auth.update_password')}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
