/**
 * Πώς πληρώνει ο πελάτης ένα τιμολόγιο — χωρίς κάρτα μέσα στην εφαρμογή.
 *
 * Δύο δρόμοι, με σειρά προτεραιότητας: ο κωδικός RF (ηλεκτρονική πληρωμή μέσω
 * τράπεζας, ταυτοποιεί μόνος του το τιμολόγιο) και, αν δεν υπάρχει, τα στοιχεία
 * τραπεζικού λογαριασμού. Όταν δεν υπάρχει τίποτα από τα δύο, η οθόνη δεν
 * εφευρίσκει οδηγίες — λέει στον πελάτη να επικοινωνήσει.
 *
 * Καθαρή συνάρτηση: καμία πρόσβαση σε βάση, δίκτυο ή χρόνο. Ό,τι αποφασίζει,
 * το αποφασίζει από τα ορίσματά της.
 */

export type BankDetails = {
  beneficiary: string | null;
  iban: string | null;
  bankName: string | null;
};

export type PaymentInstructions =
  | { kind: 'rf'; rfCode: string; bankDetails: BankDetails | null }
  | { kind: 'bank'; bankDetails: BankDetails }
  | { kind: 'none' };

type ResolveInput = {
  rfCode: string | null | undefined;
  bankDetails: BankDetails | null | undefined;
};

const trimmed = (value: string | null | undefined): string | null => {
  const next = value?.trim();
  return next ? next : null;
};

/**
 * Ο λογαριασμός μετράει ως υπαρκτός μόνο με IBAN ΚΑΙ δικαιούχο. Ένα IBAN χωρίς
 * όνομα (ή το αντίστροφο) δεν είναι μισή οδηγία — είναι οδηγία που ο πελάτης
 * δεν μπορεί να εκτελέσει, άρα καμία.
 */
const normalizeBankDetails = (details: BankDetails | null | undefined): BankDetails | null => {
  const beneficiary = trimmed(details?.beneficiary);
  const iban = trimmed(details?.iban);
  if (!beneficiary || !iban) return null;

  return { beneficiary, iban, bankName: trimmed(details?.bankName) };
};

export const resolvePaymentInstructions = ({
  rfCode,
  bankDetails,
}: ResolveInput): PaymentInstructions => {
  const rf = trimmed(rfCode);
  const bank = normalizeBankDetails(bankDetails);

  if (rf) return { kind: 'rf', rfCode: rf, bankDetails: bank };
  if (bank) return { kind: 'bank', bankDetails: bank };
  return { kind: 'none' };
};
