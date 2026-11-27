create or replace function public.admin_dashboard_overview_v2()
returns table (
  id uuid, email text, full_name text, role text, is_blocked boolean,
  created_at timestamptz, last_sign_in_at timestamptz, is_active boolean,
  classes_count bigint, students_count bigint, attendance_count bigint, performance_count bigint
)
language plpgsql stable security definer set search_path = pg_catalog
as $function$
begin
  if not public.is_admin() then raise exception 'Access denied: admin only'; end if;
  return query
  select p.id, p.email, p.full_name, p.role, p.is_blocked, p.created_at,
    u.last_sign_in_at,
    coalesce(u.last_sign_in_at >= now() - interval '30 days', false),
    (select count(*) from public.classes c where c.user_id = p.id),
    (select count(*) from public.students s where s.user_id = p.id),
    (select count(*) from public.attendance_records a where a.user_id = p.id),
    (select count(*) from public.student_daily_performance d where d.user_id = p.id)
  from public.profiles p left join auth.users u on u.id = p.id
  where p.role <> 'admin'
  order by p.created_at desc;
end;
$function$;
revoke all on function public.admin_dashboard_overview_v2() from public, anon;
grant execute on function public.admin_dashboard_overview_v2() to authenticated;