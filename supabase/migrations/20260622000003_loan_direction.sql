-- Lending direction for the "stuff I borrowed" view (P9).
--
-- OweMe was lend-only ("they owe you"). This adds the inverse: loans you took
-- from someone ("you owe them"). A single `direction` column keeps it one model —
-- the same loan machinery (add/edit/return/photos/dates) serves both ways.
--
-- Default 'lent' so every existing row stays exactly as it was, and a CHECK keeps
-- the column honest. The client always sends `direction`, so the default only
-- guards rows written by other means.

alter table loans
  add column if not exists direction text not null default 'lent'
    check (direction in ('lent', 'borrowed'));

comment on column loans.direction is
  'lent = you lent it (they owe you); borrowed = you borrowed it (you owe them).';
