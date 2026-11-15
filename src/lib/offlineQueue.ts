import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { PendingAttendanceWrite, PendingPerformanceWrite } from '../types/database';

interface HazriDB extends DBSchema {
  pending_attendance: {
    key: string;
    value: PendingAttendanceWrite;
  };
  pending_performance: {
    key: string;
    value: PendingPerformanceWrite;
  };
}

let dbPromise: Promise<IDBPDatabase<HazriDB>> | null = null;

function getDB(): Promise<IDBPDatabase<HazriDB>> {
  if (!dbPromise) {
    dbPromise = openDB<HazriDB>('hazri_offline_db', 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pending_attendance')) {
          db.createObjectStore('pending_attendance', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pending_performance')) {
          db.createObjectStore('pending_performance', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueueAttendance(records: PendingAttendanceWrite[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('pending_attendance', 'readwrite');
  for (const record of records) {
    await tx.store.put(record);
  }
  await tx.done;
}

export async function getPendingAttendanceCount(userId?: string): Promise<number> {
  try {
    const all = await getAllPendingAttendance(userId);
    return all.length;
  } catch {
    return 0;
  }
}

export async function getAllPendingAttendance(userId?: string): Promise<PendingAttendanceWrite[]> {
  try {
    if (!userId) return [];
    const db = await getDB();
    const all = await db.getAll('pending_attendance');
    return all.filter((item) => item.user_id === userId);
  } catch {
    return [];
  }
}

export async function clearSyncedAttendance(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDB();
  const tx = db.transaction('pending_attendance', 'readwrite');
  for (const id of ids) {
    await tx.store.delete(id);
  }
  await tx.done;
}

export async function enqueuePerformance(records: PendingPerformanceWrite[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('pending_performance', 'readwrite');
  for (const record of records) {
    await tx.store.put(record);
  }
  await tx.done;
}

export async function getAllPendingPerformance(userId?: string): Promise<PendingPerformanceWrite[]> {
  try {
    if (!userId) return [];
    const db = await getDB();
    const all = await db.getAll('pending_performance');
    return all.filter((item) => item.user_id === userId);
  } catch {
    return [];
  }
}

export async function clearSyncedPerformance(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDB();
  const tx = db.transaction('pending_performance', 'readwrite');
  for (const id of ids) {
    await tx.store.delete(id);
  }
  await tx.done;
}

export async function getTotalPendingSyncCount(userId?: string): Promise<number> {
  if (!userId) return 0;
  const [att, perf] = await Promise.all([
    getPendingAttendanceCount(userId),
    getAllPendingPerformance(userId),
  ]);
  return att + perf.length;
}
