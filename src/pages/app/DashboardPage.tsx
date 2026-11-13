import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useClasses } from '../../hooks/useClasses';
import { useStudents } from '../../hooks/useStudents';
import { useStatuses } from '../../hooks/useStatuses';
import { useUserAttendanceForDate } from '../../hooks/useAttendance';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { SyncIndicator } from '../../components/layout/SyncIndicator';
import {
  CheckCircle2,
  GraduationCap,
  Users,
  BarChart3,
  Settings,
  CheckCircle,
  XCircle,
  Sparkles,
  ArrowRight,
  CalendarCheck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, inspectedUser } = useAuth();
  const displayName =
    inspectedUser?.full_name || user?.full_name || user?.email || 'Educator';

  const today = new Date().toISOString().split('T')[0];
  const { classes, isLoading: classesLoading } = useClasses();
  const { students, isLoading: studentsLoading } = useStudents();
  const { statuses } = useStatuses();
  const { records: todayRecords, isLoading: attendanceLoading } =
    useUserAttendanceForDate(today);

  const activeClasses = classes.filter((c) => !c.is_archived);
  const activeStudents = students.filter((s) => !s.is_archived);
  const isLoading = classesLoading || studentsLoading || attendanceLoading;

  const presentStatusIds = new Set(
    statuses.filter((s) => s.counts_as_present).map((s) => s.id)
  );
  const statusMap = new Map(statuses.map((s) => [s.id, s]));

  const presentToday = todayRecords.filter((r) => presentStatusIds.has(r.status_id)).length;
  const absentToday = todayRecords.filter(
    (r) => statusMap.get(r.status_id)?.key === 'absent'
  ).length;
  const markedClassIds = new Set(todayRecords.map((r) => r.class_id));

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div className="bg-[var(--color-surface)] rounded-3xl shadow-sm border border-[var(--color-border)] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[22px] sm:text-[26px] font-extrabold text-[var(--color-text)] leading-tight">
              {t('dashboard.greeting', { name: displayName })}
            </h1>
            <SyncIndicator />
          </div>
          <p className="text-sm text-[var(--color-muted)]">
            {t('dashboard.subtitle')} • <span className="font-mono">{today}</span>
          </p>
        </div>

        <Button
          size="lg"
          onClick={() => navigate('/attendance')}
          className="gap-2 shadow-md shrink-0"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>{t('dashboard.mark_today')}</span>
        </Button>
      </div>

      {/* Onboarding Banner when user has no classes yet */}
      {!classesLoading && activeClasses.length === 0 && (
        <div className="bg-primary/5 dark:bg-primary/15 rounded-3xl border border-primary/20 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text)]">
                {t('dashboard.onboarding_title')}
              </h2>
              <p className="text-sm text-[var(--color-muted)] mt-0.5 max-w-xl">
                {t('dashboard.onboarding_desc')}
              </p>
            </div>
          </div>
          <Button onClick={() => navigate('/classes')} className="shrink-0 gap-2">
            <GraduationCap className="w-4 h-4" />
            <span>{t('dashboard.onboarding_cta')}</span>
          </Button>
        </div>
      )}

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          title={t('dashboard.total_students')}
          value={activeStudents.length}
          colorHex="#2563EB"
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          title={t('dashboard.present_today')}
          value={presentToday}
          colorHex="#16A34A"
          icon={<CheckCircle className="w-4 h-4" />}
        />
        <StatCard
          title={t('dashboard.absent_today')}
          value={absentToday}
          colorHex="#DC2626"
          icon={<XCircle className="w-4 h-4" />}
        />
        <StatCard
          title={t('dashboard.marked_classes')}
          value={`${markedClassIds.size}/${activeClasses.length}`}
          colorHex="#7C3AED"
          icon={<CalendarCheck className="w-4 h-4" />}
        />
      </div>

      {/* Today's Class Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-[var(--color-text)]">
            {t('dashboard.today_classes')}
          </h2>
          <Link
            to="/classes"
            className="inline-flex items-center min-h-[44px] px-2 text-sm font-bold text-primary hover:underline"
          >
            {t('nav.classes')}
          </Link>
        </div>

        {isLoading ? (
          <SkeletonCard count={2} />
        ) : activeClasses.length === 0 ? null : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {activeClasses.map((cls) => {
              const clsStudents = activeStudents.filter((s) => s.class_id === cls.id);
              const clsRecords = todayRecords.filter((r) => r.class_id === cls.id);
              const clsPresent = clsRecords.filter((r) => presentStatusIds.has(r.status_id)).length;
              const clsAbsent = clsRecords.filter(
                (r) => statusMap.get(r.status_id)?.key === 'absent'
              ).length;
              const isMarked = clsRecords.length > 0;

              return (
                <div
                  key={cls.id}
                  className="bg-[var(--color-surface)] rounded-2xl p-4 shadow-sm border border-[var(--color-border)] flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-base text-[var(--color-text)]">
                        {cls.name}
                      </h3>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          isMarked
                            ? 'bg-[#16A34A]/10 text-[#16A34A]'
                            : 'bg-slate-100 dark:bg-slate-800 text-[var(--color-muted)]'
                        }`}
                      >
                        {isMarked ? t('dashboard.marked') : t('dashboard.pending')}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-muted)]">
                      {t('classes.students_count', { count: clsStudents.length })}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
                    <div className="flex items-center gap-3 text-sm font-bold">
                      <span className="text-[#16A34A]">P: {clsPresent}</span>
                      <span className="text-[#DC2626]">A: {clsAbsent}</span>
                    </div>

                    <Button
                      size="sm"
                      variant={isMarked ? 'outline' : 'primary'}
                      onClick={() => navigate(`/attendance?classId=${cls.id}`)}
                      className="gap-1.5"
                    >
                      <span>{t('classes.mark_attendance')}</span>
                      <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Links Grid */}
      <div className="space-y-3">
        <h2 className="text-lg font-extrabold text-[var(--color-text)]">
          {t('dashboard.quick_links')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <Link
            to="/classes"
            className="bg-[var(--color-surface)] rounded-2xl p-4 min-h-[64px] border border-[var(--color-border)] hover:shadow-md transition-all duration-150 flex items-center gap-3"
          >
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-[var(--color-text)]">
              {t('nav.classes')}
            </span>
          </Link>

          <Link
            to="/students"
            className="bg-[var(--color-surface)] rounded-2xl p-4 min-h-[64px] border border-[var(--color-border)] hover:shadow-md transition-all duration-150 flex items-center gap-3"
          >
            <div className="w-11 h-11 rounded-xl bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-[var(--color-text)]">
              {t('nav.students')}
            </span>
          </Link>

          <Link
            to="/reports"
            className="bg-[var(--color-surface)] rounded-2xl p-4 min-h-[64px] border border-[var(--color-border)] hover:shadow-md transition-all duration-150 flex items-center gap-3"
          >
            <div className="w-11 h-11 rounded-xl bg-[#7C3AED]/10 text-[#7C3AED] flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-[var(--color-text)]">
              {t('nav.reports')}
            </span>
          </Link>

          <Link
            to="/settings"
            className="bg-[var(--color-surface)] rounded-2xl p-4 min-h-[64px] border border-[var(--color-border)] hover:shadow-md transition-all duration-150 flex items-center gap-3"
          >
            <div className="w-11 h-11 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-[var(--color-text)]">
              {t('nav.settings')}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};
