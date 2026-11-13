import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Navbar } from './Navbar';
import { LayoutGrid, Users, Sliders, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();

  const adminLinks = [
    { to: '/admin', label: t('admin.overview'), icon: LayoutGrid, end: true },
    { to: '/admin/users', label: t('admin.users_management'), icon: Users, end: false },
    { to: '/admin/settings', label: t('admin.global_defaults'), icon: Sliders, end: false },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar isAdminShell />

      <div className="flex-1 flex">
        {/* Tablet / Desktop Admin Sidebar */}
        <aside className="hidden sm:flex sm:w-56 lg:w-64 shrink-0 flex-col border-e border-[var(--color-border)] bg-[var(--color-surface)] p-3 gap-1 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="px-3 py-2 mb-1 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              {t('admin.title')}
            </span>
          </div>

          <nav className="flex-1 space-y-1" aria-label="Admin navigation">
            {adminLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 min-h-[44px] rounded-xl text-sm font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-100 dark:hover:bg-slate-800/70'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-[var(--color-border)]">
            <Link
              to="/dashboard"
              className="flex items-center gap-2.5 px-3.5 min-h-[44px] rounded-xl text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 shrink-0 rtl:rotate-180" />
              <span>{t('nav.back_to_app')}</span>
            </Link>
          </div>
        </aside>

        {/* Admin Content */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-5 pb-24 sm:pb-8">
          <div className="max-w-[1100px] mx-auto space-y-4">
            {/* Mobile Admin Subheader */}
            <div className="sm:hidden flex items-center justify-between gap-2 pb-2 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-extrabold text-[var(--color-text)]">
                  {t('admin.title')}
                </span>
              </div>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1 text-xs font-bold text-primary min-h-[36px] px-2"
              >
                <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
                <span>{t('nav.back_to_app')}</span>
              </Link>
            </div>

            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation for Admin */}
      <nav
        aria-label="Admin mobile navigation"
        className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-[var(--color-surface)]/95 backdrop-blur-md border-t border-[var(--color-border)] px-1 py-1 grid grid-cols-4"
      >
        {adminLinks.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-h-[52px] rounded-xl text-[11px] font-semibold transition-colors duration-150 px-1 ${
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`
              }
            >
              <Icon className="w-5 h-5 mb-0.5 shrink-0" />
              <span className="truncate max-w-full">{item.label}</span>
            </NavLink>
          );
        })}
        <Link
          to="/dashboard"
          className="flex flex-col items-center justify-center min-h-[52px] rounded-xl text-[11px] font-semibold text-[var(--color-muted)] hover:text-[var(--color-text)] px-1"
        >
          <ArrowLeft className="w-5 h-5 mb-0.5 shrink-0 rtl:rotate-180" />
          <span className="truncate max-w-full">{t('nav.back_to_app')}</span>
        </Link>
      </nav>
    </div>
  );
};
