import React, { useState } from 'react';
import { useClasses } from '../../hooks/useClasses';
import { useStudents } from '../../hooks/useStudents';
import { useAttendanceRange } from '../../hooks/useAttendance';
import { useSettings } from '../../contexts/SettingsContext';
import { useToast } from '../../contexts/ToastContext';
import { isPresentStatus } from '../../lib/statuses';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { exportAttendanceCsv, exportAttendancePdf } from '../../lib/exporters';
import {
  Download,
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const ReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const { effectiveAppName } = useSettings();
  const { showToast } = useToast();
  const { classes } = useClasses();

  const todayStr = new Date().toISOString().split('T')[0];
  const monthStartStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [rangeType, setRangeType] = useState<'today' | 'week' | 'month' | 'custom' | 'all'>('month');
  const [customStart, setCustomStart] = useState<string>(monthStartStr);
  const [customEnd, setCustomEnd] = useState<string>(todayStr);

  React.useEffect(() => {
    if (!selectedClassId && classes.length > 0) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  const getDateRange = () => {
    const today = new Date();
    const end = today.toISOString().split('T')[0];
    let start = end;

    if (rangeType === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
    } else if (rangeType === 'month') {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      start = d.toISOString().split('T')[0];
    } else if (rangeType === 'all') {
      start = '2020-01-01';
    } else if (rangeType === 'custom') {
      return {
        start: customStart <= customEnd ? customStart : customEnd,
        end: customEnd >= customStart ? customEnd : customStart,
      };
    }

    return { start, end };
  };

  const { start: startDate, end: endDate } = getDateRange();

  const { students, isLoading: studentsLoading } = useStudents(selectedClassId);
  const displayedStudents =
    selectedStudentId === 'all'
      ? students
      : students.filter((s) => s.id === selectedStudentId);

  const { records, isLoading: recordsLoading } = useAttendanceRange(
    selectedClassId,
    startDate,
    endDate
  );

  const filteredRecords =
    selectedStudentId === 'all'
      ? records
      : records.filter((r) => r.student_id === selectedStudentId);

  const currentClass = classes.find((c) => c.id === selectedClassId);

  const totalMarks = filteredRecords.length;
  const totalPresents = filteredRecords.filter((r) => isPresentStatus(r.status)).length;
  const totalAbsents = filteredRecords.filter((r) => r.status === 'absent').length;
  const totalLates = filteredRecords.filter((r) => r.status === 'late').length;
  const overallRate = totalMarks > 0 ? ((totalPresents / totalMarks) * 100).toFixed(1) : '0';

  const handleExportCsv = () => {
    if (!currentClass) return;
    exportAttendanceCsv({
      className: currentClass.name,
      dateRange: { start: startDate, end: endDate },
      students: displayedStudents,
      records: filteredRecords,
      appName: effectiveAppName,
    });
    showToast('CSV exported!', 'success');
  };

  const handleExportPdf = () => {
    if (!currentClass) return;
    exportAttendancePdf({
      className: currentClass.name,
      dateRange: { start: startDate, end: endDate },
      students: displayedStudents,
      records: filteredRecords,
      appName: effectiveAppName,
    });
    showToast('PDF downloaded!', 'success');
  };

  return (
    <div className="space-y-4">
      {/* Header & Exports */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-2xl font-extrabold text-[var(--color-text)]">
            {t('reports.title')}
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            Period: <span className="font-mono">{startDate}</span> to{' '}
            <span className="font-mono">{endDate}</span>
          </p>
        </div>

        {displayedStudents.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="md" onClick={handleExportPdf} className="gap-1.5">
              <Printer className="w-4 h-4" />
              <span>{t('reports.print_pdf')}</span>
            </Button>
            <Button size="md" onClick={handleExportCsv} className="gap-1.5 shadow-sm">
              <Download className="w-4 h-4" />
              <span>{t('reports.export_csv')}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Filters Card */}
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-4 space-y-3">
        {classes.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {classes.map((cls) => {
              const isSelected = cls.id === selectedClassId;
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => {
                    setSelectedClassId(cls.id);
                    setSelectedStudentId('all');
                  }}
                  className={`px-3.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
                    isSelected
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-[var(--color-text)] hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cls.name}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                ['today', t('reports.today')],
                ['week', t('reports.last_7_days')],
                ['month', t('reports.this_month')],
                ['custom', t('reports.custom_range')],
                ['all', t('reports.all_time')],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setRangeType(key)}
                className={`px-3 min-h-[40px] rounded-xl text-xs font-bold transition-colors ${
                  rangeType === key
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {students.length > 0 && (
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              aria-label={t('reports.select_student')}
              className="min-h-[44px] px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">{t('reports.all_students')}</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.roll_no ? `#${s.roll_no} - ` : ''}
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {rangeType === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--color-border)]">
            <div>
              <label
                htmlFor="report-start-date"
                className="block text-xs font-semibold text-[var(--color-muted)] mb-1"
              >
                {t('reports.start_date')}
              </label>
              <input
                id="report-start-date"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 text-sm font-semibold rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)]"
              />
            </div>
            <div>
              <label
                htmlFor="report-end-date"
                className="block text-xs font-semibold text-[var(--color-muted)] mb-1"
              >
                {t('reports.end_date')}
              </label>
              <input
                id="report-end-date"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 text-sm font-semibold rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary StatCards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          title={t('reports.overall_rate')}
          value={`${overallRate}%`}
          colorHex="#2563EB"
          icon={<UserCheck className="w-4 h-4" />}
        />
        <StatCard
          title={t('reports.present')}
          value={totalPresents}
          colorHex="#16A34A"
          icon={<CheckCircle className="w-4 h-4" />}
        />
        <StatCard
          title={t('reports.absent')}
          value={totalAbsents}
          colorHex="#DC2626"
          icon={<XCircle className="w-4 h-4" />}
        />
        <StatCard
          title={t('reports.late')}
          value={totalLates}
          colorHex="#F59E0B"
          icon={<Clock className="w-4 h-4" />}
        />
      </div>

      {/* Responsive Table (Desktop/Tablet) + Stacked Cards (Mobile) */}
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] overflow-hidden">
        <div className="px-4 py-3.5 border-b border-[var(--color-border)] font-bold text-sm text-[var(--color-text)]">
          Student Attendance Breakdown ({displayedStudents.length})
        </div>

        {studentsLoading || recordsLoading ? (
          <div className="p-4">
            <SkeletonCard count={3} />
          </div>
        ) : displayedStudents.length === 0 ? (
          <div className="p-4">
            <EmptyState
              variant="students"
              title="No Student Records"
              description="No students found in this class for the selected period."
            />
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-slate-50/70 dark:bg-slate-800/40 text-xs font-bold text-[var(--color-muted)] uppercase">
                    <th className="py-3 px-4 text-start">{t('reports.student')}</th>
                    <th className="py-3 px-4 text-center">{t('reports.present')}</th>
                    <th className="py-3 px-4 text-center">{t('reports.absent')}</th>
                    <th className="py-3 px-4 text-center">{t('reports.late')}</th>
                    <th className="py-3 px-4 text-center">{t('reports.leave')}</th>
                    <th className="py-3 px-4 text-center">{t('reports.total')}</th>
                    <th className="py-3 px-4 text-end">{t('reports.rate')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] text-sm">
                  {displayedStudents.map((s) => {
                    const studentRecs = filteredRecords.filter((r) => r.student_id === s.id);
                    const total = studentRecs.length;
                    const present = studentRecs.filter((r) => isPresentStatus(r.status)).length;
                    const absent = studentRecs.filter((r) => r.status === 'absent').length;
                    const late = studentRecs.filter((r) => r.status === 'late').length;
                    const leave = studentRecs.filter((r) => r.status === 'leave').length;
                    const rate = total > 0 ? (present / total) * 100 : 100;

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-[var(--color-text)]">
                          <div className="flex items-center gap-2">
                            {s.roll_no && (
                              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[var(--color-muted)]">
                                #{s.roll_no}
                              </span>
                            )}
                            <span>{s.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-[#16A34A]">{present}</td>
                        <td className="py-3 px-4 text-center font-semibold text-[#DC2626]">{absent}</td>
                        <td className="py-3 px-4 text-center font-semibold text-[#F59E0B]">{late}</td>
                        <td className="py-3 px-4 text-center font-semibold text-[#7C3AED]">{leave}</td>
                        <td className="py-3 px-4 text-center text-[var(--color-muted)]">{total}</td>
                        <td className="py-3 px-4 text-end">
                          <span
                            className={`font-extrabold ${
                              rate >= 80
                                ? 'text-[#16A34A]'
                                : rate >= 60
                                ? 'text-[#F59E0B]'
                                : 'text-[#DC2626]'
                            }`}
                          >
                            {rate.toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards */}
            <div className="md:hidden divide-y divide-[var(--color-border)]">
              {displayedStudents.map((s) => {
                const studentRecs = filteredRecords.filter((r) => r.student_id === s.id);
                const total = studentRecs.length;
                const present = studentRecs.filter((r) => isPresentStatus(r.status)).length;
                const absent = studentRecs.filter((r) => r.status === 'absent').length;
                const late = studentRecs.filter((r) => r.status === 'late').length;
                const leave = studentRecs.filter((r) => r.status === 'leave').length;
                const rate = total > 0 ? (present / total) * 100 : 100;

                return (
                  <div key={s.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {s.roll_no && (
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[var(--color-muted)]">
                            #{s.roll_no}
                          </span>
                        )}
                        <span className="font-bold text-sm text-[var(--color-text)]">
                          {s.name}
                        </span>
                      </div>

                      <span
                        className={`text-sm font-extrabold ${
                          rate >= 80
                            ? 'text-[#16A34A]'
                            : rate >= 60
                            ? 'text-[#F59E0B]'
                            : 'text-[#DC2626]'
                        }`}
                      >
                        {rate.toFixed(0)}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(rate, 100)}%`,
                          backgroundColor:
                            rate >= 80 ? '#16A34A' : rate >= 60 ? '#F59E0B' : '#DC2626',
                        }}
                      />
                    </div>

                    <div className="flex items-center flex-wrap gap-3 text-xs text-[var(--color-muted)]">
                      <span className="text-[#16A34A] font-semibold">
                        {t('reports.present')}: {present}
                      </span>
                      <span className="text-[#DC2626] font-semibold">
                        {t('reports.absent')}: {absent}
                      </span>
                      <span className="text-[#F59E0B] font-semibold">
                        {t('reports.late')}: {late}
                      </span>
                      <span className="text-[#7C3AED] font-semibold">
                        {t('reports.leave')}: {leave}
                      </span>
                      <span>
                        {t('reports.total')}: {total}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
