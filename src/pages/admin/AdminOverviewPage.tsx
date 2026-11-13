import React from 'react';
import { Link } from 'react-router-dom';
import { useAdminStats } from '../../hooks/useAdminUsers';
import { AdminNav } from '../../components/admin/AdminNav';
import { StatCard } from '../../components/ui/StatCard';
import { SkeletonCard } from '../../components/ui/Skeleton';
import {
  Users,
  UserCheck,
  Ban,
  GraduationCap,
  CalendarCheck,
  ArrowRight,
  Sliders,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const AdminOverviewPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useAdminStats();

  return (
    <div className="space-y-5">
      <AdminNav
        title={t('admin.overview')}
        subtitle="System overview, user access control, and global defaults"
      />

      {isLoading || !stats ? (
        <SkeletonCard count={2} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            colorHex="#2563EB"
            icon={<Users className="w-4 h-4" />}
          />
          <StatCard
            title="Active Users"
            value={stats.activeUsers}
            colorHex="#16A34A"
            icon={<UserCheck className="w-4 h-4" />}
          />
          <StatCard
            title="Blocked Users"
            value={stats.blockedUsers}
            colorHex="#DC2626"
            icon={<Ban className="w-4 h-4" />}
          />
          <StatCard
            title="Total Students"
            value={stats.totalStudents}
            colorHex="#7C3AED"
            icon={<GraduationCap className="w-4 h-4" />}
          />
          <StatCard
            title="Records Today"
            value={stats.recordsToday}
            colorHex="#F59E0B"
            icon={<CalendarCheck className="w-4 h-4" />}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/admin/users"
          className="bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-border)] hover:shadow-md transition-all duration-150 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-[var(--color-text)]">
                Manage Users
              </h2>
              <p className="text-xs text-[var(--color-muted)]">
                Search users, view read-only records, block/unblock, or assign admin roles
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[var(--color-muted)] shrink-0 rtl:rotate-180" />
        </Link>

        <Link
          to="/admin/settings"
          className="bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-border)] hover:shadow-md transition-all duration-150 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-[var(--color-text)]">
                Global App Settings
              </h2>
              <p className="text-xs text-[var(--color-muted)]">
                Default branding, logo, colors, language, and new-user status templates
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[var(--color-muted)] shrink-0 rtl:rotate-180" />
        </Link>
      </div>
    </div>
  );
};
