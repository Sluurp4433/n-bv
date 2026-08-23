-- Klickloggning för sökfunktionen. Insert-only för medlemmar (ingen rå-läsbehörighet
-- förutom admin — sökbeteende är milt personrelaterat). Aggregering exponeras via en
-- security definer-funktion som bara returnerar räknade etiketter, aldrig vem som sökt.
create table public.search_logs (
  id uuid primary key default gen_random_uuid(),
  searched_by uuid references auth.users(id),
  query text not null,
  result_type text not null check (result_type in ('fordon','person','observation','loggbok')),
  result_id uuid not null,
  result_label text not null,
  clicked_at timestamptz not null default now()
);
create index idx_search_logs_type_label on public.search_logs (result_type, result_label);

alter table public.search_logs enable row level security;
create policy search_logs_insert on public.search_logs for insert to authenticated
  with check (public.is_active_member(auth.uid()) and searched_by = auth.uid());
create policy search_logs_select_admin on public.search_logs for select to authenticated
  using (public.is_admin(auth.uid()));

create or replace function public.search_leaderboard(limit_n integer default 8)
returns table (category text, label text, hits bigint)
language sql stable security definer set search_path = public, pg_temp
as $$
  (select 'person'::text, result_label, count(*) from public.search_logs
   where result_type = 'person' group by result_label order by count(*) desc limit limit_n)
  union all
  (select 'fordon'::text, result_label, count(*) from public.search_logs
   where result_type = 'fordon' group by result_label order by count(*) desc limit limit_n)
  union all
  (select 'omrade'::text, result_label, count(*) from public.search_logs
   where result_type in ('observation','loggbok') and result_label is not null and result_label <> ''
   group by result_label order by count(*) desc limit limit_n)
$$;
revoke all on function public.search_leaderboard(integer) from anon;
grant execute on function public.search_leaderboard(integer) to authenticated;
