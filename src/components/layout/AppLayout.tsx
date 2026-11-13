import React from 'react';
import { NavLink } from 'react-router-dom';
import { Navbar } from './Navbar';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  CheckSquare,
  GraduationCap,
  Users,
  BarChart3,
  Settings,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const sidebarLinks = [
    { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/attendance', label: t('nav.attendance'), icon: CheckSquare },
    { to: '/classes', label: t('nav.classes'), icon: GraduationCap },
    { to: '/students', label: t('nav.students'), icon: Users },
    { to: '/reports', label: t('nav.reports'), icon: BarChart3 },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  const mobileTabs = [
    { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/attendance', label: t('nav.attendance'), icon: CheckSquare },
    { to: '/students', label: t('nav.students'), icon: Users },
    { to: '/reports', label: t('nav.reports'), icon: BarChart3 },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />

      <div className="flex-1 flex">
        {/* Tablet / Desktop Sidebar Navigation (>= 640px) */}
        <aside className="hidden sm:flex sm:w-56 lg:w-64 shrink-0 flex-col border-e border-[var(--color-border)] bg-[var(--color-surface)] p-3 gap-1 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <nav className="flex-1 space-y-1" aria-label="Main navigation">
            {sidebarLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
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

          {user && (
            <div className="pt-3 border-t border-[var(--color-border)] px-2 pb-1">
              {user.full_name && (
                <p className="text-xs font-bold text-[var(--color-text)] truncate">
                  {user.full_name}
                </p>
              )}
              <p className="text-[11px] text-[var(--color-muted)] truncate font-mono">
                {user.email}
              </p>
            </div>
          )}
        </aside>

        {/* Main Content Area (~1100px max-width) */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-5 pb-24 sm:pb-8">
          <div className="max-w-[1100px] mx-auto">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation (<640px) */}
      <nav
        aria-label="Mobile bottom navigation"
        className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-[var(--color-surface)]/95 backdrop-blur-md border-t border-[var(--color-border)] px-1 py-1 grid grid-cols-5"
      >
        {mobileTabs.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
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
      </nav>
    </div>
  );
};
