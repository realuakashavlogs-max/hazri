import type { StudentDailyPerformance } from '../types/database';

export interface PerformanceSummaryStats {
  totalDays: number;
  daysPresent: number;
  daysAbsent: number;
  daysLate: number;
  daysLeave: number;
  sabaqListenedCount: number;
  sabqiListenedCount: number;
  manzilListenedCount: number;
  totalSabaqLines: number;
  totalSabqiLines: number;
  totalManzilLines: number;
  totalLines: number;
}

function safeLines(listened: boolean, lines: number | null | undefined): number {
  if (!listened) return 0;
  if (typeof lines !== 'number' || !Number.isFinite(lines)) return 0;
  return Math.max(0, Math.trunc(lines));
}

export function computePerformanceSummary(
  records: StudentDailyPerformance[]
): PerformanceSummaryStats {
  if (records.length === 0) {
    return {
      totalDays: 0,
      daysPresent: 0,
      daysAbsent: 0,
      daysLate: 0,
      daysLeave: 0,
      sabaqListenedCount: 0,
      sabqiListenedCount: 0,
      manzilListenedCount: 0,
      totalSabaqLines: 0,
      totalSabqiLines: 0,
      totalManzilLines: 0,
      totalLines: 0,
    };
  }

  let daysPresent = 0;
  let daysAbsent = 0;
  let daysLate = 0;
  let daysLeave = 0;
  let sabaqListenedCount = 0;
  let sabqiListenedCount = 0;
  let manzilListenedCount = 0;
  let totalSabaqLines = 0;
  let totalSabqiLines = 0;
  let totalManzilLines = 0;

  for (const r of records) {
    if (r.attendance_status === 'present' || r.attendance_status === 'late') {
      daysPresent += 1;
    }
    if (r.attendance_status === 'absent') daysAbsent += 1;
    if (r.attendance_status === 'late') daysLate += 1;
    if (r.attendance_status === 'leave') daysLeave += 1;

    if (r.sabaq_listened) sabaqListenedCount += 1;
    if (r.sabqi_listened) sabqiListenedCount += 1;
    if (r.manzil_listened) manzilListenedCount += 1;

    totalSabaqLines += safeLines(r.sabaq_listened, r.sabaq_lines);
    totalSabqiLines += safeLines(r.sabqi_listened, r.sabqi_lines);
    totalManzilLines += safeLines(r.manzil_listened, r.manzil_lines);
  }

  return {
    totalDays: records.length,
    daysPresent,
    daysAbsent,
    daysLate,
    daysLeave,
    sabaqListenedCount,
    sabqiListenedCount,
    manzilListenedCount,
    totalSabaqLines,
    totalSabqiLines,
    totalManzilLines,
    totalLines: totalSabaqLines + totalSabqiLines + totalManzilLines,
  };
}
