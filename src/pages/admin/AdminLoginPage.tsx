import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldCheck, AlertCircle, LoaderCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const AdminLoginPage: React.FC = () => {
  const { user, isAdmin, loading, signInWithPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && user && isAdmin) return <Navigate to="/admin" replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInWithPassword(email, password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen min-h-[100dvh] flex items-center justify-center p-4 bg-[var(--color-bg)] text-[var(--color-text)]">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl p-6 sm:p-8 space-y-5">
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><ShieldCheck className="w-7 h-7" /></div>
          <h1 className="mt-3 text-2xl font-extrabold">Admin Login</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">صرف مجاز ایڈمن اکاؤنٹ یہاں سائن اِن کر سکتا ہے۔</p>
        </div>
        {error && <div role="alert" className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300 flex gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span></div>}
        <label className="block space-y-1.5"><span className="text-sm font-semibold">Admin Email</span><input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full min-h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 outline-none focus:ring-2 focus:ring-primary" /></label>
        <label className="block space-y-1.5"><span className="text-sm font-semibold">Password</span><input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full min-h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 outline-none focus:ring-2 focus:ring-primary" /></label>
        <button type="submit" disabled={busy || !email.trim() || !password} className="w-full min-h-12 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60">{busy && <LoaderCircle className="w-4 h-4 animate-spin" />}{busy ? 'Signing in…' : 'Sign in securely'}</button>
        <p className="text-xs text-center text-[var(--color-muted)]">عام صارفین کے لیے Google Sign-In پہلے کی طرح برقرار ہے۔</p>
      </form>
    </main>
  );
};
