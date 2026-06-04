import type { DashboardThresholdsOutput } from '@/lib/schemas/cost-model';

// ---------------------------------------------------------------------
// Hero KPI strip
// ---------------------------------------------------------------------

export type KpiMetric = {
  value: number;
  previous: number | null;
  deltaPct: number | null;
  sparkline?: number[];
  exception: boolean;
};

export type KpiHero = {
  revenueMtd: KpiMetric; // Τζίρος — issued invoices by issue_date
  collectionsMtd: KpiMetric; // Εισπράξεις — paid invoices by paid_at
  pipeline: KpiMetric;
  activeProjects: KpiMetric;
  profitMargin: KpiMetric;
  cashOverdue: KpiMetric;
  atRiskCount: KpiMetric;
};

// ---------------------------------------------------------------------
// Today agenda
// ---------------------------------------------------------------------

export type TodayItemKind =
  | 'filming'
  | 'meeting'
  | 'task'
  | 'project_start'
  | 'project_deadline'
  | 'invoice_due'
  | 'deliverable_pending';

export type TodayItem = {
  id: string;
  kind: TodayItemKind;
  title: string;
  subtitle?: string;
  time?: string | null;
  href: string;
  assigneeName?: string | null;
  assigneeAvatarUrl?: string | null;
  badge?: { label: string; tone: 'default' | 'destructive' | 'secondary' | 'outline' };
};

// ---------------------------------------------------------------------
// Risk panel
// ---------------------------------------------------------------------

export type RiskType =
  | 'overdue_invoice'
  | 'stale_lead'
  | 'stale_deliverable'
  | 'unsigned_contract'
  | 'deadline_risk'
  | 'filming_no_crew';

export type RiskItem = {
  id: string;
  type: RiskType;
  severity: 1 | 2 | 3;
  title: string;
  subtitle?: string;
  ageDays: number;
  href: string;
};

// ---------------------------------------------------------------------
// Sales funnel + forecast
// ---------------------------------------------------------------------

export type FunnelStage = {
  key: 'filming_requests' | 'leads_open' | 'proposals_sent' | 'won' | 'active_projects';
  count: number;
};

export type SalesFunnel = {
  stages: FunnelStage[];
  conversions: { fromKey: string; toKey: string; ratePct: number }[];
};

export type RevenueForecast = {
  confirmed: number;
  likely: number;
  pipeline: number;
  expectedTotal90d: number;
};

// ---------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------

export type CostHealth = {
  totalMonthlyCost: number;
  costPerHour: number;
  expectedMonthlyHours: number;
  categories: { name: string; total: number }[];
  avgProjectMargin90d: number | null;
  targetMargin: number;
  marginOnTarget: boolean;
};

export type ProjectProfitabilityRow = {
  projectId: string;
  title: string;
  clientName: string | null;
  quotedPrice: number;
  cost: number;
  marginAmount: number;
  marginPct: number;
};

export type ProjectProfitability = {
  topProfitable: ProjectProfitabilityRow[];
  topUnprofitable: ProjectProfitabilityRow[];
};

// ---------------------------------------------------------------------
// Production
// ---------------------------------------------------------------------

export type CrewLoadCell = { date: string; count: number };

export type CrewLoadRow = {
  crewMemberId: string | null;
  crewMemberName: string;
  days: CrewLoadCell[];
};

export type DeadlineProject = {
  projectId: string;
  title: string;
  clientName: string | null;
  deadline: string;
  status: string;
  daysUntilDeadline: number;
};

export type DeadlineGroup = {
  atRisk: DeadlineProject[];
  onTrack: DeadlineProject[];
  recentlyDelivered: DeadlineProject[];
};

// ---------------------------------------------------------------------
// Velocity
// ---------------------------------------------------------------------

export type VelocityCounter = {
  count: number;
  sum?: number;
  deltaVsPrevious: number;
};

// Money-only counter (no item count) — e.g. Revenue (Τζίρος) issued in the period.
export type MoneyDelta = {
  sum: number;
  deltaVsPrevious: number;
};

export type BusinessVelocity = {
  projectsCreated: VelocityCounter;
  projectsDelivered: VelocityCounter;
  revenueIssued: MoneyDelta; // Τζίρος — issued invoices by issue_date
  invoicesPaid: VelocityCounter; // Εισπράξεις — paid invoices by paid_at
  contractsSigned: VelocityCounter;
  proposalsSent: VelocityCounter;
};

// ---------------------------------------------------------------------
// Re-export thresholds for convenience
// ---------------------------------------------------------------------

export type { DashboardThresholdsOutput };
