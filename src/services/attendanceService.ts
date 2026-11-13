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

type AttendanceStatusRow = { id: string; key: AttendanceStatusKey };
type AttendanceDbRow = {
  id: string;
  user_id: string;
  student_id: string;
  class_id: string;
  attendance_date: string;
  status_id: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

async function getStatusIds(userId: string): Promise<Map<AttendanceStatusKey, string>> {
  const { data, error } = await supabase
    .from('attendance_statuses')
    .select('id, key')
    .eq('user_id', userId);

  if (error) throw error;

  const map = new Map<AttendanceStatusKey, string>(
    ((data || []) as AttendanceStatusRow[]).map((status) => [status.key, status.id])
  );
  const missing = (['present', 'absent', 'late', 'leave'] as AttendanceStatusKey[])
    .filter((key) => !map.has(key));

  if (missing.length) {
    throw new Error(
      'Your attendance statuses are not initialized in Supabase. Please sign out and sign in again, or ask the administrator to repair this account.'
    );
  }
  return map;
}

function mapRemoteRecords(
  rows: AttendanceDbRow[],
  statusIds: Map<AttendanceStatusKey, string>
): AttendanceRecord[] {
  const keysById = new Map(Array.from(statusIds.entries()).map(([key, id]) => [id, key]));
  return rows.map((row) => {
    const status = keysById.get(row.status_id);
    if (!status) {
      throw new Error('An attendance record references an unknown status. Please contact the administrator.');
    }
    return {
      id: row.id,
      user_id: row.user_id,
      student_id: row.student_id,
      class_id: row.class_id,
      attendance_date: row.attendance_date,
      status,
      note: row.note,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });
}

function toSupabaseUpsertRows(
  items: PendingAttendanceWrite[],
  statusIds: Map<AttendanceStatusKey, string>
) {
  return items.map(({ id: _localKey, status, ...row }) => {
    const status_id = statusIds.get(status);
    if (!status_id) throw new Error(`Attendance status "${status}" is not configured for this account.`);
    return { ...row, status_id };
  });
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
      user_id: existing?.user_id || p.user_id || userId,
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
      (p) => p.user_id === params.userId && p.class_id === params.classId && p.attendance_date === params.date
    );

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return mergePendingRecords([], pendingMatching, params.userId);
    }

    const statusIds = await getStatusIds(params.userId);
    const { data, error } = await supabase
      .from('attendance_records')
      .select('id, user_id, student_id, class_id, attendance_date, status_id, note, created_at, updated_at')
      .eq('user_id', params.userId)
      .eq('class_id', params.classId)
      .eq('attendance_date', params.date);

    if (error) throw error;
    return mergePendingRecords(
      mapRemoteRecords((data || []) as AttendanceDbRow[], statusIds),
      pendingMatching,
      params.userId
    );
  },

  async getAttendanceForUserDate(userId: string, date: string): Promise<AttendanceRecord[]> {
    ensureConfigured();
    const pendingAll = await getAllPendingAttendance();
    const pendingMatching = pendingAll.filter(
      (p) => p.user_id === userId && p.attendance_date === date
    );

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return mergePendingRecords([], pendingMatching, userId);
    }

    const statusIds = await getStatusIds(userId);
    const { data, error } = await supabase
      .from('attendance_records')
      .select('id, user_id, student_id, class_id, attendance_date, status_id, note, created_at, updated_at')
      .eq('user_id', userId)
      .eq('attendance_date', date);

    if (error) throw error;
    return mergePendingRecords(mapRemoteRecords((data || []) as AttendanceDbRow[], statusIds), pendingMatching, userId);
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
        p.user_id === params.userId &&
        p.class_id === params.classId &&
        p.attendance_date >= params.startDate &&
        p.attendance_date <= params.endDate
    );

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return mergePendingRecords([], pendingMatching, params.userId);
    }

    const statusIds = await getStatusIds(params.userId);
    const { data, error } = await supabase
      .from('attendance_records')
      .select('id, user_id, student_id, class_id, attendance_date, status_id, note, created_at, updated_at')
      .eq('user_id', params.userId)
      .eq('class_id', params.classId)
      .gte('attendance_date', params.startDate)
      .lte('attendance_date', params.endDate)
      .order('attendance_date', { ascending: false });

    if (error) throw error;
    return mergePendingRecords(mapRemoteRecords((data || []) as AttendanceDbRow[], statusIds), pendingMatching, params.userId);
  },

  async saveAttendance(
    userId: string,
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
      user_id: userId,
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

    const statusIds = await getStatusIds(userId);
    const { error } = await supabase
      .from('attendance_records')
      .upsert(toSupabaseUpsertRows(rowsToQueue, statusIds), {
        onConflict: 'student_id,attendance_date',
      });

    if (error) throw error;
    await clearSyncedAttendance(rowsToQueue.map((r) => r.id));
    return { queuedOffline: false, count: rowsToQueue.length };
  },

  async flushOfflineQueue(userId: string): Promise<number> {
    if (
      !isSupabaseConfigured ||
      !supabase ||
      !userId ||
      (typeof navigator !== 'undefined' && !navigator.onLine)
    ) {
      return 0;
    }

    const pending = (await getAllPendingAttendance()).filter((item) => item.user_id === userId);
    if (pending.length === 0) return 0;

    try {
      const statusIds = await getStatusIds(userId);
      const { error } = await supabase
        .from('attendance_records')
        .upsert(toSupabaseUpsertRows(pending, statusIds), {
          onConflict: 'student_id,attendance_date',
        });

      if (!error) {
        await clearSyncedAttendance(pending.map((p) => p.id));
        return pending.length;
      }
      console.error('Failed to sync offline attendance:', error.message);
    } catch (error) {
      console.error('Failed to flush offline attendance queue:', error);
    }
    return 0;
  },
};
