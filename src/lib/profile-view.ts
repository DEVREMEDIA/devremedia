/**
 * Το Προφίλ είναι ΚΑΘΡΕΦΤΗΣ, όχι φόρμα.
 *
 * Τα στοιχεία ταυτότητας ενός πελάτη ζουν σε ΕΝΑ μέρος — τη γραμμή του στον
 * πίνακα `clients`, όπως τα καταχώρησε η διαχείριση. Η παλιά φόρμα προσπαθούσε
 * να γράψει `full_name` / `company_name` / `phone` στο `user_profiles`, στήλες
 * που δεν υπήρξαν ποτέ εκεί: έδειχνε κενά και η αποθήκευση αποτύγχανε σιωπηλά.
 * Η θεραπεία δεν είναι δεύτερο αντίγραφο των στοιχείων — είναι να πάψει το
 * Προφίλ να διεκδικεί κυριότητα που δεν έχει.
 *
 * Αυτό το module είναι καθαρό: δεν ξέρει από i18n (γυρίζει ΚΛΕΙΔΙΑ ετικετών,
 * τα οποία το component περνά στο `t()`), δεν ξέρει από Supabase, δεν γράφει
 * πουθενά.
 */

export type ProfileRole = 'client' | 'employee' | 'salesman' | 'admin' | 'super_admin';

/** Κλειδί i18n της ετικέτας ΚΑΙ ταυτότητα του πεδίου — ένα πράγμα, όχι δύο. */
export type ProfileFieldKey =
  | 'companyName'
  | 'contactName'
  | 'phone'
  | 'address'
  | 'vatNumber'
  | 'displayName'
  | 'email';

export type ProfileField = {
  readonly labelKey: ProfileFieldKey;
  readonly value: string;
  /** Δεν είναι διακόπτης — είναι δήλωση. Κανένα πεδίο ταυτότητας δεν γράφεται εδώ. */
  readonly readOnly: true;
};

export type ProfileEditable = {
  readonly avatar: true;
  readonly password: true;
};

export type ProfileView = {
  readonly role: ProfileRole;
  /** Το όνομα που συνοδεύει την εικόνα — όχι πεδίο της λίστας. */
  readonly name: string | null;
  readonly fields: readonly ProfileField[];
  /** Τα ΜΟΝΑ δύο πράγματα που αλλάζει ο ίδιος ο χρήστης. */
  readonly editable: ProfileEditable;
};

/** Η γραμμή του πελάτη — η μοναδική πηγή αλήθειας για τα στοιχεία του. */
export type ClientIdentity = {
  readonly company_name?: string | null;
  readonly contact_name?: string | null;
  readonly phone?: string | null;
  readonly address?: string | null;
  readonly vat_number?: string | null;
};

/** Η γραμμή `user_profiles` — για τα μέλη της ομάδας δεν υπάρχει τίποτα άλλο. */
export type ProfileIdentity = {
  readonly display_name?: string | null;
};

export type BuildProfileViewInput = {
  readonly role: ProfileRole;
  readonly profile?: ProfileIdentity | null;
  readonly client?: ClientIdentity | null;
  readonly email?: string | null;
};

const trimmed = (value: string | null | undefined): string => (value ?? '').trim();

/** Πεδίο που λείπει δεν γίνεται κενή γραμμή — απλώς δεν μπαίνει στη λίστα. */
const field = (
  labelKey: ProfileFieldKey,
  value: string | null | undefined,
): ProfileField | null => {
  const text = trimmed(value);
  return text ? { labelKey, value: text, readOnly: true } : null;
};

const present = (fields: readonly (ProfileField | null)[]): readonly ProfileField[] =>
  fields.filter((f): f is ProfileField => f !== null);

const EDITABLE: ProfileEditable = { avatar: true, password: true };

/** Το email είναι η ταυτότητα σύνδεσης: υπάρχει πάντα, αλλάζει ποτέ από εδώ. */
const emailField = (email: string | null | undefined): ProfileField => ({
  labelKey: 'email',
  value: trimmed(email),
  readOnly: true,
});

const clientFields = (client: ClientIdentity): readonly (ProfileField | null)[] => [
  field('companyName', client.company_name),
  field('contactName', client.contact_name),
  field('phone', client.phone),
  field('address', client.address),
  field('vatNumber', client.vat_number),
];

/**
 * Χτίζει το μοντέλο προβολής του Προφίλ.
 *
 * Πελάτης με γραμμή στο `clients` → τα στοιχεία της εταιρείας του, με τη σειρά.
 * Μέλος ομάδας (employee / salesman / admin) → όνομα και email, τίποτα άλλο:
 * τα πεδία εταιρείας δεν του ανήκουν και δεν εμφανίζονται καν κενά.
 */
export function buildProfileView({
  role,
  profile,
  client,
  email,
}: BuildProfileViewInput): ProfileView {
  const isClient = role === 'client' && Boolean(client);

  if (isClient && client) {
    const name = trimmed(client.contact_name) || trimmed(client.company_name) || null;
    return {
      role,
      name,
      fields: [...present(clientFields(client)), emailField(email)],
      editable: EDITABLE,
    };
  }

  const displayName = trimmed(profile?.display_name);
  return {
    role,
    name: displayName || null,
    fields: [...present([field('displayName', displayName)]), emailField(email)],
    editable: EDITABLE,
  };
}
