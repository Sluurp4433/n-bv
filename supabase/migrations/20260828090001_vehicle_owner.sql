-- Ägarens namn på fordon (frivilligt textfält, syns i fordonslistan).
alter table public.vehicles add column if not exists owner_name text;
