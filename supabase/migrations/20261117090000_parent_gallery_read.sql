-- Parent access to a linked child's gallery, and to their own comments.
--
-- Two gaps fixed here:
--   1. A parent had no gallery at all. Media is stored privately, so a parent
--      needs read access at three layers: the event row, the media row, and the
--      storage object (URLs are signed, never public).
--   2. `getChildProjects` embedded comments(count), which PostgREST cannot
--      resolve because comments are polymorphic (resource_type/resource_id) —
--      the project tab failed with "Could not find a relationship between
--      'projects' and 'comments'". Counts are now a second query, and a viewer
--      may read the comments they wrote themselves.
--
-- Scope: active links only, via app_private.is_active_parent_of().

begin;

-- ---------------------------------------------------------------------------
-- Gallery events and media of an actively linked child
-- ---------------------------------------------------------------------------
drop policy if exists parent_reads_linked_child_gallery_events on public.gallery_events;
create policy parent_reads_linked_child_gallery_events on public.gallery_events
  for select to authenticated
  using (app_private.is_active_parent_of(user_id));

drop policy if exists parent_reads_linked_child_gallery_media on public.gallery_media;
create policy parent_reads_linked_child_gallery_media on public.gallery_media
  for select to authenticated
  using (exists (
    select 1 from public.gallery_events e
    where e.id = gallery_media.event_id
      and app_private.is_active_parent_of(e.user_id)
  ));

-- ---------------------------------------------------------------------------
-- Storage objects for that gallery
-- ---------------------------------------------------------------------------
-- uploadMedia stores '<user uuid>/<event id>/<file>', so the first path folder
-- identifies the owner. The regex guard keeps a non-uuid folder from raising a
-- cast error inside a policy.
drop policy if exists parent_reads_linked_child_gallery_objects on storage.objects;
create policy parent_reads_linked_child_gallery_objects on storage.objects
  for select to authenticated
  using (
    bucket_id = 'gallery-media'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and app_private.is_active_parent_of(((storage.foldername(name))[1])::uuid)
  );

-- ---------------------------------------------------------------------------
-- A viewer's own comments
-- ---------------------------------------------------------------------------
-- The project card shows "Encourage (N sent)", which counts the viewer's own
-- comments. Without this a parent could read no comments at all, so the label
-- could never show a number.
drop policy if exists author_reads_own_comments on public.comments;
create policy author_reads_own_comments on public.comments
  for select to authenticated
  using (user_id = auth.uid());

commit;

-- Post-check (SQL editor), impersonating a parent:
--   select count(*) from public.gallery_events where user_id = '<child uuid>';
--   select count(*) from public.gallery_media m
--     join public.gallery_events e on e.id = m.event_id
--     where e.user_id = '<child uuid>';
