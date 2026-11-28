import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  Info,
  Layers,
  RefreshCw,
  RotateCcw,
  Save,
  UserCheck,
  UserX,
  WifiOff,
} from 'lucide-react';
import type {
  AttendanceStatusKey,
  Student,
  StudentDailyPerformance,
  StudentDailyPerformanceInput,
} from '../../types/database';
import { usePerformanceRecordForDate, useSavePerformance } from '../../hooks/usePerformance';
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

export type LessonKey = 'sabaq' | 'sabqi' | 'manzil';
export type SimpleAttendanceStatus = 'present' | 'absent';

export interface SimpleFormState {
  attendance_status: SimpleAttendanceStatus;
  sabaq_listened: boolean;
  sabaq_lines: string;
  sabaq_para: string;
  sabqi_listened: boolean;
  sabqi_lines: string;
  sabqi_details: string;
  sabqi_para: string;
  sabqi_mistakes: string;
  sabqi_atak_count: string;
  manzil_listened: boolean;
  manzil_lines: string;
  manzil_details: string;
  manzil_para: string;
  manzil_mistakes: string;
  manzil_atak_count: string;
}

const DEFAULT_FORM_STATE: SimpleFormState = {
  attendance_status: 'present',
  sabaq_listened: false,
  sabaq_lines: '0',
  sabaq_para: '',
  sabqi_listened: false,
  sabqi_lines: '0',
  sabqi_details: '',
  sabqi_para: '',
  sabqi_mistakes: '0',
  sabqi_atak_count: '0',
  manzil_listened: false,
  manzil_lines: '0',
  manzil_details: '',
  manzil_para: '',
  manzil_mistakes: '0',
  manzil_atak_count: '0',
};

export function parseNonNegativeWholeLines(
  rawValue: string,
  listened: boolean
): number | null {
  if (!listened) return 0;
  const trimmed = rawValue.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 0) return null;
  return parsed;
}

export function buildSimplePerformancePayload(params: {
  studentId: string;
  classId: string;
  recordDate: string;
  form: SimpleFormState;
  existingRecord?: StudentDailyPerformance | null;
}): {
  payload: Omit<StudentDailyPerformanceInput, 'user_id'> | null;
  invalidFields: LessonKey[];
} {
  const { studentId, classId, recordDate, form, existingRecord } = params;
  const invalidFields: LessonKey[] = [];

  const sabaqPara = form.sabaq_listened && form.sabaq_para ? Number(form.sabaq_para) : null;
  const sabqiPara = form.sabqi_listened && form.sabqi_para ? Number(form.sabqi_para) : null;
  const manzilPara = form.manzil_listened && form.manzil_para ? Number(form.manzil_para) : null;
  const sabqiMistakes = form.sabqi_listened ? Number(form.sabqi_mistakes) : 0;
  const sabqiAtakCount = form.sabqi_listened ? Number(form.sabqi_atak_count) : 0;
  const manzilMistakes = form.manzil_listened ? Number(form.manzil_mistakes) : 0;
  const manzilAtakCount = form.manzil_listened ? Number(form.manzil_atak_count) : 0;
  if (form.sabaq_listened && (!sabaqPara || sabaqPara < 1 || sabaqPara > 30)) invalidFields.push('sabaq');
  if (form.sabqi_listened && (!sabqiPara || sabqiPara < 1 || sabqiPara > 30)) invalidFields.push('sabqi');
  if (form.manzil_listened && (!manzilPara || manzilPara < 1 || manzilPara > 30)) invalidFields.push('manzil');
  for (const [lesson, value] of [['sabqi', sabqiMistakes], ['sabqi', sabqiAtakCount], ['manzil', manzilMistakes], ['manzil', manzilAtakCount]] as const) {
    if (!Number.isSafeInteger(value) || value < 0 || value > 99) invalidFields.push(lesson);
  }

  const sabaqLines = parseNonNegativeWholeLines(form.sabaq_lines, form.sabaq_listened);
  if (sabaqLines === null) invalidFields.push('sabaq');

  // Sabqi and Manzil are free-text Urdu entries; keep legacy numeric columns at 0.
  const sabqiLines = 0;
  const manzilLines = 0;

  if (invalidFields.length > 0 || sabaqLines === null) {
    return { payload: null, invalidFields };
  }

  return {
    invalidFields: [],
    payload: {
      student_id: studentId,
      class_id: classId,
      record_date: recordDate,
      attendance_status: form.attendance_status,

      // Sabaq
      sabaq_listened: form.sabaq_listened,
      sabaq_lines: sabaqLines,
      sabaq_completed: form.sabaq_listened,
      sabaq_surah: existingRecord?.sabaq_surah ?? null,
      sabaq_start_ayah: existingRecord?.sabaq_start_ayah ?? null,
      sabaq_end_ayah: existingRecord?.sabaq_end_ayah ?? null,
      sabaq_start_page: existingRecord?.sabaq_start_page ?? null,
      sabaq_end_page: existingRecord?.sabaq_end_page ?? null,
      sabaq_para: sabaqPara,
      sabaq_grade: existingRecord?.sabaq_grade ?? null,
      sabaq_remarks: existingRecord?.sabaq_remarks ?? null,

      // Sabqi
      sabqi_listened: form.sabqi_listened,
      sabqi_lines: sabqiLines,
      sabqi_para: sabqiPara,
      sabqi_mistakes: sabqiMistakes,
      sabqi_atak_count: sabqiAtakCount,
      sabqi_details: form.sabqi_listened ? (form.sabqi_details.trim() || null) : null,
      sabqi_start_page: existingRecord?.sabqi_start_page ?? null,
      sabqi_end_page: existingRecord?.sabqi_end_page ?? null,
      sabqi_completed: form.sabqi_listened,
      sabqi_remarks: existingRecord?.sabqi_remarks ?? null,

      // Manzil
      manzil_listened: form.manzil_listened,
      manzil_lines: manzilLines,
      manzil_details: form.manzil_listened ? (form.manzil_details.trim() || null) : null,
      manzil_para: manzilPara,
      manzil_mistakes: manzilMistakes,
      manzil_atak_count: manzilAtakCount,
      manzil_start_page: existingRecord?.manzil_start_page ?? null,
      manzil_end_page: existingRecord?.manzil_end_page ?? null,
      manzil_completed: form.manzil_listened,
      manzil_remarks: existingRecord?.manzil_remarks ?? null,

      // Preserved legacy columns (not rendered in UI)
      total_mistakes: existingRecord?.total_mistakes ?? 0,
      major_mistakes: existingRecord?.major_mistakes ?? 0,
      minor_mistakes: existingRecord?.minor_mistakes ?? 0,
      atak_count: existingRecord?.atak_count ?? 0,
      repeated_mistakes: existingRecord?.repeated_mistakes ?? 0,
      daily_result: existingRecord?.daily_result ?? 'good',
      incomplete_reason: existingRecord?.incomplete_reason ?? null,
      teacher_remarks: existingRecord?.teacher_remarks ?? null,
    },
  };
}

