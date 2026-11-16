-- Parent read access to an actively linked child.
--
-- Applied to production while fixing "No children linked yet", but not written
-- down until now — without this file a fresh environment reproduces the bug:
-- the link row is readable, the child's profile is not, so getChildren() joins
-- the link to nothing and the dashboard claims no children are linked.
--
-- Scope is deliberately narrow (decision D2): only an ACTIVE link grants read
-- access, and only to the child it names. Pending, declined, revoked and expired
-- links grant nothing, and unrelated profiles stay invisible.

begin;

-- One predicate, shared by every policy below. SECURITY DEFINER so the check
-- does not depend on the caller's own access to the link table.
create or replace function app_private.is_active_parent_of(p_child uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app_private, pg_temp
as $$
  select exists (
    select 1
    from public.parent_student_links l
    where l.parent_id = auth.uid()
      and l.student_id = p_child
      and l.state = 'active'
  );
$$;

revoke all on function app_private.is_active_parent_of(uuid) from anon, authenticated;

drop policy if exists parent_reads_linked_child_profile on public.profiles;
create policy parent_reads_linked_child_profile on public.profiles
  for select to authenticated
  using (app_private.is_active_parent_of(id));

drop policy if exists parent_reads_linked_child_projects on public.projects;
create policy parent_reads_linked_child_projects on public.projects
  for select to authenticated
  using (app_private.is_active_parent_of(user_id));

drop policy if exists parent_reads_linked_child_achievements on public.achievements;
create policy parent_reads_linked_child_achievements on public.achievements
  for select to authenticated
  using (app_private.is_active_parent_of(user_id));

-- Known gap, not yet applied: comment counts on a child's project read 0 for a
-- parent because `comments` has no equivalent policy. Adding one requires:
--
--   create policy parent_reads_linked_child_comments on public.comments
--     for select to authenticated
--     using (exists (
--       select 1 from public.projects p
--       where p.id::text = comments.resource_id
--         and app_private.is_active_parent_of(p.user_id)
--     ));
--
-- The migration is left without it on purpose: prod and repo must agree.

commit;

-- Post-check (SQL editor), as a parent account:
--   select count(*) from public.profiles
--   where id in (select student_id from public.parent_student_links
--                where parent_id = auth.uid() and state = 'active');
