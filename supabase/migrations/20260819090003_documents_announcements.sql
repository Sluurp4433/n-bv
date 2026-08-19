-- Hjälpfunktion: får hantera dokument (admin eller styrelse)
create or replace function public.can_manage_documents(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (select 1 from public.profiles p where p.id = uid and p.active and p.role in ('admin','styrelse'));
$$;
revoke all on function public.can_manage_documents(uuid) from anon;

-- Dokument (föreningsinformation)
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  description text,
  file_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_documents_category on public.documents (category);
create index if not exists idx_documents_created_at on public.documents (created_at desc);
create trigger trg_audit_documents after insert or update or delete on public.documents
  for each row execute function public.audit_trigger();

alter table public.documents enable row level security;
create policy documents_select on public.documents for select to authenticated
  using (public.is_active_member(auth.uid()));
create policy documents_insert on public.documents for insert to authenticated
  with check (public.can_manage_documents(auth.uid()) and uploaded_by = auth.uid());
create policy documents_update on public.documents for update to authenticated
  using (public.can_manage_documents(auth.uid())) with check (public.can_manage_documents(auth.uid()));
create policy documents_delete on public.documents for delete to authenticated
  using (public.can_manage_documents(auth.uid()));

-- Driftinfo / meddelanden
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  level text not null default 'info',
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_announcements_active on public.announcements (active, created_at desc);
create trigger trg_announcements_created_by before insert on public.announcements
  for each row execute function public.set_created_by();
create trigger trg_announcements_updated before update on public.announcements
  for each row execute function public.set_updated_at();
create trigger trg_audit_announcements after insert or update or delete on public.announcements
  for each row execute function public.audit_trigger();

alter table public.announcements enable row level security;
create policy announcements_select on public.announcements for select to authenticated
  using (public.is_active_member(auth.uid()));
create policy announcements_insert on public.announcements for insert to authenticated
  with check (public.is_admin(auth.uid()) and created_by = auth.uid());
create policy announcements_update on public.announcements for update to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy announcements_delete on public.announcements for delete to authenticated
  using (public.is_admin(auth.uid()));

-- Storage-bucket för dokument
insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
  on conflict (id) do nothing;
create policy "documents read" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.is_active_member(auth.uid()));
create policy "documents insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.can_manage_documents(auth.uid()));
create policy "documents update" on storage.objects for update to authenticated
  using (bucket_id = 'documents' and public.can_manage_documents(auth.uid()));
create policy "documents delete" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and public.can_manage_documents(auth.uid()));

-- Tillåt skapare/admin att boka in andra på pass
drop policy if exists bookings_insert on public.shift_bookings;
create policy bookings_insert on public.shift_bookings for insert to authenticated
  with check (
    public.is_active_member(auth.uid()) and (
      user_id = auth.uid()
      or public.is_admin(auth.uid())
      or exists (select 1 from public.shifts s where s.id = shift_id and s.created_by = auth.uid())
    )
  );
