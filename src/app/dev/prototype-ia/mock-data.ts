// PROTOTYPE — throwaway. In-memory mock data only, no fetching, no mutations.
// Realistic Greek data so the variants are judged at real density.

export const STAGES = [
  { key: 'interest', label: 'Ενδιαφέρον' },
  { key: 'proposal', label: 'Πρόταση' },
  { key: 'agreement', label: 'Συμφωνία' },
  { key: 'booking', label: 'Κράτηση' },
  { key: 'production', label: 'Παραγωγή' },
  { key: 'review', label: 'Έγκριση' },
  { key: 'payment', label: 'Πληρωμή' },
] as const;

export type StageKey = (typeof STAGES)[number]['key'];

export interface Engagement {
  id: string;
  client: string;
  initials: string;
  title: string;
  stage: StageKey;
  value: number;
  owner: string;
  nextAction: string;
  waitingDays: number;
  overdue?: boolean;
}

export const ENGAGEMENTS: Engagement[] = [
  {
    id: 'e1',
    client: 'Marvera Shipping',
    initials: 'MS',
    title: 'Εταιρικό βίντεο στόλου',
    stage: 'review',
    value: 4800,
    owner: 'Νίκος',
    nextAction: 'Εγκρίνει ο πελάτης το v2',
    waitingDays: 3,
  },
  {
    id: 'e2',
    client: 'Καφεκοπτεία Λουμίδη',
    initials: 'ΚΛ',
    title: 'Social πακέτο Β — Ιούλιος',
    stage: 'production',
    value: 1200,
    owner: 'Ελένη',
    nextAction: 'Μοντάζ 4 reels',
    waitingDays: 1,
  },
  {
    id: 'e3',
    client: 'Olympus Fitness',
    initials: 'OF',
    title: 'Γύρισμα νέου studio',
    stage: 'booking',
    value: 2100,
    owner: 'Νίκος',
    nextAction: 'Έγκριση κράτησης 04/08',
    waitingDays: 2,
  },
  {
    id: 'e4',
    client: 'Dental Care Λάρισα',
    initials: 'DC',
    title: 'Podcast πακέτο Α',
    stage: 'agreement',
    value: 900,
    owner: 'Μαρία',
    nextAction: 'Υπογραφή συμφωνητικού',
    waitingDays: 6,
  },
  {
    id: 'e5',
    client: 'Nova Real Estate',
    initials: 'NR',
    title: 'Drone showcase 3 ακινήτων',
    stage: 'proposal',
    value: 3400,
    owner: 'Μαρία',
    nextAction: 'Αποστολή πρότασης',
    waitingDays: 4,
  },
  {
    id: 'e6',
    client: 'Aegean Bites',
    initials: 'AB',
    title: 'Food reel σειρά',
    stage: 'interest',
    value: 0,
    owner: 'Μαρία',
    nextAction: 'Πρώτη επαφή',
    waitingDays: 1,
  },
  {
    id: 'e7',
    client: 'Thermi Motors',
    initials: 'TM',
    title: 'Παρουσίαση μοντέλου 2026',
    stage: 'payment',
    value: 5600,
    owner: 'Νίκος',
    nextAction: 'Τιμολόγιο ληξιπρόθεσμο 12 ημ.',
    waitingDays: 12,
    overdue: true,
  },
  {
    id: 'e8',
    client: 'Ktima Verde',
    initials: 'KV',
    title: 'Γαμήλιο highlight',
    stage: 'production',
    value: 1800,
    owner: 'Ελένη',
    nextAction: 'Color grading',
    waitingDays: 2,
  },
  {
    id: 'e9',
    client: 'Studio Pilates Κ.',
    initials: 'SP',
    title: 'Social πακέτο Α — Ιούλιος',
    stage: 'review',
    value: 750,
    owner: 'Ελένη',
    nextAction: 'Ζητήθηκε διόρθωση',
    waitingDays: 5,
  },
  {
    id: 'e10',
    client: 'Hellenic Logistics',
    initials: 'HL',
    title: 'Εκπαιδευτικά βίντεο ασφαλείας',
    stage: 'proposal',
    value: 7200,
    owner: 'Μαρία',
    nextAction: 'Follow-up κλήση',
    waitingDays: 9,
  },
  {
    id: 'e11',
    client: 'Blue Coast Hotels',
    initials: 'BC',
    title: 'Θερινή καμπάνια',
    stage: 'booking',
    value: 4200,
    owner: 'Νίκος',
    nextAction: 'Επιβεβαίωση συνεργείου',
    waitingDays: 1,
  },
  {
    id: 'e12',
    client: 'Fresh Market Α.Ε.',
    initials: 'FM',
    title: 'In-store σήμανση',
    stage: 'payment',
    value: 2300,
    owner: 'Νίκος',
    nextAction: 'Στάλθηκε τιμολόγιο',
    waitingDays: 3,
  },
];

export interface ActionItem {
  id: string;
  group: 'approve' | 'field' | 'money';
  title: string;
  subtitle: string;
  cta: string;
  urgent?: boolean;
}

