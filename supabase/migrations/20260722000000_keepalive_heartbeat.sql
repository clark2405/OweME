-- Keep-alive heartbeat for the free-tier auto-pause.
--
-- Background: the daily GitHub Action was already pinging the REST API, but its
-- request was an anon SELECT on `loans` that RLS turns into an empty `200 []`.
-- Those empty reads did NOT count as "sufficient activity" — the project got a
-- pause warning despite 25 green pings. This gives the ping a real DB *write* to
-- perform (an UPDATE, which generates WAL), the strongest activity signal there is.
--
-- Security: `public.ping()` is SECURITY DEFINER but can do exactly one thing —
-- bump a single timestamp on a one-row table. The anon key is public (it ships in
-- the app bundle), so anyone can call it; that is harmless. No data is exposed.

create table if not exists public.keepalive (
  id         boolean primary key default true,
  last_ping  timestamptz not null default now(),
  -- enforce a single row: id can only ever be `true`
  constraint keepalive_singleton check (id)
);

insert into public.keepalive (id) values (true)
  on conflict (id) do nothing;

-- RLS on, no anon policies: direct table access stays closed. All writes go
-- through the function below, which runs as owner and bypasses RLS.
alter table public.keepalive enable row level security;

create or replace function public.ping()
returns timestamptz
language sql
security definer
set search_path = public
as $$
  update public.keepalive set last_ping = now() where id = true
  returning last_ping;
$$;

-- Let the anon role invoke it via POST /rest/v1/rpc/ping
grant execute on function public.ping() to anon;
