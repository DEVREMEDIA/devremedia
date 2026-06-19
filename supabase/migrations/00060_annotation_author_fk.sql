-- PostgREST needs a foreign key to embed the author profile on annotations.
-- video_annotations.user_id previously referenced only auth.users, so the
-- `user_profiles(...)` embed in getAnnotations() had no resolvable relationship
-- and the whole annotations read failed ("failed to load annotations"), even
-- though the insert succeeded. This adds the missing FK to public.user_profiles
-- (mirrors the pattern used by activity_log / lead_activities).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'video_annotations_user_id_user_profiles_fkey'
      and conrelid = 'public.video_annotations'::regclass
  ) then
    alter table public.video_annotations
      add constraint video_annotations_user_id_user_profiles_fkey
      foreign key (user_id) references public.user_profiles(id) on delete set null;
  end if;
end $$;
