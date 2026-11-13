import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { AdminLayout } from '../components/layout/AdminLayout';

// Public Pages
import { LoginPage } from '../pages/public/LoginPage';
import { SignUpPage } from '../pages/public/SignUpPage';
import { ForgotPasswordPage } from '../pages/public/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/public/ResetPasswordPage';
import { BlockedPage } from '../pages/public/BlockedPage';
import { NotFoundPage } from '../pages/public/NotFoundPage';

// User App Pages
import { DashboardPage } from '../pages/app/DashboardPage';
import { AttendancePage } from '../pages/app/AttendancePage';
import { ClassesPage } from '../pages/app/ClassesPage';
import { StudentsPage } from '../pages/app/StudentsPage';
import { ReportsPage } from '../pages/app/ReportsPage';
import { SettingsPage } from '../pages/app/SettingsPage';

// Admin Pages
import { AdminOverviewPage } from '../pages/admin/AdminOverviewPage';
import { AdminUsersPage } from '../pages/admin/AdminUsersPage';
import { AdminUserDetailPage } from '../pages/admin/AdminUserDetailPage';
import { AdminSettingsPage } from '../pages/admin/AdminSettingsPage';

const FullScreenLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.is_blocked) return <Navigate to="/blocked" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.is_blocked) return <Navigate to="/blocked" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <AdminLayout>{children}</AdminLayout>;
};

const BlockedRoute: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_blocked) return <Navigate to="/dashboard" replace />;
  return <BlockedPage />;
};

export const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/blocked" element={<BlockedRoute />} />

        {/* Protected User Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance"
          element={
            <ProtectedRoute>
              <AttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/classes"
          element={
            <ProtectedRoute>
              <ClassesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/students"
          element={
            <ProtectedRoute>
              <StudentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Protected Admin Routes (Dedicated AdminLayout) */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminOverviewPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsersPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users/:userId"
          element={
            <AdminRoute>
              <AdminUserDetailPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <AdminRoute>
              <AdminSettingsPage />
            </AdminRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};
