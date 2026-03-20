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
  Expense,
  EquipmentList,
  ShotList,
  ConceptNote,
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

export type CreateClientInput = Omit<Client, 'id' | 'created_at' | 'updated_at'>;

export type UpdateClientInput = Partial<CreateClientInput>;

export type CreateProjectInput = Omit<Project, 'id' | 'created_at' | 'updated_at' | 'created_by'>;

export type UpdateProjectInput = Partial<CreateProjectInput>;

export type CreateTaskInput = Omit<Task, 'id' | 'created_at'>;

export type UpdateTaskInput = Partial<CreateTaskInput>;

export type CreateDeliverableInput = Omit<
  Deliverable,
  'id' | 'created_at' | 'uploaded_by' | 'download_count'
>;

export type CreateInvoiceInput = Omit<
  Invoice,
  'id' | 'created_at' | 'updated_at' | 'created_by' | 'sent_at' | 'viewed_at' | 'paid_at'
>;

export type UpdateInvoiceInput = Partial<CreateInvoiceInput>;

export type CreateExpenseInput = Omit<Expense, 'id' | 'created_at'>;

export type UpdateExpenseInput = Partial<CreateExpenseInput>;

export type CreateMessageInput = Omit<Message, 'id' | 'created_at' | 'sender_id' | 'read_by'>;

export type CreateContractInput = Omit<
  Contract,
  'id' | 'created_at' | 'created_by' | 'sent_at' | 'viewed_at' | 'signed_at' | 'signature_data'
>;

export type UpdateContractInput = Partial<CreateContractInput>;

export type CreateFilmingRequestInput = Omit<
  FilmingRequest,
  'id' | 'created_at' | 'status' | 'admin_notes' | 'converted_project_id' | 'client_id'
>;

export type CreateEquipmentListInput = Omit<
  EquipmentList,
  'id' | 'created_at' | 'updated_at' | 'created_by'
>;

export type UpdateEquipmentListInput = Partial<CreateEquipmentListInput>;

export type CreateShotListInput = Omit<ShotList, 'id' | 'created_at' | 'updated_at' | 'created_by'>;

export type UpdateShotListInput = Partial<CreateShotListInput>;

export type CreateConceptNoteInput = Omit<
  ConceptNote,
  'id' | 'created_at' | 'updated_at' | 'created_by'
>;

export type UpdateConceptNoteInput = Partial<CreateConceptNoteInput>;
