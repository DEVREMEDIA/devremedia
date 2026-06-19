-- Allow annotations to have threaded replies by hanging off a parent annotation.
-- Replies inherit deliverable access from their parent via RLS on the parent row.

alter table public.video_annotations
  add column parent_id uuid references public.video_annotations(id) on delete cascade;

comment on column public.video_annotations.parent_id is
  'When set, this row is a reply to the given parent annotation';

-- Replies must resolve their deliverable_id from the parent when inserting,
-- so allow clients/employees to insert replies where deliverable_id matches their access.
-- Existing policies already cover select (they cover all video_annotations for a deliverable).
-- For insert: replies have a parent_id but may omit deliverable_id (set by server action).
-- The server action always sets deliverable_id, so existing insert policies still apply.
