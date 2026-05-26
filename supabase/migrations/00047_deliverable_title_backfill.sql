-- Backfill deliverable titles that follow the generic "Film N" / "Φιλμ N" pattern.
-- Rewrites them to "{client.company_name} — {project.title}" so they look
-- professional in client portal views. Custom titles (anything not matching
-- the generic pattern) are left untouched.

UPDATE deliverables d
SET title = COALESCE(c.company_name, c.contact_name, 'Client') || ' — ' || p.title
FROM projects p
LEFT JOIN clients c ON c.id = p.client_id
WHERE d.project_id = p.id
  AND (
    d.title ~* '^(film|φιλμ|video|βίντεο)\s*\d*\s*$'
    OR d.title ~* '^untitled\s*\d*\s*$'
  );
