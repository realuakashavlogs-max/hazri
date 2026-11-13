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

export interface AdminOverviewStats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  totalStudents: number;
  recordsToday: number;
}

function ensureConfigured() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured');
  }
}

export const adminService = {
  async getAllUsers(): Promise<AdminUserOverview[]> {
    ensureConfigured();

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
    ensureConfigured();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) return null;
    return data;
  },

  async getAdminStats(): Promise<AdminOverviewStats> {
    ensureConfigured();
    const today = new Date().toISOString().split('T')[0];

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
    ensureConfigured();

    const {
      data: { user: currentAuthUser },
    } = await supabase.auth.getUser();
    if (currentAuthUser && currentAuthUser.id === userId) {
      throw new Error('Admins cannot block their own account.');
    }

    const { error } = await supabase
      .from('profiles')
      .update({ is_blocked: isBlocked })
      .eq('id', userId);

    if (error) throw error;
  },

  async setUserRole(userId: string, role: 'user' | 'admin'): Promise<void> {
    ensureConfigured();

    const {
      data: { user: currentAuthUser },
    } = await supabase.auth.getUser();
    if (currentAuthUser && currentAuthUser.id === userId) {
      throw new Error('Admins cannot change their own role.');
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) throw error;
  },
};
