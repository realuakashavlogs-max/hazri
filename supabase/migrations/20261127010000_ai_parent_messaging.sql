-- Hazri Book Migration: AI Parent Messaging, Parent Consent, Admin Auto-Send Controls & Delivery Logs
-- Safe & idempotent: preserves all existing tables, rows, and RLS policies.

-- 1. Extend students table with parent messaging consent & optional channel identifiers
alter table if exists public.students
  add column if not exists messaging_consent boolean not null default false,
  add column if not exists consent_updated_at timestamptz,
  add column if not exists preferred_channel text not null default 'whatsapp',
  add column if not exists telegram_chat_id text,
  add column if not exists parent_email text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'students_preferred_channel_check'
      and conrelid = 'public.students'::regclass
  ) then
    alter table public.students
      add constraint students_preferred_channel_check
      check (preferred_channel in ('whatsapp', 'telegram', 'sms', 'email'));
  end if;
end $$;

-- 2. Global Admin-controlled messaging settings (single row id = 1)
create table if not exists public.messaging_settings (
  id integer primary key default 1 check (id = 1),
  auto_send_enabled boolean not null default false,
  require_approval_before_send boolean not null default true,
  ai_urdu_enabled boolean not null default true,
  whatsapp_api_enabled boolean not null default false,
  telegram_api_enabled boolean not null default false,
  sms_api_enabled boolean not null default false,
  email_api_enabled boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.messaging_settings (id)
values (1)
on conflict (id) do nothing;

drop trigger if exists trg_messaging_settings_updated_at on public.messaging_settings;
create trigger trg_messaging_settings_updated_at
  before update on public.messaging_settings
  for each row
  execute function public.set_updated_at();

alter table public.messaging_settings enable row level security;

drop policy if exists "messaging_settings_select_authenticated" on public.messaging_settings;
drop policy if exists "messaging_settings_admin_insert" on public.messaging_settings;
drop policy if exists "messaging_settings_admin_update" on public.messaging_settings;

create policy "messaging_settings_select_authenticated"
  on public.messaging_settings for select to authenticated
  using (public.is_not_blocked());

create policy "messaging_settings_admin_insert"
  on public.messaging_settings for insert to authenticated
  with check (public.is_admin());

create policy "messaging_settings_admin_update"
  on public.messaging_settings for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update on public.messaging_settings to authenticated;

-- 3. Parent messages table (AI Urdu drafts, approvals, manual WhatsApp opens & API delivery tracking)
create table if not exists public.parent_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  record_date date not null,
  channel text not null check (
    channel in ('whatsapp_manual', 'whatsapp_api', 'telegram', 'sms', 'email')
  ),
  recipient_masked text,
  message_urdu text not null,
  facts_snapshot jsonb not null default '{}'::jsonb,
  generated_by text not null default 'verified_composer' check (
    generated_by in ('ai_verified', 'verified_composer', 'teacher_edited')
  ),
  approval_status text not null default 'draft' check (
    approval_status in ('draft', 'approved', 'rejected')
  ),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  send_mode text not null default 'manual' check (send_mode in ('manual', 'automatic')),
  delivery_status text not null default 'draft' check (
    delivery_status in (
      'draft',
      'ready_for_manual_send',
      'opened_in_whatsapp',
      'queued',
      'sent',
      'delivered',
      'failed',
      'blocked'
    )
  ),
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists idx_parent_messages_user_created
  on public.parent_messages (user_id, created_at desc);

create index if not exists idx_parent_messages_student_date
  on public.parent_messages (student_id, record_date desc);

create index if not exists idx_parent_messages_status
  on public.parent_messages (user_id, delivery_status, record_date desc);

drop trigger if exists trg_parent_messages_updated_at on public.parent_messages;
create trigger trg_parent_messages_updated_at
  before update on public.parent_messages
  for each row
  execute function public.set_updated_at();

alter table public.parent_messages enable row level security;

drop policy if exists "parent_messages_select_own_or_admin" on public.parent_messages;
drop policy if exists "parent_messages_insert_own_or_admin" on public.parent_messages;
drop policy if exists "parent_messages_update_own_or_admin" on public.parent_messages;
drop policy if exists "parent_messages_delete_own_or_admin" on public.parent_messages;

create policy "parent_messages_select_own_or_admin"
  on public.parent_messages for select to authenticated
  using (
    (auth.uid() = user_id and public.is_not_blocked())
    or public.is_admin()
  );

create policy "parent_messages_insert_own_or_admin"
  on public.parent_messages for insert to authenticated
  with check (
    (
      (auth.uid() = user_id and public.is_not_blocked())
      or public.is_admin()
    )
    and exists (
      select 1 from public.students s
      where s.id = student_id
        and s.class_id = parent_messages.class_id
        and (s.user_id = parent_messages.user_id or public.is_admin())
    )
    and exists (
      select 1 from public.classes c
      where c.id = class_id
        and (c.user_id = parent_messages.user_id or public.is_admin())
    )
  );

create policy "parent_messages_update_own_or_admin"
  on public.parent_messages for update to authenticated
  using (
    (auth.uid() = user_id and public.is_not_blocked())
    or public.is_admin()
  )
  with check (
    (auth.uid() = user_id and public.is_not_blocked())
    or public.is_admin()
  );

create policy "parent_messages_delete_own_or_admin"
  on public.parent_messages for delete to authenticated
  using (
    (auth.uid() = user_id and public.is_not_blocked())
    or public.is_admin()
  );

grant select, insert, update, delete on public.parent_messages to authenticated;
