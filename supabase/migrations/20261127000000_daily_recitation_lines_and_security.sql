-- Hazri Book Migration: Recitation Line Counts & RLS Hardening
-- Safe & idempotent: preserves all existing tables, rows, and legacy columns.

-- 1. Add non-negative whole-number line count columns to student_daily_performance
alter table if exists public.student_daily_performance
  add column if not exists sabaq_lines integer not null default 0,
  add column if not exists sabqi_lines integer not null default 0,
  add column if not exists manzil_lines integer not null default 0;

-- Ensure non-negative check constraints exist (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'student_daily_performance_sabaq_lines_check'
      and conrelid = 'public.student_daily_performance'::regclass
  ) then
    alter table public.student_daily_performance
      add constraint student_daily_performance_sabaq_lines_check check (sabaq_lines >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'student_daily_performance_sabqi_lines_check'
      and conrelid = 'public.student_daily_performance'::regclass
  ) then
    alter table public.student_daily_performance
      add constraint student_daily_performance_sabqi_lines_check check (sabqi_lines >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'student_daily_performance_manzil_lines_check'
      and conrelid = 'public.student_daily_performance'::regclass
  ) then
    alter table public.student_daily_performance
      add constraint student_daily_performance_manzil_lines_check check (manzil_lines >= 0);
  end if;
end $$;

-- Provide safe default for legacy daily_result column when simplified UI omits it
alter table if exists public.student_daily_performance
  alter column daily_result set default 'good';

-- Ensure unique constraint on (user_id, student_id, record_date)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'student_daily_performance_user_student_date_key'
      and conrelid = 'public.student_daily_performance'::regclass
  ) then
    alter table public.student_daily_performance
      add constraint student_daily_performance_user_student_date_key
      unique (user_id, student_id, record_date);
  end if;
end $$;

-- 2. Harden attendance_insert_own to also enforce is_not_blocked() like select/update/delete
drop policy if exists "attendance_insert_own" on public.attendance_records;
create policy "attendance_insert_own"
  on public.attendance_records for insert
  with check (
    auth.uid() = user_id
    and is_not_blocked()
    and exists (
      select 1 from public.students s
      where s.id = student_id
        and s.user_id = auth.uid()
        and s.class_id = attendance_records.class_id
    )
    and exists (
      select 1 from public.classes c
      where c.id = class_id
        and c.user_id = auth.uid()
    )
  );
