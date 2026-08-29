'use server';

import { requireUser } from '@/lib/auth-helpers';
import { buildProfileView, type ProfileRole, type ProfileView } from '@/lib/profile-view';
import type { ActionResult } from '@/types';

export type MyProfile = ProfileView & { avatarUrl: string | null };

const TEAM_ROLES: readonly ProfileRole[] = ['employee', 'salesman', 'admin', 'super_admin'];

/**
 * Άγνωστος ρόλος πέφτει στο `employee`, δηλαδή στη ΣΤΕΝΟΤΕΡΗ προβολή (όνομα
 * και email). Ποτέ στο `client`: μια χαλασμένη τιμή ρόλου δεν πρέπει να ανοίγει
 * πεδία εταιρείας.
 */
const asTeamRole = (role: unknown): ProfileRole => TEAM_ROLES.find((r) => r === role) ?? 'employee';

/**
 * Το Προφίλ του συνδεδεμένου χρήστη, όπως το κατέγραψε η διαχείριση.
 *
 * Για πελάτη, τα στοιχεία ταυτότητας διαβάζονται από τη ΔΙΚΗ ΤΟΥ γραμμή στο
 * `clients` — τη μία πηγή αλήθειας. Δεν αντιγράφονται στο `user_profiles` και
 * δεν γράφονται ποτέ από εδώ.
 *
 * Σε αντίθεση με το `getMyAgreement`, εδώ ΔΕΝ χρειάζεται admin client: η
 * πολιτική RLS «Clients can view own record» (00003, αμετάβλητη έκτοτε)
 * επιτρέπει ρητά `select` στη γραμμή με `user_id = auth.uid()`. Ένα μέλος της
 * ομάδας απλώς δεν βρίσκει γραμμή — που είναι ακριβώς η σωστή απάντηση, όχι
 * σφάλμα.
 */
export async function getMyProfile(): Promise<ActionResult<MyProfile>> {
  try {
    const { supabase, user, error: authError } = await requireUser();
    if (authError) return { data: null, error: authError };

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, display_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) return { data: null, error: profileError.message };

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('company_name, contact_name, phone, address, vat_number')
      .eq('user_id', user.id)
      .maybeSingle();

    if (clientError) return { data: null, error: clientError.message };

    // Πελάτης είναι όποιος ΕΧΕΙ γραμμή στο `clients` συνδεδεμένη με τον χρήστη
    // του — αυτός είναι ο ορισμός, όχι μια τιμή σε στήλη ρόλου.
    const role: ProfileRole = client ? 'client' : asTeamRole(profile?.role);

    const view = buildProfileView({
      role,
      profile: profile ? { display_name: profile.display_name } : null,
      client,
      email: user.email,
    });

    return { data: { ...view, avatarUrl: profile?.avatar_url ?? null }, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to load profile',
    };
  }
}
