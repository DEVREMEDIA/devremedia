import type { ProjectType } from './enums';

export interface ServicePackage {
  id: string;
  name: string;
  deliverables: string;
  includes: string;
  price: number;
  priceWithScripts?: number;
  hasPrePayDiscount: boolean;
  deliveryTime: string;
  contractDuration?: string;
  notes?: string;
}

export interface ServiceCategory {
  projectType: ProjectType;
  label: string;
  description: string;
  packages: ServicePackage[];
  perCasePricing?: {
    items: Array<{ label: string; price: string }>;
    deliveryTime: string;
    fastDeliveryFee?: number;
    includes?: string;
    note?: string;
  };
  cancellationPolicy: string;
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  // ── Social Media Content ──────────────────────────────────
  {
    projectType: 'social_media_content',
    label: 'Social Media Content',
    description: 'Short-form content for social platforms',
    cancellationPolicy:
      'Αλλαγή ημερομηνίας > 7 ημέρες πριν: δωρεάν, ανάλογα με διαθεσιμότητα. Αλλαγή / ακύρωση < 7 ημέρες πριν: τέλος 150\u20AC ανά ημέρα γυρίσματος.',
    packages: [
      {
        id: 'social_a',
        name: 'Πακέτο Α',
        deliverables: '8 video / μήνα',
        includes: '2 ημέρες γυρισμάτων, 1 κύκλο αλλαγών / video',
        price: 1170,
        priceWithScripts: 1404,
        hasPrePayDiscount: true,
        deliveryTime: '7 εργάσιμες από το κάθε γύρισμα',
        contractDuration: '6 μήνες συμβόλαιο',
      },
      {
        id: 'social_b',
        name: 'Πακέτο Β',
        deliverables: '12 video / μήνα',
        includes: '2 ημέρες γυρισμάτων, 1 κύκλο αλλαγών / video',
        price: 1350,
        priceWithScripts: 1620,
        hasPrePayDiscount: true,
        deliveryTime: '7 εργάσιμες από το κάθε γύρισμα',
        contractDuration: '6 μήνες συμβόλαιο',
      },
      {
        id: 'social_c',
        name: 'Πακέτο Γ',
        deliverables: '20 video / μήνα',
        includes: '3 ημέρες γυρισμάτων, 1 κύκλο αλλαγών / video',
        price: 2220,
        priceWithScripts: 2664,
        hasPrePayDiscount: true,
        deliveryTime: '7 εργάσιμες από το κάθε γύρισμα',
        contractDuration: '6 μήνες συμβόλαιο',
      },
    ],
  },

  // ── Corporate Video (Εταιρικά Video) ──────────────────────
  {
    projectType: 'corporate_video',
    label: 'Εταιρικά Video',
    description:
      'Εταιρικά video, video εταιρικής ευθύνης, ετήσια video. Κοστολόγηση ανά περίπτωση.',
    cancellationPolicy:
      'Αλλαγή ημερομηνίας > 7 ημέρες πριν: δωρεάν, ανάλογα με διαθεσιμότητα. Αλλαγή / ακύρωση < 7 ημέρες πριν: τέλος 150\u20AC ανά ημέρα γυρίσματος.',
    packages: [],
    perCasePricing: {
      items: [
        { label: 'Ημέρα γυρίσματος', price: '500\u20AC' },
        { label: 'Video έως 2 λεπτά', price: '1.000\u20AC' },
        { label: 'Reel', price: '150\u20AC' },
        { label: 'Εξοπλισμός / ημέρα', price: '200\u20AC' },
        { label: 'Μετακινήσεις & έξοδα', price: 'Επιπλέον' },
      ],
      deliveryTime: '14 εργάσιμες',
      fastDeliveryFee: 350,
      includes: 'Γύρισμα με 2 κάμερες, χρήση drone, μικροφώνου, πλήρη edit και έναν κύκλο αλλαγών',
      note: 'Αν το video περιλαμβάνει πάνω από 2 τοποθεσίες χρειάζονται τουλάχιστον 2 μέρες γυρισμάτων. Αν περιλαμβάνει συνεντεύξεις προστίθεται μία ακόμη μέρα.',
    },
  },