export const ACTIONS: ActionItem[] = [
  {
    id: 'a1',
    group: 'approve',
    title: 'Marvera Shipping — Εταιρικό βίντεο v2',
    subtitle: 'Ο πελάτης περιμένει έγκρισή σου 3 ημέρες',
    cta: 'Άνοιγμα',
    urgent: true,
  },
  {
    id: 'a2',
    group: 'approve',
    title: 'Olympus Fitness — Κράτηση 04/08, 10:00',
    subtitle: 'Δεσμεύει 1 από 2 θέσεις της ημέρας',
    cta: 'Έγκριση',
  },
  {
    id: 'a3',
    group: 'approve',
    title: 'Studio Pilates Κ. — Ζητήθηκε διόρθωση',
    subtitle: '«Το intro είναι πολύ αργό» — 5 ημέρες χωρίς ανάθεση',
    cta: 'Ανάθεση',
    urgent: true,
  },
  {
    id: 'a4',
    group: 'field',
    title: 'Γύρισμα σήμερα 10:00 — Ktima Verde',
    subtitle: 'Συνεργείο: Νίκος, Ελένη · Εξοπλισμός δεσμευμένος',
    cta: 'Φύλλο γυρίσματος',
  },
  {
    id: 'a5',
    group: 'field',
    title: 'Αύριο 14:30 — Blue Coast Hotels',
    subtitle: 'Λείπει το shot list',
    cta: 'Συμπλήρωση',
  },
  {
    id: 'a6',
    group: 'money',
    title: 'Thermi Motors — 5.600 €',
    subtitle: 'Ληξιπρόθεσμο 12 ημέρες',
    cta: 'Υπενθύμιση',
    urgent: true,
  },
  {
    id: 'a7',
    group: 'money',
    title: 'Dental Care Λάρισα — Συμφωνητικό ανυπόγραφο',
    subtitle: '6 ημέρες από την αποστολή',
    cta: 'Υπενθύμιση',
  },
];

export const NAV_A = [
  { key: 'today', label: 'Σήμερα', badge: 7 },
  { key: 'clients', label: 'Πελάτες', badge: 2 },
  { key: 'productions', label: 'Παραγωγές', badge: 4 },
  { key: 'calendar', label: 'Ημερολόγιο', badge: 1 },
  { key: 'finance', label: 'Οικονομικά', badge: 3 },
  { key: 'knowledge', label: 'Γνώση', badge: 0 },
];

export interface ClientRow {
  id: string;
  name: string;
  initials: string;
  package: string;
  monthly: number;
  usedThisMonth: number;
  allowance: number;
  balance: number;
  stage: StageKey;
  lastContact: string;
}

export const CLIENTS: ClientRow[] = [
  {
    id: 'c1',
    name: 'Marvera Shipping',
    initials: 'MS',
    package: 'Social B',
    monthly: 1400,
    usedThisMonth: 1,
    allowance: 2,
    balance: 0,
    stage: 'review',
    lastContact: 'πριν 2 ημ.',
  },
  {
    id: 'c2',
    name: 'Καφεκοπτεία Λουμίδη',
    initials: 'ΚΛ',
    package: 'Social B',
    monthly: 1200,
    usedThisMonth: 2,
    allowance: 2,
    balance: 0,
    stage: 'production',
    lastContact: 'χθες',
  },
  {
    id: 'c3',
    name: 'Olympus Fitness',
    initials: 'OF',
    package: 'Ad hoc',
    monthly: 0,
    usedThisMonth: 0,
    allowance: 1,
    balance: 0,
    stage: 'booking',
    lastContact: 'σήμερα',
  },
  {
    id: 'c4',
    name: 'Thermi Motors',
    initials: 'TM',
    package: 'Podcast C',
    monthly: 2200,
    usedThisMonth: 3,
    allowance: 4,
    balance: 5600,
    stage: 'payment',
    lastContact: 'πριν 12 ημ.',
  },
  {
    id: 'c5',
    name: 'Dental Care Λάρισα',
    initials: 'DC',
    package: 'Podcast A',
    monthly: 900,
    usedThisMonth: 0,
    allowance: 1,
    balance: 0,
    stage: 'agreement',
    lastContact: 'πριν 6 ημ.',
  },
  {
    id: 'c6',
    name: 'Blue Coast Hotels',
    initials: 'BC',
    package: 'Social C',
    monthly: 2600,
    usedThisMonth: 1,
    allowance: 4,
    balance: 0,
    stage: 'booking',
    lastContact: 'σήμερα',
  },
  {
    id: 'c7',
    name: 'Ktima Verde',
    initials: 'KV',
    package: 'Ad hoc',
    monthly: 0,
    usedThisMonth: 1,
    allowance: 1,
    balance: 1800,
    stage: 'production',
    lastContact: 'πριν 3 ημ.',
  },
  {
    id: 'c8',
    name: 'Nova Real Estate',
    initials: 'NR',
    package: '—',
    monthly: 0,
    usedThisMonth: 0,
    allowance: 0,
    balance: 0,
    stage: 'proposal',
    lastContact: 'πριν 4 ημ.',
  },
];

export const eur = (n: number) =>
  new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