function toSimpleAttendance(status?: AttendanceStatusKey | null): SimpleAttendanceStatus {
  return status === 'absent' ? 'absent' : 'present';
}

export const DailyPerformanceForm: React.FC<DailyPerformanceFormProps> = ({
  student,
  classId,
  recordDate,
  onSaved,
}) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { record, isLoading: loadingRecord } = usePerformanceRecordForDate(
    student.id,
    recordDate
  );
  const { record: attendance, isLoading: loadingAttendance } =
    useStudentAttendanceForDate(student.id, recordDate);
  const { savePerformance, isSaving } = useSavePerformance();

  const [form, setForm] = useState<SimpleFormState>(DEFAULT_FORM_STATE);
  const [invalidFields, setInvalidFields] = useState<LessonKey[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<'online' | 'offline' | null>(null);

  useEffect(() => {
    setInvalidFields([]);
    setSaveError(null);
    setSaveNotice(null);

    if (record) {
      setForm({
        attendance_status: toSimpleAttendance(record.attendance_status),
        sabaq_listened: record.sabaq_listened,
        sabaq_lines: record.sabaq_listened ? String(Math.max(0, record.sabaq_lines ?? 0)) : '0',
        sabaq_para: record.sabaq_para ? String(record.sabaq_para) : '',
        sabqi_listened: record.sabqi_listened,
        sabqi_lines: '0',
        sabqi_details: record.sabqi_details ?? '',
        sabqi_para: record.sabqi_para ? String(record.sabqi_para) : '',
        sabqi_mistakes: String(record.sabqi_mistakes ?? 0),
        sabqi_atak_count: String(record.sabqi_atak_count ?? 0),
        manzil_listened: record.manzil_listened,
        manzil_lines: '0',
        manzil_details: record.manzil_details ?? '',
        manzil_para: record.manzil_para ? String(record.manzil_para) : '',
        manzil_mistakes: String(record.manzil_mistakes ?? 0),
        manzil_atak_count: String(record.manzil_atak_count ?? 0),
      });
    } else {
      setForm({
        ...DEFAULT_FORM_STATE,
        attendance_status: toSimpleAttendance(attendance?.status),
      });
    }
  }, [record, attendance?.status, student.id, recordDate]);

  const handleListenedChange = (lesson: LessonKey, listened: boolean) => {
    setSaveNotice(null);
    setSaveError(null);
    setInvalidFields((prev) => prev.filter((item) => item !== lesson));

    setForm((prev) => {
      if (lesson === 'sabaq') {
        return {
          ...prev,
          sabaq_listened: listened,
          sabaq_lines: listened ? prev.sabaq_lines : '0',
          sabaq_para: listened ? prev.sabaq_para : '',
        };
      }
      if (lesson === 'sabqi') {
        return {
          ...prev,
          sabqi_listened: listened,
          sabqi_lines: '0',
          sabqi_details: listened ? prev.sabqi_details : '',
          sabqi_para: listened ? prev.sabqi_para : '',
          sabqi_mistakes: listened ? prev.sabqi_mistakes : '0',
          sabqi_atak_count: listened ? prev.sabqi_atak_count : '0',
        };
      }
      return {
        ...prev,
        manzil_listened: listened,
        manzil_lines: '0',
        manzil_details: listened ? prev.manzil_details : '',
        manzil_para: listened ? prev.manzil_para : '',
        manzil_mistakes: listened ? prev.manzil_mistakes : '0',
        manzil_atak_count: listened ? prev.manzil_atak_count : '0',
      };
    });
  };

  const handleLinesChange = (lesson: LessonKey, raw: string) => {
    setSaveNotice(null);
    setSaveError(null);
    setInvalidFields((prev) => prev.filter((item) => item !== lesson));

    setForm((prev) => {
      if (lesson === 'sabaq') return { ...prev, sabaq_lines: raw };
      if (lesson === 'sabqi') return { ...prev, sabqi_details: raw };
      return { ...prev, manzil_details: raw };
    });
  };

  const preventInvalidNumberKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['-', '+', '.', ',', 'e', 'E'].includes(e.key)) {
      e.preventDefault();
    }
  };

  const performSave = async () => {
    setSaveError(null);
    setSaveNotice(null);

    const { payload, invalidFields: nextInvalid } = buildSimplePerformancePayload({
      studentId: student.id,
      classId,
      recordDate,
      form,
      existingRecord: record,
    });

    if (!payload) {
      setInvalidFields(nextInvalid);
      const msg = t('performance.err_invalid_lines');
      setSaveError(msg);
      showToast(msg, 'error');
      return;
    }

    try {
      const result = await savePerformance(payload);
      setSaveNotice(result.queuedOffline ? 'offline' : 'online');
      showToast(
        result.queuedOffline
          ? t('performance.saved_offline')
          : t('performance.saved_success'),
        result.queuedOffline ? 'info' : 'success'
      );
      onSaved?.({ queuedOffline: result.queuedOffline });
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : t('performance.err_save_failed');
      setSaveError(message);
      showToast(message, 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performSave();
  };

  if (loadingRecord || loadingAttendance) {
    return <SkeletonCard count={3} />;
  }

  const lessonSections: {
    key: LessonKey;
    title: string;
    question: string;
    listened: boolean;
    linesValue: string;
    accentColor: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: 'sabaq',
      title: t('performance.section_sabaq'),
      question: t('performance.was_sabaq_listened'),
      listened: form.sabaq_listened,
      linesValue: form.sabaq_lines,
      accentColor: '#2563EB',
      icon: <BookOpen className="w-4 h-4 text-[#2563EB]" />,
    },
    {
      key: 'sabqi',
      title: t('performance.section_sabqi'),
      question: t('performance.was_sabqi_listened'),
      listened: form.sabqi_listened,
      linesValue: form.sabqi_lines,
      accentColor: '#0D9488',
      icon: <RotateCcw className="w-4 h-4 text-[#0D9488]" />,
    },
    {
      key: 'manzil',
      title: t('performance.section_manzil'),
      question: t('performance.was_manzil_listened'),
      listened: form.manzil_listened,
      linesValue: form.manzil_lines,
      accentColor: '#7C3AED',
      icon: <Layers className="w-4 h-4 text-[#7C3AED]" />,
    },
  ];

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
      {/* Existing record notice */}
      {record && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/30 px-3.5 py-2.5 text-xs font-semibold text-blue-800 dark:text-blue-200"
        >
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{t('performance.editing_existing', { date: recordDate })}</span>
        </div>
      )}

      {/* Save error banner with retry */}
      {saveError && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3.5 py-3 text-xs sm:text-sm font-semibold text-red-700 dark:text-red-300"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{saveError}</span>
          </div>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={performSave}
            disabled={isSaving}
            className="gap-1.5 self-start sm:self-auto shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t('common.retry')}</span>
          </Button>
        </div>
      )}

      {/* Save confirmation notice */}
      {saveNotice && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-xs sm:text-sm font-semibold ${
            saveNotice === 'offline'
              ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200'
              : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200'
          }`}
        >
          {saveNotice === 'offline' ? (
            <WifiOff className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>
            {saveNotice === 'offline'
              ? t('performance.saved_offline')
              : t('performance.saved_success')}
          </span>
        </div>
      )}

      {/* 1. Attendance (Present / Absent only) */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-extrabold text-[var(--color-text)]">
            {t('performance.section_attendance')}
          </h3>
          <span className="text-xs font-mono font-semibold text-[var(--color-muted)]">
            {recordDate}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              setSaveNotice(null);
              setForm((prev) => ({ ...prev, attendance_status: 'present' }));
            }}
            aria-pressed={form.attendance_status === 'present'}
            className={`min-h-[48px] rounded-xl border px-3 py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              form.attendance_status === 'present'
                ? 'bg-[#16A34A] border-[#16A34A] text-white shadow-sm'
                : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:border-[#16A34A]/60'
            }`}
          >
            <UserCheck className="w-4 h-4 shrink-0" />
            <span>{t('reports.present')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSaveNotice(null);
              setForm((prev) => ({ ...prev, attendance_status: 'absent' }));
            }}
            aria-pressed={form.attendance_status === 'absent'}
            className={`min-h-[48px] rounded-xl border px-3 py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              form.attendance_status === 'absent'
                ? 'bg-[#DC2626] border-[#DC2626] text-white shadow-sm'
                : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:border-[#DC2626]/60'
            }`}
          >
            <UserX className="w-4 h-4 shrink-0" />
            <span>{t('reports.absent')}</span>
          </button>
        </div>
      </section>

      {/* 2. Sabaq, 3. Sabqi, 4. Manzil */}
      {lessonSections.map((section) => {
        const hasError = invalidFields.includes(section.key);
        const inputId = `${section.key}-lines-input`;

        return (
          <section
            key={section.key}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3 shadow-sm"
          >
            <div className="flex items-center gap-2">
              {section.icon}
              <h3 className="text-base font-extrabold text-[var(--color-text)]">
                {section.title}
              </h3>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-bold text-[var(--color-text)]">
                {section.question}
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleListenedChange(section.key, true)}
                  aria-pressed={section.listened}
                  className={`min-h-[48px] rounded-xl border px-3 py-2 text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                    section.listened
                      ? 'bg-[#16A34A] border-[#16A34A] text-white shadow-sm'
                      : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:border-[#16A34A]/60'
                  }`}
                >
                  {section.listened && <Check className="w-4 h-4 shrink-0" />}
                  <span>{t('common.yes')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleListenedChange(section.key, false)}
                  aria-pressed={!section.listened}
                  className={`min-h-[48px] rounded-xl border px-3 py-2 text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                    !section.listened
                      ? 'bg-[#DC2626] border-[#DC2626] text-white shadow-sm'
                      : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:border-[#DC2626]/60'
                  }`}
                >
                  {!section.listened && <Check className="w-4 h-4 shrink-0" />}
                  <span>{t('common.no')}</span>
                </button>
              </div>
            </div>

            {section.listened && (
              <div className="space-y-1.5">
                <label htmlFor={`${section.key}-para`} className="block text-sm font-bold text-[var(--color-text)]">
                  {section.key === 'sabaq' ? 'سبق کا پارہ منتخب کریں' : section.key === 'sabqi' ? 'سبقی کا پارہ منتخب کریں' : 'منزل کا پارہ منتخب کریں'}
                </label>
                <select
                  id={`${section.key}-para`}
                  value={section.key === 'sabaq' ? form.sabaq_para : section.key === 'sabqi' ? form.sabqi_para : form.manzil_para}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSaveNotice(null);
                    setSaveError(null);
                    setForm((prev) => section.key === 'sabaq'
                      ? { ...prev, sabaq_para: value }
                      : section.key === 'sabqi'
                        ? { ...prev, sabqi_para: value }
                        : { ...prev, manzil_para: value });
                  }}
                  required
                  className="w-full min-h-[48px] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">پارہ منتخب کریں</option>
                  {Array.from({ length: 30 }, (_, index) => (
                    <option key={index + 1} value={String(index + 1)}>پارہ {index + 1}</option>
                  ))}
                </select>
              </div>
            )}


            {section.listened && section.key !== 'sabaq' && (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <label htmlFor={`${section.key}-mistakes`} className="block text-sm font-bold text-[var(--color-text)]">غلطیاں کتنی ہوئیں؟</label>
                  <select
                    id={`${section.key}-mistakes`}
                    value={section.key === 'sabqi' ? form.sabqi_mistakes : form.manzil_mistakes}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSaveNotice(null);
                      setForm((prev) => section.key === 'sabqi' ? { ...prev, sabqi_mistakes: value } : { ...prev, manzil_mistakes: value });
                    }}
                    className="w-full min-h-[48px] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm font-semibold text-[var(--color-text)]"
                  >
                    {Array.from({ length: 100 }, (_, index) => <option key={index} value={String(index)}>{index}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor={`${section.key}-atak`} className="block text-sm font-bold text-[var(--color-text)]">اٹکنے کی تعداد</label>
                  <select
                    id={`${section.key}-atak`}
                    value={section.key === 'sabqi' ? form.sabqi_atak_count : form.manzil_atak_count}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSaveNotice(null);
                      setForm((prev) => section.key === 'sabqi' ? { ...prev, sabqi_atak_count: value } : { ...prev, manzil_atak_count: value });
                    }}
                    className="w-full min-h-[48px] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm font-semibold text-[var(--color-text)]"
                  >
                    {Array.from({ length: 100 }, (_, index) => <option key={index} value={String(index)}>{index}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="pt-1 space-y-1.5">
              <label htmlFor={inputId} className="block text-sm font-bold text-[var(--color-text)]">
                {t(section.key === 'sabaq' ? 'performance.how_much_recited' : 'performance.how_much_recited_count')}
              </label>
              {section.key === 'sabaq' ? (
                <div className="flex items-center gap-2">
                  <input id={inputId} type="number" min={0} step={1} inputMode="numeric" pattern="[0-9]*"
                    disabled={!section.listened} value={section.listened ? section.linesValue : '0'}
                    onKeyDown={preventInvalidNumberKeys}
                    onFocus={(e) => { if (section.listened) e.currentTarget.select(); }}
                    onChange={(e) => handleLinesChange(section.key, e.target.value)}
                    placeholder={t('performance.lines_placeholder')} aria-label={`${section.title} - ${t('performance.lines_count')}`}
                    aria-invalid={hasError}
                    className={`w-full min-h-[48px] rounded-xl border px-3.5 py-2.5 text-base font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary ${!section.listened ? 'bg-slate-100 dark:bg-slate-800/60 text-[var(--color-muted)] border-[var(--color-border)] cursor-not-allowed' : hasError ? 'bg-[var(--color-bg)] text-[var(--color-text)] border-red-500 ring-1 ring-red-500' : 'bg-[var(--color-bg)] text-[var(--color-text)] border-[var(--color-border)]'}`}
                  />
                  <span className="shrink-0 text-xs font-bold text-[var(--color-muted)] px-2">{t('performance.lines_unit')}</span>
                </div>
              ) : (
                <textarea id={inputId} rows={2} disabled={!section.listened} dir="rtl" lang="ur"
                  value={section.listened ? (section.key === 'sabqi' ? form.sabqi_details : form.manzil_details) : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSaveNotice(null); setSaveError(null);
                    setForm((prev) => section.key === 'sabqi' ? { ...prev, sabqi_details: value } : { ...prev, manzil_details: value });
                  }}
                  placeholder="مثلاً: تین پانچ سنائی ہے، آدھا پارہ"
                  aria-label={`${section.title} - کتنی سنائی ہے؟`}
                  className="w-full min-h-[64px] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-base font-semibold text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              )}
              {!section.listened && <p className="text-xs text-[var(--color-muted)]">{t('performance.lines_disabled_hint')}</p>}
              {hasError && section.key === 'sabaq' && <p className="text-xs font-semibold text-red-600 dark:text-red-400">{t('performance.err_invalid_lines')}</p>}
            </div>      </div>
          </section>
        );
      })}

      {/* Save / Update Action */}
      <div className="sticky bottom-[calc(7rem+env(safe-area-inset-bottom))] sm:bottom-4 z-20 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md p-2.5 shadow-lg">
        <Button
          type="submit"
          size="lg"
          isLoading={isSaving}
          className="w-full gap-2 font-bold"
        >
          <Save className="w-5 h-5" />
          <span>
            {record ? t('performance.update_record') : t('performance.save_record')}
          </span>
        </Button>
      </div>
    </form>
  );
};
