-- Hazri Book Migration: Google Auth Teacher Isolation & Madrasa / Hifz Daily Performance Tracking
-- Safe & idempotent: preserves all existing tables, rows, and attendance records.

-- 0. Ensure pgcrypto / gen_random_uuid availability
create extension if not exists pgcrypto;

-- 1. Ensure updated_at trigger helper exists
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2. Verify/enforce strict per-teacher RLS isolation on existing tables
--    (Preserves all existing user records and rows; never merges accounts)

alter table if exists public.classes enable row level security;
alter table if exists public.students enable row level security;
alter table if exists public.attendance_records enable row level security;

-- Classes policies
drop policy if exists "classes_select_own" on public.classes;
drop policy if exists "classes_own_insert" on public.classes;
drop policy if exists "classes_own_update" on public.classes;
drop policy if exists "classes_own_delete" on public.classes;
drop policy if exists "classes_insert_own" on public.classes;
drop policy if exists "classes_update_own" on public.classes;
drop policy if exists "classes_delete_own" on public.classes;

create policy "classes_select_own"
  on public.classes for select
  using (auth.uid() = user_id and is_not_blocked());

create policy "classes_insert_own"
  on public.classes for insert
  with check (auth.uid() = user_id and is_not_blocked());

create policy "classes_update_own"
  on public.classes for update
  using (auth.uid() = user_id and is_not_blocked())
  with check (auth.uid() = user_id and is_not_blocked());

create policy "classes_delete_own"
  on public.classes for delete
  using (auth.uid() = user_id and is_not_blocked());

-- Students policies (also verify referenced class belongs to the same teacher)
drop policy if exists "students_select_own" on public.students;
drop policy if exists "students_own_insert" on public.students;
drop policy if exists "students_own_update" on public.students;
drop policy if exists "students_own_delete" on public.students;
drop policy if exists "students_insert_own" on public.students;
drop policy if exists "students_update_own" on public.students;
drop policy if exists "students_delete_own" on public.students;

create policy "students_select_own"
  on public.students for select
  using (auth.uid() = user_id and is_not_blocked());

create policy "students_insert_own"
  on public.students for insert
  with check (
    auth.uid() = user_id
    and is_not_blocked()
    and exists (
      select 1 from public.classes c
      where c.id = class_id and c.user_id = auth.uid()
    )
  );

create policy "students_update_own"
  on public.students for update
  using (auth.uid() = user_id and is_not_blocked())
  with check (
    auth.uid() = user_id
    and is_not_blocked()
    and exists (
      select 1 from public.classes c
      where c.id = class_id and c.user_id = auth.uid()
    )
  );

create policy "students_delete_own"
  on public.students for delete
  using (auth.uid() = user_id and is_not_blocked());

-- Attendance records policies
drop policy if exists "attendance_select_own" on public.attendance_records;
drop policy if exists "attendance_records_own_insert" on public.attendance_records;
drop policy if exists "attendance_records_own_update" on public.attendance_records;
drop policy if exists "attendance_records_own_delete" on public.attendance_records;
drop policy if exists "attendance_insert_own" on public.attendance_records;
drop policy if exists "attendance_update_own" on public.attendance_records;
drop policy if exists "attendance_delete_own" on public.attendance_records;

create policy "attendance_select_own"
  on public.attendance_records for select
  using (auth.uid() = user_id and is_not_blocked());

create policy "attendance_insert_own"
  on public.attendance_records for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.students s
      where s.id = student_id and s.user_id = auth.uid() and s.class_id = attendance_records.class_id
    )
    and exists (
      select 1 from public.classes c
      where c.id = class_id and c.user_id = auth.uid()
    )
  );

create policy "attendance_update_own"
  on public.attendance_records for update
  using (auth.uid() = user_id and is_not_blocked())
  with check (
    auth.uid() = user_id
    and is_not_blocked()
    and exists (
      select 1 from public.students s
      where s.id = student_id and s.user_id = auth.uid() and s.class_id = attendance_records.class_id
    )
    and exists (
      select 1 from public.classes c
      where c.id = class_id and c.user_id = auth.uid()
    )
  );

create policy "attendance_delete_own"
  on public.attendance_records for delete
  using (auth.uid() = user_id and is_not_blocked());

