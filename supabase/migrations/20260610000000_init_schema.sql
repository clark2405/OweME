-- OweMe initial schema. Source of truth: PROJECT.md §6.
-- Tables: borrowers, loans, nudge_links. RLS scopes everything to the owner;
-- the Next.js nudge page reads nudge_links via a service-role key (bypasses RLS)
-- scoped to a single token lookup.

-- People you lend to. They do NOT need accounts.
create table borrowers (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id),
  name        text not null,
  phone       text,
  avatar_url  text,
  created_at  timestamptz default now()
);

create table loans (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id),
  borrower_id uuid not null references borrowers(id),
  type        text not null check (type in ('item', 'money')),

  -- item fields
  item_name   text,
  photo_url   text,

  -- money fields
  amount      numeric(12,2),
  currency    text default 'PHP',

  notes       text,
  lent_at     date not null default current_date,
  due_at      date,
  status      text not null default 'active'
              check (status in ('active', 'returned', 'written_off')),
  returned_at timestamptz,
  created_at  timestamptz default now(),

  -- enforce type-appropriate fields
  constraint item_has_name   check (type <> 'item'  or item_name is not null),
  constraint money_has_amount check (type <> 'money' or amount is not null)
);

-- Shareable nudge links
create table nudge_links (
  id          uuid primary key default gen_random_uuid(),
  loan_id     uuid not null references loans(id) on delete cascade,
  token       text not null unique,          -- short random slug for the URL
  tone        text default 'friendly',
  created_at  timestamptz default now(),
  opened_at   timestamptz,                   -- did they even look 👀
  responded   text                           -- 'will_return' | 'returned' | null
);

-- Helpful indexes for the common queries (active loans by owner, borrower views).
create index loans_owner_status_idx on loans (owner_id, status);
create index loans_borrower_idx     on loans (borrower_id);
create index borrowers_owner_idx    on borrowers (owner_id);

-- Row Level Security: owner_id = auth.uid() everywhere.
alter table borrowers   enable row level security;
alter table loans       enable row level security;
alter table nudge_links enable row level security;

create policy "owner manages own borrowers"
  on borrowers for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owner manages own loans"
  on loans for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- nudge_links has no owner_id; ownership flows through the parent loan.
create policy "owner manages own nudge links"
  on nudge_links for all
  using (
    exists (
      select 1 from loans
      where loans.id = nudge_links.loan_id
        and loans.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from loans
      where loans.id = nudge_links.loan_id
        and loans.owner_id = auth.uid()
    )
  );
