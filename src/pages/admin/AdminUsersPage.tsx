import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import { useAuth } from '../../contexts/AuthContext';
import { AdminNav } from '../../components/admin/AdminNav';
import { Button } from '../../components/ui/Button';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Search, Eye, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const AdminUsersPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { users, isLoading } = useAdminUsers();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'blocked' | 'admin'>('all');

  const filteredUsers = users.filter((u) => {
    if (filterType === 'active' && u.is_blocked) return false;
    if (filterType === 'blocked' && !u.is_blocked) return false;
    if (filterType === 'admin' && u.role !== 'admin') return false;

    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.full_name || '').toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <AdminNav
        title={t('admin.users_management')}
        subtitle="Inspect user accounts, toggle access, or manage admin roles"
      />

      {/* Search & Filter */}
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute start-3.5 top-3.5 text-[var(--color-muted)]" />
          <input
            type="text"
            aria-label="Search users by name or email"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[44px] ps-10 pe-4 py-2 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[var(--color-border)]">
          {(
            [
              ['all', `All (${users.length})`],
              ['active', `Active (${users.filter((u) => !u.is_blocked).length})`],
              ['blocked', `Blocked (${users.filter((u) => u.is_blocked).length})`],
              ['admin', `Admins (${users.filter((u) => u.role === 'admin').length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilterType(key)}
              className={`px-3.5 min-h-[40px] rounded-xl text-xs font-bold transition-colors ${
                filterType === key
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-[var(--color-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Responsive Table (Desktop/Tablet) + Cards (Mobile) */}
      {isLoading ? (
        <SkeletonCard count={3} />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          variant="users"
          title="No Users Match"
          description="Try clearing your search or selecting a different user filter."
        />
      ) : (
        <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] overflow-hidden">
          {/* Desktop / Tablet Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-slate-50/70 dark:bg-slate-800/40 text-xs font-bold text-[var(--color-muted)] uppercase">
                  <th className="py-3 px-4 text-start">User</th>
                  <th className="py-3 px-4 text-start">{t('admin.role')}</th>
                  <th className="py-3 px-4 text-start">{t('admin.status')}</th>
                  <th className="py-3 px-4 text-start">{t('admin.registered')}</th>
                  <th className="py-3 px-4 text-end">{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] text-sm">
                {filteredUsers.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const displayName = u.full_name || u.email;
                  return (
                    <tr
                      key={u.id}
                      onClick={() => navigate(`/admin/users/${u.id}`)}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--color-text)]">
                            {displayName}
                          </span>
                          {isSelf && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--color-muted)] font-mono">{u.email}</p>
                        {typeof u.classes_count === 'number' && typeof u.students_count === 'number' && (
                          <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
                            {u.classes_count} classes • {u.students_count} students
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                            u.role === 'admin'
                              ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-[var(--color-text)]'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            u.is_blocked
                              ? 'bg-[#DC2626]/10 text-[#DC2626]'
                              : 'bg-[#16A34A]/10 text-[#16A34A]'
                          }`}
                        >
                          {u.is_blocked ? 'Blocked' : 'Active'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[var(--color-muted)] font-mono">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/users/${u.id}`);
                          }}
                          className="gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{t('admin.inspect')}</span>
                          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards */}
          <div className="md:hidden divide-y divide-[var(--color-border)]">
            {filteredUsers.map((u) => {
              const isSelf = u.id === currentUser?.id;
              const displayName = u.full_name || u.email;
              return (
                <div
                  key={u.id}
                  onClick={() => navigate(`/admin/users/${u.id}`)}
                  className="p-4 flex flex-col gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-base text-[var(--color-text)]">
                          {displayName}
                        </span>
                        {isSelf && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--color-muted)] font-mono truncate">
                        {u.email}
                      </p>
                      <p className="text-xs text-[var(--color-muted)] mt-1">
                        {t('admin.registered')}: {new Date(u.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                          u.role === 'admin'
                            ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-[var(--color-text)]'
                        }`}
                      >
                        {u.role}
                      </span>
                      {u.is_blocked && (
                        <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full uppercase bg-[#DC2626]/10 text-[#DC2626]">
                          Blocked
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin/users/${u.id}`);
                    }}
                    className="w-full gap-1.5"
                  >
                    <Eye className="w-4 h-4" />
                    <span>{t('admin.inspect')}</span>
                    <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
