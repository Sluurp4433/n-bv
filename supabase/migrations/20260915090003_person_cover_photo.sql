-- Låter en person ha en vald "omslagsbild" (visas som miniatyr i
-- personlistan och som rubrikbild på personens sida) istället för att
-- alltid visa det först tillagda fotot.
alter table public.person_images add column if not exists is_cover boolean not null default false;

-- Sätter (atomärt) ett foto som omslagsbild och nollställer ev. tidigare
-- vald omslagsbild för samma person, i en enda uppdatering. Kontrollerar
-- behörighet internt (samma regel som redan gäller för att lägga till/ta
-- bort foton: personens skapare, eller admin).
create or replace function public.set_person_cover_image(p_image_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_person_id uuid;
begin
  select person_id into v_person_id from public.person_images where id = p_image_id;
  if v_person_id is null then
    raise exception 'Fotot hittades inte';
  end if;
  if not (public.is_admin(auth.uid()) or exists (select 1 from public.persons p where p.id = v_person_id and p.created_by = auth.uid())) then
    raise exception 'Du saknar behörighet att ändra omslagsbild för den här personen';
  end if;
  update public.person_images
  set is_cover = (id = p_image_id)
  where person_id = v_person_id
    and is_cover <> (id = p_image_id);
end;
$$;
grant execute on function public.set_person_cover_image(uuid) to authenticated;
revoke all on function public.set_person_cover_image(uuid) from anon;
