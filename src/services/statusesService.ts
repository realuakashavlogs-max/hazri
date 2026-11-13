import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { AttendanceStatus, DefaultStatus } from '../types/database';

const LOCAL_STATUSES_KEY = 'hazri_local_statuses_v2';
const LOCAL_DEFAULT_STATUSES_KEY = 'hazri_local_default_statuses_v2';

export const SEED_DEFAULT_STATUSES: DefaultStatus[] = [
  {
    id: 'def_present',
    key: 'present',
    label_en: 'Present',
    label_ur: 'حاضر',
    color: '#16A34A',
    counts_as_present: true,
    notify_parents: false,
    sort_order: 1,
  },
  {
    id: 'def_absent',
    key: 'absent',
    label_en: 'Absent',
    label_ur: 'غائب',
    color: '#DC2626',
    counts_as_present: false,
    notify_parents: true,
    sort_order: 2,
  },
  {
    id: 'def_late',
    key: 'late',
    label_en: 'Late',
    label_ur: 'دیر سے',
    color: '#F59E0B',
    counts_as_present: true,
    notify_parents: false,
    sort_order: 3,
  },
  {
    id: 'def_leave',
    key: 'leave',
    label_en: 'Leave',
    label_ur: 'رخصت',
    color: '#7C3AED',
    counts_as_present: false,
    notify_parents: false,
    sort_order: 4,
  },
];

function getLocalStatuses(userId: string): AttendanceStatus[] {
  const data = localStorage.getItem(`${LOCAL_STATUSES_KEY}_${userId}`);
  if (!data) {
    const initial: AttendanceStatus[] = SEED_DEFAULT_STATUSES.map((d) => ({
      id: `st_${d.key}`,
      user_id: userId || 'default',
      key: d.key,
      label_en: d.label_en,
      label_ur: d.label_ur,
      color: d.color,
      counts_as_present: d.counts_as_present,
      notify_parents: d.notify_parents,
      sort_order: d.sort_order,
    }));
    localStorage.setItem(`${LOCAL_STATUSES_KEY}_${userId}`, JSON.stringify(initial));
    return initial;
  }
  const parsed: AttendanceStatus[] = JSON.parse(data);
  return parsed.sort((a, b) => a.sort_order - b.sort_order);
}

function saveLocalStatuses(userId: string, statuses: AttendanceStatus[]) {
  localStorage.setItem(`${LOCAL_STATUSES_KEY}_${userId}`, JSON.stringify(statuses));
}

function getLocalDefaultStatuses(): DefaultStatus[] {
  const data = localStorage.getItem(LOCAL_DEFAULT_STATUSES_KEY);
  if (!data) {
    localStorage.setItem(LOCAL_DEFAULT_STATUSES_KEY, JSON.stringify(SEED_DEFAULT_STATUSES));
    return SEED_DEFAULT_STATUSES;
  }
  const parsed: DefaultStatus[] = JSON.parse(data);
  return parsed.sort((a, b) => a.sort_order - b.sort_order);
}

function saveLocalDefaultStatuses(statuses: DefaultStatus[]) {
  localStorage.setItem(LOCAL_DEFAULT_STATUSES_KEY, JSON.stringify(statuses));
}

