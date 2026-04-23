-- Add filming-related fields to projects table
-- These fields track when/where filming takes place and are used for
-- calendar integration and upcoming filmings display

ALTER TABLE public.projects ADD COLUMN filming_date date;
ALTER TABLE public.projects ADD COLUMN filming_time text;
ALTER TABLE public.projects ADD COLUMN location text;

CREATE INDEX idx_projects_filming_date ON public.projects(filming_date);
