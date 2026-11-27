import React, { useEffect, useState } from 'react';
import { Check, Save } from 'lucide-react';
import type { AttendanceStatusKey, Student, StudentDailyPerformanceInput } from '../../types/database';
import { FIXED_STATUSES } from '../../lib/statuses';
import { usePerformanceRecordForDate, useSavePerformance } from '../../hooks/usePerformance';
import { useStudentAttendanceForDate } from '../../hooks/useAttendance';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../ui/Button';
import { SkeletonCard } from '../ui/Skeleton';

interface DailyPerformanceFormProps { student: Student; classId: string; recordDate: string; onSaved?: (res: { queuedOffline: boolean }) => void; }
type Lesson = 'sabaq' | 'sabqi' | 'manzil';
type FormState = { attendance_status: AttendanceStatusKey; sabaq_listened: boolean; sabaq_lines: number; sabqi_listened: boolean; sabqi_lines: number; manzil_listened: boolean; manzil_lines: number; };
const initial: FormState = { attendance_status: 'present', sabaq_listened: false, sabaq_lines: 0, sabqi_listened: false, sabqi_lines: 0, manzil_listened: false, manzil_lines: 0 };
const inputCls = 'w-full min-h-[46px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-base text-[var(--color-text)]';
export const DailyPerformanceForm: React.FC<DailyPerformanceFormProps> = ({ student, classId, recordDate, onSaved }) => {
 const { showToast } = useToast();
 const { record, isLoading: loadingRecord } = usePerformanceRecordForDate(student.id, recordDate);
 const { record: attendance, isLoading: loadingAttendance } = useStudentAttendanceForDate(student.id, recordDate);
 const { savePerformance, isSaving } = useSavePerformance();
 const [form, setForm] = useState<FormState>(initial);
 useEffect(() => {
  if (record) setForm({ attendance_status: record.attendance_status, sabaq_listened: record.sabaq_listened, sabaq_lines: record.sabaq_lines ?? 0, sabqi_listened: record.sabqi_listened, sabqi_lines: record.sabqi_lines ?? 0, manzil_listened: record.manzil_listened, manzil_lines: record.manzil_lines ?? 0 });
  else setForm({ ...initial, attendance_status: attendance?.status || 'present' });
 }, [record, attendance, student.id, recordDate]);
 const setLesson = (lesson: Lesson, key: 'listened' | 'lines', value: boolean | number) => {
  if (lesson === 'sabaq') setForm(p => ({ ...p, ...(key === 'listened' ? { sabaq_listened: Boolean(value) } : { sabaq_lines: Number(value) }) }));
  if (lesson === 'sabqi') setForm(p => ({ ...p, ...(key === 'listened' ? { sabqi_listened: Boolean(value) } : { sabqi_lines: Number(value) }) }));
  if (lesson === 'manzil') setForm(p => ({ ...p, ...(key === 'listened' ? { manzil_listened: Boolean(value) } : { manzil_lines: Number(value) }) }));
 };
 const submit = async (e: React.FormEvent) => {
  e.preventDefault();
  const payload: Omit<StudentDailyPerformanceInput, 'user_id'> = {
   student_id: student.id, class_id: classId, record_date: recordDate, attendance_status: form.attendance_status,
   sabaq_listened: form.sabaq_listened, sabaq_lines: form.sabaq_lines, sabaq_completed: form.sabaq_listened, sabaq_surah: null, sabaq_start_ayah: null, sabaq_end_ayah: null, sabaq_start_page: null, sabaq_end_page: null, sabaq_para: null, sabaq_grade: null, sabaq_remarks: null,
   sabqi_listened: form.sabqi_listened, sabqi_lines: form.sabqi_lines, sabqi_details: null, sabqi_start_page: null, sabqi_end_page: null, sabqi_completed: form.sabqi_listened, sabqi_remarks: null,
   manzil_listened: form.manzil_listened, manzil_lines: form.manzil_lines, manzil_details: null, manzil_start_page: null, manzil_end_page: null, manzil_completed: form.manzil_listened, manzil_remarks: null,
   total_mistakes: 0, major_mistakes: 0, minor_mistakes: 0, atak_count: 0, repeated_mistakes: 0, daily_result: 'good', incomplete_reason: null, teacher_remarks: null
  };
  try { const result = await savePerformance(payload); showToast(result.queuedOffline ? 'Saved offline; will sync when online.' : 'Daily record saved.', result.queuedOffline ? 'info' : 'success'); onSaved?.({ queuedOffline: result.queuedOffline }); }
  catch (err: any) { showToast(err?.message || 'Could not save record.', 'error'); }
 };
 if (loadingRecord || loadingAttendance) return <SkeletonCard count={2} />;
 const lessons: { key: Lesson; title: string; urdu: string }[] = [{ key: 'sabaq', title: 'Sabaq', urdu: 'سبق' }, { key: 'sabqi', title: 'Sabqi', urdu: 'سبقی' }, { key: 'manzil', title: 'Manzil', urdu: 'منزل' }];
 return <form onSubmit={submit} className="space-y-3">
  <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3">
   <div className="flex items-center justify-between"><h3 className="font-bold">Attendance / حاضری</h3><span className="text-xs text-[var(--color-muted)]">{recordDate}</span></div>
   <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{FIXED_STATUSES.map(s => { const active = form.attendance_status === s.key; return <button key={s.key} type="button" onClick={() => setForm(p => ({ ...p, attendance_status: s.key }))} aria-pressed={active} className="min-h-[44px] rounded-xl border px-2 py-2 text-xs font-bold" style={{ backgroundColor: active ? s.color : s.color + '14', borderColor: s.color, color: active ? '#fff' : s.color }}>{active && <Check className="inline w-4 h-4 me-1" />}{s.label_en} • {s.label_ur}</button>; })}</div>
  </section>
  {lessons.map(item => { const listened = item.key === 'sabaq' ? form.sabaq_listened : item.key === 'sabqi' ? form.sabqi_listened : form.manzil_listened; const lines = item.key === 'sabaq' ? form.sabaq_lines : item.key === 'sabqi' ? form.sabqi_lines : form.manzil_lines; return <section key={item.key} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3">
   <h3 className="font-extrabold text-base">{item.title} / {item.urdu}</h3>
   <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setLesson(item.key, 'listened', true)} aria-pressed={listened} className={`min-h-[48px] rounded-xl border font-bold ${listened ? 'bg-emerald-600 text-white border-emerald-600' : 'border-[var(--color-border)]'}`}>Yes / ہاں</button><button type="button" onClick={() => setLesson(item.key, 'listened', false)} aria-pressed={!listened} className={`min-h-[48px] rounded-xl border font-bold ${!listened ? 'bg-red-600 text-white border-red-600' : 'border-[var(--color-border)]'}`}>No / نہیں</button></div>
   <label className="block text-sm font-semibold text-[var(--color-muted)]">How many lines were recited? / کتنی لائنیں سنائیں؟<input type="number" min="0" step="1" inputMode="numeric" value={lines} onChange={e => setLesson(item.key, 'lines', Math.max(0, Math.trunc(Number(e.target.value) || 0)))} className={inputCls + ' mt-1'} /></label>
  </section>; })}
  <div className="sticky bottom-[68px] sm:bottom-5 z-20 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-2 shadow-lg"><Button type="submit" size="lg" isLoading={isSaving} className="w-full gap-2 font-bold"><Save className="w-5 h-5" />{record ? 'Update daily record' : 'Save daily record'}</Button></div>
 </form>;
};
