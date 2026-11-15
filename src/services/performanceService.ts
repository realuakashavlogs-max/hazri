import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type {
  PendingPerformanceWrite,
  StudentDailyPerformance,
  StudentDailyPerformanceInput,
} from '../types/database';
import {
  clearSyncedPerformance,
  enqueuePerformance,
  getAllPendingPerformance,
} from '../lib/offlineQueue';
import { attendanceService } from './attendanceService';

function ensureConfigured() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured');
  }
}

const PERFORMANCE_COLUMNS = [
  'id',
  'user_id',
  'student_id',
  'class_id',
  'record_date',
  'attendance_status',
  'sabaq_listened',
  'sabaq_completed',
  'sabaq_surah',
  'sabaq_start_ayah',
  'sabaq_end_ayah',
  'sabaq_start_page',
  'sabaq_end_page',
  'sabaq_para',
  'sabaq_grade',
  'sabaq_remarks',
  'sabqi_listened',
  'sabqi_details',
  'sabqi_start_page',
  'sabqi_end_page',
  'sabqi_completed',
  'sabqi_remarks',
  'manzil_listened',
  'manzil_details',
  'manzil_start_page',
  'manzil_end_page',
  'manzil_completed',
  'manzil_remarks',
  'total_mistakes',
  'major_mistakes',
  'minor_mistakes',
  'atak_count',
  'repeated_mistakes',
  'daily_result',
  'incomplete_reason',
  'teacher_remarks',
  'created_at',
  'updated_at',
].join(', ');

function toPendingRecord(
  input: StudentDailyPerformanceInput,
  updatedAt: string
): PendingPerformanceWrite {
  return {
    ...input,
    id: `${input.user_id}_${input.student_id}_${input.record_date}`,
    updated_at: updatedAt,
  };
}

function toSupabaseUpsertRow(item: PendingPerformanceWrite) {
  const { id: _localKey, ...row } = item;
  return row;
}

function mergePendingPerformance(
  remote: StudentDailyPerformance[],
  pending: PendingPerformanceWrite[]
): StudentDailyPerformance[] {
  if (pending.length === 0) return remote;
  const map = new Map<string, StudentDailyPerformance>(
    remote.map((r) => [`${r.user_id}_${r.student_id}_${r.record_date}`, r])
  );

  for (const p of pending) {
    const existing = map.get(p.id);
    const { id: localKey, ...rest } = p;
    map.set(p.id, {
      ...rest,
      id: existing?.id || localKey,
      created_at: existing?.created_at || p.updated_at,
    });
  }

  return Array.from(map.values()).sort((a, b) =>
    b.record_date.localeCompare(a.record_date)
  );
}

