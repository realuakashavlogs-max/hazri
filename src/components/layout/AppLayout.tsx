import React from 'react';
import { NavLink } from 'react-router-dom';
import { Navbar } from './Navbar';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, CheckSquare, BookOpenCheck, GraduationCap, Users,
  BarChart3, MessageCircle, Settings, ShieldCheck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const { t } = useTranslation();

  const sidebarLinks = [
    { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/attendance', label: t('nav.attendance'), icon: CheckSquare },
    { to: '/performance', label: t('nav.performance'), icon: BookOpenCheck },
    { to: '/classes', label: t('nav.classes'), icon: GraduationCap },
    { to: '/students', label: t('nav.students'), icon: Users },
    { to: '/messages', label: t('nav.messages'), icon: MessageCircle },
    { to: '/reports', label: t('nav.reports'), icon: BarChart3 },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin Panel', icon: ShieldCheck }] : []),
  ];

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar />
      <div className="flex-1 flex min-w-0">
        <aside className="hidden sm:flex sm:w-56 lg:w-64 shrink-0 flex-col border-e border-[var(--color-border)] bg-[var(--color-surface)] p-3 gap-1 sticky top-16 h-[calc(100vh-4rem)] h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain print:hidden">
          <nav className="flex-1 space-y-1" aria-label="Main navigation">
            {sidebarLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 min-h-[44px] rounded-xl text-sm font-semibold transition-all duration-150 ${
                      isActive ? 'bg-primary text-white shadow-sm' : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-100 dark:hover:bg-slate-800/70'
                    }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
          {user && (
            <div className="pt-3 border-t border-[var(--color-border)] px-2 pb-1 flex items-center gap-2.5">
              {user.avatar_url && <img src={user.avatar_url} alt={user.full_name || user.email} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover border border-[var(--color-border)] shrink-0" />}
              <div className="min-w-0">
                {user.full_name && <p className="text-xs font-bold text-[var(--color-text)] truncate">{user.full_name}</p>}
                <p className="text-[11px] text-[var(--color-muted)] truncate font-mono">{user.email}</p>
              </div>
            </div>
          )}
        </aside>

        <main className="flex-1 min-w-0 px-3 sm:px-6 lg:px-8 py-4 sm:py-5 pb-[calc(8.5rem+env(safe-area-inset-bottom))] sm:pb-8">
          <div className="w-full max-w-[1100px] mx-auto min-w-0">{children}</div>
        </main>
      </div>

      <nav aria-label="Mobile bottom navigation"
        className={`sm:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--color-surface)]/95 backdrop-blur-md border-t border-[var(--color-border)] px-1 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))] grid gap-0.5 print:hidden ${isAdmin ? 'grid-cols-5' : 'grid-cols-4'}`}
      >
        {sidebarLinks.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} aria-label={item.label} title={item.label}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-h-[48px] rounded-lg text-[10px] leading-tight font-semibold transition-colors duration-150 px-0.5 py-1 min-w-0 ${
                  isActive ? 'text-primary bg-primary/10' : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
            >
              <Icon className="w-5 h-5 mb-0.5 shrink-0" />
              <span className="truncate max-w-full text-center">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
