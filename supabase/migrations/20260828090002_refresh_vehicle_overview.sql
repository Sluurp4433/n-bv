-- vehicle_overview skapades med "select v.*", men Postgres fryser kolumnlistan
-- vid vy-skapandet — nya kolumner på vehicles (year_model, owner_name) dök
-- därför aldrig upp i vyn trots "v.*". Skriver om vyn för att uppdatera listan.
-- (create or replace går inte här eftersom kolumnordningen ändras.)
drop view if exists public.vehicle_overview;
create view public.vehicle_overview with (security_invoker = on) as
select v.*,
  (select max(o.observed_at) from public.observation_vehicles ov
     join public.observations o on o.id = ov.observation_id where ov.vehicle_id = v.id) as last_observed,
  (select count(*) from public.observation_vehicles ov where ov.vehicle_id = v.id) as observation_count
from public.vehicles v;
grant select on public.vehicle_overview to authenticated;
