-- Showcase covers: give the signed-in home page real imagery to show.
--
-- public_showcase() previously returned text-only rows, so the hero had nothing
-- to display. This adds, per school, a cover (first gallery photo, else the
-- badge) and, per approved project, its first media entry plus a media count.
--
-- Nothing is invented: a project without media returns cover_url = null and the
-- UI falls back to a typographic card. Student names stay masked in the database.

begin;

create or replace function public.public_showcase(p_limit integer default 6)
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $fn$
  select jsonb_build_object(
    'schools', coalesce((
      select jsonb_agg(row_to_json(s))
      from (
        select sc.id, sc.name, sc.location, sc.country, sc.logo_url,
               (select count(*) from public.profiles pr
                 where pr.school_id = sc.id and pr.role = 'student' and pr.account_status = 'approved') as student_count,
               coalesce(
                 (select gm.url from public.school_gallery_media gm where gm.school_id = sc.id limit 1),
                 sc.logo_url
               ) as cover_url
        from public.schools sc
        where sc.approval_status = 'approved'
        order by sc.name
        limit greatest(1, least(p_limit, 12))
      ) s
    ), '[]'::jsonb),
    'projects', coalesce((
      select jsonb_agg(row_to_json(p))
      from (
        select pj.id, pj.title, left(coalesce(pj.description, ''), 180) as description,
               pj.tags, pj.updated_at,
               pj.media_urls[1] as cover_url,
               coalesce(array_length(pj.media_urls, 1), 0) as media_count,
               sc.name as school_name,
               public.mask_student_name(pr.full_name) as student
        from public.projects pj
        join public.profiles pr on pr.id = coalesce(pj.user_id, pj.owner_id)
        left join public.schools sc on sc.id = pr.school_id
        where pj.approval_status = 'approved'
          and pj.deleted_at is null
        order by pj.updated_at desc nulls last
        limit greatest(1, least(p_limit, 12))
      ) p
    ), '[]'::jsonb),
    'awards', coalesce((
      select jsonb_agg(row_to_json(a))
      from (
        select ac.id, ac.title, ac.category, ac.date_earned,
               sc.name as school_name,
               public.mask_student_name(pr.full_name) as student
        from public.achievements ac
        join public.profiles pr on pr.id = ac.user_id
        left join public.schools sc on sc.id = pr.school_id
        where ac.verified = true
        order by ac.date_earned desc nulls last, ac.created_at desc
        limit greatest(1, least(p_limit, 12))
      ) a
    ), '[]'::jsonb)
  );
$fn$;

comment on function public.public_showcase(integer) is
  'Public showcase for the signed-in home page: approved schools (with a cover), approved projects (with a cover and media count) and verified awards. Student names are masked in the database.';

commit;

-- Post-check (SQL editor):
--   select public.public_showcase(3);
