-- Förtydligar behörigheten för foton på personer och fordon: alla aktiva
-- medlemmar får lägga till foton, men ett foto får bara tas bort eller väljas
-- som omslagsbild av den som laddade upp det – eller av en admin. Postens
-- skapare har alltså INTE längre särskild rätt över andras foton.

-- ---- Personer ----
drop policy if exists perimg_delete on public.person_images;
create policy perimg_delete on public.person_images for delete to authenticated
  using (public.is_active_member(auth.uid())
    and (public.is_admin(auth.uid()) or uploaded_by = auth.uid()));

create or replace function public.set_person_cover_image(p_image_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_person_id uuid; v_uploader uuid;
begin
  select person_id, uploaded_by into v_person_id, v_uploader from public.person_images where id = p_image_id;
  if v_person_id is null then
    raise exception 'Fotot hittades inte';
  end if;
  if not (public.is_active_member(auth.uid()) and (public.is_admin(auth.uid()) or v_uploader = auth.uid())) then
    raise exception 'Du saknar behörighet att ändra omslagsbild för det här fotot';
  end if;
  update public.person_images
  set is_cover = (id = p_image_id)
  where person_id = v_person_id
    and is_cover <> (id = p_image_id);
end;
$$;

-- ---- Fordon ----
drop policy if exists vehimg_delete on public.vehicle_images;
create policy vehimg_delete on public.vehicle_images for delete to authenticated
  using (public.is_active_member(auth.uid())
    and (public.is_admin(auth.uid()) or uploaded_by = auth.uid()));

create or replace function public.set_vehicle_cover_image(p_image_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_vehicle_id uuid; v_uploader uuid;
begin
  select vehicle_id, uploaded_by into v_vehicle_id, v_uploader from public.vehicle_images where id = p_image_id;
  if v_vehicle_id is null then
    raise exception 'Fotot hittades inte';
  end if;
  if not (public.is_active_member(auth.uid()) and (public.is_admin(auth.uid()) or v_uploader = auth.uid())) then
    raise exception 'Du saknar behörighet att ändra omslagsbild för det här fotot';
  end if;
  update public.vehicle_images
  set is_cover = (id = p_image_id)
  where vehicle_id = v_vehicle_id
    and is_cover <> (id = p_image_id);
end;
$$;
