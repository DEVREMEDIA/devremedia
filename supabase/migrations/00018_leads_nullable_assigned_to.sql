-- Allow leads to be created without assigned_to (public website forms)
ALTER TABLE leads ALTER COLUMN assigned_to DROP NOT NULL;
