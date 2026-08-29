import { describe, it, expect } from 'vitest';
import {
  buildProfileView,
  type ClientIdentity,
  type ProfileFieldKey,
  type ProfileRole,
} from './profile-view';

const fullClient: ClientIdentity = {
  company_name: 'Marvera Shipping ΕΕ',
  contact_name: 'Χρήστος Ντόντης',
  phone: '+30 210 1234567',
  address: 'Λεωφ. Κηφισίας 12, Αθήνα',
  vat_number: 'EL123456789',
};

const labels = (fields: readonly { labelKey: ProfileFieldKey }[]): ProfileFieldKey[] =>
  fields.map((f) => f.labelKey);

const teamRoles: ProfileRole[] = ['employee', 'salesman', 'admin', 'super_admin'];

describe('buildProfileView — client', () => {
  it('lists every client field in order, with email last', () => {
    const view = buildProfileView({
      role: 'client',
      client: fullClient,
      email: 'info@marvera.gr',
    });

    expect(labels(view.fields)).toEqual([
      'companyName',
      'contactName',
      'phone',
      'address',
      'vatNumber',
      'email',
    ]);
  });

  it('carries the admin-entered values through untouched', () => {
    const view = buildProfileView({
      role: 'client',
      client: fullClient,
      email: 'info@marvera.gr',
    });

    expect(view.fields.map((f) => f.value)).toEqual([
      'Marvera Shipping ΕΕ',
      'Χρήστος Ντόντης',
      '+30 210 1234567',
      'Λεωφ. Κηφισίας 12, Αθήνα',
      'EL123456789',
      'info@marvera.gr',
    ]);
  });

  it('omits missing optional fields instead of showing blanks', () => {
    const view = buildProfileView({
      role: 'client',
      client: { company_name: 'Devre', contact_name: 'Τζένη', vat_number: null },
      email: 'jenny@devre.gr',
    });

    expect(labels(view.fields)).toEqual(['companyName', 'contactName', 'email']);
  });

  it('treats whitespace-only values as missing', () => {
    const view = buildProfileView({
      role: 'client',
      client: { contact_name: 'Τζένη', company_name: '   ', address: '' },
      email: 'jenny@devre.gr',
    });

    expect(labels(view.fields)).toEqual(['contactName', 'email']);
  });

  it('names the avatar after the contact, falling back to the company', () => {
    expect(buildProfileView({ role: 'client', client: fullClient, email: 'a@b.gr' }).name).toBe(
      'Χρήστος Ντόντης',
    );
    expect(
      buildProfileView({ role: 'client', client: { company_name: 'Devre' }, email: 'a@b.gr' }).name,
    ).toBe('Devre');
  });

  it('falls back to the team shape when a client has no client row yet', () => {
    const view = buildProfileView({
      role: 'client',
      client: null,
      profile: { display_name: 'Νέος Πελάτης' },
      email: 'new@devre.gr',
    });

    expect(labels(view.fields)).toEqual(['displayName', 'email']);
  });
});

describe('buildProfileView — team', () => {
  it.each(teamRoles)('shows only name and email for %s', (role) => {
    const view = buildProfileView({
      role,
      profile: { display_name: 'Μαρία Παπαδοπούλου' },
      email: 'maria@devremedia.gr',
    });

    expect(labels(view.fields)).toEqual(['displayName', 'email']);
  });

  it('never leaks client-only fields even when a client row is passed', () => {
    const view = buildProfileView({
      role: 'employee',
      profile: { display_name: 'Μαρία' },
      client: fullClient,
      email: 'maria@devremedia.gr',
    });

    expect(labels(view.fields)).toEqual(['displayName', 'email']);
  });

  it('still shows the email when the display name is missing', () => {
    const view = buildProfileView({
      role: 'salesman',
      profile: { display_name: null },
      email: 'sales@devremedia.gr',
    });

    expect(labels(view.fields)).toEqual(['email']);
  });
});

describe('buildProfileView — invariants', () => {
  const allRoles: ProfileRole[] = ['client', ...teamRoles];

  it.each(allRoles)('marks every field read-only for %s', (role) => {
    const view = buildProfileView({
      role,
      client: fullClient,
      profile: { display_name: 'Κάποιος' },
      email: 'someone@devre.gr',
    });

    expect(view.fields.every((f) => f.readOnly)).toBe(true);
  });

  it.each(allRoles)('always includes the email field for %s', (role) => {
    const view = buildProfileView({ role, client: fullClient, email: 'someone@devre.gr' });

    expect(labels(view.fields)).toContain('email');
  });

  it('keeps an email field even when the address is unknown', () => {
    const view = buildProfileView({ role: 'client', client: fullClient });

    expect(view.fields.at(-1)).toEqual({ labelKey: 'email', value: '', readOnly: true });
  });

  it.each(allRoles)('exposes avatar and password as the only editables for %s', (role) => {
    const view = buildProfileView({ role, client: fullClient, email: 'someone@devre.gr' });

    expect(view.editable).toEqual({ avatar: true, password: true });
  });
});
