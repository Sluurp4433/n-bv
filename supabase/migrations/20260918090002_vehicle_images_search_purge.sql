-- Fordonsfoton i fritextsöket (bildtexter) och i GDPR-gallringen.

-- Bildtexter på fordonsfoton kan nu hittas i sökningen, samma mönster som
-- för personfoton och observationsbilder.
create or replace function public.search_all(q text)
returns table (result_type text, result_id uuid, title text, subtitle text, snippet text, occurred_at timestamptz, rank real)
language sql stable security invoker set search_path = public, pg_temp
as $$
  with tq as (select websearch_to_tsquery('swedish', coalesce(q, '')) as query),
       nq as (select public.normalize_regnr(coalesce(q, '')) as nregnr)
  select * from (
    select 'fordon'::text as result_type, v.id as result_id, v.registration_number as title,
           nullif(trim(coalesce(v.make, '') || ' ' || coalesce(v.model, '')), '') as subtitle, v.color as snippet,
           (select max(o.observed_at) from public.observation_vehicles ov join public.observations o on o.id = ov.observation_id where ov.vehicle_id = v.id) as occurred_at,
           1.0::real as rank
    from public.vehicles v, tq, nq
    where (length(nq.nregnr) >= 2 and v.registration_normalized ilike '%' || nq.nregnr || '%')
       or v.make ilike '%' || q || '%' or v.model ilike '%' || q || '%' or v.color ilike '%' || q || '%'
       or exists (select 1 from public.vehicle_images vi where vi.vehicle_id = v.id and vi.search @@ tq.query)
    union all
    select 'person'::text, p.id,
           nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''),
           nullif(p.city, ''), left(coalesce(p.description, ''), 160), p.created_at,
           ts_rank(coalesce(p.search, ''::tsvector), tq.query)::real
    from public.persons p, tq, nq
    where (p.search @@ tq.query)
       or (q <> '' and array_to_string(p.aliases, ' ') ilike '%' || q || '%')
       or (length(nq.nregnr) >= 2 and exists (select 1 from public.person_vehicles pv join public.vehicles v on v.id = pv.vehicle_id where pv.person_id = p.id and v.registration_normalized ilike '%' || nq.nregnr || '%'))
       or exists (select 1 from public.person_images pi where pi.person_id = p.id and pi.search @@ tq.query)
    union all
    select 'observation'::text, o.id, coalesce(nullif(o.type, ''), 'Observation'), o.location,
           left(coalesce(o.description, ''), 160), o.observed_at, ts_rank(o.search, tq.query)::real
    from public.observations o, tq, nq
    where (o.search @@ tq.query)
       or (length(nq.nregnr) >= 2 and exists (select 1 from public.observation_vehicles ov join public.vehicles v on v.id = ov.vehicle_id where ov.observation_id = o.id and v.registration_normalized ilike '%' || nq.nregnr || '%'))
       or exists (select 1 from public.observation_persons op join public.persons p on p.id = op.person_id where op.observation_id = o.id and (p.search @@ tq.query or (q <> '' and array_to_string(p.aliases, ' ') ilike '%' || q || '%')))
       or exists (select 1 from public.observation_images im where im.observation_id = o.id and im.search @@ tq.query)
    union all
    select 'loggbok'::text, l.id, l.title, l.location, left(coalesce(l.content, ''), 160), l.entry_at, ts_rank(l.search, tq.query)::real
    from public.logbook_entries l, tq
    where l.search @@ tq.query
  ) results
  order by rank desc, occurred_at desc nulls last
  limit 100;
$$;
grant execute on function public.search_all(text) to authenticated;

-- gdpr_purge samlar redan ihop filsökvägarna för bilder som blir föräldralösa
-- av gallringen (så adminpanelen kan städa bort dem ur lagringen). Fordon utan
-- kvarvarande observationer gallras bort – deras foton måste också med, annars
-- blir filerna kvar i lagringen.
create or replace function public.gdpr_purge(dry_run boolean default true)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  cutoff timestamptz;
  n_obs int; n_logs int; n_veh int; n_per int;
  v_obs_paths text[];
  v_log_paths text[];
  v_per_paths text[];
  v_veh_paths text[];
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

  -- Samma logik för fordon.
  select coalesce(array_agg(vi.file_path), '{}') into v_veh_paths
    from public.vehicle_images vi
    where vi.vehicle_id in (
      select v.id from public.vehicles v
      where not exists (
        select 1 from public.observation_vehicles ov
        where ov.vehicle_id = v.id
          and ov.observation_id not in (select id from public.observations where observed_at < cutoff)
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
    'orphaned_file_paths', v_obs_paths || v_log_paths || v_per_paths || v_veh_paths
  );
end;
$$;
grant execute on function public.gdpr_purge(boolean) to authenticated;
revoke all on function public.gdpr_purge(boolean) from anon;
