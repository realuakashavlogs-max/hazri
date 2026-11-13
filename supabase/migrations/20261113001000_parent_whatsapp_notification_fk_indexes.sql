create index if not exists idx_parent_whatsapp_notifications_class_id
  on public.parent_whatsapp_notifications (class_id);
create index if not exists idx_parent_whatsapp_notifications_student_id
  on public.parent_whatsapp_notifications (student_id);