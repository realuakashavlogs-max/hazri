import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpenCheck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  User,
  BarChart3,
  CheckCircle2,
  School,
} from 'lucide-react';
import { useClasses } from '../../hooks/useClasses';
import { useStudents } from '../../hooks/useStudents';
import { useUserPerformanceForDate } from '../../hooks/usePerformance';
import { DailyPerformanceForm } from '../../components/performance/DailyPerformanceForm';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';

export const DailyPerformancePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { classes, isLoading: classesLoading } = useClasses();

  const urlClassId = searchParams.get('classId') || '';
  const urlStudentId = searchParams.get('studentId') || '';
  const urlDate = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const [selectedClassId, setSelectedClassId] = useState<string>(urlClassId);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(urlStudentId);
  const [selectedDate, setSelectedDate] = useState<string>(urlDate);

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
  const { records: dateRecords } = useUserPerformanceForDate(selectedDate);

  useEffect(() => {
    if (urlStudentId && students.some((s) => s.id === urlStudentId)) {
      setSelectedStudentId(urlStudentId);
    } else if (
      (!selectedStudentId || !students.some((s) => s.id === selectedStudentId)) &&
      students.length > 0
    ) {
      setSelectedStudentId(students[0].id);
    } else if (students.length === 0) {
      setSelectedStudentId('');
    }
  }, [students, selectedStudentId, urlStudentId]);

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    const nextDate = d.toISOString().split('T')[0];
    setSelectedDate(nextDate);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('date', nextDate);
      return next;
    });
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId) || null;
  const recordedStudentIds = new Set(dateRecords.map((r) => r.student_id));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-2xl font-extrabold text-[var(--color-text)] flex items-center gap-2">
            <BookOpenCheck className="w-6 h-6 text-primary" />
            <span>{t('performance.title')}</span>
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            {t('performance.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {selectedStudent && (
            <Link
              to={`/students/${selectedStudent.id}`}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs sm:text-sm font-bold text-[var(--color-text)] hover:border-primary transition-colors"
            >
              <User className="w-4 h-4 text-primary" />
              <span>{t('performance.view_profile')}</span>
            </Link>
          )}

          <Link
            to="/performance/reports"
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-xl bg-primary/10 text-primary text-xs sm:text-sm font-bold hover:bg-primary/20 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            <span>{t('performance.reports_link')}</span>
          </Link>
        </div>
      </div>

      {/* Controls: Class, Student & Date Selector */}
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
                    setSelectedStudentId('');
                    setSearchParams({ classId: cls.id, date: selectedDate });
                  }}
                  className={`px-4 min-h-[44px] rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
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
          !classesLoading && (
            <div className="text-sm text-[var(--color-muted)] py-1 flex items-center gap-2">
              <School className="w-4 h-4 text-primary" />
              <span>No classes found. Create one in Classes first.</span>
            </div>
          )
        )}

        {/* Student Selector + Date Picker */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-[var(--color-border)]">
          <div>
            <label
              htmlFor="perf-student-select"
              className="block text-xs font-semibold text-[var(--color-muted)] mb-1"
            >
              {t('performance.select_student')}
            </label>
            <select
              id="perf-student-select"
              value={selectedStudentId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSelectedStudentId(nextId);
                setSearchParams({
                  classId: selectedClassId,
                  studentId: nextId,
                  date: selectedDate,
                });
              }}
              className="w-full min-h-[44px] px-3.5 py-2 text-sm font-bold rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {students.length === 0 ? (
                <option value="">{t('attendance.no_students')}</option>
              ) : (
                students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {recordedStudentIds.has(s.id) ? '✓ ' : ''}
                    {s.roll_no ? `#${s.roll_no} - ` : ''}
                    {s.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
              {t('performance.record_date')}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => shiftDate(-1)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-[var(--color-border)] hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Previous Day"
              >
                <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
              </button>
              <div className="flex-1 flex items-center gap-2 px-3 min-h-[44px] rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-sm font-bold">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <input
                  type="date"
                  aria-label="Performance date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-transparent border-none text-sm font-bold focus:outline-none cursor-pointer"
                />
              </div>
              <button
                type="button"
                onClick={() => shiftDate(1)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-[var(--color-border)] hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Next Day"
              >
                <ChevronRight className="w-5 h-5 rtl:rotate-180" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick student switcher chips */}
        {students.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-[var(--color-border)]">
            {students.map((s) => {
              const isSelected = s.id === selectedStudentId;
              const hasRecord = recordedStudentIds.has(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedStudentId(s.id)}
                  className={`inline-flex items-center gap-1.5 px-3 min-h-[38px] rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    isSelected
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-[var(--color-text)] hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {hasRecord && (
                    <CheckCircle2
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected ? 'text-white' : 'text-[#16A34A]'
                      }`}
                    />
                  )}
                  <span>{s.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Performance Form */}
      {classesLoading || studentsLoading ? (
        <SkeletonCard count={3} />
      ) : !selectedStudent ? (
        <EmptyState
          variant="students"
          title={t('attendance.no_students')}
          description="Select or create a class and add students before recording daily Sabaq & performance."
          action={
            <Button onClick={() => navigate('/students')}>
              {t('nav.students')}
            </Button>
          }
        />
      ) : (
        <DailyPerformanceForm
          student={selectedStudent}
          classId={selectedClassId}
          recordDate={selectedDate}
        />
      )}
    </div>
  );
};
