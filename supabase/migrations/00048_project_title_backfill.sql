-- Backfill project titles that follow a generic "Filming N" / "Φιλμ N" pattern.
-- Rewrites them to "{client.company_name} — {original title}" so brand context
-- is visible in dashboards, breadcrumbs, lists, deliverable views, etc.
-- Custom/meaningful titles are left untouched.

UPDATE projects p
SET title = COALESCE(c.company_name, c.contact_name, 'Client') || ' — ' || p.title
FROM clients c
WHERE c.id = p.client_id
  AND (
    p.title ~* '^(filming|film|φιλμ|γύρισμα|video|βίντεο|project|έργο|untitled)\s*\d*\s*$'
  );
