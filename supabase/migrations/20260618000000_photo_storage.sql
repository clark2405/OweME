-- Photo Storage for item photos + borrower avatars (TASKS.md E1).
--
-- One public bucket, `photos`, holding both kinds. Files live under the owner's
-- folder: `{auth.uid()}/item/{uuid}.jpg` and `{auth.uid()}/avatar/{uuid}.jpg`.
-- The bucket is PUBLIC so the stored URL (in loans.photo_url / borrowers.avatar_url)
-- resolves on any device without re-signing — paths are unguessable uuids. Write
-- access is still owner-scoped via the policies below (only public *read* is open).

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- Owner may upload into their own folder only (first path segment = their uid).
create policy "owner uploads own photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owner updates own photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owner deletes own photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Read is public (the bucket is public); an explicit select policy keeps `list`
-- working for any role and documents the intent.
create policy "public reads photos"
  on storage.objects for select
  using (bucket_id = 'photos');
