-- Permanent historik för genomförda körpass. Statistiken på Körpass-fliken ska
-- inte kunna manipuleras genom att radera ett pass i efterhand — så fort ett
-- pass sluttid har passerat "låses" det in här och kan aldrig försvinna, även
-- om själva passet (public.shifts) senare tas bort. Pass som ännu inte ägt rum
-- låses INTE in (ett avbokat/borttaget framtida pass ska fortfarande försvinna
-- ur statistiken — det är korrekt beteende).
create table public.shift_history (
  shift_id uuid primary key,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  uses_guard_car boolean not null,
  recorded_at timestamptz not null default now()
);

alter table public.shift_history enable row level security;
create policy shift_history_select on public.shift_history for select to authenticated
  using (public.is_active_member(auth.uid()));
-- Inga insert/update/delete-policyer för klienter — bara den schemalagda
-- funktionen (security definer) skriver hit.

create or replace function public.lock_in_completed_shifts()
returns integer language plpgsql security definer set search_path = public, pg_temp
as $$
declare n integer;
begin
  with ins as (
    insert into public.shift_history (shift_id, starts_at, ends_at, uses_guard_car)
    select id, starts_at, ends_at, uses_guard_car
    from public.shifts
    where ends_at <= now()
    on conflict (shift_id) do nothing
    returning 1
  )
  select count(*) into n from ins;
  return n;
end;
$$;
revoke all on function public.lock_in_completed_shifts() from public, anon, authenticated;

-- Kör var 15:e minut. pg_cron krävs.
create extension if not exists pg_cron;
select cron.schedule('lock-in-completed-shifts', '*/15 * * * *', $$select public.lock_in_completed_shifts();$$);

-- Fyll i historik för pass som redan hunnit ta slut innan denna funktion fanns.
select public.lock_in_completed_shifts();
