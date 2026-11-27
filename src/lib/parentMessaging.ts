import type {
  AttendanceRecord,
  AttendanceStatusKey,
  MessagingChannel,
  Student,
  StudentDailyPerformance,
  VerifiedDailyFacts,
} from '../types/database';

const URDU_ATTENDANCE_LABELS: Record<AttendanceStatusKey, string> = {
  present: 'حاضر',
  absent: 'غیر حاضر',
  late: 'تاخیر سے حاضر',
  leave: 'رخصت',
};

export function extractVerifiedDailyFacts(params: {
  student: Student;
  className: string;
  date: string;
  attendance?: AttendanceRecord | null;
  performance?: StudentDailyPerformance | null;
}): VerifiedDailyFacts {
  const { student, className, date, attendance, performance } = params;
  const attendanceStatus: AttendanceStatusKey | null =
    performance?.attendance_status ?? attendance?.status ?? null;

  const hasPerformanceRecord = Boolean(performance);
  const hasAttendanceRecord = Boolean(attendance || performance);

  return {
    studentId: student.id,
    studentName: student.name,
    classId: student.class_id,
    className: className || '',
    recordDate: date,
    hasAttendanceRecord,
    attendanceStatus,
    hasPerformanceRecord,
    sabaqListened: performance ? Boolean(performance.sabaq_listened) : null,
    sabaqLines: performance
      ? performance.sabaq_listened
        ? Math.max(0, Math.trunc(performance.sabaq_lines ?? 0))
        : 0
      : null,
    sabqiListened: performance ? Boolean(performance.sabqi_listened) : null,
    sabqiLines: performance
      ? performance.sabqi_listened
        ? Math.max(0, Math.trunc(performance.sabqi_lines ?? 0))
        : 0
      : null,
    manzilListened: performance ? Boolean(performance.manzil_listened) : null,
    manzilLines: performance
      ? performance.manzil_listened
        ? Math.max(0, Math.trunc(performance.manzil_lines ?? 0))
        : 0
      : null,
  };
}

export function hasVerifiedDataForMessage(facts: VerifiedDailyFacts): boolean {
  return facts.hasAttendanceRecord || facts.hasPerformanceRecord;
}

export function composeVerifiedUrduMessage(
  facts: VerifiedDailyFacts,
  appName = 'Hazri Book'
): string {
  if (!hasVerifiedDataForMessage(facts) || !facts.attendanceStatus) {
    throw new Error(
      'Cannot generate a parent message without recorded attendance or daily performance data.'
    );
  }

  const cleanAppName = appName.trim() || 'Hazri Book';
  const statusUrdu = URDU_ATTENDANCE_LABELS[facts.attendanceStatus];
  const classSegment = facts.className ? ` (${facts.className})` : '';

  const lines: string[] = [
    'السلام علیکم، محترم والدین!',
    `${cleanAppName} کی جانب سے ${facts.studentName}${classSegment} کی مورخہ ${facts.recordDate} کی تصدیق شدہ رپورٹ:`,
    `• حاضری: ${statusUrdu}`,
  ];

  if (facts.hasPerformanceRecord) {
    const sabaqText = facts.sabaqListened
      ? `سنایا گیا (${facts.sabaqLines ?? 0} سطور)`
      : 'نہیں سنایا (0 سطور)';
    const sabqiText = facts.sabqiListened
      ? `سنی گئی (${facts.sabqiLines ?? 0} سطور)`
      : 'نہیں سنی (0 سطور)';
    const manzilText = facts.manzilListened
      ? `سنی گئی (${facts.manzilLines ?? 0} سطور)`
      : 'نہیں سنی (0 سطور)';

    lines.push(`• سبق: ${sabaqText}`);
    lines.push(`• سبقی: ${sabqiText}`);
    lines.push(`• منزل: ${manzilText}`);
  } else if (facts.attendanceStatus === 'absent') {
    lines.push('براہ کرم غیر حاضری کی اطلاع سے آگاہ رہیں۔');
  }

  lines.push(`جزاکم اللہ خیراً، ${cleanAppName}`);
  return lines.join('\n');
}

export function verifyUrduMessageFacts(
  message: string,
  facts: VerifiedDailyFacts
): { isAccurate: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const trimmed = message.trim();

  if (!trimmed) {
    return { isAccurate: false, warnings: ['Message text cannot be empty.'] };
  }

  if (!hasVerifiedDataForMessage(facts) || !facts.attendanceStatus) {
    return {
      isAccurate: false,
      warnings: ['No recorded attendance or Sabaq data exists for this date.'],
    };
  }

  if (!trimmed.includes(facts.studentName)) {
    warnings.push(`Student name "${facts.studentName}" is missing from the message.`);
  }

  const expectedStatusUrdu = URDU_ATTENDANCE_LABELS[facts.attendanceStatus];
  if (!trimmed.includes(expectedStatusUrdu)) {
    warnings.push(`Attendance status "${expectedStatusUrdu}" is missing or altered.`);
  }

  if (facts.hasPerformanceRecord) {
    const sabaqExpected = String(facts.sabaqLines ?? 0);
    const sabqiExpected = String(facts.sabqiLines ?? 0);
    const manzilExpected = String(facts.manzilLines ?? 0);

    if (
      (facts.sabaqListened && !trimmed.includes(sabaqExpected)) ||
      (facts.sabqiListened && !trimmed.includes(sabqiExpected)) ||
      (facts.manzilListened && !trimmed.includes(manzilExpected))
    ) {
      warnings.push(
        'One or more recorded line counts (Sabaq/Sabqi/Manzil) do not match the saved daily record.'
      );
    }
  } else if (/\b\d+\s*سطور/.test(trimmed)) {
    warnings.push(
      'Recitation lines appear in the message even though no daily Sabaq record exists for this date.'
    );
  }

  return {
    isAccurate: warnings.length === 0,
    warnings,
  };
}

export function maskRecipient(
  channel: MessagingChannel,
  rawRecipient: string | null | undefined
): string | null {
  if (!rawRecipient) return null;
  const trimmed = rawRecipient.trim();
  if (!trimmed) return null;

  if (channel === 'email') {
    const parts = trimmed.split('@');
    if (parts.length !== 2) return '***';
    const local = parts[0];
    const prefix = local.slice(0, Math.min(2, local.length));
    return `${prefix}***@${parts[1]}`;
  }

  if (channel === 'telegram') {
    const tail = trimmed.slice(-3);
    return `TG ***${tail}`;
  }

  const digits = trimmed.replace(/[^0-9]/g, '');
  if (digits.length <= 5) return '***';
  return `${digits.slice(0, 4)}****${digits.slice(-3)}`;
}

export function formatWhatsAppPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (/^03\d{9}$/.test(digits)) {
    return `92${digits.slice(1)}`;
  }
  return digits;
}

export function formatE164Phone(phone: string | null | undefined): string | null {
  const normalized = formatWhatsAppPhone(phone);
  if (!normalized || normalized.length < 7 || normalized.length > 15) return null;
  return `+${normalized}`;
}
