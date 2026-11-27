import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  CheckCircle2,
  Download,
  Layers,
  Printer,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { useClasses } from '../../hooks/useClasses';
import { useStudents } from '../../hooks/useStudents';
import { usePerformanceRange } from '../../hooks/usePerformance';
import { useSettings } from '../../contexts/SettingsContext';
import { useToast } from '../../contexts/ToastContext';
import { computePerformanceSummary } from '../../lib/performanceStats';
import { FIXED_STATUS_MAP } from '../../lib/statuses';
import { exportPerformancePdf } from '../../lib/exporters';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

type ReportPeriod = 'date' | 'week' | 'month' | 'custom';

export const PerformanceReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const { effectiveAppName } = useSettings();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const { classes } = useClasses();

  const todayStr = new Date().toISOString().split('T')[0];
  const monthStartStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const [selectedClassId, setSelectedClassId] = useState<string>(
    searchParams.get('classId') || 'all'
  );
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    searchParams.get('studentId') || 'all'
  );
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [singleDate, setSingleDate] = useState<string>(todayStr);
  const [customStart, setCustomStart] = useState<string>(monthStartStr);
  const [customEnd, setCustomEnd] = useState<string>(todayStr);

  const { students } = useStudents(
    selectedClassId === 'all' ? undefined : selectedClassId
  );

  useEffect(() => {
    if (
      selectedStudentId !== 'all' &&
      students.length > 0 &&
      !students.some((s) => s.id === selectedStudentId)
    ) {
      setSelectedStudentId('all');
    }
  }, [students, selectedStudentId]);

  const { startDate, endDate } = useMemo(() => {
    if (period === 'date') {
      return { startDate: singleDate, endDate: singleDate };
    }
    if (period === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return { startDate: d.toISOString().split('T')[0], endDate: todayStr };
    }
    if (period === 'month') {
      return { startDate: monthStartStr, endDate: todayStr };
    }
    return {
      startDate: customStart <= customEnd ? customStart : customEnd,
      endDate: customEnd >= customStart ? customEnd : customStart,
    };
  }, [period, singleDate, monthStartStr, todayStr, customStart, customEnd]);

  const { records, isLoading } = usePerformanceRange({
    classId: selectedClassId === 'all' ? undefined : selectedClassId,
    studentId: selectedStudentId === 'all' ? undefined : selectedStudentId,
    startDate,
    endDate,
  });

  const summary = useMemo(() => computePerformanceSummary(records), [records]);

  const studentMap = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students]
  );

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const trendPoints = useMemo(() => {
    const sorted = [...records].sort((a, b) => a.record_date.localeCompare(b.record_date));
    return sorted.slice(-14);
  }, [records]);

  const maxLines = Math.max(
    1,
    ...trendPoints.map((r) => {
      const sabaq = r.sabaq_listened ? r.sabaq_lines ?? 0 : 0;
      const sabqi = r.sabqi_listened ? r.sabqi_lines ?? 0 : 0;
      const manzil = r.manzil_listened ? r.manzil_lines ?? 0 : 0;
      return Math.max(sabaq, sabqi, manzil);
    })
  );

  const handleDownloadPdf = () => {
    exportPerformancePdf({
      title: selectedClass ? `Class: ${selectedClass.name}` : 'All Classes',
      subtitle: selectedStudent ? `Student: ${selectedStudent.name}` : 'All Students',
      dateRange: { start: startDate, end: endDate },
      students,
      records,
      appName: effectiveAppName,
    });
    showToast('Sabaq report PDF downloaded!', 'success');
  };

  return (
    <div className="space-y-4">
      {/* Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Link
              to="/reports"
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-[var(--color-muted)] hover:text-[var(--color-text)]"
            >
              {t('reports.attendance_tab')}
            </Link>
            <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-white">
              {t('reports.performance_tab')}
            </span>
          </div>
          <h1 className="text-[22px] sm:text-2xl font-extrabold text-[var(--color-text)]">
            {t('performance.reports_title')}
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            <span className="font-mono">{startDate}</span> →{' '}
            <span className="font-mono">{endDate}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="md"
            onClick={() => window.print()}
            className="gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>{t('performance.print_report')}</span>
          </Button>
          <Button
            size="md"
            onClick={handleDownloadPdf}
            disabled={records.length === 0}
            className="gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>{t('reports.print_pdf')}</span>
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-4 space-y-3 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
              {t('nav.classes')}
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedStudentId('all');
              }}
              className="w-full min-h-[44px] px-3 py-2 text-sm font-bold rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)]"
            >
              <option value="all">{t('students.all_classes')}</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
              {t('reports.select_student')}
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 text-sm font-bold rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)]"
            >
              <option value="all">{t('reports.all_students')}</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.roll_no ? `#${s.roll_no} - ` : ''}
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-[var(--color-border)]">
          {(
            [
              ['date', t('performance.selected_date')],
              ['week', t('performance.weekly')],
              ['month', t('performance.monthly')],
              ['custom', t('reports.custom_range')],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={`px-3 min-h-[40px] rounded-xl text-xs font-bold transition-colors ${
                period === key
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-[var(--color-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {period === 'date' && (
          <div className="pt-2 border-t border-[var(--color-border)] max-w-xs">
            <input
              type="date"
              value={singleDate}
              onChange={(e) => setSingleDate(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 text-sm font-semibold rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]"
            />
          </div>
        )}

        {period === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--color-border)]">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
                {t('reports.start_date')}
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 text-sm font-semibold rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
                {t('reports.end_date')}
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 text-sm font-semibold rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold">{effectiveAppName} — Sabaq & Attendance Report</h1>
        <p className="text-sm">
          {selectedClass ? selectedClass.name : 'All Classes'} |{' '}
          {selectedStudent ? selectedStudent.name : 'All Students'} | {startDate} to{' '}
          {endDate}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          title={t('performance.days_present')}
          value={summary.daysPresent}
          colorHex="#16A34A"
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <StatCard
          title={t('performance.days_absent')}
          value={summary.daysAbsent}
          colorHex="#DC2626"
          icon={<XCircle className="w-4 h-4" />}
        />
        <StatCard
          title={t('performance.sabaq_lines_total')}
          value={summary.totalSabaqLines}
          colorHex="#2563EB"
          icon={<BookOpen className="w-4 h-4" />}
        />
        <StatCard
          title={t('performance.sabqi_lines_total')}
          value={summary.totalSabqiLines}
          colorHex="#0D9488"
          icon={<RotateCcw className="w-4 h-4" />}
        />
        <StatCard
          title={t('performance.manzil_lines_total')}
          value={summary.totalManzilLines}
          colorHex="#7C3AED"
          icon={<Layers className="w-4 h-4" />}
        />
      </div>

      {/* Visual Breakdown & Lines Chart */}
      {records.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 space-y-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm sm:text-base font-extrabold text-[var(--color-text)]">
                {t('performance.completion_breakdown')}
              </h2>
              <span className="text-xs font-bold font-mono text-primary">
                {summary.totalLines} {t('performance.lines_unit')}
              </span>
            </div>

            <div className="space-y-3">
              {[
                {
                  label: t('performance.section_sabaq'),
                  done: summary.sabaqListenedCount,
                  lines: summary.totalSabaqLines,
                  total: summary.totalDays,
                  color: '#2563EB',
                },
                {
                  label: t('performance.section_sabqi'),
                  done: summary.sabqiListenedCount,
                  lines: summary.totalSabqiLines,
                  total: summary.totalDays,
                  color: '#0D9488',
                },
                {
                  label: t('performance.section_manzil'),
                  done: summary.manzilListenedCount,
                  lines: summary.totalManzilLines,
                  total: summary.totalDays,
                  color: '#7C3AED',
                },
              ].map((bar) => {
                const pct =
                  bar.total > 0 ? Math.round((bar.done / bar.total) * 100) : 0;
                return (
                  <div key={bar.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>{bar.label}</span>
                      <span className="font-mono">
                        {bar.done}/{bar.total} ({pct}%) • {bar.lines}{' '}
                        {t('performance.lines_unit')}
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: bar.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trend Bar Chart (SVG) for Recited Lines */}
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-extrabold text-[var(--color-text)]">
                {t('performance.trend_chart_title')}
              </h2>
              <div className="flex items-center gap-3 text-[11px] font-bold">
                <span className="inline-flex items-center gap-1 text-[#2563EB]">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#2563EB]" /> Sabaq
                </span>
                <span className="inline-flex items-center gap-1 text-[#0D9488]">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#0D9488]" /> Sabqi
                </span>
                <span className="inline-flex items-center gap-1 text-[#7C3AED]">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#7C3AED]" /> Manzil
                </span>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${Math.max(280, trendPoints.length * 44)} 140`}
                className="w-full h-36"
                role="img"
                aria-label="Daily Sabaq, Sabqi, and Manzil lines chart"
              >
                {trendPoints.map((pt, idx) => {
                  const x = idx * 44 + 8;
                  const sabaqLines = pt.sabaq_listened ? pt.sabaq_lines ?? 0 : 0;
                  const sabqiLines = pt.sabqi_listened ? pt.sabqi_lines ?? 0 : 0;
                  const manzilLines = pt.manzil_listened ? pt.manzil_lines ?? 0 : 0;

                  const hSabaq = Math.max(sabaqLines > 0 ? 6 : 2, (sabaqLines / maxLines) * 95);
                  const hSabqi = Math.max(sabqiLines > 0 ? 6 : 2, (sabqiLines / maxLines) * 95);
                  const hManzil = Math.max(manzilLines > 0 ? 6 : 2, (manzilLines / maxLines) * 95);

                  return (
                    <g key={pt.id}>
                      <rect
                        x={x}
                        y={110 - hSabaq}
                        width={9}
                        height={hSabaq}
                        rx={2}
                        fill="#2563EB"
                      />
                      <rect
                        x={x + 11}
                        y={110 - hSabqi}
                        width={9}
                        height={hSabqi}
                        rx={2}
                        fill="#0D9488"
                      />
                      <rect
                        x={x + 22}
                        y={110 - hManzil}
                        width={9}
                        height={hManzil}
                        rx={2}
                        fill="#7C3AED"
                      />
                      <text
                        x={x + 15}
                        y={128}
                        textAnchor="middle"
                        fontSize="8"
                        fill="currentColor"
                        opacity="0.65"
                      >
                        {pt.record_date.slice(5)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Records Table / Cards */}
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] overflow-hidden">
        <div className="px-4 py-3.5 border-b border-[var(--color-border)] font-bold text-sm text-[var(--color-text)]">
          {t('performance.records_breakdown')} ({records.length})
        </div>

        {isLoading ? (
          <div className="p-4">
            <SkeletonCard count={3} />
          </div>
        ) : records.length === 0 ? (
          <div className="p-4">
            <EmptyState
              variant="attendance"
              title="No Performance Records"
              description="Record daily Attendance, Sabaq, Sabqi, and Manzil from Daily Sabaq or Student Profile."
            />
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-slate-50/70 dark:bg-slate-800/40 text-xs font-bold text-[var(--color-muted)] uppercase">
                    <th className="py-3 px-4 text-start">Date</th>
                    <th className="py-3 px-4 text-start">Student</th>
                    <th className="py-3 px-4 text-center">Attend</th>
                    <th className="py-3 px-4 text-center">Sabaq</th>
                    <th className="py-3 px-4 text-center">Sabqi</th>
                    <th className="py-3 px-4 text-center">Manzil</th>
                    <th className="py-3 px-4 text-end">Total Lines</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] text-sm">
                  {records.map((r) => {
                    const st = studentMap.get(r.student_id);
                    const attMeta = FIXED_STATUS_MAP[r.attendance_status];
                    const sabaqLines = r.sabaq_listened ? r.sabaq_lines ?? 0 : 0;
                    const sabqiLines = r.sabqi_listened ? r.sabqi_lines ?? 0 : 0;
                    const manzilLines = r.manzil_listened ? r.manzil_lines ?? 0 : 0;

                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                      >
                        <td className="py-3 px-4 font-mono text-xs font-bold">
                          {r.record_date}
                        </td>
                        <td className="py-3 px-4 font-bold">
                          <Link
                            to={`/students/${r.student_id}`}
                            className="text-primary hover:underline"
                          >
                            {st ? `${st.roll_no ? `#${st.roll_no} ` : ''}${st.name}` : '-'}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className="px-2 py-0.5 rounded-full text-[11px] font-bold text-white"
                            style={{ backgroundColor: attMeta.color }}
                          >
                            {attMeta.label_en}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-xs font-bold">
                          <span className={r.sabaq_listened ? 'text-[#16A34A]' : 'text-[#DC2626]'}>
                            {r.sabaq_listened ? t('common.yes') : t('common.no')}
                          </span>{' '}
                          <span className="font-mono text-[var(--color-muted)]">
                            ({sabaqLines})
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-xs font-bold">
                          <span className={r.sabqi_listened ? 'text-[#16A34A]' : 'text-[#DC2626]'}>
                            {r.sabqi_listened ? t('common.yes') : t('common.no')}
                          </span>{' '}
                          <span className="font-mono text-[var(--color-muted)]">
                            ({sabqiLines})
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-xs font-bold">
                          <span className={r.manzil_listened ? 'text-[#16A34A]' : 'text-[#DC2626]'}>
                            {r.manzil_listened ? t('common.yes') : t('common.no')}
                          </span>{' '}
                          <span className="font-mono text-[var(--color-muted)]">
                            ({manzilLines})
                          </span>
                        </td>
                        <td className="py-3 px-4 text-end font-mono font-extrabold text-primary">
                          {sabaqLines + sabqiLines + manzilLines}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-[var(--color-border)]">
              {records.map((r) => {
                const st = studentMap.get(r.student_id);
                const attMeta = FIXED_STATUS_MAP[r.attendance_status];
                const sabaqLines = r.sabaq_listened ? r.sabaq_lines ?? 0 : 0;
                const sabqiLines = r.sabqi_listened ? r.sabqi_lines ?? 0 : 0;
                const manzilLines = r.manzil_listened ? r.manzil_lines ?? 0 : 0;
                return (
                  <Link
                    key={r.id}
                    to={`/students/${r.student_id}`}
                    className="block p-4 space-y-1.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-primary">
                        {st ? st.name : r.student_id}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[11px] font-bold text-white"
                        style={{ backgroundColor: attMeta.color }}
                      >
                        {attMeta.label_en}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--color-muted)] font-mono">
                      {r.record_date} • Sabaq: {r.sabaq_listened ? sabaqLines : 0} • Sabqi:{' '}
                      {r.sabqi_listened ? sabqiLines : 0} • Manzil:{' '}
                      {r.manzil_listened ? manzilLines : 0}
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
