import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useClasses } from '../../hooks/useClasses';
import { useStudents } from '../../hooks/useStudents';
import { useAttendance } from '../../hooks/useAttendance';
import { useSettings } from '../../contexts/SettingsContext';
import { useToast } from '../../contexts/ToastContext';
import { FIXED_STATUSES, FIXED_STATUS_MAP } from '../../lib/statuses';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { buildWhatsAppLink } from '../../lib/whatsapp';
import { supabase } from '../../lib/supabaseClient';
import type { AttendanceStatusKey, Student } from '../../types/database';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  Check,
  Save,
  MessageCircle,
  FileText,
  School,
  BellRing,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ROMAN_URDU_STATUS: Record<AttendanceStatusKey, string> = {
  present: 'Hazir',
  absent: 'Ghair hazir',
  late: 'Dair se hazir',
  leave: 'Rukhsat',
};

export const AttendancePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { effectiveLanguage, effectiveAppName, effectiveMessageTemplate } = useSettings();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { classes, isLoading: classesLoading } = useClasses();

  const urlClassId = searchParams.get('classId') || '';
  const [selectedClassId, setSelectedClassId] = useState<string>(urlClassId);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    if (urlClassId && classes.some((c) => c.id === urlClassId)) {
      setSelectedClassId(urlClassId);
    } else if (
      (!selectedClassId || !classes.some((c) => c.id === selectedClassId)) &&
      classes.length > 0
    ) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId, urlClassId]);

  const { students, isLoading: studentsLoading } = useStudents(selectedClassId);
  const { records, isLoading: recordsLoading, saveAttendance } = useAttendance(
    selectedClassId,
    selectedDate
  );

  const [pendingMarks, setPendingMarks] = useState<
    Record<string, { status: AttendanceStatusKey; note: string }>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [notifyList, setNotifyList] = useState<
    { student: Student; statusName: string; color: string }[] | null
  >(null);

  const [noteStudent, setNoteStudent] = useState<Student | null>(null);
  const [tempNoteText, setTempNoteText] = useState('');
  const [whatsAppStudent, setWhatsAppStudent] = useState<{
    student: Student;
    statusName: string;
  } | null>(null);

  const shiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
    setPendingMarks({});
    setNotifyList(null);
  };

  const getStudentStatus = (studentId: string): AttendanceStatusKey => {
    if (pendingMarks[studentId]?.status) {
      return pendingMarks[studentId].status;
    }
    const saved = records.find((r) => r.student_id === studentId);
    if (saved) return saved.status;
    return 'present';
  };

  const getStudentNote = (studentId: string): string => {
    if (pendingMarks[studentId]?.note !== undefined) {
      return pendingMarks[studentId].note;
    }
    const saved = records.find((r) => r.student_id === studentId);
    return saved?.note || '';
  };

  const setStudentStatus = (studentId: string, status: AttendanceStatusKey) => {
    setPendingMarks((prev) => ({
      ...prev,
      [studentId]: {
        status,
        note: prev[studentId]?.note ?? getStudentNote(studentId),
      },
    }));
  };

  const handleMarkAllPresent = () => {
    const newMarks: Record<string, { status: AttendanceStatusKey; note: string }> = {};
    students.forEach((s) => {
      newMarks[s.id] = {
        status: 'present',
        note: pendingMarks[s.id]?.note ?? getStudentNote(s.id),
      };
    });
    setPendingMarks(newMarks);
  };

  const handleSaveAttendance = async () => {
    if (!selectedClassId || students.length === 0) return;
    setIsSaving(true);
    try {
      const recordsToSave = students.map((s) => ({
        studentId: s.id,
        status: getStudentStatus(s.id),
        note: getStudentNote(s.id),
      }));

      const res = await saveAttendance(recordsToSave);
      setPendingMarks({});

      showToast(
        res.queuedOffline ? t('attendance.saved_offline') : t('attendance.saved_success'),
        res.queuedOffline ? 'info' : 'success'
      );

      if (!res.queuedOffline) {
        const { data: notificationResult, error: notificationError } = await supabase.functions.invoke(
          'send-parent-whatsapp',
          { body: { classId: selectedClassId, attendanceDate: selectedDate } }
        );
        if (notificationError || notificationResult?.error) {
          const detail = notificationResult?.error || notificationError?.message || 'Unknown notification error';
          showToast(
            detail.includes('WHATSAPP_NOT_CONFIGURED') || detail.includes('not configured')
              ? 'Attendance saved. WhatsApp API setup is still required before parents can receive messages.'
              : `Attendance saved, but parent notification failed: ${detail}`,
            'info'
          );
        } else if ((notificationResult?.sent || 0) > 0) {
          showToast(
            `WhatsApp notifications sent: ${notificationResult.sent}${notificationResult.failed ? `, failed: ${notificationResult.failed}` : ''}`,
            notificationResult.failed ? 'info' : 'success'
          );
        }
      }

      const toNotify = recordsToSave
        .map((r) => {
          const st = FIXED_STATUS_MAP[r.status];
          const student = students.find((s) => s.id === r.studentId);
          if (!st || !student || (r.status !== 'absent' && r.status !== 'leave')) return null;
          return {
            student,
            statusName: effectiveLanguage === 'ur' ? st.label_ur : ROMAN_URDU_STATUS[r.status],
            color: st.color,
          };
        })
        .filter(Boolean) as { student: Student; statusName: string; color: string }[];

      setNotifyList(toNotify.length > 0 ? toNotify : null);
    } catch (err: any) {
      showToast(err.message || 'Failed to save attendance', 'error', {
        label: t('common.retry'),
        onClick: handleSaveAttendance,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const currentClass = classes.find((c) => c.id === selectedClassId);
  const isInitialLoading = classesLoading || studentsLoading || recordsLoading;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] sm:text-2xl font-extrabold text-[var(--color-text)]">
          {t('nav.attendance')}
        </h1>
      </div>

      {/* Top Controls: Class Selector & Date Navigation */}
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-4 space-y-3">
        {classes.length > 0 ? (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {classes.map((cls) => {
              const isSelected = cls.id === selectedClassId;
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => {
                    setSelectedClassId(cls.id);
                    setSearchParams({ classId: cls.id });
                    setPendingMarks({});
                    setNotifyList(null);
                  }}
                  aria-pressed={isSelected}
                  className={`px-4 min-h-[44px] rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-150 active:scale-[0.98] ${
                    isSelected
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-[var(--color-text)] hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cls.name}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-[var(--color-muted)] py-1 flex items-center gap-2">
            <School className="w-4 h-4 text-primary" />
            <span>No classes found. Create one in Classes first.</span>
          </div>
        )}

        {/* Date Row */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)] flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-[var(--color-border)] hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--color-text)] transition-colors"
              aria-label="Previous Day"
              title="Previous Day"
            >
              <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
            </button>

            <div className="flex items-center gap-2 px-3 min-h-[44px] rounded-xl bg-slate-100/80 dark:bg-slate-800/80 text-sm font-bold text-[var(--color-text)] border border-[var(--color-border)]">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <input
                type="date"
                aria-label="Attendance date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setPendingMarks({});
                  setNotifyList(null);
                }}
                className="bg-transparent border-none text-sm font-bold focus:outline-none cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => shiftDate(1)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-[var(--color-border)] hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--color-text)] transition-colors"
              aria-label="Next Day"
              title="Next Day"
            >
              <ChevronRight className="w-5 h-5 rtl:rotate-180" />
            </button>
          </div>

          {students.length > 0 && (
            <Button
              variant="outline"
              size="md"
              onClick={handleMarkAllPresent}
              className="gap-1.5"
            >
              <CheckCheck className="w-4 h-4 text-[#16A34A]" />
              <span>{t('attendance.mark_all_present')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Post-Save Notify Parents Panel */}
      {notifyList && notifyList.length > 0 && currentClass && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <BellRing className="w-5 h-5 text-[#16A34A] shrink-0" />
              <div>
                <h2 className="text-base font-bold text-[var(--color-text)]">
                  {t('attendance.notify_parents_title')} ({notifyList.length})
                </h2>
                <p className="text-xs text-[var(--color-muted)]">
                  {t('attendance.notify_parents_desc')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNotifyList(null)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[var(--color-muted)] hover:text-[var(--color-text)]"
              aria-label="Close notifications panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {notifyList.map(({ student, statusName, color }) => (
              <div
                key={student.id}
                className="flex items-center justify-between gap-2 bg-[var(--color-surface)] rounded-xl p-3 border border-[var(--color-border)]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-[var(--color-text)] truncate">
                      {student.name}
                    </span>
                    <span
                      className="text-xs font-bold px-2.5 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: color }}
                    >
                      {statusName}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-muted)] font-mono mt-0.5">
                    {student.parent_phone || 'No parent phone'}
                  </p>
                </div>

                {student.parent_phone ? (
                  <a
                    href={buildWhatsAppLink({
                      phone: student.parent_phone,
                      template: effectiveMessageTemplate,
                      studentName: student.name,
                      className: currentClass.name,
                      status: statusName,
                      date: selectedDate,
                      appName: effectiveAppName,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 min-h-[44px] rounded-xl bg-[#16A34A] hover:bg-green-700 text-white text-xs font-bold shrink-0 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </a>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setWhatsAppStudent({ student, statusName })}
                    className="shrink-0"
                  >
                    Preview
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Single-Column Scroll-Friendly Students Attendance List */}
      {isInitialLoading ? (
        <SkeletonCard count={4} />
      ) : students.length === 0 ? (
        <EmptyState
          variant="attendance"
          title={t('attendance.no_students')}
          description="Add students to this class in the Students tab to start marking daily attendance."
          action={
            <Button onClick={() => navigate('/students')}>
              {t('nav.students')}
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {students.map((student) => {
            const currentStatus = getStudentStatus(student.id);
            const currentNote = getStudentNote(student.id);
            const activeStatus = FIXED_STATUS_MAP[currentStatus];

            return (
              <div
                key={student.id}
                className="bg-[var(--color-surface)] rounded-2xl p-4 shadow-sm border border-[var(--color-border)] flex flex-col gap-3 transition-all duration-150"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {student.roll_no && (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-[var(--color-text)] shrink-0">
                        {student.roll_no}
                      </span>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-[var(--color-text)] leading-tight truncate">
                        {student.name}
                      </h3>
                      {student.parent_phone && (
                        <p className="text-xs text-[var(--color-muted)] font-mono truncate">
                          {student.parent_phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const statusLabel =
                          effectiveLanguage === 'ur'
                            ? activeStatus.label_ur
                            : ROMAN_URDU_STATUS[currentStatus];
                        setWhatsAppStudent({ student, statusName: statusLabel });
                      }}
                      aria-label={`${t('attendance.notify_parent')} (${student.name})`}
                      title={t('attendance.notify_parent')}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#16A34A] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNoteStudent(student);
                        setTempNoteText(currentNote);
                      }}
                      aria-label={`${t('attendance.add_note')} (${student.name})`}
                      title={currentNote || t('attendance.add_note')}
                      className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors ${
                        currentNote
                          ? 'text-primary bg-primary/10'
                          : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <FileText className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Daily Note Preview */}
                {currentNote && (
                  <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs text-[var(--color-muted)] italic border-s-2 border-primary">
                    {currentNote}
                  </div>
                )}

                {/* Fixed Status Segmented Chip Buttons (English + Urdu labels) */}
                <div
                  role="group"
                  aria-label={`Attendance status for ${student.name}`}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-2"
                >
                  {FIXED_STATUSES.map((st) => {
                    const isSelected = st.key === currentStatus;

                    return (
                      <button
                        key={st.key}
                        type="button"
                        onClick={() => setStudentStatus(student.id, st.key)}
                        aria-pressed={isSelected}
                        className={`min-h-[44px] px-2.5 py-2 text-xs sm:text-sm font-bold rounded-xl border transition-all duration-150 active:scale-[0.97] flex items-center justify-center gap-1.5 ${
                          isSelected ? 'text-white shadow-sm' : 'hover:opacity-90'
                        }`}
                        style={{
                          backgroundColor: isSelected ? st.color : `${st.color}14`,
                          borderColor: isSelected ? st.color : `${st.color}45`,
                          color: isSelected ? '#FFFFFF' : st.color,
                        }}
                      >
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        ) : (
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: st.color }}
                            aria-hidden="true"
                          />
                        )}
                        <span className="truncate">
                          {st.label_en} • {st.label_ur}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky Save Action Bar at Bottom */}
      {students.length > 0 && (
        <div className="sticky bottom-[68px] sm:bottom-5 z-20 pt-2">
          <div className="bg-[var(--color-surface)]/90 backdrop-blur-md p-2 rounded-2xl border border-[var(--color-border)] shadow-lg">
            <Button
              onClick={handleSaveAttendance}
              size="lg"
              className="w-full font-bold flex items-center justify-center gap-2"
              isLoading={isSaving}
            >
              <Save className="w-5 h-5" />
              <span>{isSaving ? t('attendance.saving') : t('attendance.save_records')}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {noteStudent && (
        <Modal
          isOpen={Boolean(noteStudent)}
          onClose={() => setNoteStudent(null)}
          title={`Note for ${noteStudent.name}`}
        >
          <div className="space-y-4">
            <label className="block text-xs font-semibold text-[var(--color-text)]">
              {t('attendance.add_note')}
            </label>
            <textarea
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-primary min-h-[110px]"
              placeholder="e.g. Medical leave, Arrived 20 mins late, Doctor appointment"
              value={tempNoteText}
              onChange={(e) => setTempNoteText(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setNoteStudent(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() => {
                  setPendingMarks((prev) => ({
                    ...prev,
                    [noteStudent.id]: {
                      status: getStudentStatus(noteStudent.id),
                      note: tempNoteText,
                    },
                  }));
                  setNoteStudent(null);
                }}
              >
                {t('attendance.save_note')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* WhatsApp Message Preview Modal */}
      {whatsAppStudent && currentClass && (
        <Modal
          isOpen={Boolean(whatsAppStudent)}
          onClose={() => setWhatsAppStudent(null)}
          title={t('attendance.notify_parent')}
        >
          <div className="space-y-4 text-sm">
            <p className="font-semibold text-[var(--color-text)]">
              Recipient: Parent ({whatsAppStudent.student.parent_phone || 'No phone'})
            </p>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-[var(--color-border)] text-[var(--color-text)] leading-relaxed">
              {effectiveMessageTemplate
                .replace(/{student_name}/g, whatsAppStudent.student.name)
                .replace(/{class_name}/g, currentClass.name)
                .replace(/{status}/g, whatsAppStudent.statusName)
                .replace(/{date}/g, selectedDate)
                .replace(/{app_name}/g, effectiveAppName)}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setWhatsAppStudent(null)}>
                {t('common.cancel')}
              </Button>
              <a
                href={buildWhatsAppLink({
                  phone: whatsAppStudent.student.parent_phone,
                  template: effectiveMessageTemplate,
                  studentName: whatsAppStudent.student.name,
                  className: currentClass.name,
                  status: whatsAppStudent.statusName,
                  date: selectedDate,
                  appName: effectiveAppName,
                })}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setWhatsAppStudent(null)}
                className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl bg-[#16A34A] hover:bg-green-700 text-white text-sm font-semibold transition-colors"
              >
                Open in WhatsApp
              </a>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
