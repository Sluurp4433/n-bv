-- Personlig färg + avatar på medlemsprofilen
alter table public.profiles add column if not exists personal_color text;
alter table public.profiles add column if not exists avatar jsonb;

-- Körpass
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null default 2 check (capacity between 1 and 20),
  title text,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shifts_time_order check (ends_at > starts_at)
);

create table if not exists public.shift_bookings (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint shift_bookings_unique unique (shift_id, user_id)
);

create index if not exists idx_shifts_starts_at on public.shifts (starts_at);
create index if not exists idx_shifts_created_by on public.shifts (created_by);
create index if not exists idx_shift_bookings_user on public.shift_bookings (user_id);
create index if not exists idx_shift_bookings_shift on public.shift_bookings (shift_id);

create trigger trg_shifts_created_by before insert on public.shifts
  for each row execute function public.set_created_by();
create trigger trg_shifts_updated before update on public.shifts
  for each row execute function public.set_updated_at();
create trigger trg_audit_shifts after insert or update or delete on public.shifts
  for each row execute function public.audit_trigger();
create trigger trg_audit_shift_bookings after insert or update or delete on public.shift_bookings
  for each row execute function public.audit_trigger();

-- Kapacitetskontroll: hindra överbokning på databasnivå
create or replace function public.enforce_shift_capacity()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare cap int; cnt int;
begin
  select capacity into cap from public.shifts where id = new.shift_id;
  if cap is null then raise exception 'Passet finns inte'; end if;
  select count(*) into cnt from public.shift_bookings where shift_id = new.shift_id;
  if cnt >= cap then raise exception 'Passet är fullbokat'; end if;
  return new;
end; $$;
revoke all on function public.enforce_shift_capacity() from public, anon, authenticated;
create trigger trg_shift_capacity before insert on public.shift_bookings
  for each row execute function public.enforce_shift_capacity();

-- RLS
alter table public.shifts enable row level security;
alter table public.shift_bookings enable row level security;

create policy shifts_select on public.shifts for select to authenticated
  using (public.is_active_member(auth.uid()));
create policy shifts_insert on public.shifts for insert to authenticated
  with check (public.is_active_member(auth.uid()) and created_by = auth.uid());
create policy shifts_update on public.shifts for update to authenticated
  using (public.is_admin(auth.uid()) or (created_by = auth.uid() and public.within_edit_window(created_at)))
  with check (public.is_admin(auth.uid()) or created_by = auth.uid());
create policy shifts_delete on public.shifts for delete to authenticated
  using (public.is_admin(auth.uid()) or created_by = auth.uid());

create policy bookings_select on public.shift_bookings for select to authenticated
  using (public.is_active_member(auth.uid()));
create policy bookings_insert on public.shift_bookings for insert to authenticated
  with check (public.is_active_member(auth.uid()) and user_id = auth.uid());
create policy bookings_delete on public.shift_bookings for delete to authenticated
  using (
    public.is_admin(auth.uid())
    or user_id = auth.uid()
    or exists (select 1 from public.shifts s where s.id = shift_id and s.created_by = auth.uid())
  );
