-- Bildbilagor på loggboksinlägg (återanvänder bucket observation-images)
create table if not exists public.logbook_images (
  id uuid primary key default gen_random_uuid(),
  logbook_entry_id uuid not null references public.logbook_entries(id) on delete cascade,
  file_path text not null,
  caption text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  search tsvector generated always as (to_tsvector('swedish', coalesce(caption, ''))) stored
);
create index if not exists idx_logimg_entry on public.logbook_images (logbook_entry_id);
create index if not exists idx_logimg_search on public.logbook_images using gin (search);
create trigger trg_audit_logimg after insert or update or delete on public.logbook_images
  for each row execute function public.audit_trigger();

alter table public.logbook_images enable row level security;
create policy logimg_select on public.logbook_images for select to authenticated
  using (public.is_active_member(auth.uid()));
create policy logimg_insert on public.logbook_images for insert to authenticated
  with check (public.is_active_member(auth.uid()) and uploaded_by = auth.uid()
    and (public.is_admin(auth.uid()) or exists (select 1 from public.logbook_entries l where l.id = logbook_entry_id and l.created_by = auth.uid())));
create policy logimg_delete on public.logbook_images for delete to authenticated
  using (public.is_admin(auth.uid()) or exists (select 1 from public.logbook_entries l where l.id = logbook_entry_id and l.created_by = auth.uid()));

-- search_all: loggboksinlägg hittas även via sina bildtexter (loggbok-grenen tillägg:
--   or exists (select 1 from public.logbook_images li where li.logbook_entry_id = l.id and li.search @@ tq.query))
-- Se applicerad funktion i migration 14_logbook_images.
