-- Styrelse får hantera sponsorer (lägga till/ta bort), likt can_manage_documents för dokument.
create or replace function public.can_manage_sponsors(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (select 1 from public.profiles p where p.id = uid and p.active and p.role in ('admin','styrelse'));
$$;
revoke all on function public.can_manage_sponsors(uuid) from anon;

drop policy if exists sponsors_insert on public.sponsors;
create policy sponsors_insert on public.sponsors for insert to authenticated
  with check (public.can_manage_sponsors(auth.uid()));
drop policy if exists sponsors_update on public.sponsors;
create policy sponsors_update on public.sponsors for update to authenticated
  using (public.can_manage_sponsors(auth.uid())) with check (public.can_manage_sponsors(auth.uid()));
drop policy if exists sponsors_delete on public.sponsors;
create policy sponsors_delete on public.sponsors for delete to authenticated
  using (public.can_manage_sponsors(auth.uid()));

-- Storage: styrelse får ladda upp/ändra/ta bort sponsorloggor (path-prefix "sponsors/"),
-- men inte övriga public-assets (t.ex. föreningens egen logga) — det förblir admin-only.
create policy "public-assets sponsors insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'public-assets' and left(name, 9) = 'sponsors/' and public.can_manage_sponsors(auth.uid()));
create policy "public-assets sponsors update" on storage.objects for update to authenticated
  using (bucket_id = 'public-assets' and left(name, 9) = 'sponsors/' and public.can_manage_sponsors(auth.uid()));
create policy "public-assets sponsors delete" on storage.objects for delete to authenticated
  using (bucket_id = 'public-assets' and left(name, 9) = 'sponsors/' and public.can_manage_sponsors(auth.uid()));
