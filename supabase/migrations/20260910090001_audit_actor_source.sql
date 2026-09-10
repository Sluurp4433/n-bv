-- Skiljer på åtgärder utan inloggad medlem i ändringsloggen:
--   'system' = adminfunktion/edge function som kör med systemnyckel
--              (t.ex. när ett medlemskonto skapas via adminpanelen)
--   'db'     = direkt databasåtkomst (manuellt underhåll, tester)
-- Markören läggs i details->>'actor_source'. Ingen tabelländring, bara
-- trigger-funktionen skrivs om (triggarna pekar redan på den via namn).
create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_record_id text; v_details jsonb; v_source text;
begin
  if (tg_op = 'DELETE') then
    v_record_id := old.id::text; v_details := jsonb_build_object('old', to_jsonb(old));
  elsif (tg_op = 'UPDATE') then
    v_record_id := new.id::text; v_details := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  else
    v_record_id := new.id::text; v_details := jsonb_build_object('new', to_jsonb(new));
  end if;

  if auth.uid() is null then
    v_source := case when auth.jwt() is not null then 'system' else 'db' end;
    v_details := v_details || jsonb_build_object('actor_source', v_source);
  end if;

  insert into public.audit_logs (user_id, action, table_name, record_id, details)
  values (auth.uid(), tg_op, tg_table_name, v_record_id, v_details);
  if (tg_op = 'DELETE') then return old; end if;
  return new;
end; $$;

revoke all on function public.audit_trigger() from public, anon, authenticated;
