import { describe, it, expect } from 'vitest';
import { decideStatusEffects } from './status-effects';

describe('decideStatusEffects — project', () => {
  it('notifies the client and revalidates the project paths on any status', () => {
    const effects = decideStatusEffects({
      entity: 'project',
      status: 'in_progress',
      ctx: { entityId: 'p1', title: 'Acme — Promo', clientId: 'c1' },
    });

    expect(effects.notifications).toEqual([
      {
        recipient: { kind: 'clientByProject', projectId: 'p1' },
        type: 'project_status',
        title: 'Project "Acme — Promo" status updated to in_progress',
        actionUrl: '/client/projects/p1',
      },
    ]);
    expect(effects.email).toBeNull();
    expect(effects.calendarSync).toBe(false);
    expect(effects.revalidate).toEqual([
      '/admin/productions',
      '/admin/projects/p1',
      '/client/productions',
      '/client/projects/p1',
      '/client/home',
    ]);
  });

  it('fires the project_delivered email when delivered with a client_id', () => {
    const effects = decideStatusEffects({
      entity: 'project',
      status: 'delivered',
      ctx: { entityId: 'p1', title: 'Acme — Promo', clientId: 'c1' },
    });

    expect(effects.email).toEqual({
      trigger: 'project_delivered',
      payload: { projectId: 'p1', projectTitle: 'Acme — Promo', clientId: 'c1' },
    });
  });

  it('does NOT fire the delivered email when client_id is missing', () => {
    const effects = decideStatusEffects({
      entity: 'project',
      status: 'delivered',
      ctx: { entityId: 'p1', title: 'Acme — Promo', clientId: null },
    });

    expect(effects.email).toBeNull();
  });

  it('requests calendar sync only when entering filming', () => {
    expect(
      decideStatusEffects({
        entity: 'project',
        status: 'filming',
        ctx: { entityId: 'p1', title: 'X', clientId: 'c1' },
      }).calendarSync,
    ).toBe(true);
  });
});

describe('decideStatusEffects — invoice', () => {
  const sentCtx = {
    entityId: 'inv1',
    clientId: 'c1',
    invoiceNumber: 'DMS-2026-001',
    total: 1234.5,
    currency: 'EUR',
    dueDate: '2026-07-01',
  };

  it('notifies the client and fires invoice_sent email on sent', () => {
    const effects = decideStatusEffects({ entity: 'invoice', status: 'sent', ctx: sentCtx });

    expect(effects.notifications).toEqual([
      {
        recipient: { kind: 'clientByClient', clientId: 'c1' },
        type: 'invoice_sent',
        title: 'Invoice DMS-2026-001 sent',
        body: 'Amount: €1234.50',
        actionUrl: '/client/invoices',
      },
    ]);
    expect(effects.email).toEqual({
      trigger: 'invoice_sent',
      payload: {
        invoiceId: 'inv1',
        clientId: 'c1',
        invoiceNumber: 'DMS-2026-001',
        total: 1234.5,
        currency: 'EUR',
        dueDate: '2026-07-01',
      },
    });
    expect(effects.revalidate).toEqual([
      '/admin/finance',
      '/admin/invoices/inv1',
      '/client/documents',
      '/client/home',
    ]);
  });

  it('emits nothing notification/email-wise on sent without a client_id', () => {
    const effects = decideStatusEffects({
      entity: 'invoice',
      status: 'sent',
      ctx: { ...sentCtx, clientId: null },
    });
    expect(effects.notifications).toEqual([]);
    expect(effects.email).toBeNull();
  });

  it('notifies admins on paid and treats a null total as 0.00', () => {
    const effects = decideStatusEffects({
      entity: 'invoice',
      status: 'paid',
      ctx: { entityId: 'inv1', invoiceNumber: 'DMS-2026-002', total: null },
    });

    expect(effects.notifications).toEqual([
      {
        recipient: { kind: 'admins' },
        type: 'invoice_paid',
        title: 'Invoice DMS-2026-002 paid',
        body: 'Amount: €0.00',
        actionUrl: '/admin/invoices',
      },
    ]);
    expect(effects.email).toBeNull();
    expect(effects.revalidate).toEqual([
      '/admin/finance',
      '/admin/invoices/inv1',
      '/client/documents',
      '/client/home',
    ]);
  });

  it('emits no notifications/email for a neutral status but still revalidates', () => {
    const effects = decideStatusEffects({
      entity: 'invoice',
      status: 'draft',
      ctx: { entityId: 'inv1', invoiceNumber: 'DMS-2026-003', total: 50 },
    });
    expect(effects.notifications).toEqual([]);
    expect(effects.email).toBeNull();
    expect(effects.calendarSync).toBe(false);
    expect(effects.revalidate).toEqual([
      '/admin/finance',
      '/admin/invoices/inv1',
      '/client/documents',
      '/client/home',
    ]);
  });
});

