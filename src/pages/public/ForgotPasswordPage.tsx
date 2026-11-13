import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { BookOpenCheck, CheckCircle, ArrowLeft, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const ForgotPasswordPage: React.FC = () => {
  const { resetPassword } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setServerError(null);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: any) {
      setServerError(err.message || 'Failed to send password reset link. Please try again.');
    } finally {
      setIsLoading(false);
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
          <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">
            {t('auth.forgot_password')}
          </h2>

          {sent ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-[#16A34A] mx-auto mb-3" />
              <p className="text-base font-semibold text-[var(--color-text)] mb-1">
                Reset Link Sent
              </p>
              <p className="text-sm text-[var(--color-muted)] mb-6">
                If an account exists for {email}, password reset instructions have been sent.
              </p>
              <Link to="/login">
                <Button variant="outline" className="w-full" size="lg">
                  Return to Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-[var(--color-muted)] mb-4">
                Enter your registered email address and we'll send you instructions to reset your password.
              </p>

              {serverError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-[#DC2626] dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}

              <Input
                label={t('auth.email')}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                {t('auth.send_reset_link')}
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-3 text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-text)]"
                >
                  <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                  <span>Back to Login</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
