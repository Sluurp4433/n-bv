-- Vy: fordon med aggregat (senast observerad, antal observationer)
create or replace view public.vehicle_overview with (security_invoker = on) as
select v.*,
  (select max(o.observed_at) from public.observation_vehicles ov
     join public.observations o on o.id = ov.observation_id where ov.vehicle_id = v.id) as last_observed,
  (select count(*) from public.observation_vehicles ov where ov.vehicle_id = v.id) as observation_count
from public.vehicles v;
grant select on public.vehicle_overview to authenticated;

-- Universell sökning över fordon/observationer/loggbok (RLS gäller för anroparen)
create or replace function public.search_all(q text)
returns table (result_type text, result_id uuid, title text, subtitle text, snippet text, occurred_at timestamptz, rank real)
language sql stable security invoker set search_path = public, pg_temp
as $$
  with tq as (select websearch_to_tsquery('swedish', coalesce(q, '')) as query),
       nq as (select public.normalize_regnr(coalesce(q, '')) as nregnr)
  select * from (
    select 'fordon'::text as result_type, v.id as result_id, v.registration_number as title,
           nullif(trim(coalesce(v.make, '') || ' ' || coalesce(v.model, '')), '') as subtitle,
           v.color as snippet,
           (select max(o.observed_at) from public.observation_vehicles ov
              join public.observations o on o.id = ov.observation_id where ov.vehicle_id = v.id) as occurred_at,
           1.0::real as rank
    from public.vehicles v, nq
    where (length(nq.nregnr) >= 2 and v.registration_normalized ilike '%' || nq.nregnr || '%')
       or (v.make ilike '%' || q || '%') or (v.model ilike '%' || q || '%') or (v.color ilike '%' || q || '%')
    union all
    select 'observation'::text, o.id, coalesce(nullif(o.type, ''), 'Observation'), o.location,
           left(coalesce(o.description, ''), 160), o.observed_at, ts_rank(o.search, tq.query)::real
    from public.observations o, tq, nq
    where (o.search @@ tq.query)
       or (length(nq.nregnr) >= 2 and exists (
             select 1 from public.observation_vehicles ov join public.vehicles v on v.id = ov.vehicle_id
             where ov.observation_id = o.id and v.registration_normalized ilike '%' || nq.nregnr || '%'))
    union all
    select 'loggbok'::text, l.id, l.title, l.location,
           left(coalesce(l.content, ''), 160), l.entry_at, ts_rank(l.search, tq.query)::real
    from public.logbook_entries l, tq
    where l.search @@ tq.query
  ) results
  order by rank desc, occurred_at desc nulls last
  limit 100;
$$;
grant execute on function public.search_all(text) to authenticated;
revoke all on function public.search_all(text) from anon;

-- Dashboard-statistik
create or replace function public.dashboard_stats()
returns jsonb language sql stable security invoker set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'observations_7d', (select count(*) from public.observations where observed_at > now() - interval '7 days'),
    'logbook_7d', (select count(*) from public.logbook_entries where entry_at > now() - interval '7 days'),
    'observations_total', (select count(*) from public.observations),
    'vehicles_total', (select count(*) from public.vehicles)
  );
$$;
grant execute on function public.dashboard_stats() to authenticated;
revoke all on function public.dashboard_stats() from anon;

-- GDPR-gallring (endast admin). dry_run=true visar bara vad som skulle raderas.
create or replace function public.gdpr_purge(dry_run boolean default true)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare cutoff timestamptz; n_obs int; n_logs int; n_veh int;
begin
  if not public.is_admin(auth.uid()) then raise exception 'Endast administratörer kan gallra data'; end if;
  select now() - make_interval(months => retention_months) into cutoff from public.app_settings where id = 1;
  select count(*) into n_obs from public.observations where observed_at < cutoff;
  select count(*) into n_logs from public.logbook_entries where entry_at < cutoff;
  if not dry_run then
    delete from public.observations where observed_at < cutoff;
    delete from public.logbook_entries where entry_at < cutoff;
    delete from public.vehicles v where not exists (select 1 from public.observation_vehicles ov where ov.vehicle_id = v.id);
  end if;
  select count(*) into n_veh from public.vehicles v where not exists (select 1 from public.observation_vehicles ov where ov.vehicle_id = v.id);
  return jsonb_build_object('cutoff', cutoff, 'observations', n_obs, 'logbook', n_logs, 'orphan_vehicles', n_veh, 'dry_run', dry_run);
end; $$;
grant execute on function public.gdpr_purge(boolean) to authenticated;
revoke all on function public.gdpr_purge(boolean) from anon;