describe('decideStatusEffects — deliverable', () => {
  it('admin change notifies client + uploader and revalidates all 5 paths', () => {
    const effects = decideStatusEffects({
      entity: 'deliverable',
      status: 'approved',
      ctx: {
        entityId: 'd1',
        title: 'Cut v2',
        projectId: 'p1',
        actorId: 'admin1',
        actorRole: 'admin',
        uploadedBy: 'emp1',
      },
    });

    expect(effects.notifications).toEqual([
      {
        recipient: { kind: 'clientByProject', projectId: 'p1' },
        type: 'deliverable_reviewed',
        title: 'Deliverable "Cut v2" marked as approved',
        actionUrl: '/client/projects/p1',
      },
      {
        recipient: { kind: 'user', id: 'emp1' },
        type: 'deliverable_reviewed',
        title: 'Deliverable "Cut v2" marked as approved',
        actionUrl: '/employee/deliverables/p1',
      },
    ]);
    expect(effects.revalidate).toEqual([
      '/admin/projects/p1',
      '/client/projects/p1',
      '/client/home',
      '/employee/deliverables/p1',
      '/employee/projects/p1',
    ]);
  });

  it('admin change does NOT notify the uploader when the admin is the uploader', () => {
    const effects = decideStatusEffects({
      entity: 'deliverable',
      status: 'approved',
      ctx: {
        entityId: 'd1',
        title: 'Cut v2',
        projectId: 'p1',
        actorId: 'admin1',
        actorRole: 'super_admin',
        uploadedBy: 'admin1',
      },
    });
    expect(effects.notifications).toHaveLength(1);
    expect(effects.notifications[0].recipient).toEqual({
      kind: 'clientByProject',
      projectId: 'p1',
    });
  });

  it('non-admin (client) change notifies admins only', () => {
    const effects = decideStatusEffects({
      entity: 'deliverable',
      status: 'changes_requested',
      ctx: {
        entityId: 'd1',
        title: 'Cut v2',
        projectId: 'p1',
        actorId: 'client1',
        actorRole: 'client',
        uploadedBy: 'emp1',
      },
    });

    expect(effects.notifications).toEqual([
      {
        recipient: { kind: 'admins' },
        type: 'deliverable_reviewed',
        title: 'Deliverable "Cut v2" marked as changes_requested',
        actionUrl: '/admin/projects/p1',
      },
    ]);
  });

  it('emits nothing when projectId is missing', () => {
    const effects = decideStatusEffects({
      entity: 'deliverable',
      status: 'approved',
      ctx: { entityId: 'd1', title: 'Cut v2', projectId: null, actorRole: 'admin' },
    });
    expect(effects).toEqual({
      notifications: [],
      email: null,
      calendarSync: false,
      revalidate: [],
    });
  });
});

describe('decideStatusEffects — task', () => {
  it('notifies the assignee when someone else changed the status', () => {
    const effects = decideStatusEffects({
      entity: 'task',
      status: 'in_progress',
      ctx: {
        entityId: 't1',
        title: 'Edit reel',
        projectId: 'p1',
        actorId: 'admin1',
        assignedTo: 'emp1',
      },
    });

    expect(effects.notifications).toEqual([
      {
        recipient: { kind: 'user', id: 'emp1' },
        type: 'task_updated',
        title: 'Task "Edit reel" status changed to in_progress',
        actionUrl: '/employee/tasks/t1',
      },
    ]);
    expect(effects.revalidate).toEqual(['/admin/projects/p1', '/employee/work', '/employee/today']);
  });

  it('notifies admins when the assignee changed their own task', () => {
    const effects = decideStatusEffects({
      entity: 'task',
      status: 'completed',
      ctx: {
        entityId: 't1',
        title: 'Edit reel',
        projectId: 'p1',
        actorId: 'emp1',
        assignedTo: 'emp1',
      },
    });

    expect(effects.notifications).toEqual([
      {
        recipient: { kind: 'admins' },
        type: 'task_updated',
        title: 'Task "Edit reel" marked as completed',
        actionUrl: '/admin/projects/p1?tab=tasks',
      },
    ]);
  });

  it('emits no notification for an unassigned task but still revalidates', () => {
    const effects = decideStatusEffects({
      entity: 'task',
      status: 'todo',
      ctx: {
        entityId: 't1',
        title: 'Edit reel',
        projectId: 'p1',
        actorId: 'admin1',
        assignedTo: null,
      },
    });
    expect(effects.notifications).toEqual([]);
    expect(effects.revalidate).toEqual(['/admin/projects/p1', '/employee/work', '/employee/today']);
  });

  it('omits the admin-project path when projectId is missing', () => {
    const effects = decideStatusEffects({
      entity: 'task',
      status: 'todo',
      ctx: {
        entityId: 't1',
        title: 'Edit reel',
        projectId: null,
        actorId: 'admin1',
        assignedTo: null,
      },
    });
    expect(effects.revalidate).toEqual(['/employee/work', '/employee/today']);
  });
});
