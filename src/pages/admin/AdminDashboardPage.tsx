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
  last_sign_in_at: string | null;
  is_active: boolean;
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
  const [selectedAccount, setSelectedAccount] = useState<AdminAccount | null>(null);
  const [detailTab, setDetailTab] = useState<'classes' | 'students' | 'attendance' | 'performance'>('classes');
  const [detailRows, setDetailRows] = useState<{ classes: any[]; students: any[]; attendance: any[]; performance: any[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadOverview = async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('admin_dashboard_overview_v2');
    if (rpcError) {
      setError(rpcError.message);
      setAccounts([]);
    } else {
      setAccounts((data || []) as AdminAccount[]);
    }
    setLoading(false);
  };

  useEffect(() => { void loadOverview(); }, []);

  const loadAccountDetails = async (account: AdminAccount) => {
    if (!supabase) return;
    setSelectedAccount(account);
    setDetailTab('classes');
    setDetailRows(null);
    setDetailError(null);
    setDetailLoading(true);
    const [classesResult, studentsResult, attendanceResult, performanceResult] = await Promise.all([
      supabase.from('classes').select('id,name').eq('user_id', account.id).order('created_at', { ascending: false }),
      supabase.from('students').select('id,name,roll_no,class_id').eq('user_id', account.id).order('name'),
      supabase.from('attendance_records').select('student_id,attendance_date,status').eq('user_id', account.id).order('attendance_date', { ascending: false }),
      supabase.from('student_daily_performance').select('student_id,record_date,attendance_status,sabaq_listened,sabaq_lines,sabqi_listened,sabqi_lines,manzil_listened,manzil_lines').eq('user_id', account.id).order('record_date', { ascending: false }),
    ]);
    const firstError = classesResult.error || studentsResult.error || attendanceResult.error || performanceResult.error;
    if (firstError) {
      setDetailError(firstError.message);
    } else {
      setDetailRows({
        classes: classesResult.data || [],
        students: studentsResult.data || [],
        attendance: attendanceResult.data || [],
        performance: performanceResult.data || [],
      });
    }
    setDetailLoading(false);
  };

  const detailTabs = [
    { key: 'classes', label: 'Classes' },
    { key: 'students', label: 'Students' },
    { key: 'attendance', label: 'Attendance records' },
    { key: 'performance', label: 'Performance records' },
  ] as const;

  const totals = useMemo(() => accounts.reduce((sum, account) => ({
    accounts: sum.accounts + 1,
    active: sum.active + (account.is_active ? 1 : 0),
    classes: sum.classes + Number(account.classes_count || 0),
    students: sum.students + Number(account.students_count || 0),
    attendance: sum.attendance + Number(account.attendance_count || 0),
    performance: sum.performance + Number(account.performance_count || 0),
  }), { accounts: 0, active: 0, classes: 0, students: 0, attendance: 0, performance: 0 }), [accounts]);

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
        <StatCard label="Registered Users" value={totals.accounts} icon={<Users className="w-5 h-5" />} />
        <StatCard label="Active Users (30 days)" value={totals.active} icon={<Users className="w-5 h-5" />} />
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
                  <th className="p-3 font-bold">Account</th><th className="p-3 font-bold">Role</th><th className="p-3 font-bold">Last Active</th><th className="p-3 font-bold">Classes</th><th className="p-3 font-bold">Students</th><th className="p-3 font-bold">Attendance</th><th className="p-3 font-bold">Performance</th><th className="p-3 font-bold">Status</th><th className="p-3 font-bold">Details</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-t border-[var(--color-border)]">
                    <td className="p-3"><div className="font-bold text-[var(--color-text)]">{account.full_name || 'Unnamed account'}</div><div className="text-xs text-[var(--color-muted)]">{account.email}</div></td>
                    <td className="p-3 capitalize">{account.role}</td>
                    <td className="p-3 text-xs whitespace-nowrap">{account.last_sign_in_at ? new Date(account.last_sign_in_at).toLocaleDateString() : "Never"}<div className={account.is_active ? "text-emerald-600 font-bold" : "text-[var(--color-muted)]"}>{account.is_active ? "Active" : "Inactive"}</div></td>
                    <td className="p-3 tabular-nums">{Number(account.classes_count || 0)}</td>
                    <td className="p-3 tabular-nums">{Number(account.students_count || 0)}</td>
                    <td className="p-3 tabular-nums">{Number(account.attendance_count || 0)}</td>
                    <td className="p-3 tabular-nums">{Number(account.performance_count || 0)}</td>
                    <td className="p-3"><span className={account.is_blocked ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>{account.is_blocked ? 'Blocked' : 'Active'}</span></td><td className="p-3"><button type="button" onClick={() => void loadAccountDetails(account)} className="rounded-lg bg-primary/10 text-primary px-3 py-2 text-xs font-bold hover:bg-primary/15">View records</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {selectedAccount && (
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-extrabold text-lg text-[var(--color-text)]">Account Records</h2>
              <p className="text-xs text-[var(--color-muted)] break-all">{selectedAccount.full_name || 'Unnamed account'} · {selectedAccount.email}</p>
            </div>
            <button type="button" onClick={() => { setSelectedAccount(null); setDetailRows(null); }} className="text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-text)] self-start sm:self-auto">Close details</button>
          </div>
          <div className="flex flex-wrap gap-2 p-3 border-b border-[var(--color-border)]">
            {detailTabs.map((tab) => (
              <button key={tab.key} type="button" onClick={() => setDetailTab(tab.key)} className={`rounded-xl px-3 py-2 text-xs font-bold ${detailTab === tab.key ? 'bg-primary text-white' : 'bg-[var(--color-bg)] text-[var(--color-muted)]'}`}>{tab.label}</button>
            ))}
          </div>
          {detailLoading ? <div className="p-5 text-sm text-[var(--color-muted)]">Loading account records…</div> :
            detailError ? <div role="alert" className="p-4 text-sm text-red-600">{detailError}</div> :
            !detailRows ? <div className="p-4 text-sm text-[var(--color-muted)]">Select a record category.</div> :
            <div className="overflow-x-auto">
              {detailTab === 'classes' && <table className="w-full text-sm"><thead><tr className="text-left text-[var(--color-muted)]"><th className="p-3">Class</th><th className="p-3">Students</th><th className="p-3">ID</th></tr></thead><tbody>{detailRows.classes.map((row) => <tr key={row.id} className="border-t border-[var(--color-border)]"><td className="p-3 font-semibold">{row.name}</td><td className="p-3 tabular-nums">{detailRows.students.filter((student) => student.class_id === row.id).length}</td><td className="p-3 font-mono text-xs">{row.id}</td></tr>)}</tbody></table>}
              {detailTab === 'students' && <table className="w-full min-w-[520px] text-sm"><thead><tr className="text-left text-[var(--color-muted)]"><th className="p-3">Student</th><th className="p-3">Roll No.</th><th className="p-3">Class ID</th></tr></thead><tbody>{detailRows.students.map((row) => <tr key={row.id} className="border-t border-[var(--color-border)]"><td className="p-3 font-semibold">{row.name}</td><td className="p-3">{row.roll_no || '—'}</td><td className="p-3 font-mono text-xs">{row.class_id}</td></tr>)}</tbody></table>}
              {detailTab === 'attendance' && <table className="w-full min-w-[520px] text-sm"><thead><tr className="text-left text-[var(--color-muted)]"><th className="p-3">Date</th><th className="p-3">Student ID</th><th className="p-3">Status</th></tr></thead><tbody>{detailRows.attendance.map((row, i) => <tr key={`${row.student_id}-${row.attendance_date}-${i}`} className="border-t border-[var(--color-border)]"><td className="p-3">{row.attendance_date}</td><td className="p-3 font-mono text-xs">{row.student_id}</td><td className="p-3 capitalize font-semibold">{row.status}</td></tr>)}</tbody></table>}
              {detailTab === 'performance' && <table className="w-full min-w-[760px] text-sm"><thead><tr className="text-left text-[var(--color-muted)]"><th className="p-3">Date</th><th className="p-3">Student ID</th><th className="p-3">Attendance</th><th className="p-3">Sabaq</th><th className="p-3">Sabqi</th><th className="p-3">Manzil</th></tr></thead><tbody>{detailRows.performance.map((row, i) => <tr key={`${row.student_id}-${row.record_date}-${i}`} className="border-t border-[var(--color-border)]"><td className="p-3">{row.record_date}</td><td className="p-3 font-mono text-xs">{row.student_id}</td><td className="p-3 capitalize">{row.attendance_status}</td><td className="p-3">{row.sabaq_listened ? `Yes · ${row.sabaq_lines} lines` : 'No'}</td><td className="p-3">{row.sabqi_listened ? `Yes · ${row.sabqi_lines} lines` : 'No'}</td><td className="p-3">{row.manzil_listened ? `Yes · ${row.manzil_lines} lines` : 'No'}</td></tr>)}</tbody></table>}
            </div>
          }
        </section>
      )}
    </div>
  );
};
