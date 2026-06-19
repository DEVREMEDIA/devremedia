-- Track who has seen each annotation or reply, with a timestamp.
-- One row per (annotation, user) pair; upsert on conflict to avoid duplicates.

create table public.annotation_seen (
  id           uuid primary key default gen_random_uuid(),
  annotation_id uuid not null references public.video_annotations(id) on delete cascade,
  user_id      uuid not null references public.user_profiles(id) on delete cascade,
  seen_at      timestamptz not null default now(),
  unique (annotation_id, user_id)
);

comment on table public.annotation_seen is
  'Bidirectional read-receipt tracking for annotation threads';

-- Enable RLS
alter table public.annotation_seen enable row level security;

-- Any authenticated user who can see the parent annotation may read receipts.
-- Policy mirrors video_annotations select: all authenticated users for now
-- (the deliverable-level access is enforced on video_annotations itself).
create policy "Authenticated users can read annotation_seen"
  on public.annotation_seen for select
  using (auth.uid() is not null);

-- Users can mark items as seen for themselves only.
create policy "Users can insert their own seen records"
  on public.annotation_seen for insert
  with check (auth.uid() = user_id);

-- Allow upsert (update the seen_at when already exists).
create policy "Users can update their own seen records"
  on public.annotation_seen for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
