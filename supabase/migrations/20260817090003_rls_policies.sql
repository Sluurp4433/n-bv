alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.observations enable row level security;
alter table public.observation_vehicles enable row level security;
alter table public.logbook_entries enable row level security;
alter table public.audit_logs enable row level security;
alter table public.app_settings enable row level security;

-- PROFILES
create policy profiles_select on public.profiles for select to authenticated
  using (public.is_active_member(auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin(auth.uid()))
  with check (id = auth.uid() or public.is_admin(auth.uid()));
create policy profiles_delete on public.profiles for delete to authenticated
  using (public.is_admin(auth.uid()));

-- VEHICLES / OBSERVATIONS / LOGBOOK: läs för aktiva medlemmar; skapa själv;
-- ändra egen inom fönster eller admin; radera endast admin
create policy vehicles_select on public.vehicles for select to authenticated
  using (public.is_active_member(auth.uid()));
create policy vehicles_insert on public.vehicles for insert to authenticated
  with check (public.is_active_member(auth.uid()) and created_by = auth.uid());
create policy vehicles_update on public.vehicles for update to authenticated
  using (public.is_admin(auth.uid()) or (created_by = auth.uid() and public.within_edit_window(created_at)))
  with check (public.is_admin(auth.uid()) or created_by = auth.uid());
create policy vehicles_delete on public.vehicles for delete to authenticated
  using (public.is_admin(auth.uid()));

create policy observations_select on public.observations for select to authenticated
  using (public.is_active_member(auth.uid()));
create policy observations_insert on public.observations for insert to authenticated
  with check (public.is_active_member(auth.uid()) and created_by = auth.uid());
create policy observations_update on public.observations for update to authenticated
  using (public.is_admin(auth.uid()) or (created_by = auth.uid() and public.within_edit_window(created_at)))
  with check (public.is_admin(auth.uid()) or created_by = auth.uid());
create policy observations_delete on public.observations for delete to authenticated
  using (public.is_admin(auth.uid()));

create policy logbook_select on public.logbook_entries for select to authenticated
  using (public.is_active_member(auth.uid()));
create policy logbook_insert on public.logbook_entries for insert to authenticated
  with check (public.is_active_member(auth.uid()) and created_by = auth.uid());
create policy logbook_update on public.logbook_entries for update to authenticated
  using (public.is_admin(auth.uid()) or (created_by = auth.uid() and public.within_edit_window(created_at)))
  with check (public.is_admin(auth.uid()) or created_by = auth.uid());
create policy logbook_delete on public.logbook_entries for delete to authenticated
  using (public.is_admin(auth.uid()));

-- OBSERVATION_VEHICLES: koppla/koppla bort fordon till egen observation (eller admin)
create policy obsveh_select on public.observation_vehicles for select to authenticated
  using (public.is_active_member(auth.uid()));
create policy obsveh_insert on public.observation_vehicles for insert to authenticated
  with check (public.is_admin(auth.uid()) or exists (
    select 1 from public.observations o where o.id = observation_id and o.created_by = auth.uid()));
create policy obsveh_delete on public.observation_vehicles for delete to authenticated
  using (public.is_admin(auth.uid()) or exists (
    select 1 from public.observations o where o.id = observation_id and o.created_by = auth.uid()));

-- AUDIT_LOGS: endast admin läser (skrivs bara via trigger)
create policy audit_select on public.audit_logs for select to authenticated
  using (public.is_admin(auth.uid()));

-- APP_SETTINGS: alla medlemmar läser, endast admin ändrar
create policy settings_select on public.app_settings for select to authenticated
  using (public.is_active_member(auth.uid()));
create policy settings_update on public.app_settings for update to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
