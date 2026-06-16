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
      '/admin/projects',
      '/admin/projects/p1',
      '/client/projects',
      '/client/projects/p1',
      '/client/dashboard',
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
      '/admin/invoices',
      '/admin/invoices/inv1',
      '/client/invoices',
      '/client/dashboard',
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
      '/admin/invoices',
      '/admin/invoices/inv1',
      '/client/invoices',
      '/client/dashboard',
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
      '/admin/invoices',
      '/admin/invoices/inv1',
      '/client/invoices',
      '/client/dashboard',
    ]);
  });
});
