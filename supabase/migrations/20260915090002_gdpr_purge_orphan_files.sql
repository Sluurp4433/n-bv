-- gdpr_purge tog tidigare bara bort databasrader vid gallring – de
-- tillhörande bildfilerna i storage-bucketen blev kvar som föräldralösa
-- filer, eftersom ren SQL inte kan anropa Storage-API:et. Funktionen samlar
-- nu ihop filsökvägarna som blir föräldralösa (både vid förhandsgranskning
-- och verklig körning) och returnerar dem, så att adminpanelen kan städa
-- bort dem ur lagringen i ett efterföljande steg.
create or replace function public.gdpr_purge(dry_run boolean default true)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  cutoff timestamptz;
  n_obs int; n_logs int; n_veh int; n_per int;
  v_obs_paths text[];
  v_log_paths text[];
  v_per_paths text[];
begin
  if not public.is_admin(auth.uid()) then raise exception 'Endast administratörer kan gallra data'; end if;
  select now() - make_interval(months => retention_months) into cutoff from public.app_settings where id = 1;
  select count(*) into n_obs  from public.observations   where observed_at < cutoff;
  select count(*) into n_logs from public.logbook_entries where entry_at   < cutoff;

  -- Beräknas INNAN raderna tas bort (annars är kopplingarna borta).
  select coalesce(array_agg(oi.file_path), '{}') into v_obs_paths
    from public.observation_images oi
    join public.observations o on o.id = oi.observation_id
    where o.observed_at < cutoff;

  select coalesce(array_agg(li.file_path), '{}') into v_log_paths
    from public.logbook_images li
    join public.logbook_entries l on l.id = li.logbook_entry_id
    where l.entry_at < cutoff;

  -- Personer vars alla observationskopplingar pekar på observationer som
  -- gallras bort (eller som redan saknar kopplingar) blir föräldralösa och
  -- tas bort nedan – deras foton samlas in här innan dess.
  select coalesce(array_agg(pi.file_path), '{}') into v_per_paths
    from public.person_images pi
    where pi.person_id in (
      select p.id from public.persons p
      where not exists (
        select 1 from public.observation_persons op
        where op.person_id = p.id
          and op.observation_id not in (select id from public.observations where observed_at < cutoff)
      )
    );

  if not dry_run then
    delete from public.observations   where observed_at < cutoff;
    delete from public.logbook_entries where entry_at   < cutoff;
    delete from public.vehicles v where not exists (select 1 from public.observation_vehicles ov where ov.vehicle_id = v.id);
    delete from public.persons p where not exists (select 1 from public.observation_persons op where op.person_id = p.id);
  end if;

  select count(*) into n_veh from public.vehicles v where not exists (select 1 from public.observation_vehicles ov where ov.vehicle_id = v.id);
  select count(*) into n_per from public.persons p where not exists (select 1 from public.observation_persons op where op.person_id = p.id);
  return jsonb_build_object(
    'cutoff', cutoff,
    'observations', n_obs,
    'logbook', n_logs,
    'orphan_vehicles', n_veh,
    'orphan_persons', n_per,
    'dry_run', dry_run,
    'orphaned_file_paths', v_obs_paths || v_log_paths || v_per_paths
  );
end;
$$;
grant execute on function public.gdpr_purge(boolean) to authenticated;
revoke all on function public.gdpr_purge(boolean) from anon;
