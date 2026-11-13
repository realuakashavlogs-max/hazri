create table if not exists public.parent_whatsapp_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  attendance_date date not null,
  status_key text not null check (status_key in ('absent', 'leave')),
  phone_number text not null,
  language text not null check (language in ('en', 'ur')),
  delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'sent', 'failed')),
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (user_id, student_id, attendance_date, status_key)
);

create index if not exists idx_parent_whatsapp_notifications_user_created
  on public.parent_whatsapp_notifications (user_id, created_at desc);

alter table public.parent_whatsapp_notifications enable row level security;

drop policy if exists "Users can read own parent notifications" on public.parent_whatsapp_notifications;
create policy "Users can read own parent notifications"
  on public.parent_whatsapp_notifications for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own parent notifications" on public.parent_whatsapp_notifications;
create policy "Users can create own parent notifications"
  on public.parent_whatsapp_notifications for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own parent notifications" on public.parent_whatsapp_notifications;
create policy "Users can update own parent notifications"
  on public.parent_whatsapp_notifications for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.parent_whatsapp_notifications to authenticated;
