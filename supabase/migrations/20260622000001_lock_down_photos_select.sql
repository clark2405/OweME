-- Lock down photo enumeration (TASKS.md S3).
--
-- The photo_storage migration added an open read policy:
--   create policy "public reads photos" on storage.objects
--     for select using (bucket_id = 'photos');
-- With no role restriction, ANY role — including anon, holding only the public
-- key — can call the Storage list/select API and enumerate object paths, which
-- embed user uids. That's a privacy leak (who has an account, how many photos).
--
-- Public URL *rendering* does NOT need this policy: `photos` is a public bucket,
-- served through the unauthenticated /object/public/ CDN path, which bypasses
-- RLS entirely. The app never calls the authenticated list/select API (it only
-- uploads and builds public URLs client-side via getPublicUrl). So we can drop
-- the open policy and replace it with an owner-scoped read — a signed-in owner
-- can still list/manage only their own objects (useful for a future GC sweep,
-- E5), and cross-user enumeration is closed.
--
-- Deeper hardening (private bucket + time-limited signed URLs, so the permanent
-- bearer URLs go away too) is parked as a follow-up: it changes the render model
-- (URLs would expire and need re-signing per session), a larger refactor than
-- this enumeration fix.

drop policy if exists "public reads photos" on storage.objects;

create policy "owner reads own photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
