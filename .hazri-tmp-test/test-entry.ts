import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SupabaseNotConfigured } from '../src/components/SupabaseNotConfigured';
import { FIXED_STATUSES, isPresentStatus } from '../src/lib/statuses';
import { buildWhatsAppLink } from '../src/lib/whatsapp';
import { settingsService } from '../src/services/settingsService';
import { exportAttendanceCsv, exportAttendancePdf } from '../src/lib/exporters';
import {
  enqueueAttendance,
  getAllPendingAttendance,
  getPendingAttendanceCount,
  clearSyncedAttendance,
} from '../src/lib/offlineQueue';
import * as supabaseClientModule from '../src/lib/supabaseClient';
import { authService } from '../src/services/authService';
import { classesService } from '../src/services/classesService';
import { studentsService } from '../src/services/studentsService';
import { attendanceService } from '../src/services/attendanceService';

async function main() {
  console.log('Test 1: Env missing screen');
  assert.equal(supabaseClientModule.isSupabaseConfigured, false, 'Without env vars, isSupabaseConfigured must be false');
  const notConfiguredHtml = renderToStaticMarkup(React.createElement(SupabaseNotConfigured));
  assert.match(notConfiguredHtml, /Supabase not configured/);
  assert.match(notConfiguredHtml, /VITE_SUPABASE_URL/);
  assert.match(notConfiguredHtml, /VITE_SUPABASE_ANON_KEY/);
  console.log('  PASS: SupabaseNotConfigured renders cleanly when env vars are missing');

  console.log('Test 2: Fixed statuses + EN/UR labels + colors');
  assert.deepEqual(
    FIXED_STATUSES.map((s) => [s.key, s.color, s.label_en, s.label_ur]),
    [
      ['present', '#16A34A', 'Present', 'حاضر'],
      ['absent', '#DC2626', 'Absent', 'غائب'],
      ['late', '#F59E0B', 'Late', 'دیر سے'],
      ['leave', '#7C3AED', 'Leave', 'رخصت'],
    ]
  );
  assert.equal(isPresentStatus('present'), true);
  assert.equal(isPresentStatus('late'), true);
  assert.equal(isPresentStatus('absent'), false);
  assert.equal(isPresentStatus('leave'), false);
  console.log('  PASS: Fixed statuses verified');

  console.log('Test 3: Local device settings persistence');
  const savedSettings = settingsService.saveDeviceSettings({
    primary_color: '#0D9488',
    dark_mode: true,
    language: 'ur',
    app_display_name: 'Madrasa Suffah',
  });
  assert.equal(savedSettings.primary_color, '#0D9488');
  assert.equal(settingsService.getDeviceSettings().language, 'ur');
  assert.equal(settingsService.getDeviceSettings().app_display_name, 'Madrasa Suffah');
  console.log('  PASS: Settings saved & persisted in localStorage');

  console.log('Test 4: IndexedDB offline queue enqueue, count, read, clear');
  (globalThis as any).__mockOnline = false;
  await enqueueAttendance([
    {
      id: 'stu-1_2026-11-13',
      class_id: 'cls-1',
      student_id: 'stu-1',
      attendance_date: '2026-11-13',
      status: 'absent',
      note: 'Fever',
      updated_at: '2026-11-13T08:00:00.000Z',
    },
  ]);
  assert.equal(await getPendingAttendanceCount(), 1);
  const pending = await getAllPendingAttendance();
  assert.equal(pending[0].status, 'absent');
  await clearSyncedAttendance(['stu-1_2026-11-13']);
  assert.equal(await getPendingAttendanceCount(), 0);
  console.log('  PASS: Offline queue operations verified');

  console.log('Test 5: Reports & Exports (CSV + PDF) + WhatsApp link');
  const sampleStudents = [
    { id: 's1', user_id: 'u1', class_id: 'c1', name: 'Muhammad Ali', roll_no: '101', parent_phone: '923001234567', created_at: '2026-11-01' },
    { id: 's2', user_id: 'u1', class_id: 'c1', name: 'Zaid Khan', roll_no: '102', parent_phone: '923007654321', created_at: '2026-11-01' },
  ];
  const sampleRecords = [
    { id: 'r1', user_id: 'u1', class_id: 'c1', student_id: 's1', attendance_date: '2026-11-12', status: 'present' as const, note: null, created_at: '', updated_at: '' },
    { id: 'r2', user_id: 'u1', class_id: 'c1', student_id: 's1', attendance_date: '2026-11-13', status: 'late' as const, note: null, created_at: '', updated_at: '' },
    { id: 'r3', user_id: 'u1', class_id: 'c1', student_id: 's2', attendance_date: '2026-11-12', status: 'absent' as const, note: 'Sick', created_at: '', updated_at: '' },
    { id: 'r4', user_id: 'u1', class_id: 'c1', student_id: 's2', attendance_date: '2026-11-13', status: 'leave' as const, note: null, created_at: '', updated_at: '' },
  ];
  exportAttendanceCsv({
    className: 'Hifz Batch A',
    dateRange: { start: '2026-11-01', end: '2026-11-13' },
    students: sampleStudents,
    records: sampleRecords,
    appName: 'Hazri Book',
  });
  const blobs = (globalThis as any).__downloadedBlobs;
  assert.equal(blobs.length, 1);
  assert.match(blobs[0].content, /"101","Muhammad Ali","923001234567",2,2,0,1,0,"100.0%"/);
  assert.match(blobs[0].content, /"102","Zaid Khan","923007654321",2,0,1,0,1,"0.0%"/);
  assert.equal(blobs[0].filename, 'attendance_hifz_batch_a_2026-11-01_2026-11-13.csv');

  exportAttendancePdf({
    className: 'Hifz Batch A',
    dateRange: { start: '2026-11-01', end: '2026-11-13' },
    students: sampleStudents,
    records: sampleRecords,
    appName: 'Hazri Book',
  });

  const waUrl = buildWhatsAppLink({
    phone: '+92 300 7654321',
    template: 'Assalamu Alaikum, {student_name} ({class_name}) is {status} on {date}. - {app_name}',
    studentName: 'Zaid Khan',
    className: 'Hifz Batch A',
    status: 'Absent • غائب',
    date: '2026-11-13',
    appName: 'Hazri Book',
  });
  assert.ok(waUrl.startsWith('https://wa.me/923007654321?text='));
  console.log('  PASS: CSV, PDF & WhatsApp link verified');

  console.log('Test 6: Verify Supabase client unconfigured guards throw cleanly');
  await assert.rejects(() => authService.signIn('qari@school.com', 'pass1234'), /Supabase is not configured/);
  await assert.rejects(() => classesService.createClass({ name: 'Hifz' }), /Supabase is not configured/);
  await assert.rejects(() => studentsService.createStudent({ classId: 'c1', name: 'Ali' }), /Supabase is not configured/);
  await assert.rejects(() => attendanceService.saveAttendance([]), /Supabase is not configured/);
  console.log('  PASS: Service unconfigured guards verified');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
