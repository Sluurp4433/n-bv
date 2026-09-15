-- Foton på personer, byggt exakt som observation_images/logbook_images:
-- egen tabell, samma bildlagringsyta (observation-images-bucketen, egen
-- mapp person/<person_id>/...), samma typ av skydd.
create table if not exists public.person_images (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.persons(id) on delete cascade,
  file_path text not null,
  caption text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  search tsvector generated always as (to_tsvector('swedish', coalesce(caption, ''))) stored
);
create index if not exists idx_perimg_person on public.person_images (person_id);
create index if not exists idx_perimg_search on public.person_images using gin (search);
create trigger trg_audit_perimg after insert or update or delete on public.person_images for each row execute function public.audit_trigger();

alter table public.person_images enable row level security;

create policy perimg_select on public.person_images for select to authenticated using (public.is_active_member(auth.uid()));
create policy perimg_insert on public.person_images for insert to authenticated
  with check (public.is_active_member(auth.uid()) and uploaded_by = auth.uid()
    and (public.is_admin(auth.uid()) or exists (select 1 from public.persons p where p.id = person_id and p.created_by = auth.uid())));
create policy perimg_delete on public.person_images for delete to authenticated
  using (public.is_admin(auth.uid()) or exists (select 1 from public.persons p where p.id = person_id and p.created_by = auth.uid()));

-- Skyddsnät utöver klientens bildförminskning och den befintliga
-- MIME-tillåtlistan: hård maxstorlek per fil i den delade bildbucketen.
update storage.buckets
set file_size_limit = 8388608 -- 8 MB
where id = 'observation-images';

-- Gör att bildtexter på personfoton också kan hittas i fritextsöket,
-- samma mönster som redan finns för observationsbilder.
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
    from public.vehicles v, nq
    where (length(nq.nregnr) >= 2 and v.registration_normalized ilike '%' || nq.nregnr || '%')
       or v.make ilike '%' || q || '%' or v.model ilike '%' || q || '%' or v.color ilike '%' || q || '%'
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
