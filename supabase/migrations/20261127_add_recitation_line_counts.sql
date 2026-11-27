-- Add simple daily recitation line counts for Sabaq, Sabqi and Manzil.
-- Existing performance rows are preserved; old rows default to zero lines.
alter table public.student_daily_performance
  add column if not exists sabaq_lines integer not null default 0 check (sabaq_lines >= 0),
  add column if not exists sabqi_lines integer not null default 0 check (sabqi_lines >= 0),
  add column if not exists manzil_lines integer not null default 0 check (manzil_lines >= 0);
