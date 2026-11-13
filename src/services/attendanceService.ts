import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type {
  AttendanceRecord,
  AttendanceStatusKey,
  PendingAttendanceWrite,
} from '../types/database';
import {
  enqueueAttendance,
  getAllPendingAttendance,
  clearSyncedAttendance,
} from '../lib/offlineQueue';

function ensureConfigured() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured');
  }
}

function toSupabaseUpsertRows(items: PendingAttendanceWrite[]) {
  return items.map(({ id: _localKey, ...row }) => row);
}

function mergePendingRecords(
  remote: AttendanceRecord[],
  pending: PendingAttendanceWrite[],
  userId: string
): AttendanceRecord[] {
  if (pending.length === 0) return remote;
  const map = new Map<string, AttendanceRecord>(
    remote.map((r) => [`${r.student_id}_${r.attendance_date}`, r])
  );

  for (const p of pending) {
    const existing = map.get(p.id);
    map.set(p.id, {
      id: existing?.id || p.id,
      user_id: existing?.user_id || userId,
      student_id: p.student_id,
      class_id: p.class_id,
      attendance_date: p.attendance_date,
      status: p.status,
      note: p.note,
      created_at: existing?.created_at || p.updated_at,
      updated_at: p.updated_at,
    });
  }

  return Array.from(map.values());
}

export const attendanceService = {
  async getAttendanceForDate(params: {
    userId: string;
    classId: string;
    date: string;
  }): Promise<AttendanceRecord[]> {
    ensureConfigured();
    const pendingAll = await getAllPendingAttendance();
    const pendingMatching = pendingAll.filter(
      (p) => p.class_id === params.classId && p.attendance_date === params.date
    );

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return mergePendingRecords([], pendingMatching, params.userId);
    }

    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('id, user_id, student_id, class_id, attendance_date, status, note, created_at, updated_at')
        .eq('user_id', params.userId)
        .eq('class_id', params.classId)
        .eq('attendance_date', params.date);

      if (error) throw error;
      return mergePendingRecords(data || [], pendingMatching, params.userId);
    } catch (err) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return mergePendingRecords([], pendingMatching, params.userId);
      }
      throw err;
    }
  },

  async getAttendanceForUserDate(userId: string, date: string): Promise<AttendanceRecord[]> {
    ensureConfigured();
    const pendingAll = await getAllPendingAttendance();
    const pendingMatching = pendingAll.filter((p) => p.attendance_date === date);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return mergePendingRecords([], pendingMatching, userId);
    }

    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('id, user_id, student_id, class_id, attendance_date, status, note, created_at, updated_at')
        .eq('user_id', userId)
        .eq('attendance_date', date);

      if (error) throw error;
      return mergePendingRecords(data || [], pendingMatching, userId);
    } catch (err) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return mergePendingRecords([], pendingMatching, userId);
      }
      throw err;
    }
  },

  async getAttendanceForRange(params: {
    userId: string;
    classId: string;
    startDate: string;
    endDate: string;
  }): Promise<AttendanceRecord[]> {
    ensureConfigured();
    const pendingAll = await getAllPendingAttendance();
    const pendingMatching = pendingAll.filter(
      (p) =>
        p.class_id === params.classId &&
        p.attendance_date >= params.startDate &&
        p.attendance_date <= params.endDate
    );

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return mergePendingRecords([], pendingMatching, params.userId);
    }

    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('id, user_id, student_id, class_id, attendance_date, status, note, created_at, updated_at')
        .eq('user_id', params.userId)
        .eq('class_id', params.classId)
        .gte('attendance_date', params.startDate)
        .lte('attendance_date', params.endDate)
        .order('attendance_date', { ascending: false });

      if (error) throw error;
      return mergePendingRecords(data || [], pendingMatching, params.userId);
    } catch (err) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return mergePendingRecords([], pendingMatching, params.userId);
      }
      throw err;
    }
  },

  async saveAttendance(
    records: {
      classId: string;
      studentId: string;
      attendanceDate: string;
      status: AttendanceStatusKey;
      note?: string;
    }[]
  ): Promise<{ queuedOffline: boolean; count: number }> {
    ensureConfigured();

    const now = new Date().toISOString();
    const rowsToQueue: PendingAttendanceWrite[] = records.map((r) => ({
      id: `${r.studentId}_${r.attendanceDate}`,
      class_id: r.classId,
      student_id: r.studentId,
      attendance_date: r.attendanceDate,
      status: r.status,
      note: r.note?.trim() ? r.note.trim() : null,
      updated_at: now,
    }));

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await enqueueAttendance(rowsToQueue);
      return { queuedOffline: true, count: rowsToQueue.length };
    }

    try {
      const { error } = await supabase
        .from('attendance_records')
        .upsert(toSupabaseUpsertRows(rowsToQueue), {
          onConflict: 'student_id,attendance_date',
        });

      if (error) throw error;

      // Clear any matching pending records that just synced cleanly
      await clearSyncedAttendance(rowsToQueue.map((r) => r.id));

      return { queuedOffline: false, count: rowsToQueue.length };
    } catch (err: any) {
      // Queue offline if network/connectivity failure
      const isNetworkErr =
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        err instanceof TypeError ||
        /fetch|network|offline/i.test(err?.message || '');

      if (isNetworkErr) {
        await enqueueAttendance(rowsToQueue);
        return { queuedOffline: true, count: rowsToQueue.length };
      }
      throw err;
    }
  },

  async flushOfflineQueue(): Promise<number> {
    if (
      !isSupabaseConfigured ||
      !supabase ||
      (typeof navigator !== 'undefined' && !navigator.onLine)
    ) {
      return 0;
    }

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
