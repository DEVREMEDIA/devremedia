import { requireEnv } from './env';
import type { FixtureDb } from './supabase-admin';

/**
 * The individual record builders behind the seed.
 *
 * Column values are taken from `supabase/migrations/` and the status arrays in
 * `src/lib/constants/enums.ts` — nothing here is guessed. One trap worth naming:
 * the `CONTRACT_STATUSES` array in constants contains 'pending_review', but the
 * CHECK constraint from `00002_core_tables.sql` does not allow it, so the
 * contracts here use only draft / sent / signed.
 */

export interface SeedNames {
  readonly runId: string;
  readonly namespace: string;
}

export interface OwnerIds {
  readonly clientId: string;
  readonly projectId: string;
  readonly adminId: string;
}

export const isoDate = (offsetDays: number): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

async function insertRow(
  db: FixtureDb,
  table: string,
  row: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await db.from(table).insert(row).select('id').single();
  if (error) throw new Error(`insert into ${table} failed: ${error.message}`);
  return (data as { id: string }).id;
}

async function createAuthUser(
  db: FixtureDb,
  input: { email: string; password: string; role: 'admin' | 'client'; displayName: string },
): Promise<string> {
  const { data, error } = await db.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { role: input.role, display_name: input.displayName },
  });
  if (error) throw new Error(`createUser(${input.email}) failed: ${error.message}`);

  const id = data.user?.id;
  if (!id) throw new Error(`createUser(${input.email}) returned no user`);

  // handle_new_user() reads `role` from the metadata above, but that trigger is
  // a moving target across migrations 00001/00016/00020/00051. Set the role
  // explicitly so the fixture does not depend on which version is deployed.
  const { error: profileError } = await db
    .from('user_profiles')
    .update({ role: input.role, display_name: input.displayName })
    .eq('id', id);
  if (profileError) {
    throw new Error(`setting role for ${input.email} failed: ${profileError.message}`);
  }

  return id;
}

export async function seedUsers(db: FixtureDb, names: SeedNames) {
  const adminEmail = `e2e-${names.runId}-admin@devre.test`;
  const clientEmail = `e2e-${names.runId}-client@devre.test`;
  const adminDisplayName = `${names.namespace} Admin`;
  const clientDisplayName = `${names.namespace} Client`;

  const adminId = await createAuthUser(db, {
    email: adminEmail,
    password: requireEnv('E2E_ADMIN_PASSWORD'),
    role: 'admin',
    displayName: adminDisplayName,
  });

  const clientId = await createAuthUser(db, {
    email: clientEmail,
    password: requireEnv('E2E_CLIENT_PASSWORD'),
    role: 'client',
    displayName: clientDisplayName,
  });

  return {
    admin: { id: adminId, email: adminEmail, role: 'admin', displayName: adminDisplayName },
    client: { id: clientId, email: clientEmail, role: 'client', displayName: clientDisplayName },
  } as const;
}

export async function seedClients(db: FixtureDb, names: SeedNames, clientUserId: string) {
  const companyName = `${names.namespace} Acme Films`;
  const contactName = `${names.namespace} Contact`;
  const email = `e2e-${names.runId}-client@devre.test`;

  const clientId = await insertRow(db, 'clients', {
    user_id: clientUserId,
    company_name: companyName,
    contact_name: contactName,
    email,
    phone: '+30 210 0000000',
    address: 'Test Street 1, Athens',
    vat_number: 'EL000000000',
    status: 'active',
  });

  const emptyCompanyName = `${names.namespace} Empty Co`;
  const emptyContactName = `${names.namespace} Empty Contact`;
  const emptyEmail = `e2e-${names.runId}-empty@devre.test`;

  const emptyId = await insertRow(db, 'clients', {
    company_name: emptyCompanyName,
    contact_name: emptyContactName,
    email: emptyEmail,
    status: 'active',
  });

  return {
    client: { id: clientId, companyName, contactName, email, userId: clientUserId },
    emptyClient: {
      id: emptyId,
      companyName: emptyCompanyName,
      contactName: emptyContactName,
      email: emptyEmail,
      userId: null,
    },
  } as const;
}

export async function seedProjects(
  db: FixtureDb,
  names: SeedNames,
  clientId: string,
  adminId: string,
) {
  const activeTitle = `${names.namespace} Brand Film`;
  const deliveredTitle = `${names.namespace} Delivered Spot`;

  const activeId = await insertRow(db, 'projects', {
    client_id: clientId,
    title: activeTitle,
    description: 'Seeded by the E2E fixture layer.',
    project_type: 'corporate_video',
    status: 'filming',
    priority: 'high',
    start_date: isoDate(-7),
    deadline: isoDate(21),
    budget: 5000,
    created_by: adminId,
  });

  const deliveredId = await insertRow(db, 'projects', {
    client_id: clientId,
    title: deliveredTitle,
    description: 'Seeded by the E2E fixture layer.',
    project_type: 'commercial',
    status: 'delivered',
    priority: 'medium',
    start_date: isoDate(-60),
    deadline: isoDate(-10),
    budget: 3000,
    created_by: adminId,
  });

  return {
    active: { id: activeId, title: activeTitle, status: 'filming', projectType: 'corporate_video' },
    delivered: {
      id: deliveredId,
      title: deliveredTitle,
      status: 'delivered',
      projectType: 'commercial',
    },
  } as const;
}

