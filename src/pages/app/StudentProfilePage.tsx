import React, { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  Edit3,
  MessageCircle,
  Phone,
  RotateCcw,
  Layers,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { useStudents } from '../../hooks/useStudents';
import { useClasses } from '../../hooks/useClasses';
import { useStudentPerformanceHistory } from '../../hooks/usePerformance';
import { DailyPerformanceForm } from '../../components/performance/DailyPerformanceForm';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { StatCard } from '../../components/ui/StatCard';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { FIXED_STATUS_MAP } from '../../lib/statuses';
import { DAILY_RESULT_MAP, computePerformanceSummary } from '../../lib/performanceStats';
import { normalizePhoneNumber } from '../../lib/whatsapp';
import type { StudentDailyPerformance } from '../../types/database';

type HistoryRange = 'today' | '7d' | '30d' | 'custom';

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

export const StudentProfilePage: React.FC = () => {
  const { studentId = '' } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { students, isLoading: studentsLoading } = useStudents();
  const { classes } = useClasses();

  const student = students.find((s) => s.id === studentId);
  const studentClass = classes.find((c) => c.id === student?.class_id);

  const todayStr = new Date().toISOString().split('T')[0];
  const [formDate, setFormDate] = useState<string>(todayStr);
  const [showForm, setShowForm] = useState<boolean>(true);
  const [historyRange, setHistoryRange] = useState<HistoryRange>('30d');
  const [customStart, setCustomStart] = useState<string>(daysAgoIso(30));
  const [customEnd, setCustomEnd] = useState<string>(todayStr);
  const [detailRecord, setDetailRecord] = useState<StudentDailyPerformance | null>(null);

  const formSectionRef = useRef<HTMLDivElement | null>(null);

  const { startDate, endDate } = useMemo(() => {
    if (historyRange === 'today') {
      return { startDate: todayStr, endDate: todayStr };
    }
    if (historyRange === '7d') {
      return { startDate: daysAgoIso(6), endDate: todayStr };
    }
    if (historyRange === '30d') {
      return { startDate: daysAgoIso(29), endDate: todayStr };
    }
    return {
      startDate: customStart <= customEnd ? customStart : customEnd,
      endDate: customEnd >= customStart ? customEnd : customStart,
    };
  }, [historyRange, todayStr, customStart, customEnd]);

  const { records: historyRecords, isLoading: historyLoading } =
    useStudentPerformanceHistory(studentId, startDate, endDate);

  const summary = useMemo(
    () => computePerformanceSummary(historyRecords),
    [historyRecords]
  );

  const cleanPhone = normalizePhoneNumber(student?.parent_phone);

  if (studentsLoading) {
    return <SkeletonCard count={3} />;
  }

  if (!student) {
    return (
      <EmptyState
        variant="students"
        title="Student Not Found"
        description="This student profile could not be found in your workspace."
        action={
          <Button onClick={() => navigate('/students')}>
            {t('nav.students')}
          </Button>
        }
      />
    );
  }

  const handleEditDate = (date: string) => {
    setFormDate(date);
    setShowForm(true);
    setDetailRecord(null);
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  return (
    <div className="space-y-5">
      {/* Top Back & Report link */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => navigate('/students')}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-bold text-[var(--color-text)] hover:border-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{t('nav.students')}</span>
        </button>

        <Link
          to={`/performance/reports?classId=${student.class_id}&studentId=${student.id}`}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-xl bg-primary/10 text-primary text-xs sm:text-sm font-bold hover:bg-primary/20 transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          <span>{t('performance.student_report')}</span>
        </Link>
      </div>

      {/* Student Header Card */}
      <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            {student.roll_no && (
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-primary/10 text-primary">
                #{student.roll_no}
              </span>
            )}
            <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--color-text)]">
              {student.name}
            </h1>
            {studentClass && (
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-[var(--color-muted)]">
                {studentClass.name}
              </span>
            )}
          </div>

          {student.parent_phone && (
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[var(--color-muted)] font-mono">
              <Phone className="w-3.5 h-3.5" />
              <span>{student.parent_phone}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {cleanPhone && (
            <a
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-[#16A34A] text-white text-xs sm:text-sm font-bold hover:bg-green-700 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </a>
          )}
          <Button
            variant={showForm ? 'outline' : 'primary'}
            onClick={() => setShowForm((prev) => !prev)}
          >
            {showForm
              ? t('performance.hide_form')
              : t('performance.record_today')}
          </Button>
        </div>
      </div>

      {/* Period Summary StatCards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          title={t('performance.days_present')}
          value={summary.daysPresent}
          colorHex="#16A34A"
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <StatCard
          title={t('performance.sabaq_done')}
          value={summary.sabaqCompletedCount}
          colorHex="#2563EB"
          icon={<BookOpen className="w-4 h-4" />}
        />
        <StatCard
          title={t('performance.total_mistakes')}
          value={summary.totalMistakes}
          colorHex="#DC2626"
          icon={<AlertTriangle className="w-4 h-4" />}
        />
        <StatCard
          title={t('performance.total_atak')}
          value={summary.totalAtak}
          colorHex="#7C3AED"
          icon={<RotateCcw className="w-4 h-4" />}
        />
      </div>

      {/* Daily Performance Entry / Edit Section */}
      {showForm && (
        <div ref={formSectionRef} className="space-y-3">
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[var(--color-text)]">
                {t('performance.daily_section_title')}
              </h2>
              <p className="text-xs text-[var(--color-muted)]">
                {t('performance.daily_section_desc')}
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 min-h-[44px] rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <input
                type="date"
                aria-label="Daily performance date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="bg-transparent border-none text-sm font-bold focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          <DailyPerformanceForm
            student={student}
            classId={student.class_id}
            recordDate={formDate}
          />
        </div>
      )}

      {/* Performance History Section */}
      <section className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[var(--color-text)]">
              {t('performance.history_title')}
            </h2>
            <p className="text-xs text-[var(--color-muted)]">
              {startDate} → {endDate} ({historyRecords.length})
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                ['today', t('reports.today')],
                ['7d', t('performance.last_7_days')],
                ['30d', t('performance.last_30_days')],
                ['custom', t('reports.custom_range')],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setHistoryRange(key)}
                className={`px-3 min-h-[40px] rounded-xl text-xs font-bold transition-colors ${
                  historyRange === key
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {historyRange === 'custom' && (
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

        {historyLoading ? (
          <SkeletonCard count={2} />
        ) : historyRecords.length === 0 ? (
          <EmptyState
            variant="attendance"
            title={t('performance.no_history')}
            description={t('performance.no_history_desc')}
          />
        ) : (
          <div className="space-y-2.5">
            {historyRecords.map((rec) => {
              const attMeta = FIXED_STATUS_MAP[rec.attendance_status];
              const resMeta = DAILY_RESULT_MAP[rec.daily_result];
              return (
                <button
                  key={rec.id}
                  type="button"
                  onClick={() => setDetailRecord(rec)}
                  className="w-full text-start p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:border-primary transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-extrabold text-[var(--color-text)]">
                        {rec.record_date}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[11px] font-bold text-white"
                        style={{ backgroundColor: attMeta.color }}
                      >
                        {attMeta.label_en}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[11px] font-bold text-white"
                        style={{ backgroundColor: resMeta.color }}
                      >
                        {resMeta.label_en}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-muted)] truncate">
                      Sabaq: {rec.sabaq_surah || '—'}
                      {rec.sabaq_para ? ` (Para ${rec.sabaq_para})` : ''} •{' '}
                      {rec.sabaq_completed ? 'Done' : 'Incomplete'} | Sabqi:{' '}
                      {rec.sabqi_completed ? 'Done' : 'Incomplete'} | Manzil:{' '}
                      {rec.manzil_completed ? 'Done' : 'Incomplete'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-bold shrink-0">
                    <span className="text-[#DC2626]">
                      Mistakes: {rec.total_mistakes}
                    </span>
                    <span className="text-[#7C3AED]">Atak: {rec.atak_count}</span>
                    <span className="text-primary underline">View</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Date Detail Modal */}
      {detailRecord && (
        <Modal
          isOpen={Boolean(detailRecord)}
          onClose={() => setDetailRecord(null)}
          title={`${student.name} • ${detailRecord.record_date}`}
        >
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-bold text-white"
                style={{
                  backgroundColor:
                    FIXED_STATUS_MAP[detailRecord.attendance_status].color,
                }}
              >
                {FIXED_STATUS_MAP[detailRecord.attendance_status].label_en} •{' '}
                {FIXED_STATUS_MAP[detailRecord.attendance_status].label_ur}
              </span>
              <span
                className="px-2.5 py-1 rounded-full text-xs font-bold text-white"
                style={{
                  backgroundColor: DAILY_RESULT_MAP[detailRecord.daily_result].color,
                }}
              >
                {DAILY_RESULT_MAP[detailRecord.daily_result].label_en} •{' '}
                {DAILY_RESULT_MAP[detailRecord.daily_result].label_ur}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-primary" />
                <span>Sabaq</span>
                {detailRecord.sabaq_completed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-[#DC2626]" />
                )}
              </div>
              <p className="text-xs text-[var(--color-muted)]">
                Listened: {detailRecord.sabaq_listened ? 'Yes' : 'No'} | Completed:{' '}
                {detailRecord.sabaq_completed ? 'Yes' : 'No'} | Surah:{' '}
                {detailRecord.sabaq_surah || '-'} | Para:{' '}
                {detailRecord.sabaq_para || '-'}
              </p>
              <p className="text-xs text-[var(--color-muted)]">
                Ayahs: {detailRecord.sabaq_start_ayah ?? '-'} –{' '}
                {detailRecord.sabaq_end_ayah ?? '-'} | Pages:{' '}
                {detailRecord.sabaq_start_page ?? '-'} –{' '}
                {detailRecord.sabaq_end_page ?? '-'} | Grade:{' '}
                {detailRecord.sabaq_grade || '-'}
              </p>
              {detailRecord.sabaq_remarks && (
                <p className="text-xs italic">{detailRecord.sabaq_remarks}</p>
              )}
            </div>

            <div className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-[#0D9488]" />
                <span>Sabqi</span>
              </div>
              <p className="text-xs text-[var(--color-muted)]">
                Listened: {detailRecord.sabqi_listened ? 'Yes' : 'No'} | Completed:{' '}
                {detailRecord.sabqi_completed ? 'Yes' : 'No'} | Details:{' '}
                {detailRecord.sabqi_details || '-'} | Pages:{' '}
                {detailRecord.sabqi_start_page ?? '-'} –{' '}
                {detailRecord.sabqi_end_page ?? '-'}
              </p>
              {detailRecord.sabqi_remarks && (
                <p className="text-xs italic">{detailRecord.sabqi_remarks}</p>
              )}
            </div>

            <div className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#7C3AED]" />
                <span>Manzil</span>
              </div>
              <p className="text-xs text-[var(--color-muted)]">
                Listened: {detailRecord.manzil_listened ? 'Yes' : 'No'} | Completed:{' '}
                {detailRecord.manzil_completed ? 'Yes' : 'No'} | Details:{' '}
                {detailRecord.manzil_details || '-'} | Pages:{' '}
                {detailRecord.manzil_start_page ?? '-'} –{' '}
                {detailRecord.manzil_end_page ?? '-'}
              </p>
              {detailRecord.manzil_remarks && (
                <p className="text-xs italic">{detailRecord.manzil_remarks}</p>
              )}
            </div>

            <div className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs space-y-1">
              <div className="font-bold text-sm">Mistakes Breakdown</div>
              <p>
                Total: <strong>{detailRecord.total_mistakes}</strong> | Major:{' '}
                <strong>{detailRecord.major_mistakes}</strong> | Minor:{' '}
                <strong>{detailRecord.minor_mistakes}</strong> | Atak:{' '}
                <strong>{detailRecord.atak_count}</strong> | Repeated:{' '}
                <strong>{detailRecord.repeated_mistakes}</strong>
              </p>
            </div>

            {(detailRecord.incomplete_reason || detailRecord.teacher_remarks) && (
              <div className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs space-y-1">
                {detailRecord.incomplete_reason && (
                  <p>
                    <strong>Incomplete Reason:</strong> {detailRecord.incomplete_reason}
                  </p>
                )}
                {detailRecord.teacher_remarks && (
                  <p>
                    <strong>Teacher Remarks:</strong> {detailRecord.teacher_remarks}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setDetailRecord(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() => handleEditDate(detailRecord.record_date)}
                className="gap-1.5"
              >
                <Edit3 className="w-4 h-4" />
                <span>{t('performance.edit_this_date')}</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
