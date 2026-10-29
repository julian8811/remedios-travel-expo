create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.administradores (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.administradores enable row level security;
revoke all on public.administradores from anon, authenticated;
grant select on public.administradores to authenticated;
create policy "Consultar acceso propio" on public.administradores for select to authenticated
using (user_id = (select auth.uid()));

-- A confirmed email, controlled by Auth, grants the coordinator access.
-- Client-supplied user_metadata never grants administrative privileges.
create function private.sync_coordinator() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is not null and lower(new.email) = 'jose.gomez.lopez@colmayor.edu.co' then
    insert into public.administradores(user_id) values(new.id) on conflict do nothing;
  else
    delete from public.administradores where user_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_coordinator() from public, anon, authenticated;
create trigger grant_coordinator after insert or update of email, email_confirmed_at
on auth.users for each row execute function private.sync_coordinator();

create table public.registros (
  id uuid primary key,
  form text not null check (form in ('A','B','C')),
  por text not null check (length(trim(por)) between 1 and 60),
  capture_date date not null,
  captured_at timestamptz not null,
  received_at timestamptz not null default now(),
  registrar_consent boolean not null check (registrar_consent),
  schema_version integer not null default 1 check (schema_version = 1),
  d jsonb not null check (jsonb_typeof(d) = 'object' and octet_length(d::text) <= 30000),
  check (form <> 'B' or coalesce((d->>'autoriza')::boolean,false) or
    (coalesce(d->>'persona','') = '' and coalesce(d->>'cargo','') = '' and coalesce(d->>'tel','') = '' and coalesce(d->>'correo','') = '')),
  check (form <> 'A' or coalesce(d->>'contacto','') = '' or coalesce((d->>'autoriza')::boolean,false))
);
create index registros_received_at_id_idx on public.registros(received_at desc, id);
create index registros_form_idx on public.registros(form);
alter table public.registros enable row level security;
revoke all on public.registros from anon, authenticated;
grant select on public.registros to authenticated;
grant all on public.registros to service_role;
create policy "Solo coordinadores consultan" on public.registros for select to authenticated
using (exists(select 1 from public.administradores a where a.user_id = (select auth.uid())));

create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  hits integer not null
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;
grant all on public.rate_limits to service_role;
create function public.allow_submission(source_key text) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare current_hits integer;
begin
  insert into public.rate_limits(key,window_start,hits) values(source_key,now(),1)
  on conflict (key) do update set
    hits = case when public.rate_limits.window_start < now() - interval '10 minutes' then 1 else public.rate_limits.hits + 1 end,
    window_start = case when public.rate_limits.window_start < now() - interval '10 minutes' then now() else public.rate_limits.window_start end
  returning hits into current_hits;
  return current_hits <= 60;
end;
$$;
revoke all on function public.allow_submission(text) from public, anon, authenticated;
grant execute on function public.allow_submission(text) to service_role;

create table public.summary_runs (
  report_date date primary key,
  status text not null check (status in ('sending','sent','empty','failed')),
  attempts integer not null default 1,
  updated_at timestamptz not null default now(),
  provider_id text,
  error text
);
alter table public.summary_runs enable row level security;
revoke all on public.summary_runs from anon, authenticated;
grant all on public.summary_runs to service_role;
grant select on public.summary_runs to authenticated;
create policy "Coordinadores consultan envios" on public.summary_runs for select to authenticated
using (exists(select 1 from public.administradores a where a.user_id = (select auth.uid())));

create function public.claim_summary(report_day date) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare claimed date;
begin
  insert into public.summary_runs(report_date,status) values(report_day,'sending')
  on conflict(report_date) do update set status = 'sending', attempts = public.summary_runs.attempts + 1, updated_at = now(), error = null
  where public.summary_runs.status = 'failed' or (public.summary_runs.status = 'sending' and public.summary_runs.updated_at < now() - interval '10 minutes')
  returning report_date into claimed;
  return claimed is not null;
end;
$$;
revoke all on function public.claim_summary(date) from public, anon, authenticated;
grant execute on function public.claim_summary(date) to service_role;

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
-- Generate the internal scheduler credential in Vault, never in source control.
select vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'), 'remedios_cron_secret', 'Internal daily digest credential');
create function public.authorize_summary(supplied_secret text) returns boolean
language sql security definer set search_path = '' as $$
  select exists(select 1 from vault.decrypted_secrets where name = 'remedios_cron_secret' and decrypted_secret = supplied_secret);
$$;
revoke all on function public.authorize_summary(text) from public, anon, authenticated;
grant execute on function public.authorize_summary(text) to service_role;
-- 12:00 UTC = 07:00 America/Bogota. Two bounded retries at 07:15 and 07:30.
select cron.schedule('remedios-daily-summary', '0,15,30 12 * * *', $job$
  select net.http_post(
    url := 'https://wfwxdvkcdqnvdmkjxaoj.supabase.co/functions/v1/daily-summary',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',
      (select decrypted_secret from vault.decrypted_secrets where name='remedios_cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
$job$);
select cron.schedule('remedios-rate-limit-cleanup', '0 9 * * *', $job$
  delete from public.rate_limits where window_start < now() - interval '1 day';
$job$);