export async function seedProjectWork(
  db: FixtureDb,
  names: SeedNames,
  projectId: string,
  adminId: string,
) {
  const taskTitle = `${names.namespace} Storyboard review`;
  const taskId = await insertRow(db, 'tasks', {
    project_id: projectId,
    assigned_to: adminId,
    title: taskTitle,
    description: 'Seeded task.',
    status: 'todo',
    priority: 'medium',
    due_date: isoDate(5),
    created_by: adminId,
  });

  const deliverableTitle = `${names.namespace} Rough cut v1`;
  const deliverableId = await insertRow(db, 'deliverables', {
    project_id: projectId,
    title: deliverableTitle,
    description: 'Seeded deliverable — link only, no storage object.',
    file_path: 'https://drive.example.test/e2e-rough-cut-v1',
    status: 'pending_review',
    version: 1,
    uploaded_by: adminId,
    created_by: adminId,
  });

  const messageContent = `${names.namespace} first message from the team`;
  const messageId = await insertRow(db, 'messages', {
    project_id: projectId,
    sender_id: adminId,
    content: messageContent,
    channel: 'client',
  });

  return {
    task: { id: taskId, title: taskTitle, status: 'todo' },
    deliverable: { id: deliverableId, title: deliverableTitle, status: 'pending_review' },
    message: { id: messageId, content: messageContent },
  } as const;
}

export async function seedContracts(db: FixtureDb, names: SeedNames, ids: OwnerIds) {
  const now = new Date().toISOString();

  const make = (title: string, extra: Record<string, unknown>): Promise<string> =>
    insertRow(db, 'contracts', {
      client_id: ids.clientId,
      project_id: ids.projectId,
      title,
      content: 'Seeded contract body for the E2E suite.',
      service_type: 'corporate_video',
      agreed_amount: 2500,
      locale: 'el',
      created_by: ids.adminId,
      ...extra,
    });

  const draftTitle = `${names.namespace} Draft Agreement`;
  const sentTitle = `${names.namespace} Awaiting Signature`;
  const signedTitle = `${names.namespace} Signed Agreement`;

  const draftId = await make(draftTitle, { status: 'draft' });
  const sentId = await make(sentTitle, { status: 'sent', sent_at: now });
  const signedId = await make(signedTitle, {
    status: 'signed',
    sent_at: now,
    viewed_at: now,
    signed_at: now,
    signature_data: {
      signature: 'data:image/png;base64,e2e',
      ip: '127.0.0.1',
      user_agent: 'e2e-fixture',
      signed_at: now,
    },
  });

  return {
    draft: { id: draftId, title: draftTitle, status: 'draft' },
    sent: { id: sentId, title: sentTitle, status: 'sent' },
    signed: { id: signedId, title: signedTitle, status: 'signed' },
  } as const;
}

export async function seedInvoices(db: FixtureDb, names: SeedNames, ids: OwnerIds) {
  const now = new Date().toISOString();

  const make = (invoiceNumber: string, extra: Record<string, unknown>): Promise<string> =>
    insertRow(db, 'invoices', {
      invoice_number: invoiceNumber,
      client_id: ids.clientId,
      project_id: ids.projectId,
      issue_date: isoDate(-14),
      subtotal: 1000,
      tax_rate: 24,
      tax_amount: 240,
      total: 1240,
      currency: 'EUR',
      line_items: [{ description: 'Production day', quantity: 1, unit_price: 1000, total: 1000 }],
      created_by: ids.adminId,
      ...extra,
    });

  const paidNumber = `${names.namespace}-PAID`;
  const unpaidNumber = `${names.namespace}-UNPAID`;

  const paidId = await make(paidNumber, {
    status: 'paid',
    due_date: isoDate(-1),
    payment_method: 'bank_transfer',
    sent_at: now,
    paid_at: now,
  });

  const unpaidId = await make(unpaidNumber, {
    status: 'sent',
    due_date: isoDate(21),
    sent_at: now,
  });

  return {
    paid: { id: paidId, number: paidNumber, status: 'paid', total: 1240 },
    unpaid: { id: unpaidId, number: unpaidNumber, status: 'sent', total: 1240 },
  } as const;
}

export async function seedFilmingRequest(db: FixtureDb, names: SeedNames, clientId: string) {
  const title = `${names.namespace} Filming Request`;

  const id = await insertRow(db, 'filming_requests', {
    client_id: clientId,
    title,
    description: 'Seeded filming request.',
    location: 'Athens Studio',
    project_type: 'corporate_video',
    budget_range: '2000-5000',
    status: 'pending',
    preferred_dates: [isoDate(14), isoDate(15)],
    contact_name: `${names.namespace} Contact`,
    contact_email: `e2e-${names.runId}-client@devre.test`,
    contact_phone: '+30 210 0000000',
    contact_company: `${names.namespace} Acme Films`,
  });

  return { id, title, status: 'pending' } as const;
}

export async function seedLead(db: FixtureDb, names: SeedNames, adminId: string) {
  const contactName = `${names.namespace} Lead Contact`;
  const companyName = `${names.namespace} Prospect Ltd`;
  const email = `e2e-${names.runId}-lead@devre.test`;

  const id = await insertRow(db, 'leads', {
    contact_name: contactName,
    email,
    phone: '+30 210 1111111',
    company_name: companyName,
    source: 'website',
    stage: 'new',
    deal_value: 4000,
    probability: 20,
    assigned_to: adminId,
    expected_close_date: isoDate(30),
  });

  return { id, contactName, companyName, email, stage: 'new' } as const;
}
