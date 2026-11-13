import type { AttendanceStatusKey } from '../types/database';

export interface FixedAttendanceStatus {
  key: AttendanceStatusKey;
  label_en: string;
  label_ur: string;
  color: string;
  countsAsPresent: boolean;
  notifyOnAbsent: boolean;
}

export const FIXED_STATUSES: readonly FixedAttendanceStatus[] = [
  {
    key: 'present',
    label_en: 'Present',
    label_ur: 'حاضر',
    color: '#16A34A',
    countsAsPresent: true,
    notifyOnAbsent: false,
  },
  {
    key: 'absent',
    label_en: 'Absent',
    label_ur: 'غائب',
    color: '#DC2626',
    countsAsPresent: false,
    notifyOnAbsent: true,
  },
  {
    key: 'late',
    label_en: 'Late',
    label_ur: 'دیر سے',
    color: '#F59E0B',
    countsAsPresent: true,
    notifyOnAbsent: false,
  },
  {
    key: 'leave',
    label_en: 'Leave',
    label_ur: 'رخصت',
    color: '#7C3AED',
    countsAsPresent: false,
    notifyOnAbsent: false,
  },
] as const;

export const FIXED_STATUS_MAP: Record<AttendanceStatusKey, FixedAttendanceStatus> = {
  present: FIXED_STATUSES[0],
  absent: FIXED_STATUSES[1],
  late: FIXED_STATUSES[2],
  leave: FIXED_STATUSES[3],
};

export function isPresentStatus(status: AttendanceStatusKey): boolean {
  return FIXED_STATUS_MAP[status]?.countsAsPresent ?? false;
}