-- 3. New Table: student_daily_performance
create table if not exists public.student_daily_performance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  record_date date not null,

  -- Attendance integration
  attendance_status text not null check (attendance_status in ('present', 'absent', 'late', 'leave')),

  -- Sabaq (New Lesson)
  sabaq_listened boolean not null default false,
  sabaq_completed boolean not null default false,
  sabaq_surah text,
  sabaq_start_ayah integer check (sabaq_start_ayah is null or sabaq_start_ayah >= 1),
  sabaq_end_ayah integer check (sabaq_end_ayah is null or sabaq_end_ayah >= 1),
  sabaq_start_page integer check (sabaq_start_page is null or sabaq_start_page >= 1),
  sabaq_end_page integer check (sabaq_end_page is null or sabaq_end_page >= 1),
  sabaq_para integer check (sabaq_para is null or (sabaq_para >= 1 and sabaq_para <= 30)),
  sabaq_grade text,
  sabaq_remarks text,

  -- Sabqi (Recent Revision)
  sabqi_listened boolean not null default false,
  sabqi_details text,
  sabqi_start_page integer check (sabqi_start_page is null or sabqi_start_page >= 1),
  sabqi_end_page integer check (sabqi_end_page is null or sabqi_end_page >= 1),
  sabqi_completed boolean not null default false,
  sabqi_remarks text,

  -- Manzil (Old Memorization Revision)
  manzil_listened boolean not null default false,
  manzil_details text,
  manzil_start_page integer check (manzil_start_page is null or manzil_start_page >= 1),
  manzil_end_page integer check (manzil_end_page is null or manzil_end_page >= 1),
  manzil_completed boolean not null default false,
  manzil_remarks text,

  -- Mistakes Record (0 is a valid value)
  total_mistakes integer not null default 0 check (total_mistakes >= 0),
  major_mistakes integer not null default 0 check (major_mistakes >= 0),
  minor_mistakes integer not null default 0 check (minor_mistakes >= 0),
  atak_count integer not null default 0 check (atak_count >= 0),
  repeated_mistakes integer not null default 0 check (repeated_mistakes >= 0),

  -- Daily Result & Remarks
  daily_result text not null check (
    daily_result in ('excellent', 'very_good', 'good', 'needs_improvement', 'not_satisfactory')
  ),
  incomplete_reason text,
  teacher_remarks text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Range integrity checks
  constraint chk_sabaq_ayah_range check (
    sabaq_start_ayah is null or sabaq_end_ayah is null or sabaq_end_ayah >= sabaq_start_ayah
  ),
  constraint chk_sabaq_page_range check (
    sabaq_start_page is null or sabaq_end_page is null or sabaq_end_page >= sabaq_start_page
  ),
  constraint chk_sabqi_page_range check (
    sabqi_start_page is null or sabqi_end_page is null or sabqi_end_page >= sabqi_start_page
  ),
  constraint chk_manzil_page_range check (
    manzil_start_page is null or manzil_end_page is null or manzil_end_page >= manzil_start_page
  ),

  -- Prevent duplicate daily performance records per student and date within teacher's account
  constraint student_daily_performance_user_student_date_key unique (user_id, student_id, record_date)
);

-- Indexes for fast per-teacher, per-class, per-student, and date-range queries
create index if not exists idx_sdp_user_date
  on public.student_daily_performance (user_id, record_date desc);

create index if not exists idx_sdp_user_class_date
  on public.student_daily_performance (user_id, class_id, record_date desc);

create index if not exists idx_sdp_user_student_date
  on public.student_daily_performance (user_id, student_id, record_date desc);

-- Updated_at trigger
drop trigger if exists trg_sdp_set_updated_at on public.student_daily_performance;
create trigger trg_sdp_set_updated_at
  before update on public.student_daily_performance
  for each row
  execute function public.set_updated_at();

-- Enable RLS
alter table public.student_daily_performance enable row level security;

drop policy if exists "sdp_select_own" on public.student_daily_performance;
drop policy if exists "sdp_insert_own" on public.student_daily_performance;
drop policy if exists "sdp_update_own" on public.student_daily_performance;
drop policy if exists "sdp_delete_own" on public.student_daily_performance;

create policy "sdp_select_own"
  on public.student_daily_performance for select
  using (auth.uid() = user_id and is_not_blocked());

create policy "sdp_insert_own"
  on public.student_daily_performance for insert
  with check (
    auth.uid() = user_id
    and is_not_blocked()
    and exists (
      select 1 from public.students s
      where s.id = student_id and s.user_id = auth.uid() and s.class_id = student_daily_performance.class_id
    )
    and exists (
      select 1 from public.classes c
      where c.id = class_id and c.user_id = auth.uid()
    )
  );

create policy "sdp_update_own"
  on public.student_daily_performance for update
  using (auth.uid() = user_id and is_not_blocked())
  with check (
    auth.uid() = user_id
    and is_not_blocked()
    and exists (
      select 1 from public.students s
      where s.id = student_id and s.user_id = auth.uid() and s.class_id = student_daily_performance.class_id
    )
    and exists (
      select 1 from public.classes c
      where c.id = class_id and c.user_id = auth.uid()
    )
  );

create policy "sdp_delete_own"
  on public.student_daily_performance for delete
  using (auth.uid() = user_id and is_not_blocked());
