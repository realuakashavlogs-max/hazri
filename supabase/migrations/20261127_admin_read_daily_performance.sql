create policy "sdp_select_own_or_admin"
on public.student_daily_performance
for select
to authenticated
using (
  (auth.uid() = user_id and public.is_not_blocked())
  or public.is_admin()
);