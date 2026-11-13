import assert from 'node:assert/strict';

const TEACHER_UID = '11111111-1111-4111-8111-111111111111';
const db = {
  classes: [] as any[],
  students: [] as any[],
  attendance_records: [] as any[],
};
const capturedRequests: { method: string; url: string; body: any }[] = [];

(globalThis as any).fetch = async (input: any, init: any = {}) => {
  const urlStr = typeof input === 'string' ? input : input.url;
  const method = (init.method || (typeof input !== 'string' ? input.method : 'GET')).toUpperCase();
  const rawBody = init.body ? String(init.body) : null;
  let body: any = null;
  try { body = rawBody ? JSON.parse(rawBody) : null; } catch {}

  capturedRequests.push({ method, url: urlStr, body });
  const u = new URL(urlStr);

  if (u.pathname === '/auth/v1/token') {
    if (body?.email === 'qari@school.com' && body?.password === 'correct-pass') {
      return new Response(JSON.stringify({
        access_token: 'mock-jwt-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        user: {
          id: TEACHER_UID,
          email: 'qari@school.com',
          user_metadata: { full_name: 'Qari Tariq' },
          aud: 'authenticated',
          role: 'authenticated',
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify({
      error: 'invalid_grant',
      error_description: 'Invalid login credentials',
    }), { status: 400, headers: { 'content-type': 'application/json' } });
  }

  if (u.pathname === '/auth/v1/logout') {
    return new Response(null, { status: 204 });
  }

  if (u.pathname === '/auth/v1/recover') {
    return new Response(JSON.stringify({}), { status: 200, headers: { 'content-type': 'application/json' } });
  }

  if (u.pathname === '/auth/v1/user' && method === 'PUT') {
    return new Response(JSON.stringify({
      id: TEACHER_UID,
      email: 'qari@school.com',
      user_metadata: { full_name: 'Qari Tariq' },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }

  if (u.pathname.includes('/rest/v1/profiles')) {
    return new Response(JSON.stringify({ message: 'profiles table must not be queried' }), { status: 500 });
  }

  if (u.pathname === '/rest/v1/classes') {
    if (method === 'POST') {
      assert.equal('user_id' in body, false, 'classes.insert MUST NOT send user_id');
      assert.equal('section' in body, false, 'classes.insert MUST NOT send section');
      assert.equal('is_archived' in body, false, 'classes.insert MUST NOT send is_archived');
      const row = {
        id: `cls-${db.classes.length + 1}`,
        user_id: TEACHER_UID,
        name: body.name,
        created_at: '2026-11-13T08:00:00Z',
      };
      db.classes.push(row);
      return new Response(JSON.stringify(row), { status: 201, headers: { 'content-type': 'application/json' } });
    }
    if (method === 'GET') {
      return new Response(JSON.stringify(db.classes), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  }

  if (u.pathname === '/rest/v1/students') {
    if (method === 'POST') {
      const items = Array.isArray(body) ? body : [body];
      const created = items.map((item) => {
        assert.equal('user_id' in item, false, 'students.insert MUST NOT send user_id');
        assert.equal('parent_name' in item, false, 'students.insert MUST NOT send parent_name');
        assert.equal('notes' in item, false, 'students.insert MUST NOT send notes');
        assert.equal('is_archived' in item, false, 'students.insert MUST NOT send is_archived');
        const row = {
          id: `stu-${db.students.length + 1}`,
          user_id: TEACHER_UID,
          class_id: item.class_id,
          name: item.name,
          roll_no: item.roll_no ?? null,
          parent_phone: item.parent_phone ?? null,
          created_at: '2026-11-13T08:00:00Z',
        };
        db.students.push(row);
        return row;
      });
      return new Response(JSON.stringify(Array.isArray(body) ? created : created[0]), { status: 201, headers: { 'content-type': 'application/json' } });
    }
    if (method === 'GET') {
      const classParam = u.searchParams.get('class_id');
      const cid = classParam?.startsWith('eq.') ? classParam.slice(3) : null;
      const rows = cid ? db.students.filter((s) => s.class_id === cid) : db.students;
      return new Response(JSON.stringify(rows), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  }

  if (u.pathname === '/rest/v1/attendance_records') {
    if (method === 'POST') {
      assert.equal(u.searchParams.get('on_conflict'), 'student_id,attendance_date', 'Must upsert on student_id,attendance_date');
      const items = Array.isArray(body) ? body : [body];
      for (const item of items) {
        assert.equal('user_id' in item, false, 'attendance_records.upsert MUST NOT send user_id');
        assert.equal('status_id' in item, false, 'attendance_records.upsert MUST NOT send status_id');
        assert.ok(['present', 'absent', 'late', 'leave'].includes(item.status), 'Valid status');
        assert.ok(item.updated_at, 'Must set updated_at');
        const idx = db.attendance_records.findIndex(
          (r) => r.student_id === item.student_id && r.attendance_date === item.attendance_date
        );
        const stored = {
          id: idx >= 0 ? db.attendance_records[idx].id : `att-${db.attendance_records.length + 1}`,
          user_id: TEACHER_UID,
          class_id: item.class_id,
          student_id: item.student_id,
          attendance_date: item.attendance_date,
          status: item.status,
          note: item.note ?? null,
          created_at: idx >= 0 ? db.attendance_records[idx].created_at : item.updated_at,
          updated_at: item.updated_at,
        };
        if (idx >= 0) db.attendance_records[idx] = stored;
        else db.attendance_records.push(stored);
      }
      return new Response(JSON.stringify(items), { status: 201, headers: { 'content-type': 'application/json' } });
    }
    if (method === 'GET') {
      let rows = [...db.attendance_records];
      const cls = u.searchParams.get('class_id');
      if (cls?.startsWith('eq.')) rows = rows.filter((r) => r.class_id === cls.slice(3));
      const dt = u.searchParams.get('attendance_date');
      if (dt?.startsWith('eq.')) rows = rows.filter((r) => r.attendance_date === dt.slice(3));
      return new Response(JSON.stringify(rows), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  }

  return new Response(JSON.stringify({}), { status: 200, headers: { 'content-type': 'application/json' } });
};

import { supabase, isSupabaseConfigured } from '../src/lib/supabaseClient';
import { authService } from '../src/services/authService';
import { classesService } from '../src/services/classesService';
import { studentsService } from '../src/services/studentsService';
import { attendanceService } from '../src/services/attendanceService';
import { getPendingAttendanceCount } from '../src/lib/offlineQueue';

async function main() {
  assert.equal(isSupabaseConfigured, true, 'With env defines, isSupabaseConfigured must be true');

  console.log('Flow 1: Wrong password rejects');
  await assert.rejects(
    () => authService.signIn('qari@school.com', 'wrong-pass'),
    /Invalid login credentials/
  );

  console.log('Flow 2: Valid teacher login (no profiles query)');
  const user = await authService.signIn('qari@school.com', 'correct-pass');
  assert.equal(user.id, TEACHER_UID);
  assert.equal(user.email, 'qari@school.com');
  assert.equal(user.full_name, 'Qari Tariq');
  assert.equal(
    capturedRequests.some((r) => r.url.includes('/rest/v1/profiles')),
    false,
    'Must never query profiles'
  );

  console.log('Flow 3: Forgot password redirectTo + Update password');
  await authService.resetPassword('qari@school.com');
  const recoverReq = capturedRequests.find((r) => r.url.includes('/auth/v1/recover'));
  assert.ok(recoverReq?.url.includes('redirect_to=https%3A%2F%2Fhazri.suffah.workers.dev%2Freset-password') || recoverReq?.body?.redirect_to === 'https://hazri.suffah.workers.dev/reset-password');
  await authService.updatePassword('new-secure-pass');

  console.log('Flow 4: Create & fetch class + student (no user_id sent)');
  const cls = await classesService.createClass({ name: 'Hifz Batch A' });
  assert.equal(cls.name, 'Hifz Batch A');
  const fetchedClasses = await classesService.getClasses(TEACHER_UID);
  assert.equal(fetchedClasses.length, 1);

  const stu = await studentsService.createStudent({
    classId: cls.id,
    name: 'Muhammad Ali',
    rollNo: '101',
    parentPhone: '923001234567',
  });
  assert.equal(stu.name, 'Muhammad Ali');
  const fetchedStudents = await studentsService.getStudents(TEACHER_UID, cls.id);
  assert.equal(fetchedStudents.length, 1);

  console.log('Flow 5: Attendance save online + reload persistence');
  const saveRes = await attendanceService.saveAttendance([
    {
      classId: cls.id,
      studentId: stu.id,
      attendanceDate: '2026-11-13',
      status: 'absent',
      note: 'Family trip',
    },
  ]);
  assert.equal(saveRes.queuedOffline, false);
  assert.equal(saveRes.count, 1);

  const reloadedRecords = await attendanceService.getAttendanceForDate({
    userId: TEACHER_UID,
    classId: cls.id,
    date: '2026-11-13',
  });
  assert.equal(reloadedRecords.length, 1);
  assert.equal(reloadedRecords[0].status, 'absent');
  assert.equal(reloadedRecords[0].note, 'Family trip');

  console.log('Flow 6: Offline save -> IndexedDB queue -> Sync back online');
  (globalThis as any).__mockOnline = false;
  const offlineRes = await attendanceService.saveAttendance([
    {
      classId: cls.id,
      studentId: stu.id,
      attendanceDate: '2026-11-13',
      status: 'late',
      note: 'Traffic',
    },
  ]);
  assert.equal(offlineRes.queuedOffline, true);
  assert.equal(await getPendingAttendanceCount(), 1);

  const offlineView = await attendanceService.getAttendanceForDate({
    userId: TEACHER_UID,
    classId: cls.id,
    date: '2026-11-13',
  });
  assert.equal(offlineView[0].status, 'late');

  (globalThis as any).__mockOnline = true;
  const syncedCount = await attendanceService.flushOfflineQueue();
  assert.equal(syncedCount, 1);
  assert.equal(await getPendingAttendanceCount(), 0);

  const afterSyncView = await attendanceService.getAttendanceForDate({
    userId: TEACHER_UID,
    classId: cls.id,
    date: '2026-11-13',
  });
  assert.equal(afterSyncView[0].status, 'late');
  assert.equal(afterSyncView[0].note, 'Traffic');

  console.log('Flow 7: Logout clears session');
  await authService.signOut();
  const { data: sessionAfterLogout } = await supabase!.auth.getSession();
  assert.equal(sessionAfterLogout.session, null);

  console.log('ALL SUPABASE END-TO-END FLOW TESTS PASSED!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
