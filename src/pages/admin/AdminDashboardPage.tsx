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

const StatCard: React.FC<{ label: string; value: number; icon: React.ReactNode; onClick?: () => void }> = ({ label, value, icon, onClick }) => {
  const content = <>
    <div className="flex items-center justify-between gap-2 text-[var(--color-muted)]">
      <span className="text-xs sm:text-sm font-semibold">{label}</span>
      {icon}
    </div>
    <p className="mt-2 text-2xl sm:text-3xl font-extrabold tabular-nums text-[var(--color-text)]">{value.toLocaleString()}</p>
    {onClick && <p className="mt-1 text-[11px] font-semibold text-primary">Click to view details</p>}
  </>;
  return onClick ? <button type="button" onClick={onClick} className="w-full text-left rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm min-w-0 hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary">{content}</button> : <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm min-w-0">{content}</div>;
};

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<AdminAccount | null>(null);
  const [detailRows, setDetailRows] = useState<{ classes: any[]; students: any[]; attendance: any[]; performance: any[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [globalCategory, setGlobalCategory] = useState<'classes' | 'students' | 'attendance' | 'performance' | null>(null);
  const [globalRows, setGlobalRows] = useState<any[]>([]);\n  const [expandedGlobalRow, setExpandedGlobalRow] = useState<string | null>(null);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

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
    setDetailRows(null);
    setDetailError(null);
    setDetailLoading(true);
    const [classesResult, studentsResult, attendanceResult, performanceResult] = await Promise.all([
      supabase.from('classes').select('id,name').eq('user_id', account.id).order('created_at', { ascending: false }),
      supabase.from('students').select('id,name,roll_no,class_id').eq('user_id', account.id).order('name'),
      supabase.from('attendance_records').select('student_id,attendance_date,status_id').eq('user_id', account.id).order('attendance_date', { ascending: false }),
      supabase.from('student_daily_performance').select('student_id,record_date,attendance_status,sabaq_listened,sabaq_lines,sabqi_listened,sabqi_lines,manzil_listened,manzil_lines').eq('user_id', account.id).order('record_date', { ascending: false }),
    ]);
    const firstError = classesResult.error || studentsResult.error || attendanceResult.error || performanceResult.error;
    if (firstError) {
      setDetailError(firstError.message);
    } else {
      const { data: statuses, error: statusError } = await supabase.from('attendance_statuses').select('id,label_en,label_ur');
      if (statusError) {
        setDetailError(statusError.message);
      } else {
        const statusRows = (statuses ?? []) as unknown as Array<{ id: string; label_en: string | null; label_ur: string | null }>;
        const statusLabels = new Map(statusRows.map((status) => [status.id, status.label_ur || status.label_en || status.id]));
        const attendanceRows = (attendanceResult.data ?? []) as unknown as Array<Record<string, any>>;
        const studentMap = new Map((studentsResult.data ?? []).map((student: any) => [student.id, student]));
        const classMap = new Map((classesResult.data ?? []).map((cl: any) => [cl.id, cl]));
        setDetailRows({
          classes: classesResult.data || [],
          students: studentsResult.data || [],
          attendance: attendanceRows.map(({ status_id, ...row }) => { const student: any = studentMap.get(row.student_id); return { ...row, student_name: student?.name || 'نام دستیاب نہیں', roll_no: student?.roll_no || '—', class_name: classMap.get(student?.class_id)?.name || 'کلاس دستیاب نہیں', attendance_status: statusLabels.get(status_id) || status_id }; }),
          performance: (performanceResult.data || []).map((row: any) => { const student: any = studentMap.get(row.student_id); return { ...row, student_name: student?.name || 'نام دستیاب نہیں', roll_no: student?.roll_no || '—', class_name: classMap.get(row.class_id || student?.class_id)?.name || 'کلاس دستیاب نہیں' }; }),
        });
      }
    }
    setDetailLoading(false);
  };

  const openGlobalRecords = async (category: 'classes' | 'students' | 'attendance' | 'performance') => {
    if (!supabase || accounts.length === 0) return;
    setGlobalCategory(category);
    setGlobalRows([]);
    setExpandedGlobalRow(null);
    setGlobalError(null);
    setGlobalLoading(true);
    const accountIds = accounts.map((account) => account.id);
    const config = {
      classes: { table: 'classes', columns: 'id,name,section,user_id,created_at', order: 'created_at' },
      students: { table: 'students', columns: 'id,name,roll_no,class_id,user_id', order: 'name' },
      attendance: { table: 'attendance_records', columns: 'id,student_id,class_id,attendance_date,status_id,user_id', order: 'attendance_date' },
      performance: { table: 'student_daily_performance', columns: 'id,student_id,class_id,record_date,attendance_status,sabaq_listened,sabaq_lines,sabqi_listened,sabqi_lines,manzil_listened,manzil_lines,user_id', order: 'record_date' },
    }[category];
    const { data, error: queryError } = await supabase.from(config.table as 'classes' | 'students' | 'attendance_records' | 'student_daily_performance').select(config.columns).in('user_id', accountIds).order(config.order, { ascending: false });
    if (queryError) {
      setGlobalError(queryError.message);
      setGlobalLoading(false);
      return;
    }
    const [studentResult, classResult, statusResult] = await Promise.all([
      supabase.from('students').select('id,name,roll_no,class_id,user_id').in('user_id', accountIds),
      supabase.from('classes').select('id,name,section,user_id').in('user_id', accountIds),
      supabase.from('attendance_statuses').select('id,label_en,label_ur'),
    ]);
    const lookupError = studentResult.error || classResult.error || statusResult.error;
    if (lookupError) {
      setGlobalError(lookupError.message);
    } else {
      const students = studentResult.data ?? [];
      const classes = classResult.data ?? [];
      const studentMap = new Map(students.map((s: any) => [s.id, s]));
      const classMap = new Map(classes.map((cl: any) => [cl.id, cl]));
      const statusMap = new Map((statusResult.data ?? []).map((st: any) => [st.id, st.label_ur || st.label_en || st.id]));
      const enriched = (data ?? []).map((raw: any) => {
        const student = studentMap.get(raw.student_id);
        const classInfo = classMap.get(raw.class_id || student?.class_id);
        const accountEmail = accounts.find((a) => a.id === raw.user_id)?.email || 'Account';
        if (category === 'classes') return { ...raw, class_name: raw.name, account_email: accountEmail };
        if (category === 'students') return { ...raw, student_name: raw.name, class_name: classMap.get(raw.class_id)?.name || 'کلاس دستیاب نہیں', account_email: accountEmail };
        if (category === 'attendance') return { ...raw, student_name: student?.name || 'نام دستیاب نہیں', roll_no: student?.roll_no || '—', class_name: classInfo?.name || 'کلاس دستیاب نہیں', class_section: classInfo?.section || '', attendance_status: statusMap.get(raw.status_id) || raw.status_id, account_email: accountEmail };
        return { ...raw, student_name: student?.name || 'نام دستیاب نہیں', roll_no: student?.roll_no || '—', class_name: classInfo?.name || 'کلاس دستیاب نہیں', class_section: classInfo?.section || '', account_email: accountEmail };
      });
      setGlobalRows(enriched);
    }
    setGlobalLoading(false);
  };



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
        <StatCard label="Total Classes" value={totals.classes} icon={<GraduationCap className="w-5 h-5" />} onClick={() => void openGlobalRecords("classes")} />
        <StatCard label="Total Students" value={totals.students} icon={<Users className="w-5 h-5" />} onClick={() => void openGlobalRecords("students")} />
        <StatCard label="Attendance Records" value={totals.attendance} icon={<ClipboardCheck className="w-5 h-5" />} onClick={() => void openGlobalRecords("attendance")} />
      </section>
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard label="Daily Performance Records" value={totals.performance} icon={<BookOpenCheck className="w-5 h-5" />} onClick={() => void openGlobalRecords("performance")} />
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
          <p className="text-xs sm:text-sm font-semibold text-[var(--color-muted)]">Access policy</p>
          <p className="mt-2 text-sm font-bold text-[var(--color-text)]">Only database-verified Admin accounts can access this dashboard.</p>
        </div>
      </section>

      {globalCategory && (
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between gap-3">
            <div>
              <h2 className="font-extrabold text-lg text-[var(--color-text)]">{({ classes: 'All Classes', students: 'All Students', attendance: 'All Attendance Records', performance: 'All Daily Performance Records' })[globalCategory]}</h2>
              <p className="text-xs text-[var(--color-muted)]">Showing records across all registered accounts</p>
            </div>
            <button type="button" onClick={() => setGlobalCategory(null)} className="rounded-lg px-3 py-2 text-xs font-bold bg-[var(--color-bg)]">Close</button>
          </div>
          {globalLoading ? <div className="p-5 text-sm text-[var(--color-muted)]">Loading records…</div> : globalError ? <div role="alert" className="p-4 text-sm text-red-600">{globalError}</div> : (
            <div className="divide-y divide-[var(--color-border)]">
              {globalRows.map((row, index) => {
                const rowKey = String(row.id || `${row.student_id}-${index}`);
                const expanded = expandedGlobalRow === rowKey;
                const detailFields: Array<[string, any]> = globalCategory === 'attendance'
                  ? [['اکاؤنٹ', row.account_email], ['طالب علم', row.student_name], ['رول نمبر', row.roll_no], ['کلاس', row.class_name], ['سیکشن', row.class_section || '—'], ['تاریخ', row.attendance_date], ['حاضری', row.attendance_status]]
                  : globalCategory === 'performance'
                    ? [['اکاؤنٹ', row.account_email], ['طالب علم', row.student_name], ['رول نمبر', row.roll_no], ['کلاس', row.class_name], ['سیکشن', row.class_section || '—'], ['تاریخ', row.record_date], ['حاضری', row.attendance_status], ['سبق سنایا', row.sabaq_listened ? 'ہاں' : 'نہیں'], ['سبق لائنیں', row.sabaq_lines ?? 0], ['سبقی سنائی', row.sabqi_listened ? 'ہاں' : 'نہیں'], ['سبقی لائنیں', row.sabqi_lines ?? 0], ['منزل سنائی', row.manzil_listened ? 'ہاں' : 'نہیں'], ['منزل لائنیں', row.manzil_lines ?? 0]]
                    : globalCategory === 'students'
                      ? [['اکاؤنٹ', row.account_email], ['طالب علم', row.student_name], ['رول نمبر', row.roll_no], ['کلاس', row.class_name]]
                      : [['اکاؤنٹ', row.account_email], ['کلاس', row.class_name], ['سیکشن', row.section || '—'], ['تخلیق کی تاریخ', row.created_at ? new Date(row.created_at).toLocaleDateString() : '—']];
                return <div key={rowKey} className="p-3">
                  <button type="button" onClick={() => setExpandedGlobalRow(expanded ? null : rowKey)} className="w-full text-left rounded-xl p-3 hover:bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-primary">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-[var(--color-text)]">{globalCategory === 'attendance' || globalCategory === 'performance' ? row.student_name : globalCategory === 'students' ? row.student_name : row.class_name}</p>
                        <p className="text-xs text-[var(--color-muted)]">{globalCategory === 'attendance' ? `${row.class_name} · ${row.attendance_status} · ${row.attendance_date}` : globalCategory === 'performance' ? `${row.class_name} · ${row.record_date}` : row.account_email}</p>
                      </div>
                      <span className="text-xs font-semibold text-primary">{expanded ? 'تفصیل بند کریں' : 'مکمل تفصیل دیکھیں'}</span>
                    </div>
                  </button>
                  {expanded && <div className="mt-2 rounded-xl bg-[var(--color-bg)] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{detailFields.map(([label, value]) => <div key={label}><p className="text-xs text-[var(--color-muted)]">{label}</p><p className="font-semibold text-sm text-[var(--color-text)]">{value == null || value === '' ? '—' : String(value)}</p></div>)}</div>}
                </div>;
              })}
              {globalRows.length === 0 && <p className="p-5 text-sm text-[var(--color-muted)]">No records found.</p>}
            </div>
          )}
        </section>
      )}
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
                    <td className="p-3"><span className={account.is_blocked ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>{account.is_blocked ? 'Blocked' : 'Active'}</span></td><td className="p-3"><button type="button" onClick={() => void loadAccountDetails(account)} className="rounded-lg bg-primary/10 text-primary px-3 py-2 text-xs font-bold hover:bg-primary/15">View Report</button></td>
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
          <div className="p-3 border-b border-[var(--color-border)] text-sm font-semibold text-[var(--color-muted)]">تمام کلاسز، طلبہ، حاضری اور روزانہ کارکردگی کی تفصیل نیچے ایک ساتھ موجود ہے۔ کسی ریکارڈ کو کھول کر مکمل تفصیل دیکھیں۔</div>
          {detailLoading ? <div className="p-5 text-sm text-[var(--color-muted)]">Loading account records…</div> :
            detailError ? <div role="alert" className="p-4 text-sm text-red-600">{detailError}</div> :
            !detailRows ? <div className="p-4 text-sm text-[var(--color-muted)]">Select a record category.</div> :
            <>
            {true && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard label="Total Classes" value={Number(selectedAccount.classes_count || 0)} icon={<GraduationCap className="w-5 h-5" />} />
                  <StatCard label="Total Students" value={Number(selectedAccount.students_count || 0)} icon={<Users className="w-5 h-5" />} />
                  <StatCard label="Attendance Records" value={Number(selectedAccount.attendance_count || 0)} icon={<ClipboardCheck className="w-5 h-5" />} />
                  <StatCard label="Performance Records" value={Number(selectedAccount.performance_count || 0)} icon={<BookOpenCheck className="w-5 h-5" />} />
                </div>
                {detailRows && (
                  <div className="rounded-xl border border-[var(--color-border)] p-4">
                    <h3 className="font-bold text-[var(--color-text)] mb-3">Report Details</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div><p className="text-[var(--color-muted)]">Classes loaded</p><p className="font-extrabold text-xl">{detailRows.classes.length}</p></div>
                      <div><p className="text-[var(--color-muted)]">Students loaded</p><p className="font-extrabold text-xl">{detailRows.students.length}</p></div>
                      <div><p className="text-[var(--color-muted)]">Attendance rows</p><p className="font-extrabold text-xl">{detailRows.attendance.length}</p></div>
                      <div><p className="text-[var(--color-muted)]">Performance rows</p><p className="font-extrabold text-xl">{detailRows.performance.length}</p></div>
                    </div>
                    <p className="mt-3 text-xs text-[var(--color-muted)]">تمام ریکارڈز نیچے الگ الگ حصوں میں دکھائے گئے ہیں۔</p>
                  </div>
                )}
              </div>
            )}
            <div className="overflow-x-auto">
              {true && <section className="p-3"><h3 className="font-bold mb-2">Classes</h3><table className="w-full text-sm"><thead><tr className="text-left text-[var(--color-muted)]"><th className="p-3">Class</th><th className="p-3">Students</th><th className="p-3">ID</th></tr></thead><tbody>{detailRows.classes.map((row) => <tr key={row.id} className="border-t border-[var(--color-border)]"><td className="p-3 font-semibold">{row.name}</td><td className="p-3 tabular-nums">{detailRows.students.filter((student) => student.class_id === row.id).length}</td><td className="p-3 font-mono text-xs">{row.id}</td></tr>)}</tbody></table></section>}
              {true && <section className="p-3"><h3 className="font-bold mb-2">Students</h3><table className="w-full min-w-[520px] text-sm"><thead><tr className="text-left text-[var(--color-muted)]"><th className="p-3">Student</th><th className="p-3">Roll No.</th><th className="p-3">Class ID</th></tr></thead><tbody>{detailRows.students.map((row) => <tr key={row.id} className="border-t border-[var(--color-border)]"><td className="p-3 font-semibold">{row.name}</td><td className="p-3">{row.roll_no || '—'}</td><td className="p-3 font-mono text-xs">{row.class_id}</td></tr>)}</tbody></table></section>}
              {true && <section className="p-3"><h3 className="font-bold mb-2">Attendance Records</h3><table className="w-full min-w-[520px] text-sm"><thead><tr className="text-left text-[var(--color-muted)]"><th className="p-3">Date</th><th className="p-3">Student Name</th><th className="p-3">Roll No.</th><th className="p-3">Class</th><th className="p-3">Attendance</th></tr></thead><tbody>{detailRows.attendance.map((row, i) => <tr key={`${row.student_id}-${row.attendance_date}-${i}`} className="border-t border-[var(--color-border)]"><td className="p-3">{row.attendance_date}</td><td className="p-3 font-semibold">{row.student_name}</td><td className="p-3">{row.roll_no}</td><td className="p-3">{row.class_name}</td><td className="p-3 font-semibold">{row.attendance_status}</td></tr>)}</tbody></table></section>}
              {true && <section className="p-3"><h3 className="font-bold mb-2">Daily Performance Records</h3><table className="w-full min-w-[760px] text-sm"><thead><tr className="text-left text-[var(--color-muted)]"><th className="p-3">Date</th><th className="p-3">Student</th><th className="p-3">Class</th><th className="p-3">Attendance</th><th className="p-3">Sabaq</th><th className="p-3">Sabqi</th><th className="p-3">Manzil</th></tr></thead><tbody>{detailRows.performance.map((row, i) => <tr key={`${row.student_id}-${row.record_date}-${i}`} className="border-t border-[var(--color-border)]"><td className="p-3">{row.record_date}</td><td className="p-3 font-semibold">{row.student_name}</td><td className="p-3">{row.class_name}</td><td className="p-3 capitalize">{row.attendance_status}</td><td className="p-3">{row.sabaq_listened ? `Yes · ${row.sabaq_lines} lines` : 'No'}</td><td className="p-3">{row.sabqi_listened ? `Yes · ${row.sabqi_lines} lines` : 'No'}</td><td className="p-3">{row.manzil_listened ? `Yes · ${row.manzil_lines} lines` : 'No'}</td></tr>)}</tbody></table></section>}
            </div>
            </>
          }
        </section>
      )}
    </div>
  );
};
