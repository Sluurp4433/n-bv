-- Årsmodell på fordon (frivilligt fält).
alter table public.vehicles add column if not exists year_model integer
  constraint vehicles_year_model_range check (year_model is null or (year_model between 1900 and 2100));
