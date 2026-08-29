'use server';

import { z } from 'zod';

import { requireAdmin, requireUser } from '@/lib/auth-helpers';
import { createAdminClient } from '@/lib/supabase/admin';
import type { BankDetails } from '@/lib/payment-instructions';
import type { ActionResult } from '@/types';

export type CompanySettings = {
  company_name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  vat_number: string | null;
  tax_office: string | null;
  profession: string | null;
  primary_color: string | null;
  bank_beneficiary: string | null;
  bank_iban: string | null;
  bank_name: string | null;
};

const EMPTY_BANK_DETAILS: BankDetails = { beneficiary: null, iban: null, bankName: null };

const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  company_name: 'ΝΤΕΒΡΕΝΤΛΗΣ ΑΓΓΕΛΟΣ ΝΙΚΟΛΑΟΣ',
  logo_url: null,
  address: 'ΣΟΦΟΥΛΗ ΘΕΜΙΣΤΟΚΛΗ 88, ΚΑΛΑΜΑΡΙΑ',
  phone: null,
  email: null,
  vat_number: '160594763',
  tax_office: 'ΚΑΛΑΜΑΡΙΑΣ',
  profession: 'ΥΠΗΡΕΣΙΕΣ ΦΩΤΟΓΡΑΦΙΣΗΣ ΚΑΙ ΒΙΝΤΕΟΣΚΟΠΗΣΗΣ',
  primary_color: null,
  bank_beneficiary: null,
  bank_iban: null,
  bank_name: null,
};

/**
 * Η αποθηκευμένη τιμή είναι jsonb — μπορεί να γράφτηκε πριν υπάρξουν τα τραπεζικά
 * πεδία, ή να μην είναι καν αντικείμενο. Την περνάμε από σχήμα και τη στρώνουμε
 * πάνω στις προεπιλογές, ώστε κάθε πεδίο να υπάρχει και μετά από παλιά εγγραφή.
 */
const storedCompanySettingsSchema = z
  .object({
    company_name: z.string(),
    logo_url: z.string().nullable(),
    address: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    vat_number: z.string().nullable(),
    tax_office: z.string().nullable(),
    profession: z.string().nullable(),
    primary_color: z.string().nullable(),
    bank_beneficiary: z.string().nullable(),
    bank_iban: z.string().nullable(),
    bank_name: z.string().nullable(),
  })
  .partial();

const toCompanySettings = (value: unknown): CompanySettings => {
  const parsed = storedCompanySettingsSchema.safeParse(value);
  if (!parsed.success) return DEFAULT_COMPANY_SETTINGS;
  return { ...DEFAULT_COMPANY_SETTINGS, ...parsed.data };
};

export type NotificationSettings = {
  email_new_project: boolean;
  email_project_deadline: boolean;
  email_invoice_paid: boolean;
  email_new_message: boolean;
  email_deliverable_feedback: boolean;
};

export async function getCompanySettings(): Promise<ActionResult<CompanySettings>> {
  try {
    const { supabase, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    // For now, we'll use a simple approach with a settings table
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('key', 'company_settings')
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" - acceptable for first load
      return { data: null, error: error.message };
    }

    return { data: toCompanySettings(data?.value), error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch company settings',
    };
  }
}

export async function updateCompanySettings(
  settings: CompanySettings,
): Promise<ActionResult<CompanySettings>> {
  try {
    const { supabase, error: authError } = await requireAdmin();
    if (authError) return { data: null, error: authError };

    const { error } = await supabase.from('settings').upsert({
      key: 'company_settings',
      value: settings,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: settings, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update company settings',
    };
  }
}

/**
 * Τα τραπεζικά στοιχεία, όπως τα βλέπει ο πελάτης στις οδηγίες πληρωμής.
 *
 * Ο πίνακας `settings` είναι σκόπιμα κλειστός σε όλους πλην διαχειριστών: η
 * γραμμή `company_settings` κουβαλά ΟΛΟ το προφίλ της εταιρείας (ΑΦΜ, ΔΟΥ,
 * διεύθυνση), και μια πολιτική RLS «ο καθένας διαβάζει αυτή τη γραμμή» θα τα
 * έδινε όλα. Γι' αυτό διαβάζουμε εδώ με τον admin client, ΑΦΟΥ βεβαιωθούμε ότι
 * υπάρχει συνδεδεμένος χρήστης, και επιστρέφουμε ΜΟΝΟ τα τρία τραπεζικά πεδία.
 * Το φίλτρο ζει σε μία συνάρτηση που διαβάζεται, όχι σε μια πολιτική που
 * υπόσχεται λιγότερα απ' όσα δίνει.
 */
export async function getBankDetails(): Promise<ActionResult<BankDetails>> {
  try {
    const { error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

    const { data, error } = await createAdminClient()
      .from('settings')
      .select('value')
      .eq('key', 'company_settings')
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    if (!data) return { data: EMPTY_BANK_DETAILS, error: null };

    const settings = toCompanySettings(data.value);

    return {
      data: {
        beneficiary: settings.bank_beneficiary,
        iban: settings.bank_iban,
        bankName: settings.bank_name,
      },
      error: null,
    };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch bank details',
    };
  }
}

export async function getNotificationSettings(
  userId: string,
): Promise<ActionResult<NotificationSettings>> {
  try {
    const { supabase, user, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const isAdmin = profile && ['super_admin', 'admin'].includes(profile.role);
    if (!isAdmin && user.id !== userId) {
      return { data: null, error: "Forbidden: cannot access another user's settings" };
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('preferences')
      .eq('id', userId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    const preferences = (data?.preferences as Record<string, unknown>) || {};
    const settings: NotificationSettings = {
      email_new_project:
        preferences.email_new_project !== undefined ? Boolean(preferences.email_new_project) : true,
      email_project_deadline:
        preferences.email_project_deadline !== undefined
          ? Boolean(preferences.email_project_deadline)
          : true,
      email_invoice_paid:
        preferences.email_invoice_paid !== undefined
          ? Boolean(preferences.email_invoice_paid)
          : true,
      email_new_message:
        preferences.email_new_message !== undefined ? Boolean(preferences.email_new_message) : true,
      email_deliverable_feedback:
        preferences.email_deliverable_feedback !== undefined
          ? Boolean(preferences.email_deliverable_feedback)
          : true,
    };

    return { data: settings, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch notification settings',
    };
  }
}

export async function updateNotificationSettings(
  userId: string,
  settings: NotificationSettings,
): Promise<ActionResult<NotificationSettings>> {
  try {
    const { supabase, user, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const isAdmin = profile && ['super_admin', 'admin'].includes(profile.role);
    if (!isAdmin && user.id !== userId) {
      return { data: null, error: "Forbidden: cannot update another user's settings" };
    }

    // Get current preferences
    const { data: currentData } = await supabase
      .from('user_profiles')
      .select('preferences')
      .eq('id', userId)
      .single();

    const currentPreferences = (currentData?.preferences as Record<string, unknown>) || {};
    const updatedPreferences = {
      ...currentPreferences,
      ...settings,
    };

    const { error } = await supabase
      .from('user_profiles')
      .update({ preferences: updatedPreferences })
      .eq('id', userId);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: settings, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update notification settings',
    };
  }
}
