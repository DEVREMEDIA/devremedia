-- Migration: allow 'podcast' as a projects.project_type
--
-- WHY (issue #50): 'podcast' is a valid app-level PROJECT_TYPE
-- (src/lib/constants/enums.ts), has service packages podcast_a/b/c
-- (src/lib/constants/services.ts), and createProjectSchema accepts it — but the
-- original CHECK in 00002_core_tables.sql omitted it. So creating a podcast
-- project passed app + Zod validation and then failed at the DB CHECK.
--
-- This brings the DB-accepted set into parity with the app PROJECT_TYPES.
-- The constraint stays nullable (no NOT NULL added), matching the original.

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_project_type_check;

ALTER TABLE public.projects ADD CONSTRAINT projects_project_type_check
  CHECK (project_type IN (
    'corporate_video', 'event_coverage', 'social_media_content',
    'commercial', 'documentary', 'music_video', 'podcast', 'other'
  ));
