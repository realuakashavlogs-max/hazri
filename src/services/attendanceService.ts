import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { AttendanceRecord, PendingAttendanceWrite } from '../types/database';
import {
  enqueueAttendance,
  getAllPendingAttendance,
  clearSyncedAttendance,
} from '../lib/offlineQueue';

const LOCAL_ATTENDANCE_KEY = 'hazri_local_attendance';

function getLocalAttendance(): AttendanceRecord[] {
  const data = localStorage.getItem(LOCAL_ATTENDANCE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveLocalAttendance(records: AttendanceRecord[]) {
  localStorage.setItem(LOCAL_ATTENDANCE_KEY, JSON.stringify(records));
}

function toSupabaseUpsertRows(items: PendingAttendanceWrite[]) {
  return items.map(({ id: _localKey, ...row }) => row);
}

export const attendanceService = {
  async getAttendanceForDate(params: {
    userId: string;
    classId: string;
    date: string;
  }): Promise<AttendanceRecord[]> {
    if (!isSupabaseConfigured) {
      return getLocalAttendance().filter(
        (r) =>
          (r.user_id === params.userId || params.userId.startsWith('demo_')) &&
          r.class_id === params.classId &&
          r.attendance_date === params.date
      );
    }

    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', params.userId)
      .eq('class_id', params.classId)
      .eq('attendance_date', params.date);

    if (error) throw error;
    return data || [];
  },

  async getAttendanceForUserDate(userId: string, date: string): Promise<AttendanceRecord[]> {
    if (!isSupabaseConfigured) {
      return getLocalAttendance().filter(
        (r) =>
          (r.user_id === userId || userId.startsWith('demo_')) &&
          r.attendance_date === date
      );
    }

    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .eq('attendance_date', date);

    if (error) throw error;
    return data || [];
  },

  async getAllAttendanceForUser(userId: string): Promise<AttendanceRecord[]> {
    if (!isSupabaseConfigured) {
      return getLocalAttendance().filter(
        (r) => r.user_id === userId || userId.startsWith('demo_')
      );
    }

    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .order('attendance_date', { ascending: false })
      .limit(500);

    if (error) throw error;
    return data || [];
  },

  async getAttendanceForRange(params: {
    userId: string;
    classId: string;
    startDate: string;
    endDate: string;
  }): Promise<AttendanceRecord[]> {
    if (!isSupabaseConfigured) {
      return getLocalAttendance().filter(
        (r) =>
          (r.user_id === params.userId || params.userId.startsWith('demo_')) &&
          r.class_id === params.classId &&
          r.attendance_date >= params.startDate &&
          r.attendance_date <= params.endDate
      );
    }

    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', params.userId)
      .eq('class_id', params.classId)
      .gte('attendance_date', params.startDate)
      .lte('attendance_date', params.endDate)
      .order('attendance_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async saveAttendance(
    records: {
      userId: string;
      classId: string;
      studentId: string;
      attendanceDate: string;
      statusId: string;
      note?: string;
    }[]
  ): Promise<{ queuedOffline: boolean; count: number }> {
    const now = new Date().toISOString();
    const rowsToQueue: PendingAttendanceWrite[] = records.map((r) => ({
      id: `${r.studentId}_${r.attendanceDate}`,
      user_id: r.userId,
      class_id: r.classId,
      student_id: r.studentId,
      attendance_date: r.attendanceDate,
      status_id: r.statusId,
      note: r.note || null,
      updated_at: now,
    }));

    if (!navigator.onLine || !isSupabaseConfigured) {
      await enqueueAttendance(rowsToQueue);

      const local = getLocalAttendance();
      const map = new Map(local.map((item) => [`${item.student_id}_${item.attendance_date}`, item]));
      rowsToQueue.forEach((item) => {
        map.set(item.id, {
          ...item,
          created_at: now,
        });
      });
      saveLocalAttendance(Array.from(map.values()));

      return { queuedOffline: true, count: rowsToQueue.length };
    }

    try {
      const { error } = await supabase
        .from('attendance_records')
        .upsert(toSupabaseUpsertRows(rowsToQueue), {
          onConflict: 'student_id,attendance_date',
        });

      if (error) throw error;

      return { queuedOffline: false, count: rowsToQueue.length };
    } catch (err) {
      console.warn('Network error saving attendance, queuing offline:', err);
      await enqueueAttendance(rowsToQueue);
      return { queuedOffline: true, count: rowsToQueue.length };
    }
  },

  async flushOfflineQueue(): Promise<number> {
    if (!navigator.onLine || !isSupabaseConfigured) return 0;

    const pending = await getAllPendingAttendance();
    if (pending.length === 0) return 0;

    try {
      const { error } = await supabase
        .from('attendance_records')
        .upsert(toSupabaseUpsertRows(pending), {
          onConflict: 'student_id,attendance_date',
        });

      if (!error) {
        await clearSyncedAttendance(pending.map((p) => p.id));
        return pending.length;
      }
    } catch (e) {
      console.error('Failed to flush offline attendance queue:', e);
    }
    return 0;
  },
};
