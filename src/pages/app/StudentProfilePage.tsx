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
import { computePerformanceSummary } from '../../lib/performanceStats';
import { ParentMessageComposerModal } from '../../components/messaging/ParentMessageComposerModal';
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
  const [messageDate, setMessageDate] = useState<string | null>(null);

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

          <div className="flex items-center gap-2 flex-wrap">
            {student.parent_phone && (
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[var(--color-muted)] font-mono">
                <Phone className="w-3.5 h-3.5" />
                <span>{student.parent_phone}</span>
              </div>
            )}
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                student.messaging_consent
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
              }`}
            >
              {student.messaging_consent ? 'Parent Consent ✓' : 'Consent Needed'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            onClick={() => setMessageDate(formDate)}
            className="gap-1.5 bg-[#16A34A] hover:bg-green-700 text-white"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </Button>
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
              const sabaqLines = rec.sabaq_listened ? rec.sabaq_lines ?? 0 : 0;
              const sabqiLines = rec.sabqi_listened ? rec.sabqi_lines ?? 0 : 0;
              const manzilLines = rec.manzil_listened ? rec.manzil_lines ?? 0 : 0;

              return (
                <div
                  key={rec.id}
                  className="w-full p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:border-primary transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <button
                    type="button"
                    onClick={() => setDetailRecord(rec)}
                    className="flex-1 text-start space-y-1 min-w-0"
                  >
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
                    </div>
                    <p className="text-xs text-[var(--color-muted)]">
                      Sabaq: {rec.sabaq_listened ? `${t('common.yes')} (${sabaqLines})` : `${t('common.no')} (0)`} •{' '}
                      Sabqi: {rec.sabqi_listened ? `${t('common.yes')} (${sabqiLines})` : `${t('common.no')} (0)`} •{' '}
                      Manzil: {rec.manzil_listened ? `${t('common.yes')} (${manzilLines})` : `${t('common.no')} (0)`}
                    </p>
                  </button>

                  <div className="flex items-center gap-2 text-xs font-bold shrink-0">
                    <span className="font-mono text-[var(--color-text)]">
                      {sabaqLines + sabqiLines + manzilLines} {t('performance.lines_unit')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMessageDate(rec.record_date)}
                      aria-label={`WhatsApp parent for ${rec.record_date}`}
                      className="inline-flex items-center gap-1 min-h-[38px] px-2.5 rounded-xl bg-[#16A34A]/10 text-[#16A34A] hover:bg-[#16A34A]/20 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailRecord(rec)}
                      className="min-h-[38px] px-2 text-primary underline"
                    >
                      {t('performance.view_record')}
                    </button>
                  </div>
                </div>
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
            </div>

            <div className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-between">
              <div className="font-bold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#2563EB]" />
                <span>{t('performance.section_sabaq')}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold">
                {detailRecord.sabaq_listened ? (
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                ) : (
                  <XCircle className="w-4 h-4 text-[#DC2626]" />
                )}
                <span>
                  {detailRecord.sabaq_listened ? t('common.yes') : t('common.no')} •{' '}
                  <span className="font-mono">
                    {detailRecord.sabaq_listened ? detailRecord.sabaq_lines ?? 0 : 0}{' '}
                    {t('performance.lines_unit')}
                  </span>
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-between">
              <div className="font-bold flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-[#0D9488]" />
                <span>{t('performance.section_sabqi')}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold">
                {detailRecord.sabqi_listened ? (
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                ) : (
                  <XCircle className="w-4 h-4 text-[#DC2626]" />
                )}
                <span>
                  {detailRecord.sabqi_listened ? t('common.yes') : t('common.no')} •{' '}
                  <span className="font-mono">
                    {detailRecord.sabqi_listened ? detailRecord.sabqi_lines ?? 0 : 0}{' '}
                    {t('performance.lines_unit')}
                  </span>
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-between">
              <div className="font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#7C3AED]" />
                <span>{t('performance.section_manzil')}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold">
                {detailRecord.manzil_listened ? (
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                ) : (
                  <XCircle className="w-4 h-4 text-[#DC2626]" />
                )}
                <span>
                  {detailRecord.manzil_listened ? t('common.yes') : t('common.no')} •{' '}
                  <span className="font-mono">
                    {detailRecord.manzil_listened ? detailRecord.manzil_lines ?? 0 : 0}{' '}
                    {t('performance.lines_unit')}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-2 flex-wrap">
              <Button
                type="button"
                onClick={() => {
                  const dt = detailRecord.record_date;
                  setDetailRecord(null);
                  setMessageDate(dt);
                }}
                className="gap-1.5 bg-[#16A34A] hover:bg-green-700 text-white"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </Button>
              <div className="flex justify-end gap-2">
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
          </div>
        </Modal>
      )}

      {messageDate && (
        <ParentMessageComposerModal
          isOpen={Boolean(messageDate)}
          onClose={() => setMessageDate(null)}
          student={student}
          className={studentClass?.name || ''}
          recordDate={messageDate}
        />
      )}
    </div>
  );
};
