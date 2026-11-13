import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Student, AttendanceRecord } from '../types/database';
import { isPresentStatus } from './statuses';

export function exportAttendanceCsv(params: {
  className: string;
  dateRange: { start: string; end: string };
  students: Student[];
  records: AttendanceRecord[];
  appName: string;
}): void {
  const { className, dateRange, students, records, appName } = params;

  const headers = [
    'Roll No',
    'Student Name',
    'Phone',
    'Total Sessions',
    'Present',
    'Absent',
    'Late',
    'Leave',
    'Attendance %',
  ];

  const rows = students.map((s) => {
    const studentRecs = records.filter((r) => r.student_id === s.id);
    const total = studentRecs.length;
    const present = studentRecs.filter((r) => isPresentStatus(r.status)).length;
    const absent = studentRecs.filter((r) => r.status === 'absent').length;
    const late = studentRecs.filter((r) => r.status === 'late').length;
    const leave = studentRecs.filter((r) => r.status === 'leave').length;
    const pct = total > 0 ? ((present / total) * 100).toFixed(1) + '%' : 'N/A';

    return [
      `"${s.roll_no || ''}"`,
      `"${s.name}"`,
      `"${s.parent_phone || ''}"`,
      total,
      present,
      absent,
      late,
      leave,
      `"${pct}"`,
    ].join(',');
  });

  const metadata = [
    `"${appName} - Attendance Report"`,
    `"Class: ${className}"`,
    `"Date Range: ${dateRange.start} to ${dateRange.end}"`,
    `"Generated: ${new Date().toISOString()}"`,
    '',
  ];

  const csvContent = [...metadata, headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance_${className.toLowerCase().replace(/\s+/g, '_')}_${dateRange.start}_${dateRange.end}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAttendancePdf(params: {
  className: string;
  dateRange: { start: string; end: string };
  students: Student[];
  records: AttendanceRecord[];
  appName: string;
}): void {
  const { className, dateRange, students, records, appName } = params;

  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235);
  doc.text(appName, 14, 20);

  doc.setFontSize(12);
  doc.setTextColor(50, 50, 50);
  doc.text(`Class: ${className}`, 14, 28);
  doc.text(`Period: ${dateRange.start} to ${dateRange.end}`, 14, 34);

  const tableData = students.map((s) => {
    const studentRecs = records.filter((r) => r.student_id === s.id);
    const total = studentRecs.length;
    const present = studentRecs.filter((r) => isPresentStatus(r.status)).length;
    const absent = studentRecs.filter((r) => r.status === 'absent').length;
    const late = studentRecs.filter((r) => r.status === 'late').length;
    const leave = studentRecs.filter((r) => r.status === 'leave').length;
    const pct = total > 0 ? `${((present / total) * 100).toFixed(0)}%` : '-';

    return [
      s.roll_no || '-',
      s.name,
      s.parent_phone || '-',
      total.toString(),
      present.toString(),
      absent.toString(),
      late.toString(),
      leave.toString(),
      pct,
    ];
  });

  const runAutoTable =
    typeof autoTable === 'function'
      ? autoTable
      : ((autoTable as unknown as { default?: typeof autoTable })?.default ?? autoTable);

  runAutoTable(doc, {
    startY: 40,
    head: [['Roll', 'Name', 'Phone', 'Total', 'Present', 'Absent', 'Late', 'Leave', 'Rate']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`HazriReport_${className.replace(/\s+/g, '_')}_${dateRange.start}.pdf`);
}