  // ── Content on the Spot — Event Coverage ──────────────────
  {
    projectType: 'event_coverage',
    label: 'Content on the Spot — Κάλυψη Event',
    description: 'Γύρισμα και edit επιτόπου. Ιδανικό για εγκαίνια, συνέδρια, εταιρικά events.',
    cancellationPolicy:
      'Η προκαταβολή δεν επιστρέφεται σε περίπτωση ακύρωσης. Μεταφορά σε άλλη ημερομηνία μόνο κατόπιν συνεννόησης & διαθεσιμότητας.',
    packages: [
      {
        id: 'event_a',
        name: 'Πακέτο Α',
        deliverables: '3 video',
        includes: 'Γύρισμα και edit on the spot',
        price: 650,
        hasPrePayDiscount: false,
        deliveryTime: 'Παράδοση επιτόπου',
        notes: 'Ιδανικό για εγκαίνια, συνέδρια, γάμους',
      },
      {
        id: 'event_b',
        name: 'Πακέτο Β',
        deliverables: '5 video',
        includes: 'Γύρισμα και edit on the spot',
        price: 850,
        hasPrePayDiscount: false,
        deliveryTime: 'Παράδοση επιτόπου',
      },
    ],
  },

  // ── Podcasts ──────────────────────────────────────────────
  {
    projectType: 'podcast',
    label: 'Podcasts',
    description: 'Επαγγελματική παραγωγή podcast με 3 κάμερες και πλήρες μοντάζ.',
    cancellationPolicy:
      'Αλλαγή ημερομηνίας > 7 ημέρες πριν: δωρεάν, ανάλογα με διαθεσιμότητα. Αλλαγή / ακύρωση < 7 ημέρες πριν: τέλος 150\u20AC ανά ημέρα γυρίσματος.',
    packages: [
      {
        id: 'podcast_a',
        name: 'Πακέτο Α',
        deliverables: '2 επεισόδια / μήνα',
        includes: '1 μέρα γυρισμάτων, γύρισμα με 3 κάμερες, full μοντάζ επεισοδίων',
        price: 800,
        hasPrePayDiscount: true,
        deliveryTime: '7 εργάσιμες από το κάθε γύρισμα',
        contractDuration: '6 μήνες συμβόλαιο',
      },
      {
        id: 'podcast_b',
        name: 'Πακέτο Β',
        deliverables: '4 επεισόδια / μήνα',
        includes: '2 μέρες γυρισμάτων, γύρισμα με 3 κάμερες, full μοντάζ επεισοδίων',
        price: 1200,
        hasPrePayDiscount: true,
        deliveryTime: '7 εργάσιμες από το κάθε γύρισμα',
        contractDuration: '6 μήνες συμβόλαιο',
      },
      {
        id: 'podcast_c',
        name: 'Πακέτο Γ',
        deliverables: '6 επεισόδια / μήνα',
        includes: '3 μέρες γυρισμάτων, γύρισμα με 3 κάμερες, full μοντάζ επεισοδίων',
        price: 1500,
        hasPrePayDiscount: true,
        deliveryTime: '7 εργάσιμες από το κάθε γύρισμα',
        contractDuration: '6 μήνες συμβόλαιο',
      },
    ],
  },

  // ── Custom Request ────────────────────────────────────────
  {
    projectType: 'other',
    label: 'Custom Request',
    description:
      'Μεγαλύτερες παραγωγές, διαφημιστικά, ή οτιδήποτε δεν καλύπτεται από τα υπόλοιπα πακέτα. Θα σας στείλουμε προσφορά.',
    cancellationPolicy: 'Κατόπιν συνεννόησης.',
    packages: [],
  },
];

/**
 * Helper: find the service category for a given project type.
 * Returns undefined for types without a dedicated service category
 * (e.g. commercial, documentary, music_video).
 */
export function getServiceCategory(projectType: ProjectType): ServiceCategory | undefined {
  return SERVICE_CATEGORIES.find((c) => c.projectType === projectType);
}