export const performanceService = {
  async getPerformanceRecord(params: {
    userId: string;
    studentId: string;
    recordDate: string;
  }): Promise<StudentDailyPerformance | null> {
    ensureConfigured();
    const pendingAll = await getAllPendingPerformance(params.userId);
    const pendingMatch = pendingAll.find(
      (p) => p.student_id === params.studentId && p.record_date === params.recordDate
    );

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return pendingMatch ? mergePendingPerformance([], [pendingMatch])[0] || null : null;
    }

    const { data, error } = await supabase
      .from('student_daily_performance')
      .select(PERFORMANCE_COLUMNS)
      .eq('user_id', params.userId)
      .eq('student_id', params.studentId)
      .eq('record_date', params.recordDate)
      .maybeSingle();

    if (error) throw error;
    const remoteRow = data as StudentDailyPerformance | null;
    if (pendingMatch) {
      return mergePendingPerformance(remoteRow ? [remoteRow] : [], [pendingMatch])[0] || null;
    }
    return remoteRow;
  },

  async getPerformanceForStudent(params: {
    userId: string;
    studentId: string;
    startDate?: string;
    endDate?: string;
  }): Promise<StudentDailyPerformance[]> {
    ensureConfigured();
    const pendingAll = await getAllPendingPerformance(params.userId);
    const pendingMatching = pendingAll.filter((p) => {
      if (p.student_id !== params.studentId) return false;
      if (params.startDate && p.record_date < params.startDate) return false;
      if (params.endDate && p.record_date > params.endDate) return false;
      return true;
    });

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return mergePendingPerformance([], pendingMatching);
    }

    try {
      let query = supabase
        .from('student_daily_performance')
        .select(PERFORMANCE_COLUMNS)
        .eq('user_id', params.userId)
        .eq('student_id', params.studentId)
        .order('record_date', { ascending: false });

      if (params.startDate) query = query.gte('record_date', params.startDate);
      if (params.endDate) query = query.lte('record_date', params.endDate);

      const { data, error } = await query;
      if (error) throw error;
      return mergePendingPerformance(
        ((data as unknown) as StudentDailyPerformance[]) || [],
        pendingMatching
      );
    } catch (err) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return mergePendingPerformance([], pendingMatching);
      }
      throw err;
    }
  },

  async getPerformanceForUserDate(
    userId: string,
    recordDate: string
  ): Promise<StudentDailyPerformance[]> {
    ensureConfigured();
    const pendingAll = await getAllPendingPerformance(userId);
    const pendingMatching = pendingAll.filter((p) => p.record_date === recordDate);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return mergePendingPerformance([], pendingMatching);
    }

    try {
      const { data, error } = await supabase
        .from('student_daily_performance')
        .select(PERFORMANCE_COLUMNS)
        .eq('user_id', userId)
        .eq('record_date', recordDate);

      if (error) throw error;
      return mergePendingPerformance(
        ((data as unknown) as StudentDailyPerformance[]) || [],
        pendingMatching
      );
    } catch (err) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return mergePendingPerformance([], pendingMatching);
      }
      throw err;
    }
  },

  async getPerformanceForRange(params: {
    userId: string;
    classId?: string;
    studentId?: string;
    startDate: string;
    endDate: string;
  }): Promise<StudentDailyPerformance[]> {
    ensureConfigured();
    const pendingAll = await getAllPendingPerformance(params.userId);
    const pendingMatching = pendingAll.filter((p) => {
      if (params.classId && p.class_id !== params.classId) return false;
      if (params.studentId && p.student_id !== params.studentId) return false;
      if (p.record_date < params.startDate || p.record_date > params.endDate) return false;
      return true;
    });

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return mergePendingPerformance([], pendingMatching);
    }

    try {
      let query = supabase
        .from('student_daily_performance')
        .select(PERFORMANCE_COLUMNS)
        .eq('user_id', params.userId)
        .gte('record_date', params.startDate)
        .lte('record_date', params.endDate)
        .order('record_date', { ascending: false });

      if (params.classId) query = query.eq('class_id', params.classId);
      if (params.studentId) query = query.eq('student_id', params.studentId);

      const { data, error } = await query;
      if (error) throw error;
      return mergePendingPerformance(
        ((data as unknown) as StudentDailyPerformance[]) || [],
        pendingMatching
      );
    } catch (err) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return mergePendingPerformance([], pendingMatching);
      }
      throw err;
    }
  },

  async savePerformanceRecord(
    input: StudentDailyPerformanceInput
  ): Promise<{ queuedOffline: boolean; record: StudentDailyPerformance }> {
    ensureConfigured();

    const now = new Date().toISOString();
    const pendingRow = toPendingRecord(input, now);

    // Sync attendance record alongside daily performance (without creating loop)
    const syncAttendancePromise = attendanceService.saveAttendance(
      [
        {
          userId: input.user_id,
          classId: input.class_id,
          studentId: input.student_id,
          attendanceDate: input.record_date,
          status: input.attendance_status,
        },
      ],
      { syncPerformance: false }
    );

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await Promise.all([enqueuePerformance([pendingRow]), syncAttendancePromise]);
      return {
        queuedOffline: true,
        record: mergePendingPerformance([], [pendingRow])[0],
      };
    }

    try {
      const { data, error } = await supabase
        .from('student_daily_performance')
        .upsert(toSupabaseUpsertRow(pendingRow), {
          onConflict: 'user_id,student_id,record_date',
        })
        .select(PERFORMANCE_COLUMNS)
        .single();

      if (error) throw error;

      await clearSyncedPerformance([pendingRow.id]);
      await syncAttendancePromise;

      return {
        queuedOffline: false,
        record: (data as unknown) as StudentDailyPerformance,
      };
    } catch (err: any) {
      const isNetworkErr =
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        err instanceof TypeError ||
        /fetch|network|offline/i.test(err?.message || '');

      if (isNetworkErr) {
        await enqueuePerformance([pendingRow]);
        await syncAttendancePromise.catch(() => {});
        return {
          queuedOffline: true,
          record: mergePendingPerformance([], [pendingRow])[0],
        };
      }
      throw err;
    }
  },

  async deletePerformanceRecord(userId: string, id: string): Promise<void> {
    ensureConfigured();

    const { error } = await supabase
      .from('student_daily_performance')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  },

  async flushOfflineQueue(userId?: string): Promise<number> {
    if (
      !isSupabaseConfigured ||
      !supabase ||
      (typeof navigator !== 'undefined' && !navigator.onLine)
    ) {
      return 0;
    }

    const pending = await getAllPendingPerformance(userId);
    if (pending.length === 0) return 0;

    try {
      const { error } = await supabase
        .from('student_daily_performance')
        .upsert(pending.map(toSupabaseUpsertRow), {
          onConflict: 'user_id,student_id,record_date',
        });

      if (!error) {
        await clearSyncedPerformance(pending.map((p) => p.id));
        return pending.length;
      }
    } catch (e) {
      console.error('Failed to flush offline performance queue:', e);
    }
    return 0;
  },
};
