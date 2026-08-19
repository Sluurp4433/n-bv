-- Skydd: audit_logs är append-only. Blockerar TRUNCATE alltid, och DELETE om inte
-- den sanktionerade gallringsrutinen uttryckligen tillåtit det (via GUC-flagga).
create or replace function public.guard_audit_logs()
returns trigger language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'TRUNCATE' then
    raise exception 'audit_logs är skyddad: TRUNCATE är inte tillåtet';
  end if;
  if coalesce(current_setting('app.allow_audit_purge', true), 'off') <> 'on' then
    raise exception 'audit_logs är skyddad: radering kräver den godkända gallringsrutinen (admin)';
  end if;
  return null;
end;
$$;
revoke all on function public.guard_audit_logs() from public, anon, authenticated;

drop trigger if exists trg_audit_no_truncate on public.audit_logs;
drop trigger if exists trg_audit_no_delete on public.audit_logs;
create trigger trg_audit_no_truncate before truncate on public.audit_logs
  for each statement execute function public.guard_audit_logs();
create trigger trg_audit_no_delete before delete on public.audit_logs
  for each statement execute function public.guard_audit_logs();

-- Sanktionerad gallring (endast admin): sätter flaggan och raderar gammal historik.
create or replace function public.purge_audit_logs(older_than_days integer default 365)
returns integer language plpgsql security definer
set search_path = public, pg_temp
as $$
declare n integer;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Endast administratörer kan gallra ändringsloggen';
  end if;
  perform set_config('app.allow_audit_purge', 'on', true);
  with del as (
    delete from public.audit_logs where created_at < now() - make_interval(days => greatest(older_than_days, 1)) returning 1
  )
  select count(*) into n from del;
  return n;
end;
$$;
revoke all on function public.purge_audit_logs(integer) from anon;
grant execute on function public.purge_audit_logs(integer) to authenticated;
