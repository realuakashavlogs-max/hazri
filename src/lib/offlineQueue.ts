import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { PendingAttendanceWrite } from '../types/database';

interface HazriDB extends DBSchema {
  pending_attendance: {
    key: string;
    value: PendingAttendanceWrite;
  };
}

let dbPromise: Promise<IDBPDatabase<HazriDB>> | null = null;

function getDB(): Promise<IDBPDatabase<HazriDB>> {
  if (!dbPromise) {
    dbPromise = openDB<HazriDB>('hazri_offline_db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pending_attendance')) {
          db.createObjectStore('pending_attendance', { keyPath: 'id' });
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

export async function getPendingAttendanceCount(): Promise<number> {
  try {
    const db = await getDB();
    return await db.count('pending_attendance');
  } catch {
    return 0;
  }
}

export async function getAllPendingAttendance(): Promise<PendingAttendanceWrite[]> {
  try {
    const db = await getDB();
    return await db.getAll('pending_attendance');
  } catch {
    return [];
  }
}

export async function clearSyncedAttendance(ids: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('pending_attendance', 'readwrite');
  for (const id of ids) {
    await tx.store.delete(id);
  }
  await tx.done;
}
