// Centralized feature flag for the dashboard RPC migration.
//
// When DASHBOARD_USE_RPCS=true, the dashboard query layer uses the
// aggregate RPCs added in migration 00045 instead of issuing the
// per-card supabase query batches. Default OFF — flip after the
// migration is applied to Supabase cloud and verified with a side-by-
// side numbers check.
export const dashboardRpcsEnabled = (): boolean => process.env.DASHBOARD_USE_RPCS === 'true';
