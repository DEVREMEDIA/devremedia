import type {
  ProjectStatus,
  ProjectType,
  Priority,
  TaskStatus,
  InvoiceStatus,
  ExpenseCategory,
  ClientStatus,
  LeadStage,
  LeadSource,
} from '@/lib/constants';
import type { ActivityLog, Project } from './entities';

export type ProjectFilters = {
  client_id?: string;
  status?: ProjectStatus | ProjectStatus[];
  priority?: Priority | Priority[];
  project_type?: ProjectType | ProjectType[];
  created_by?: string;
  tags?: string[];
  search?: string;
  start_date_from?: string;
  start_date_to?: string;
  deadline_from?: string;
  deadline_to?: string;
};

export type TaskFilters = {
  project_id?: string;
  status?: TaskStatus | TaskStatus[];
  priority?: Priority | Priority[];
  assigned_to?: string;
  created_by?: string;
  due_date_from?: string;
  due_date_to?: string;
};

export type InvoiceFilters = {
  project_id?: string;
  client_id?: string;
  status?: InvoiceStatus | InvoiceStatus[];
  issue_date_from?: string;
  issue_date_to?: string;
  due_date_from?: string;
  due_date_to?: string;
};

export type ExpenseFilters = {
  project_id?: string;
  category?: ExpenseCategory | ExpenseCategory[];
  billable?: boolean;
  date_from?: string;
  date_to?: string;
};

export type ClientFilters = {
  status?: ClientStatus | ClientStatus[];
  search?: string;
};

export type LeadFilters = {
  stage?: LeadStage | LeadStage[];
  source?: LeadSource | LeadSource[];
  assigned_to?: string;
  search?: string;
  expected_close_from?: string;
  expected_close_to?: string;
};

export type PaginationParams = {
  page?: number;
  per_page?: number;
  order_by?: string;
  order_direction?: 'asc' | 'desc';
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
  };
};

export type ProjectStats = {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  archived_projects: number;
  projects_by_status: Record<ProjectStatus, number>;
  projects_by_type: Record<ProjectType, number>;
  overdue_projects: number;
};

export type InvoiceStats = {
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
  total_overdue: number;
  invoices_by_status: Record<InvoiceStatus, number>;
  average_payment_time: number;
};

export type ExpenseStats = {
  total_expenses: number;
  billable_expenses: number;
  non_billable_expenses: number;
  expenses_by_category: Record<ExpenseCategory, number>;
};

export type DashboardStats = {
  projects: ProjectStats;
  invoices: InvoiceStats;
  expenses: ExpenseStats;
  recent_activity: ActivityLog[];
  upcoming_deadlines: Project[];
};
