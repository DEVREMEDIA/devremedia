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
