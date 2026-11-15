import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  BookOpen,
  RotateCcw,
  Layers,
  AlertTriangle,
  Award,
  MessageSquare,
  Save,
  Minus,
  Plus,
  History,
} from 'lucide-react';
import type {
  AttendanceStatusKey,
  DailyResultKey,
  Student,
  StudentDailyPerformanceInput,
} from '../../types/database';
import { FIXED_STATUSES } from '../../lib/statuses';
import { DAILY_RESULTS, SABAQ_GRADES } from '../../lib/performanceStats';
import {
  usePerformanceRecordForDate,
  useSavePerformance,
} from '../../hooks/usePerformance';
import { useStudentAttendanceForDate } from '../../hooks/useAttendance';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../ui/Button';
import { SkeletonCard } from '../ui/Skeleton';

interface DailyPerformanceFormProps {
  student: Student;
  classId: string;
  recordDate: string;
  onSaved?: (res: { queuedOffline: boolean }) => void;
}

interface FormState {
  attendance_status: AttendanceStatusKey;
  sabaq_listened: boolean;
  sabaq_completed: boolean;
  sabaq_surah: string;
  sabaq_start_ayah: string;
  sabaq_end_ayah: string;
  sabaq_start_page: string;
  sabaq_end_page: string;
  sabaq_para: string;
  sabaq_grade: string;
  sabaq_remarks: string;
  sabqi_listened: boolean;
  sabqi_details: string;
  sabqi_start_page: string;
  sabqi_end_page: string;
  sabqi_completed: boolean;
  sabqi_remarks: string;
  manzil_listened: boolean;
  manzil_details: string;
  manzil_start_page: string;
  manzil_end_page: string;
  manzil_completed: boolean;
  manzil_remarks: string;
  total_mistakes: number;
  major_mistakes: number;
  minor_mistakes: number;
  atak_count: number;
  repeated_mistakes: number;
  daily_result: DailyResultKey;
  incomplete_reason: string;
  teacher_remarks: string;
}

const DEFAULT_FORM_STATE: FormState = {
  attendance_status: 'present',
  sabaq_listened: true,
  sabaq_completed: true,
  sabaq_surah: '',
  sabaq_start_ayah: '',
  sabaq_end_ayah: '',
  sabaq_start_page: '',
  sabaq_end_page: '',
  sabaq_para: '',
  sabaq_grade: 'A',
  sabaq_remarks: '',
  sabqi_listened: true,
  sabqi_details: '',
  sabqi_start_page: '',
  sabqi_end_page: '',
  sabqi_completed: true,
  sabqi_remarks: '',
  manzil_listened: true,
  manzil_details: '',
  manzil_start_page: '',
  manzil_end_page: '',
  manzil_completed: true,
  manzil_remarks: '',
  total_mistakes: 0,
  major_mistakes: 0,
  minor_mistakes: 0,
  atak_count: 0,
  repeated_mistakes: 0,
  daily_result: 'good',
  incomplete_reason: '',
  teacher_remarks: '',
};

