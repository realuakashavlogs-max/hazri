import type { DailyResultKey, StudentDailyPerformance } from '../types/database';

export interface DailyResultOption {
  key: DailyResultKey;
  label_en: string;
  label_ur: string;
  color: string;
  score: number; // 1..5 scale for average & trend charts
}

export const DAILY_RESULTS: readonly DailyResultOption[] = [
  {
    key: 'excellent',
    label_en: 'Excellent',
    label_ur: 'ممتاز',
    color: '#16A34A',
    score: 5,
  },
  {
    key: 'very_good',
    label_en: 'Very Good',
    label_ur: 'بہت اچھا',
    color: '#0D9488',
    score: 4,
  },
  {
    key: 'good',
    label_en: 'Good',
    label_ur: 'اچھا',
    color: '#2563EB',
    score: 3,
  },
  {
    key: 'needs_improvement',
    label_en: 'Needs Improvement',
    label_ur: 'محنت کی ضرورت',
    color: '#F59E0B',
    score: 2,
  },
  {
    key: 'not_satisfactory',
    label_en: 'Not Satisfactory',
    label_ur: 'غیر تسلی بخش',
    color: '#DC2626',
    score: 1,
  },
] as const;

export const DAILY_RESULT_MAP: Record<DailyResultKey, DailyResultOption> = {
  excellent: DAILY_RESULTS[0],
  very_good: DAILY_RESULTS[1],
  good: DAILY_RESULTS[2],
  needs_improvement: DAILY_RESULTS[3],
  not_satisfactory: DAILY_RESULTS[4],
};

export const SABAQ_GRADES = ['A+', 'A', 'B+', 'B', 'C', 'Needs Practice'] as const;

export interface PerformanceSummaryStats {
  totalDays: number;
  daysPresent: number;
  daysAbsent: number;
  daysLate: number;
  daysLeave: number;
  sabaqListenedCount: number;
  sabaqCompletedCount: number;
  sabqiListenedCount: number;
  sabqiCompletedCount: number;
  manzilListenedCount: number;
  manzilCompletedCount: number;
  totalMistakes: number;
  majorMistakes: number;
  minorMistakes: number;
  totalAtak: number;
  repeatedMistakes: number;
  averageScore: number; // 0..5
  averageResultLabel: string;
  improvementDelta: number | null; // second half avg score - first half avg score
  improvementMistakesDelta: number | null; // second half avg mistakes - first half avg mistakes (negative = improved)
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
      sabaqCompletedCount: 0,
      sabqiListenedCount: 0,
      sabqiCompletedCount: 0,
      manzilListenedCount: 0,
      manzilCompletedCount: 0,
      totalMistakes: 0,
      majorMistakes: 0,
      minorMistakes: 0,
      totalAtak: 0,
      repeatedMistakes: 0,
      averageScore: 0,
      averageResultLabel: '-',
      improvementDelta: null,
      improvementMistakesDelta: null,
    };
  }

  let daysPresent = 0;
  let daysAbsent = 0;
  let daysLate = 0;
  let daysLeave = 0;
  let sabaqListenedCount = 0;
  let sabaqCompletedCount = 0;
  let sabqiListenedCount = 0;
  let sabqiCompletedCount = 0;
  let manzilListenedCount = 0;
  let manzilCompletedCount = 0;
  let totalMistakes = 0;
  let majorMistakes = 0;
  let minorMistakes = 0;
  let totalAtak = 0;
  let repeatedMistakes = 0;
  let scoreSum = 0;

  for (const r of records) {
    if (r.attendance_status === 'present' || r.attendance_status === 'late') {
      daysPresent += 1;
    }
    if (r.attendance_status === 'absent') daysAbsent += 1;
    if (r.attendance_status === 'late') daysLate += 1;
    if (r.attendance_status === 'leave') daysLeave += 1;

    if (r.sabaq_listened) sabaqListenedCount += 1;
    if (r.sabaq_completed) sabaqCompletedCount += 1;
    if (r.sabqi_listened) sabqiListenedCount += 1;
    if (r.sabqi_completed) sabqiCompletedCount += 1;
    if (r.manzil_listened) manzilListenedCount += 1;
    if (r.manzil_completed) manzilCompletedCount += 1;

    totalMistakes += r.total_mistakes || 0;
    majorMistakes += r.major_mistakes || 0;
    minorMistakes += r.minor_mistakes || 0;
    totalAtak += r.atak_count || 0;
    repeatedMistakes += r.repeated_mistakes || 0;

    scoreSum += DAILY_RESULT_MAP[r.daily_result]?.score ?? 3;
  }

  const averageScore = Number((scoreSum / records.length).toFixed(2));
  const roundedScore = Math.round(averageScore);
  const averageResultOption =
    DAILY_RESULTS.find((d) => d.score === roundedScore) || DAILY_RESULTS[2];

  // Improvement over time: compare chronological first half vs second half (requires >= 2 records)
  let improvementDelta: number | null = null;
  let improvementMistakesDelta: number | null = null;
  if (records.length >= 2) {
    const sorted = [...records].sort((a, b) => a.record_date.localeCompare(b.record_date));
    const mid = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, mid);
    const secondHalf = sorted.slice(mid);

    const avgScore = (arr: StudentDailyPerformance[]) =>
      arr.reduce((sum, item) => sum + (DAILY_RESULT_MAP[item.daily_result]?.score ?? 3), 0) /
      arr.length;

    const avgMistakes = (arr: StudentDailyPerformance[]) =>
      arr.reduce((sum, item) => sum + (item.total_mistakes || 0), 0) / arr.length;

    improvementDelta = Number((avgScore(secondHalf) - avgScore(firstHalf)).toFixed(2));
    improvementMistakesDelta = Number(
      (avgMistakes(secondHalf) - avgMistakes(firstHalf)).toFixed(2)
    );
  }

  return {
    totalDays: records.length,
    daysPresent,
    daysAbsent,
    daysLate,
    daysLeave,
    sabaqListenedCount,
    sabaqCompletedCount,
    sabqiListenedCount,
    sabqiCompletedCount,
    manzilListenedCount,
    manzilCompletedCount,
    totalMistakes,
    majorMistakes,
    minorMistakes,
    totalAtak,
    repeatedMistakes,
    averageScore,
    averageResultLabel: averageResultOption.label_en,
    improvementDelta,
    improvementMistakesDelta,
  };
}
