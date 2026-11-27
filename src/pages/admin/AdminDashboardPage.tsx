import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, ShieldCheck, Users, GraduationCap, BookOpenCheck, ClipboardCheck, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

type AdminAccount = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_blocked: boolean;
  created_at: string;
  classes_count: number;
  students_count: number;
  attendance_count: number;
  performance_count: number;
};

const StatCard: React.FC<{ label: string; value: number; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm min-w-0">
    <div className="flex items-center justify-between gap-2 text-[var(--color-muted)]">
      <span className="text-xs sm:text-sm font-semibold">{label}</span>
      {icon}
    </div>
    <p className="mt-2 text-2xl sm:text-3xl font-extrabold tabular-nums text-[var(--color-text)]">{value.toLocaleString()}</p>
  </div>
);

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('admin_dashboard_overview');
    if (rpcError) {
      setError(rpcError.message);
      setAccounts([]);
    } else {
      setAccounts((data || []) as AdminAccount[]);
    }
    setLoading(false);
  };

  useEffect(() => { void loadOverview(); }, []);

  const totals = useMemo(() => accounts.reduce((sum, account) => ({
    accounts: sum.accounts + 1,
    classes: sum.classes + Number(account.classes_count || 0),
    students: sum.students + Number(account.students_count || 0),
    attendance: sum.attendance + Number(account.attendance_count || 0),
    performance: sum.performance + Number(account.performance_count || 0),
  }), { accounts: 0, classes: 0, students: 0, attendance: 0, performance: 0 }), [accounts]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wide"><ShieldCheck className="w-4 h-4" /> Secure Admin Area</div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]">Admin Dashboard</h1>
          <p className="text-sm text-[var(--color-muted)] break-all">Signed in as {user?.email}</p>
        </div>
        <button type="button" onClick={() => void loadOverview()} disabled={loading}
          className="inline-flex items-center justify-center gap-2 min-h-10 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-semibold disabled:opacity-60">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 text-red-700 p-3 text-sm flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>Admin data could not be loaded: {error}</span></div>}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Registered Accounts" value={totals.accounts} icon={<Users className="w-5 h-5" />} />
        <StatCard label="Total Classes" value={totals.classes} icon={<GraduationCap className="w-5 h-5" />} />
        <StatCard label="Total Students" value={totals.students} icon={<Users className="w-5 h-5" />} />
        <StatCard label="Attendance Records" value={totals.attendance} icon={<ClipboardCheck className="w-5 h-5" />} />
      </section>
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard label="Daily Performance Records" value={totals.performance} icon={<BookOpenCheck className="w-5 h-5" />} />
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
          <p className="text-xs sm:text-sm font-semibold text-[var(--color-muted)]">Access policy</p>
          <p className="mt-2 text-sm font-bold text-[var(--color-text)]">Only database-verified Admin accounts can access this dashboard.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="font-extrabold text-lg text-[var(--color-text)]">All Registered Accounts</h2>
          <p className="text-xs text-[var(--color-muted)]">Classes, students, attendance and daily performance totals by account.</p>
        </div>
        {loading ? <div className="p-6 text-sm text-[var(--color-muted)]">Loading admin overview…</div> : accounts.length === 0 ? <div className="p-6 text-sm text-[var(--color-muted)]">No registered accounts found.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-[var(--color-bg)] text-[var(--color-muted)]">
                <tr className="text-left">
                  <th className="p-3 font-bold">Account</th><th className="p-3 font-bold">Role</th><th className="p-3 font-bold">Classes</th><th className="p-3 font-bold">Students</th><th className="p-3 font-bold">Attendance</th><th className="p-3 font-bold">Performance</th><th className="p-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-t border-[var(--color-border)]">
                    <td className="p-3"><div className="font-bold text-[var(--color-text)]">{account.full_name || 'Unnamed account'}</div><div className="text-xs text-[var(--color-muted)]">{account.email}</div></td>
                    <td className="p-3 capitalize">{account.role}</td>
                    <td className="p-3 tabular-nums">{Number(account.classes_count || 0)}</td>
                    <td className="p-3 tabular-nums">{Number(account.students_count || 0)}</td>
                    <td className="p-3 tabular-nums">{Number(account.attendance_count || 0)}</td>
                    <td className="p-3 tabular-nums">{Number(account.performance_count || 0)}</td>
                    <td className="p-3"><span className={account.is_blocked ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>{account.is_blocked ? 'Blocked' : 'Active'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
