-- Allow general (non-timestamped) annotations so revision-request notes
-- can be stored without pinning them to a video moment.
alter table public.video_annotations
  alter column timestamp_seconds drop not null;

comment on column public.video_annotations.timestamp_seconds is
  'Position in video (seconds); NULL for general notes not tied to a timestamp';
