import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAdminUsers, useAdminUserDetail } from '../../hooks/useAdminUsers';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { StatCard } from '../../components/ui/StatCard';
import { SkeletonCard } from '../../components/ui/Skeleton';
import {
  ArrowLeft,
  Ban,
  CheckCircle,
  Shield,
  GraduationCap,
  Users,
  CalendarCheck,
  Eye,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const AdminUserDetailPage: React.FC = () => {
  const { userId = '' } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user: currentUser, setInspectedUser } = useAuth();
  const { setUserBlocked, setUserRole } = useAdminUsers();
  const { profile, classes, students, attendance, statuses, isLoading } =
    useAdminUserDetail(userId);

  const [activeTab, setActiveTab] = useState<'classes' | 'students' | 'attendance'>('classes');
  const [confirmAction, setConfirmAction] = useState<'block' | 'role' | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const isSelf = profile?.id === currentUser?.id;
  const statusMap = new Map(statuses.map((s) => [s.id, s]));

  const handleConfirmBlock = async () => {
    if (!profile || isSelf) return;
    setIsMutating(true);
    try {
      await setUserBlocked({ userId: profile.id, isBlocked: !profile.is_blocked });
      showToast(
        profile.is_blocked ? 'User unblocked' : 'User blocked',
        profile.is_blocked ? 'success' : 'info'
      );
      setConfirmAction(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to update block status', 'error');
    } finally {
      setIsMutating(false);
    }
  };

  const handleConfirmRole = async () => {
    if (!profile || isSelf) return;
    const nextRole = profile.role === 'admin' ? 'user' : 'admin';
    setIsMutating(true);
    try {
      await setUserRole({ userId: profile.id, role: nextRole });
      showToast(`User role updated to ${nextRole}`, 'success');
      setConfirmAction(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to update role', 'error');
    } finally {
      setIsMutating(false);
    }
  };

  const handleOpenInAppView = () => {
    if (!profile) return;
    setInspectedUser(profile);
    navigate('/dashboard');
  };

  return (
    <div className="space-y-4">
      <div>
        <Link
          to="/admin/users"
          className="inline-flex items-center gap-1.5 min-h-[44px] text-sm font-bold text-[var(--color-muted)] hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>Back to Users</span>
        </Link>
      </div>

      {isLoading ? (
        <SkeletonCard count={3} />
      ) : !profile ? (
        <div className="bg-[var(--color-surface)] rounded-2xl p-8 text-center border border-[var(--color-border)]">
          <p className="text-base font-bold text-[var(--color-text)]">User not found</p>
        </div>
      ) : (
        <>
          <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-xl font-extrabold text-[var(--color-text)]">
                  {profile.full_name || profile.email}
                </h1>
                <span
                  className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                    profile.role === 'admin'
                      ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-[var(--color-text)]'
                  }`}
                >
                  {profile.role}
                </span>
                {profile.is_blocked && (
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase bg-[#DC2626]/10 text-[#DC2626]">
                    Blocked
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--color-muted)] font-mono">{profile.email}</p>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                Joined: {new Date(profile.created_at).toLocaleString()}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleOpenInAppView} className="gap-1.5">
                <Eye className="w-4 h-4" />
                <span>Inspect in App</span>
              </Button>

              {!isSelf && (
                <>
                  <Button
                    variant={profile.is_blocked ? 'outline' : 'danger'}
                    size="sm"
                    onClick={() => setConfirmAction('block')}
                    className="gap-1.5"
                  >
                    {profile.is_blocked ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Ban className="w-4 h-4" />
                    )}
                    <span>{profile.is_blocked ? t('admin.unblock') : t('admin.block')}</span>
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setConfirmAction('role')}
                    className="gap-1.5"
                  >
                    <Shield className="w-4 h-4" />
                    <span>
                      {profile.role === 'admin' ? t('admin.make_user') : t('admin.make_admin')}
                    </span>
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <StatCard
              title="Classes"
              value={classes.length}
              colorHex="#2563EB"
              icon={<GraduationCap className="w-4 h-4" />}
            />
            <StatCard
              title="Students"
              value={students.length}
              colorHex="#7C3AED"
              icon={<Users className="w-4 h-4" />}
            />
            <StatCard
              title="Attendance Records"
              value={attendance.length}
              colorHex="#16A34A"
              icon={<CalendarCheck className="w-4 h-4" />}
            />
          </div>

          <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] overflow-hidden">
            <div className="flex gap-2 px-4 pt-2 border-b border-[var(--color-border)] overflow-x-auto">
              {(
                [
                  ['classes', `Classes (${classes.length})`],
                  ['students', `Students (${students.length})`],
                  ['attendance', `Attendance (${attendance.length})`],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`min-h-[44px] px-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="divide-y divide-[var(--color-border)] max-h-[420px] overflow-y-auto">
              {activeTab === 'classes' &&
                (classes.length === 0 ? (
                  <p className="p-6 text-center text-sm text-[var(--color-muted)]">No classes.</p>
                ) : (
                  classes.map((c) => (
                    <div key={c.id} className="p-4 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-bold text-[var(--color-text)]">{c.name}</p>
                        {c.section && <p className="text-xs text-[var(--color-muted)]">{c.section}</p>}
                      </div>
                      {c.is_archived && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-xs">
                          Archived
                        </span>
                      )}
                    </div>
                  ))
                ))}

              {activeTab === 'students' &&
                (students.length === 0 ? (
                  <p className="p-6 text-center text-sm text-[var(--color-muted)]">No students.</p>
                ) : (
                  students.map((s) => {
                    const cls = classes.find((c) => c.id === s.class_id);
                    return (
                      <div key={s.id} className="p-4 flex items-center justify-between text-sm">
                        <div>
                          <p className="font-bold text-[var(--color-text)]">
                            {s.roll_no ? `#${s.roll_no} ` : ''}
                            {s.name}
                          </p>
                          <p className="text-xs text-[var(--color-muted)]">
                            {cls?.name || 'Unknown Class'}
                            {s.parent_phone ? ` • ${s.parent_phone}` : ''}
                          </p>
                        </div>
                        {s.is_archived && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-xs">
                            Archived
                          </span>
                        )}
                      </div>
                    );
                  })
                ))}

              {activeTab === 'attendance' &&
                (attendance.length === 0 ? (
                  <p className="p-6 text-center text-sm text-[var(--color-muted)]">
                    No attendance records yet.
                  </p>
                ) : (
                  attendance.slice(0, 100).map((r) => {
                    const st = students.find((s) => s.id === r.student_id);
                    const cls = classes.find((c) => c.id === r.class_id);
                    const statusObj = statusMap.get(r.status_id);
                    return (
                      <div key={r.id} className="p-4 flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <p className="font-bold text-[var(--color-text)] truncate">
                            {st?.name || r.student_id}
                          </p>
                          <p className="text-xs text-[var(--color-muted)] truncate">
                            {cls?.name || ''} {r.note ? `• "${r.note}"` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {statusObj && (
                            <span
                              className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: statusObj.color }}
                            >
                              {statusObj.label_en}
                            </span>
                          )}
                          <span className="font-mono text-xs text-[var(--color-muted)]">
                            {r.attendance_date}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ))}
            </div>
          </div>

          <Modal
            isOpen={confirmAction === 'block'}
            onClose={() => setConfirmAction(null)}
            title={
              profile.is_blocked
                ? `Unblock ${profile.full_name || profile.email}?`
                : `Block ${profile.full_name || profile.email}?`
            }
          >
            <div className="space-y-4">
              <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                {profile.is_blocked
                  ? 'This user will regain full access to their Hazri Book account.'
                  : 'Blocked users are immediately redirected to the blocked screen and cannot read or modify any records.'}
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setConfirmAction(null)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  variant={profile.is_blocked ? 'primary' : 'danger'}
                  onClick={handleConfirmBlock}
                  isLoading={isMutating}
                >
                  {t('common.confirm')}
                </Button>
              </div>
            </div>
          </Modal>

          <Modal
            isOpen={confirmAction === 'role'}
            onClose={() => setConfirmAction(null)}
            title="Change User Role?"
          >
            <div className="space-y-4">
              <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                Change <strong>{profile.full_name || profile.email}</strong>'s role from{' '}
                <strong className="uppercase">{profile.role}</strong> to{' '}
                <strong className="uppercase">
                  {profile.role === 'admin' ? 'user' : 'admin'}
                </strong>
                ?
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setConfirmAction(null)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleConfirmRole} isLoading={isMutating}>
                  {t('common.confirm')}
                </Button>
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
};
