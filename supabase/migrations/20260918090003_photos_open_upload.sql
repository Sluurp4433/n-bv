-- Alla aktiva medlemmar får lägga till foton på personer och fordon, oavsett
-- vem som skapade posten (så att medlemmar kan komplettera varandras poster).
-- Att ta bort ett foto eller välja det som omslagsbild får den som laddade upp
-- fotot, postens skapare eller en admin.

-- ---- Personer ----
drop policy if exists perimg_insert on public.person_images;
create policy perimg_insert on public.person_images for insert to authenticated
  with check (public.is_active_member(auth.uid()) and uploaded_by = auth.uid());

drop policy if exists perimg_delete on public.person_images;
create policy perimg_delete on public.person_images for delete to authenticated
  using (public.is_active_member(auth.uid())
    and (public.is_admin(auth.uid()) or uploaded_by = auth.uid()
      or exists (select 1 from public.persons p where p.id = person_id and p.created_by = auth.uid())));

create or replace function public.set_person_cover_image(p_image_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_person_id uuid; v_uploader uuid;
begin
  select person_id, uploaded_by into v_person_id, v_uploader from public.person_images where id = p_image_id;
  if v_person_id is null then
    raise exception 'Fotot hittades inte';
  end if;
  if not (public.is_active_member(auth.uid())
      and (public.is_admin(auth.uid()) or v_uploader = auth.uid()
        or exists (select 1 from public.persons p where p.id = v_person_id and p.created_by = auth.uid()))) then
    raise exception 'Du saknar behörighet att ändra omslagsbild för det här fotot';
  end if;
  update public.person_images
  set is_cover = (id = p_image_id)
  where person_id = v_person_id
    and is_cover <> (id = p_image_id);
end;
$$;

-- ---- Fordon ----
drop policy if exists vehimg_insert on public.vehicle_images;
create policy vehimg_insert on public.vehicle_images for insert to authenticated
  with check (public.is_active_member(auth.uid()) and uploaded_by = auth.uid());

drop policy if exists vehimg_delete on public.vehicle_images;
create policy vehimg_delete on public.vehicle_images for delete to authenticated
  using (public.is_active_member(auth.uid())
    and (public.is_admin(auth.uid()) or uploaded_by = auth.uid()
      or exists (select 1 from public.vehicles v where v.id = vehicle_id and v.created_by = auth.uid())));

create or replace function public.set_vehicle_cover_image(p_image_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_vehicle_id uuid; v_uploader uuid;
begin
  select vehicle_id, uploaded_by into v_vehicle_id, v_uploader from public.vehicle_images where id = p_image_id;
  if v_vehicle_id is null then
    raise exception 'Fotot hittades inte';
  end if;
  if not (public.is_active_member(auth.uid())
      and (public.is_admin(auth.uid()) or v_uploader = auth.uid()
        or exists (select 1 from public.vehicles v where v.id = v_vehicle_id and v.created_by = auth.uid()))) then
    raise exception 'Du saknar behörighet att ändra omslagsbild för det här fotot';
  end if;
  update public.vehicle_images
  set is_cover = (id = p_image_id)
  where vehicle_id = v_vehicle_id
    and is_cover <> (id = p_image_id);
end;
$$;
