// Kill-switch for the dashboard RPC migration (00045).
//
// The aggregate RPCs (get_dashboard_kpi, get_sales_funnel,
// get_revenue_forecast, get_business_velocity) are applied in
// production. By default the dashboard query layer calls them.
//
// Set DASHBOARD_USE_RPCS=false in the environment to fall back to the
// legacy per-card Supabase query batches (kept in this codebase as
// `*Legacy` functions for ~30s rollback without a code revert).
//
// Each RPC path also auto-falls-back to the legacy implementation if
// the RPC itself errors, so toggling has no hard dependency on the
// migration being applied.
export const dashboardRpcsEnabled = (): boolean => process.env.DASHBOARD_USE_RPCS !== 'false';