function toNumOrNull(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function toStr(val: number | null | undefined): string {
  return val === null || val === undefined ? '' : String(val);
}

const inputCls =
  'w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-primary';

export const DailyPerformanceForm: React.FC<DailyPerformanceFormProps> = ({
  student,
  classId,
  recordDate,
  onSaved,
}) => {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const { record: existingRecord, isLoading: loadingPerf } =
    usePerformanceRecordForDate(student.id, recordDate);
  const { record: existingAttendance, isLoading: loadingAtt } =
    useStudentAttendanceForDate(student.id, recordDate);
  const { savePerformance, isSaving } = useSavePerformance();

  const [form, setForm] = useState<FormState>(DEFAULT_FORM_STATE);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setValidationError(null);
    if (existingRecord) {
      setForm({
        attendance_status: existingRecord.attendance_status,
        sabaq_listened: existingRecord.sabaq_listened,
        sabaq_completed: existingRecord.sabaq_completed,
        sabaq_surah: existingRecord.sabaq_surah || '',
        sabaq_start_ayah: toStr(existingRecord.sabaq_start_ayah),
        sabaq_end_ayah: toStr(existingRecord.sabaq_end_ayah),
        sabaq_start_page: toStr(existingRecord.sabaq_start_page),
        sabaq_end_page: toStr(existingRecord.sabaq_end_page),
        sabaq_para: toStr(existingRecord.sabaq_para),
        sabaq_grade: existingRecord.sabaq_grade || '',
        sabaq_remarks: existingRecord.sabaq_remarks || '',
        sabqi_listened: existingRecord.sabqi_listened,
        sabqi_details: existingRecord.sabqi_details || '',
        sabqi_start_page: toStr(existingRecord.sabqi_start_page),
        sabqi_end_page: toStr(existingRecord.sabqi_end_page),
        sabqi_completed: existingRecord.sabqi_completed,
        sabqi_remarks: existingRecord.sabqi_remarks || '',
        manzil_listened: existingRecord.manzil_listened,
        manzil_details: existingRecord.manzil_details || '',
        manzil_start_page: toStr(existingRecord.manzil_start_page),
        manzil_end_page: toStr(existingRecord.manzil_end_page),
        manzil_completed: existingRecord.manzil_completed,
        manzil_remarks: existingRecord.manzil_remarks || '',
        total_mistakes: existingRecord.total_mistakes ?? 0,
        major_mistakes: existingRecord.major_mistakes ?? 0,
        minor_mistakes: existingRecord.minor_mistakes ?? 0,
        atak_count: existingRecord.atak_count ?? 0,
        repeated_mistakes: existingRecord.repeated_mistakes ?? 0,
        daily_result: existingRecord.daily_result,
        incomplete_reason: existingRecord.incomplete_reason || '',
        teacher_remarks: existingRecord.teacher_remarks || '',
      });
      return;
    }

    setForm({
      ...DEFAULT_FORM_STATE,
      attendance_status: existingAttendance?.status || 'present',
    });
  }, [existingRecord, existingAttendance, student.id, recordDate]);

  const validateAndBuildPayload = (): Omit<StudentDailyPerformanceInput, 'user_id'> | null => {
    const sabaqStartAyah = toNumOrNull(form.sabaq_start_ayah);
    const sabaqEndAyah = toNumOrNull(form.sabaq_end_ayah);
    const sabaqStartPage = toNumOrNull(form.sabaq_start_page);
    const sabaqEndPage = toNumOrNull(form.sabaq_end_page);
    const sabaqPara = toNumOrNull(form.sabaq_para);
    const sabqiStartPage = toNumOrNull(form.sabqi_start_page);
    const sabqiEndPage = toNumOrNull(form.sabqi_end_page);
    const manzilStartPage = toNumOrNull(form.manzil_start_page);
    const manzilEndPage = toNumOrNull(form.manzil_end_page);

    if (sabaqPara !== null && (sabaqPara < 1 || sabaqPara > 30)) {
      setValidationError(t('performance.err_para_range'));
      return null;
    }

    const positivePairs: [number | null, number | null, string][] = [
      [sabaqStartAyah, sabaqEndAyah, t('performance.err_sabaq_ayah')],
      [sabaqStartPage, sabaqEndPage, t('performance.err_sabaq_page')],
      [sabqiStartPage, sabqiEndPage, t('performance.err_sabqi_page')],
      [manzilStartPage, manzilEndPage, t('performance.err_manzil_page')],
    ];

    for (const [start, end, message] of positivePairs) {
      if ((start !== null && start < 1) || (end !== null && end < 1)) {
        setValidationError(t('performance.err_positive_page_ayah'));
        return null;
      }
      if (start !== null && end !== null && end < start) {
        setValidationError(message);
        return null;
      }
    }

    const nonNeg = [
      form.total_mistakes,
      form.major_mistakes,
      form.minor_mistakes,
      form.atak_count,
      form.repeated_mistakes,
    ];
    if (nonNeg.some((n) => !Number.isFinite(n) || n < 0)) {
      setValidationError(t('performance.err_negative_mistakes'));
      return null;
    }

    setValidationError(null);
    return {
      student_id: student.id,
      class_id: classId,
      record_date: recordDate,
      attendance_status: form.attendance_status,
      sabaq_listened: form.sabaq_listened,
      sabaq_completed: form.sabaq_completed,
      sabaq_surah: form.sabaq_surah.trim() || null,
      sabaq_start_ayah: sabaqStartAyah,
      sabaq_end_ayah: sabaqEndAyah,
      sabaq_start_page: sabaqStartPage,
      sabaq_end_page: sabaqEndPage,
      sabaq_para: sabaqPara,
      sabaq_grade: form.sabaq_grade.trim() || null,
      sabaq_remarks: form.sabaq_remarks.trim() || null,
      sabqi_listened: form.sabqi_listened,
      sabqi_details: form.sabqi_details.trim() || null,
      sabqi_start_page: sabqiStartPage,
      sabqi_end_page: sabqiEndPage,
      sabqi_completed: form.sabqi_completed,
      sabqi_remarks: form.sabqi_remarks.trim() || null,
      manzil_listened: form.manzil_listened,
      manzil_details: form.manzil_details.trim() || null,
      manzil_start_page: manzilStartPage,
      manzil_end_page: manzilEndPage,
      manzil_completed: form.manzil_completed,
      manzil_remarks: form.manzil_remarks.trim() || null,
      total_mistakes: Math.max(0, Math.trunc(form.total_mistakes)),
      major_mistakes: Math.max(0, Math.trunc(form.major_mistakes)),
      minor_mistakes: Math.max(0, Math.trunc(form.minor_mistakes)),
      atak_count: Math.max(0, Math.trunc(form.atak_count)),
      repeated_mistakes: Math.max(0, Math.trunc(form.repeated_mistakes)),
      daily_result: form.daily_result,
      incomplete_reason: form.incomplete_reason.trim() || null,
      teacher_remarks: form.teacher_remarks.trim() || null,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = validateAndBuildPayload();
    if (!payload) return;

    try {
      const res = await savePerformance(payload);
      showToast(
        res.queuedOffline
          ? t('performance.saved_offline')
          : t('performance.saved_success'),
        res.queuedOffline ? 'info' : 'success'
      );
      onSaved?.({ queuedOffline: res.queuedOffline });
    } catch (err: any) {
      showToast(err?.message || 'Failed to save performance record', 'error');
    }
  };

  const updateMistakeField = (
    field:
      | 'total_mistakes'
      | 'major_mistakes'
      | 'minor_mistakes'
      | 'atak_count'
      | 'repeated_mistakes',
    nextVal: number
  ) => {
    const safeVal = Math.max(0, Math.trunc(Number.isFinite(nextVal) ? nextVal : 0));
    setForm((prev) => {
      const updated = { ...prev, [field]: safeVal };
      if (field === 'major_mistakes' || field === 'minor_mistakes') {
        const minCombined =
          (field === 'major_mistakes' ? safeVal : prev.major_mistakes) +
          (field === 'minor_mistakes' ? safeVal : prev.minor_mistakes);
        if (updated.total_mistakes < minCombined) {
          updated.total_mistakes = minCombined;
        }
      }
      return updated;
    });
  };

  if (loadingPerf || loadingAtt) {
    return <SkeletonCard count={3} />;
  }

  const hasIncompleteLesson =
    !form.sabaq_completed || !form.sabqi_completed || !form.manzil_completed;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Existing record notice (Duplicate Prevention) */}
      {existingRecord && (
        <div className="px-4 py-3 rounded-2xl bg-primary/10 border border-primary/25 text-xs sm:text-sm font-semibold text-primary flex items-center gap-2">
          <History className="w-4 h-4 shrink-0" />
          <span>
            {t('performance.editing_existing', { date: recordDate })}
          </span>
        </div>
      )}

      {validationError && (
        <div className="px-4 py-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs sm:text-sm font-semibold text-[#DC2626] dark:text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* A. Attendance */}
      <section className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm sm:text-base font-extrabold text-[var(--color-text)]">
            1. {t('performance.section_attendance')}
          </h3>
          <span className="text-xs font-mono text-[var(--color-muted)]">{recordDate}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FIXED_STATUSES.map((st) => {
            const isSelected = st.key === form.attendance_status;
            return (
              <button
                key={st.key}
                type="button"
                onClick={() =>
                  setForm((prev) => ({ ...prev, attendance_status: st.key }))
                }
                aria-pressed={isSelected}
                className="min-h-[44px] px-2.5 py-2 text-xs sm:text-sm font-bold rounded-xl border transition-all duration-150 flex items-center justify-center gap-1.5"
                style={{
                  backgroundColor: isSelected ? st.color : `${st.color}14`,
                  borderColor: isSelected ? st.color : `${st.color}45`,
                  color: isSelected ? '#FFFFFF' : st.color,
                }}
              >
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                <span className="truncate">
                  {st.label_en} • {st.label_ur}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* B. Sabaq (New Lesson) */}
      <section className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <h3 className="text-sm sm:text-base font-extrabold text-[var(--color-text)]">
              2. {t('performance.section_sabaq')}
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label className="inline-flex items-center gap-2 min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] cursor-pointer text-xs font-bold">
              <input
                type="checkbox"
                checked={form.sabaq_listened}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    sabaq_listened: e.target.checked,
                  }))
                }
                className="w-4 h-4 accent-primary"
              />
              <span>{t('performance.listened')}</span>
            </label>
            <label className="inline-flex items-center gap-2 min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] cursor-pointer text-xs font-bold">
              <input
                type="checkbox"
                checked={form.sabaq_completed}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    sabaq_completed: e.target.checked,
                  }))
                }
                className="w-4 h-4 accent-[#16A34A]"
              />
              <span>{t('performance.completed')}</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
              {t('performance.surah_name')}
            </label>
            <input
              type="text"
              value={form.sabaq_surah}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, sabaq_surah: e.target.value }))
              }
              placeholder="e.g. Al-Baqarah / Yaseen"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
              {t('performance.para_number')}
            </label>
            <select
              value={form.sabaq_para}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, sabaq_para: e.target.value }))
              }
              className={inputCls}
            >
              <option value="">-- Select Para / Juz (1-30) --</option>
              {Array.from({ length: 30 }, (_, idx) => idx + 1).map((para) => (
                <option key={para} value={para}>
                  Para {para} (پارہ {para})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
              {t('performance.start_ayah')}
            </label>
            <input
              type="number"
              min={1}
              value={form.sabaq_start_ayah}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, sabaq_start_ayah: e.target.value }))
              }
              placeholder="1"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
              {t('performance.end_ayah')}
            </label>
            <input
              type="number"
              min={1}
              value={form.sabaq_end_ayah}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, sabaq_end_ayah: e.target.value }))
              }
              placeholder="15"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
              {t('performance.start_page')}
            </label>
            <input
              type="number"
              min={1}
              value={form.sabaq_start_page}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, sabaq_start_page: e.target.value }))
              }
              placeholder="1"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
              {t('performance.end_page')}
            </label>
            <input
              type="number"
              min={1}
              value={form.sabaq_end_page}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, sabaq_end_page: e.target.value }))
              }
              placeholder="2"
              className={inputCls}
            />
          </div>
        </div>

        {/* Grade chips */}
        <div>
          <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1.5">
            {t('performance.sabaq_grade')}
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {SABAQ_GRADES.map((grade) => {
              const selected = form.sabaq_grade === grade;
              return (
                <button
                  key={grade}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      sabaq_grade: prev.sabaq_grade === grade ? '' : grade,
                    }))
                  }
                  className={`px-3 min-h-[40px] rounded-xl text-xs font-bold border transition-colors ${
                    selected
                      ? 'bg-primary text-white border-primary'
                      : 'bg-[var(--color-bg)] text-[var(--color-text)] border-[var(--color-border)] hover:border-primary'
                  }`}
                >
                  {grade}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
            {t('performance.sabaq_remarks')}
          </label>
          <input
            type="text"
            value={form.sabaq_remarks}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, sabaq_remarks: e.target.value }))
            }
            placeholder="Tajweed, fluency, makharij notes..."
            className={inputCls}
          />
        </div>
      </section>

      {/* C. Sabqi (Recent Revision) */}
      <section className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-[#0D9488]" />
            <h3 className="text-sm sm:text-base font-extrabold text-[var(--color-text)]">
              3. {t('performance.section_sabqi')}
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label className="inline-flex items-center gap-2 min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] cursor-pointer text-xs font-bold">
              <input
                type="checkbox"
                checked={form.sabqi_listened}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    sabqi_listened: e.target.checked,
                  }))
                }
                className="w-4 h-4 accent-primary"
              />
              <span>{t('performance.listened')}</span>
            </label>
            <label className="inline-flex items-center gap-2 min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] cursor-pointer text-xs font-bold">
              <input
                type="checkbox"
                checked={form.sabqi_completed}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    sabqi_completed: e.target.checked,
                  }))
                }
                className="w-4 h-4 accent-[#16A34A]"
              />
              <span>{t('performance.completed')}</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
              {t('performance.details')}
            </label>
            <input
              type="text"
              value={form.sabqi_details}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, sabqi_details: e.target.value }))
              }
              placeholder="e.g. Juz 14, last 5 pages"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
              {t('performance.start_page')}
            </label>
            <input
              type="number"
              min={1}
              value={form.sabqi_start_page}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, sabqi_start_page: e.target.value }))
              }
              placeholder="1"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
              {t('performance.end_page')}
            </label>
            <input
              type="number"
              min={1}
              value={form.sabqi_end_page}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, sabqi_end_page: e.target.value }))
              }
              placeholder="5"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
            {t('performance.sabqi_remarks')}
          </label>
          <input
            type="text"
            value={form.sabqi_remarks}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, sabqi_remarks: e.target.value }))
            }
            placeholder="Sabqi notes..."
            className={inputCls}
          />
        </div>
      </section>

      {/* D. Manzil (Old Memorization Revision) */}
      <section className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#7C3AED]" />
            <h3 className="text-sm sm:text-base font-extrabold text-[var(--color-text)]">
              4. {t('performance.section_manzil')}
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label className="inline-flex items-center gap-2 min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] cursor-pointer text-xs font-bold">
              <input
                type="checkbox"
                checked={form.manzil_listened}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    manzil_listened: e.target.checked,
                  }))
                }
                className="w-4 h-4 accent-primary"
              />
              <span>{t('performance.listened')}</span>
            </label>
            <label className="inline-flex items-center gap-2 min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] cursor-pointer text-xs font-bold">
              <input
                type="checkbox"
                checked={form.manzil_completed}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    manzil_completed: e.target.checked,
                  }))
                }
                className="w-4 h-4 accent-[#16A34A]"
              />
              <span>{t('performance.completed')}</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
              {t('performance.details')}
            </label>
            <input
              type="text"
              value={form.manzil_details}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, manzil_details: e.target.value }))
              }
              placeholder="e.g. Juz 3 full / 1 Juz"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
              {t('performance.start_page')}
            </label>
            <input
              type="number"
              min={1}
              value={form.manzil_start_page}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, manzil_start_page: e.target.value }))
              }
              placeholder="1"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
              {t('performance.end_page')}
            </label>
            <input
              type="number"
              min={1}
              value={form.manzil_end_page}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, manzil_end_page: e.target.value }))
              }
              placeholder="20"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
            {t('performance.manzil_remarks')}
          </label>
          <input
            type="text"
            value={form.manzil_remarks}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, manzil_remarks: e.target.value }))
            }
            placeholder="Manzil notes..."
            className={inputCls}
          />
        </div>
      </section>

      {/* E. Mistakes Record */}
      <section className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
            <h3 className="text-sm sm:text-base font-extrabold text-[var(--color-text)]">
              5. {t('performance.section_mistakes')}
            </h3>
          </div>
          <span className="text-[11px] text-[var(--color-muted)]">
            {t('performance.zero_allowed')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {(
            [
              ['total_mistakes', t('performance.total_mistakes'), '#DC2626'],
              ['major_mistakes', t('performance.major_mistakes'), '#B91C1C'],
              ['minor_mistakes', t('performance.minor_mistakes'), '#F59E0B'],
              ['atak_count', t('performance.atak_count'), '#7C3AED'],
              ['repeated_mistakes', t('performance.repeated_mistakes'), '#475569'],
            ] as const
          ).map(([field, label, accent]) => {
            const val = form[field];
            return (
              <div
                key={field}
                className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] space-y-2"
              >
                <label
                  htmlFor={`perf-${field}`}
                  className="block text-xs font-bold text-[var(--color-text)] truncate"
                >
                  {label}
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateMistakeField(field, val - 1)}
                    aria-label={`Decrease ${label}`}
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    id={`perf-${field}`}
                    type="number"
                    min={0}
                    value={val}
                    onChange={(e) =>
                      updateMistakeField(
                        field,
                        e.target.value === '' ? 0 : Number(e.target.value)
                      )
                    }
                    className="w-full min-h-[40px] text-center font-mono font-extrabold text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
                    style={{ color: val > 0 ? accent : undefined }}
                  />
                  <button
                    type="button"
                    onClick={() => updateMistakeField(field, val + 1)}
                    aria-label={`Increase ${label}`}
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* F. Daily Result */}
      <section className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 space-y-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-[#16A34A]" />
          <h3 className="text-sm sm:text-base font-extrabold text-[var(--color-text)]">
            6. {t('performance.section_result')}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {DAILY_RESULTS.map((resOpt) => {
            const isSelected = form.daily_result === resOpt.key;
            return (
              <button
                key={resOpt.key}
                type="button"
                onClick={() =>
                  setForm((prev) => ({ ...prev, daily_result: resOpt.key }))
                }
                aria-pressed={isSelected}
                className="min-h-[48px] px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-center"
                style={{
                  backgroundColor: isSelected ? resOpt.color : `${resOpt.color}12`,
                  borderColor: isSelected ? resOpt.color : `${resOpt.color}40`,
                  color: isSelected ? '#FFFFFF' : resOpt.color,
                }}
              >
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                <span>
                  {resOpt.label_en} • {resOpt.label_ur}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* G. Additional Notes */}
      <section className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 space-y-3 shadow-sm">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h3 className="text-sm sm:text-base font-extrabold text-[var(--color-text)]">
            7. {t('performance.section_notes')}
          </h3>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
            {t('performance.incomplete_reason')}
            {hasIncompleteLesson && (
              <span className="ms-1.5 text-[#F59E0B] font-bold">
                ({t('performance.recommended_incomplete')})
              </span>
            )}
          </label>
          <input
            type="text"
            value={form.incomplete_reason}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, incomplete_reason: e.target.value }))
            }
            placeholder="e.g. Student arrived late, weak memorization, illness..."
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
            {t('performance.teacher_remarks')}
          </label>
          <textarea
            rows={3}
            value={form.teacher_remarks}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, teacher_remarks: e.target.value }))
            }
            placeholder="Overall teacher note for student/parents..."
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </section>

      {/* Sticky Save CTA */}
      <div className="sticky bottom-[68px] sm:bottom-5 z-20 pt-1">
        <div className="bg-[var(--color-surface)]/95 backdrop-blur-md p-2 rounded-2xl border border-[var(--color-border)] shadow-lg">
          <Button
            type="submit"
            size="lg"
            isLoading={isSaving}
            className="w-full gap-2 font-bold"
          >
            <Save className="w-5 h-5" />
            <span>
              {existingRecord
                ? t('performance.update_record')
                : t('performance.save_record')}
            </span>
          </Button>
        </div>
      </div>
    </form>
  );
};
