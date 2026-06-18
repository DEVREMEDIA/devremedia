import type {
  UserProfile,
  Client,
  Project,
  Task,
  Deliverable,
  VideoAnnotation,
  Message,
  Invoice,
  Contract,
  FilmingRequest,
  ActivityLog,
  Lead,
  LeadActivity,
  ChatConversation,
  ChatMessage,
} from './entities';

export type ProjectWithClient = Project & {
  client: Client;
};

export type ProjectWithRelations = Project & {
  client: Client;
  tasks: Task[];
  deliverables: Deliverable[];
};

export type TaskWithAssignee = Task & {
  assigned_user: UserProfile | null;
};

export type DeliverableWithAnnotations = Deliverable & {
  annotations: VideoAnnotation[];
};

export type DeliverableWithProject = {
  id: string;
  title: string;
  status: string;
  version: number;
  created_at: string;
  project_id: string;
  project?: { title: string };
};

export type MessageWithUser = Message & {
  user: UserProfile;
};

export type InvoiceWithRelations = Invoice & {
  client: Client;
  project: Project;
  tax_rate?: number;
};

export type ContractWithRelations = Contract & {
  client: Client;
  project: Project | null;
};

export type ContractWithProject = Contract & {
  project: { id: string; title: string } | null;
};

// Phase 1: Create modes only. Edit modes use existing edit pages via navigation.
export type ClientDrawerMode =
  | { type: 'create-project'; clientId: string }
  | {
      type: 'create-invoice';
      clientId: string;
      projects: { id: string; title: string; client_id: string }[];
      nextInvoiceNumber: string;
    };

export type FilmingRequestWithProject = FilmingRequest & {
  converted_project: Project | null;
};

export type ActivityLogWithUser = ActivityLog & {
  user: UserProfile;
};

export type LeadWithActivities = Lead & {
  activities: LeadActivity[];
};

export type ChatConversationWithMessages = ChatConversation & {
  messages: ChatMessage[];
};

// Create*/Update* input types are owned by the Zod schemas in src/lib/schemas/*
// (z.infer of the create/update schemas). Server actions take `input: unknown`
// and validate at the boundary with those schemas, so the hand-written Omit-based
// duplicates that used to live here were unused and drifted — removed in #52.
// This file holds relation/join types only.
