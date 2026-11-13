import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type {
  Profile,
  ClassItem,
  Student,
  AttendanceRecord,
  AttendanceStatus,
  AdminUserOverview,
} from '../types/database';
import { classesService } from './classesService';
import { studentsService } from './studentsService';
import { attendanceService } from './attendanceService';
import { statusesService } from './statusesService';

const LOCAL_ADMIN_USERS_KEY = 'hazri_admin_users';

export interface AdminOverviewStats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  totalStudents: number;
  recordsToday: number;
}

function getLocalUsers(): AdminUserOverview[] {
  const data = localStorage.getItem(LOCAL_ADMIN_USERS_KEY);
  if (!data) {
    const initial: AdminUserOverview[] = [
      {
        id: 'admin_demo_01',
        email: 'realuakashavlogs@gmail.com',
        full_name: 'App Administrator',
        role: 'admin',
        is_blocked: false,
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
      {
        id: 'teacher_demo_01',
        email: 'teacher@hazribook.com',
        full_name: 'Ustadh Ahmad',
        role: 'user',
        is_blocked: false,
        created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
      },
      {
        id: 'teacher_demo_02',
        email: 'fatima.tutor@example.com',
        full_name: 'Fatima Teacher',
        role: 'user',
        is_blocked: false,
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
    ];
    localStorage.setItem(LOCAL_ADMIN_USERS_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(data);
}

function saveLocalUsers(users: AdminUserOverview[]) {
  localStorage.setItem(LOCAL_ADMIN_USERS_KEY, JSON.stringify(users));
}

export const adminService = {
  async getAllUsers(): Promise<AdminUserOverview[]> {
    if (!isSupabaseConfigured) {
      return getLocalUsers();
    }

    // Try optional admin_user_overview RPC first, fall back to profiles table
    const rpcRes = await supabase.rpc('admin_user_overview');
    if (!rpcRes.error && Array.isArray(rpcRes.data)) {
      return rpcRes.data;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getUserById(userId: string): Promise<Profile | null> {
    if (!isSupabaseConfigured) {
      return getLocalUsers().find((u) => u.id === userId) || null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) return null;
    return data;
  },

  async getAdminStats(): Promise<AdminOverviewStats> {
    const today = new Date().toISOString().split('T')[0];

    if (!isSupabaseConfigured) {
      const users = getLocalUsers();
      const studentsRaw = localStorage.getItem('hazri_local_students');
      const attendanceRaw = localStorage.getItem('hazri_local_attendance');
      const students: Student[] = studentsRaw ? JSON.parse(studentsRaw) : [];
      const attendance: AttendanceRecord[] = attendanceRaw ? JSON.parse(attendanceRaw) : [];

      return {
        totalUsers: users.length,
        activeUsers: users.filter((u) => !u.is_blocked).length,
        blockedUsers: users.filter((u) => u.is_blocked).length,
        totalStudents: students.length,
        recordsToday: attendance.filter((a) => a.attendance_date === today).length,
      };
    }

    const [usersRes, studentsRes, attendanceRes] = await Promise.all([
      supabase.from('profiles').select('id, is_blocked'),
      supabase.from('students').select('id', { count: 'exact', head: true }),
      supabase
        .from('attendance_records')
        .select('id', { count: 'exact', head: true })
        .eq('attendance_date', today),
    ]);

    if (usersRes.error) throw usersRes.error;

    const users = usersRes.data || [];
    const blockedCount = users.filter((u) => u.is_blocked).length;

    return {
      totalUsers: users.length,
      activeUsers: users.length - blockedCount,
      blockedUsers: blockedCount,
      totalStudents: studentsRes.count || 0,
      recordsToday: attendanceRes.count || 0,
    };
  },

  async getUserClasses(userId: string): Promise<ClassItem[]> {
    return classesService.getClasses(userId);
  },

  async getUserStudents(userId: string): Promise<Student[]> {
    return studentsService.getStudents(userId);
  },

  async getUserAttendance(userId: string): Promise<AttendanceRecord[]> {
    return attendanceService.getAllAttendanceForUser(userId);
  },

  async getUserStatuses(userId: string): Promise<AttendanceStatus[]> {
    return statusesService.getStatuses(userId);
  },

  async setUserBlocked(userId: string, isBlocked: boolean): Promise<void> {
    if (!isSupabaseConfigured) {
      const users = getLocalUsers();
      const idx = users.findIndex((u) => u.id === userId);
      if (idx !== -1) {
        users[idx].is_blocked = isBlocked;
        saveLocalUsers(users);
      }
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ is_blocked: isBlocked })
      .eq('id', userId);

    if (error) throw error;
  },

  async setUserRole(userId: string, role: 'user' | 'admin'): Promise<void> {
    if (!isSupabaseConfigured) {
      const users = getLocalUsers();
      const idx = users.findIndex((u) => u.id === userId);
      if (idx !== -1) {
        users[idx].role = role;
        saveLocalUsers(users);
      }
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) throw error;
  },
};
