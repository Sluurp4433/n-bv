-- Hjälpfunktioner (security definer, kringgår RLS-rekursion)
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$ select exists (select 1 from public.profiles p where p.id = uid and p.role = 'admin' and p.active); $$;

create or replace function public.is_active_member(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$ select exists (select 1 from public.profiles p where p.id = uid and p.active); $$;

create or replace function public.within_edit_window(created timestamptz)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$ select created > now() - make_interval(hours => (select edit_window_hours from public.app_settings where id = 1)); $$;

-- updated_at (+ updated_by om kolumnen finns)
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  if to_jsonb(new) ? 'updated_by' then new.updated_by := auth.uid(); end if;
  return new;
end; $$;

create or replace function public.set_created_by()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
begin
  if new.created_by is null then new.created_by := auth.uid(); end if;
  return new;
end; $$;

create trigger trg_vehicles_created_by before insert on public.vehicles for each row execute function public.set_created_by();
create trigger trg_observations_created_by before insert on public.observations for each row execute function public.set_created_by();
create trigger trg_logbook_created_by before insert on public.logbook_entries for each row execute function public.set_created_by();
create trigger trg_vehicles_updated before update on public.vehicles for each row execute function public.set_updated_at();
create trigger trg_observations_updated before update on public.observations for each row execute function public.set_updated_at();
create trigger trg_logbook_updated before update on public.logbook_entries for each row execute function public.set_updated_at();
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

-- Icke-admins kan inte ändra roll/aktiv-status/id på profiler
create or replace function public.protect_profile_privileges()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_admin(auth.uid()) then
    new.role := old.role; new.active := old.active; new.id := old.id;
  end if;
  return new;
end; $$;
create trigger trg_profiles_protect before update on public.profiles for each row execute function public.protect_profile_privileges();

-- Skapa profil automatiskt vid ny auth-användare
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, name, role, active)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', new.email),
          coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'medlem'), true)
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Auditlogg-trigger
create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_record_id text; v_details jsonb;
begin
  if (tg_op = 'DELETE') then
    v_record_id := old.id::text; v_details := jsonb_build_object('old', to_jsonb(old));
  elsif (tg_op = 'UPDATE') then
    v_record_id := new.id::text; v_details := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  else
    v_record_id := new.id::text; v_details := jsonb_build_object('new', to_jsonb(new));
  end if;
  insert into public.audit_logs (user_id, action, table_name, record_id, details)
  values (auth.uid(), tg_op, tg_table_name, v_record_id, v_details);
  if (tg_op = 'DELETE') then return old; end if;
  return new;
end; $$;
create trigger trg_audit_observations after insert or update or delete on public.observations for each row execute function public.audit_trigger();
create trigger trg_audit_logbook after insert or update or delete on public.logbook_entries for each row execute function public.audit_trigger();
create trigger trg_audit_vehicles after insert or update or delete on public.vehicles for each row execute function public.audit_trigger();
create trigger trg_audit_profiles after insert or update or delete on public.profiles for each row execute function public.audit_trigger();

-- Trigger-funktioner ska aldrig gå att anropa via API:t
revoke all on function public.audit_trigger() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.protect_profile_privileges() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.set_created_by() from public, anon, authenticated;
revoke all on function public.normalize_regnr(text) from anon;
revoke all on function public.is_admin(uuid) from anon;
revoke all on function public.is_active_member(uuid) from anon;
revoke all on function public.within_edit_window(timestamptz) from anon;
