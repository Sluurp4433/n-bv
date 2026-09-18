-- Foton på fordon, byggt exakt som person_images: egen tabell, samma
-- bildlagringsyta (observation-images-bucketen, egen mapp
-- vehicle/<vehicle_id>/...), samma typ av skydd och valbar omslagsbild.
create table if not exists public.vehicle_images (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  file_path text not null,
  caption text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  search tsvector generated always as (to_tsvector('swedish', coalesce(caption, ''))) stored,
  is_cover boolean not null default false
);
create index if not exists idx_vehimg_vehicle on public.vehicle_images (vehicle_id);
create index if not exists idx_vehimg_search on public.vehicle_images using gin (search);
create trigger trg_audit_vehimg after insert or update or delete on public.vehicle_images for each row execute function public.audit_trigger();

alter table public.vehicle_images enable row level security;

create policy vehimg_select on public.vehicle_images for select to authenticated using (public.is_active_member(auth.uid()));
create policy vehimg_insert on public.vehicle_images for insert to authenticated
  with check (public.is_active_member(auth.uid()) and uploaded_by = auth.uid()
    and (public.is_admin(auth.uid()) or exists (select 1 from public.vehicles v where v.id = vehicle_id and v.created_by = auth.uid())));
create policy vehimg_delete on public.vehicle_images for delete to authenticated
  using (public.is_admin(auth.uid()) or exists (select 1 from public.vehicles v where v.id = vehicle_id and v.created_by = auth.uid()));

-- Sätter (atomärt) ett foto som omslagsbild och nollställer ev. tidigare vald
-- omslagsbild för samma fordon. Kontrollerar behörighet internt (samma regel
-- som för att lägga till/ta bort foton: fordonets skapare, eller admin).
create or replace function public.set_vehicle_cover_image(p_image_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_vehicle_id uuid;
begin
  select vehicle_id into v_vehicle_id from public.vehicle_images where id = p_image_id;
  if v_vehicle_id is null then
    raise exception 'Fotot hittades inte';
  end if;
  if not (public.is_admin(auth.uid()) or exists (select 1 from public.vehicles v where v.id = v_vehicle_id and v.created_by = auth.uid())) then
    raise exception 'Du saknar behörighet att ändra omslagsbild för det här fordonet';
  end if;
  update public.vehicle_images
  set is_cover = (id = p_image_id)
  where vehicle_id = v_vehicle_id
    and is_cover <> (id = p_image_id);
end;
$$;
grant execute on function public.set_vehicle_cover_image(uuid) to authenticated;
revoke all on function public.set_vehicle_cover_image(uuid) from anon;
