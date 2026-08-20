-- Vaktbil: markerar om ett körpass körs med föreningens vaktbil (förvalt).
-- Visas ljusrött i kalendern.
alter table public.shifts add column if not exists uses_guard_car boolean not null default true;
