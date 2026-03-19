-- Fix: messages.sender_id references auth.users(id) but queries join with user_profiles
-- PostgREST can't resolve the implicit join without a FK to user_profiles
-- Same pattern as leads.assigned_to fix in 00016

ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_id_user_profiles_fkey
  FOREIGN KEY (sender_id) REFERENCES public.user_profiles(id);