export const statusesService = {
  async getStatuses(userId: string): Promise<AttendanceStatus[]> {
    if (!isSupabaseConfigured) {
      return getLocalStatuses(userId);
    }

    const { data, error } = await supabase
      .from('attendance_statuses')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createStatus(params: {
    userId: string;
    labelEn: string;
    labelUr: string;
    color: string;
    countsAsPresent: boolean;
    notifyParents?: boolean;
    sortOrder?: number;
  }): Promise<AttendanceStatus> {
    const baseKey =
      params.labelEn.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') ||
      `status_${Date.now()}`;

    if (!isSupabaseConfigured) {
      const list = getLocalStatuses(params.userId);
      const uniqueKey = list.some((s) => s.key === baseKey) ? `${baseKey}_${Date.now()}` : baseKey;
      const newStatus: AttendanceStatus = {
        id: 'st_' + Date.now(),
        user_id: params.userId,
        key: uniqueKey,
        label_en: params.labelEn,
        label_ur: params.labelUr || params.labelEn,
        color: params.color,
        counts_as_present: params.countsAsPresent,
        notify_parents: params.notifyParents ?? false,
        sort_order: params.sortOrder ?? list.length + 1,
      };
      list.push(newStatus);
      saveLocalStatuses(params.userId, list);
      return newStatus;
    }

    const existing = await this.getStatuses(params.userId);
    const uniqueKey = existing.some((s) => s.key === baseKey)
      ? `${baseKey}_${Date.now().toString().slice(-4)}`
      : baseKey;

    const { data, error } = await supabase
      .from('attendance_statuses')
      .insert({
        user_id: params.userId,
        key: uniqueKey,
        label_en: params.labelEn,
        label_ur: params.labelUr || params.labelEn,
        color: params.color,
        counts_as_present: params.countsAsPresent,
        notify_parents: params.notifyParents ?? false,
        sort_order: params.sortOrder ?? existing.length + 1,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateStatus(
    id: string,
    updates: Partial<Omit<AttendanceStatus, 'id' | 'user_id'>>,
    userId?: string
  ): Promise<AttendanceStatus> {
    if (!isSupabaseConfigured) {
      const uid = userId || 'teacher_demo_01';
      const list = getLocalStatuses(uid);
      const idx = list.findIndex((s) => s.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        saveLocalStatuses(uid, list);
        return list[idx];
      }
      throw new Error('Status not found');
    }

    const { data, error } = await supabase
      .from('attendance_statuses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async reorderStatuses(orderedStatuses: AttendanceStatus[], userId?: string): Promise<void> {
    if (!isSupabaseConfigured) {
      const uid = userId || orderedStatuses[0]?.user_id || 'teacher_demo_01';
      const updated = orderedStatuses.map((s, idx) => ({
        ...s,
        sort_order: idx + 1,
      }));
      saveLocalStatuses(uid, updated);
      return;
    }

    const updates = orderedStatuses.map((s, idx) =>
      supabase
        .from('attendance_statuses')
        .update({ sort_order: idx + 1 })
        .eq('id', s.id)
    );
    const results = await Promise.all(updates);
    const firstError = results.find((r) => r.error)?.error;
    if (firstError) throw firstError;
  },

  async deleteStatus(id: string, userId?: string): Promise<void> {
    if (!isSupabaseConfigured) {
      const uid = userId || 'teacher_demo_01';
      const list = getLocalStatuses(uid).filter((s) => s.id !== id);
      saveLocalStatuses(uid, list);
      return;
    }

    // Check usage first (attendance_records.status_id is ON DELETE RESTRICT)
    const { count, error: countError } = await supabase
      .from('attendance_records')
      .select('id', { count: 'exact', head: true })
      .eq('status_id', id);

    if (countError) throw countError;
    if (count && count > 0) {
      throw new Error(
        `This status is used by ${count} attendance records. Please reassign before deleting.`
      );
    }

    const { error } = await supabase.from('attendance_statuses').delete().eq('id', id);
    if (error) throw error;
  },

  // Global template statuses (`default_statuses` table — admin editable)
  async getDefaultStatuses(): Promise<DefaultStatus[]> {
    if (!isSupabaseConfigured) {
      return getLocalDefaultStatuses();
    }

    const { data, error } = await supabase
      .from('default_statuses')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return SEED_DEFAULT_STATUSES;
    }
    return data;
  },

  async saveDefaultStatuses(statuses: DefaultStatus[]): Promise<DefaultStatus[]> {
    const normalized = statuses.map((s, idx) => ({
      ...s,
      key:
        s.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') ||
        `status_${idx + 1}`,
      label_en: s.label_en.trim() || 'Status',
      label_ur: s.label_ur.trim() || s.label_en.trim() || 'حیثیت',
      sort_order: idx + 1,
    }));

    if (!isSupabaseConfigured) {
      saveLocalDefaultStatuses(normalized);
      return normalized;
    }

    // Fetch existing rows so deleted items are removed
    const { data: existingRows, error: fetchErr } = await supabase
      .from('default_statuses')
      .select('id');
    if (fetchErr) throw fetchErr;

    const keptIds = new Set(
      normalized.filter((s) => !s.id.startsWith('def_new_')).map((s) => s.id)
    );
    const toDelete = (existingRows || [])
      .map((r) => r.id)
      .filter((id) => !keptIds.has(id));

    if (toDelete.length > 0) {
      const { error: delErr } = await supabase
        .from('default_statuses')
        .delete()
        .in('id', toDelete);
      if (delErr) throw delErr;
    }

    const toInsert = normalized
      .filter((s) => s.id.startsWith('def_new_') || s.id.startsWith('def_'))
      .map(({ id: _ignore, ...rest }) => rest);

    const toUpdate = normalized.filter(
      (s) => !s.id.startsWith('def_new_') && !s.id.startsWith('def_')
    );

    for (const item of toUpdate) {
      const { id, ...patch } = item;
      const { error: updErr } = await supabase
        .from('default_statuses')
        .update(patch)
        .eq('id', id);
      if (updErr) throw updErr;
    }

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase
        .from('default_statuses')
        .upsert(toInsert, { onConflict: 'key' });
      if (insErr) throw insErr;
    }

    return this.getDefaultStatuses();
  },
};
