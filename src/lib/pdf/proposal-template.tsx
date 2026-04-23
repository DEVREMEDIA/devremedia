/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Svg,
  Line,
  Path,
  Rect,
} from '@react-pdf/renderer';

// =====================================================================
// Design tokens
// =====================================================================

const C = {
  ink: '#0a0a0f',
  surface: '#141420',
  rule: '#2a2a35',
  gold: '#d4a843',
  goldBright: '#f0c14a',
  cream: '#f5f1e8',
  creamDeep: '#ebe5d3',
  paper: '#ffffff',
  text: '#0a0a0f',
  textSoft: '#3a3a48',
  textMuted: '#6e6e7d',
  textMutedDark: '#8a8a99',
  white: '#ffffff',
} as const;

// =====================================================================
// i18n
// =====================================================================

const T = {
  el: {
    brand: 'DEVRE MEDIA',
    year: '2026',
    cover1: 'ΠΡΟΤΑΣΗ',
    cover2: 'ΣΥΝΕΡΓΑΣΙΑΣ',
    subtitleLine: (c: string) => `Content Production & Video Marketing · ${c}`,
    fileLabel: 'FILE',
    dateLabel: 'DATE',
    pageLabel: 'PAGE',

    sec01: 'COMPANY',
    sec02: 'STRATEGY',
    sec03: 'SERVICES',
    sec04: 'PRICING',
    sec04b: 'INTRO DISCOUNT',
    sec05: 'TIMELINE',
    sec06: 'LET’S START',

    whoWeAreKicker: 'ΠΟΙΟΙ ΕΙΜΑΣΤΕ',
    whoWeAreTitle: 'CINEMATIC CONTENT\nFOR BUSINESS',
    whoWeAreBody:
      'Η Devre Media δραστηριοποιείται στον τομέα της οπτικοακουστικής παραγωγής και των ψηφιακών δημιουργικών υπηρεσιών. Προσφέρουμε ολοκληρωμένες λύσεις επικοινωνίας σε επιχειρήσεις που θέλουν να ενισχύσουν την ψηφιακή τους παρουσία και να αναδείξουν το brand τους με cinematic ποιότητα.',
    trustedBy: 'TRUSTED BY',

    strategyKicker: 'ΣΤΟΧΟΣ ΣΥΝΕΡΓΑΣΙΑΣ',
    strategyTitle1: 'CONTENT',
    strategyTitle2: 'ENGINE',
    strategyIntro: 'Σταθερό, αποδοτικό σύστημα παραγωγής περιεχομένου που θα:',
    strategyBullet1: (client: string) => `Ενισχύσει την παρουσία της ${client} στα Social Media.`,
    strategyBullet2: (client: string, advantage: string) =>
      `Επικοινωνήσει την ${advantage} της ${client} στα social media.`,
    strategyBullet3: 'Μετατρέψει το ενδιαφέρον σε διάδραση με το αγοραστικό κοινό.',
    needKicker: 'Η ΑΝΑΓΚΗ',

    servicesKicker: 'ΥΠΗΡΕΣΙΕΣ & ΠΑΡΑΔΟΤΕΑ',
    servicesTitle: 'FROM CONCEPT\nTO CONVERSION',
    serviceA: 'SOCIAL FIRST',
    serviceABody:
      'Περιεχόμενο σε μορφή 9:16 για Tik Tok, Reels και Shorts με γρήγορο ρυθμό και hooks.',
    serviceB: 'FULL PRODUCTION',
    serviceBBody:
      'Από το concept και το shotlist μέχρι το μοντάζ, το sound design και τους υπότιτλους.',
    serviceC: 'FUNNEL LOGIC',
    serviceCBody: 'Στρατηγική 6 μηνών: Awareness → Consideration → Conversion assets.',

    pricingKicker: 'ΟΙΚΟΝΟΜΙΚΗ ΠΡΟΣΦΟΡΑ',
    pricingTitle: 'PACKAGES',
    includes: 'ΠΕΡΙΛΑΜΒΑΝΕΙ',
    recommended: 'RECOMMENDED',
    depositTitle: 'ΠΛΗΡΩΜΗ',
    deposit: (d: number) => `Προκαταβολή ${Math.round(d * 100)}% · εξόφληση με την παράδοση.`,
    vatNote: (v: number) => `*ΦΠΑ ${Math.round(v * 100)}% δεν συμπεριλαμβάνεται`,
    discountKicker: 'EARLY BIRD',
    discountTitle: (pct: number, m: number) =>
      `−${Math.round(pct * 100)}% ΓΙΑ ΤΟΥΣ ΠΡΩΤΟΥΣ ${m} ΜΗΝΕΣ`,
    discountSub: 'Προσφορά γνωριμίας — μία φορά, για νέους συνεργάτες.',

    timelineKicker: 'ΡΟΗ ΕΡΓΑΣΙΩΝ',
    timelineTitle: 'HOW WE WORK',
    step1: 'ΓΥΡΙΣΜΑΤΑ',
    step1body: 'Εντός του μήνα, σε συμφωνημένες ημερομηνίες βάσει calendar.',
    step2: 'ΠΑΡΑΔΟΣΗ',
    step2body: 'Batch delivery εντός 5–10 εργάσιμων ημερών από το γύρισμα.',
    step3: 'REVISIONS',
    step3body: '1 κύκλος μικροδιορθώσεων ανά video (τίτλοι, trims, minor edits).',
    timelineNote: 'Αλλαγές που απαιτούν επαναμοντάζ ή νέο concept τιμολογούνται ξεχωριστά.',

    closeKicker: 'ΕΠΟΜΕΝΟ ΒΗΜΑ',
    closeQuestion: 'ΞΕΚΙΝΑΜΕ;',
    closeSubtitle: 'Έτοιμοι να γυρίσουμε περιεχόμενο που πουλάει;',
    thankYou: 'THANK YOU',
    validUntil: (d: string) => `ΙΣΧΥΕΙ ΕΩΣ ${d}`,
  },
  en: {
    brand: 'DEVRE MEDIA',
    year: '2026',
    cover1: 'PROPOSAL',
    cover2: 'COLLABORATION',
    subtitleLine: (c: string) => `Content Production & Video Marketing · ${c}`,
    fileLabel: 'FILE',
    dateLabel: 'DATE',
    pageLabel: 'PAGE',

    sec01: 'COMPANY',
    sec02: 'STRATEGY',
    sec03: 'SERVICES',
    sec04: 'PRICING',
    sec04b: 'INTRO DISCOUNT',
    sec05: 'TIMELINE',
    sec06: 'LET’S START',

    whoWeAreKicker: 'WHO WE ARE',
    whoWeAreTitle: 'CINEMATIC CONTENT\nFOR BUSINESS',
    whoWeAreBody:
      'Devre Media operates in video production and digital creative services. We deliver end-to-end communication solutions for businesses that want to enhance their digital presence and elevate their brand with cinematic quality.',
    trustedBy: 'TRUSTED BY',

    strategyKicker: 'PARTNERSHIP GOAL',
    strategyTitle1: 'CONTENT',
    strategyTitle2: 'ENGINE',
    strategyIntro: 'A stable, efficient content production system that will:',
    strategyBullet1: (c: string) => `Strengthen ${c}’s presence on Social Media.`,
    strategyBullet2: (c: string, a: string) => `Communicate ${c}’s ${a} on social media.`,
    strategyBullet3: 'Turn interest into interaction with the buying audience.',
    needKicker: 'THE NEED',

    servicesKicker: 'SERVICES & DELIVERABLES',
    servicesTitle: 'FROM CONCEPT\nTO CONVERSION',
    serviceA: 'SOCIAL FIRST',
    serviceABody: '9:16 content for Tik Tok, Reels and Shorts with fast pace and hooks.',
    serviceB: 'FULL PRODUCTION',
    serviceBBody: 'From concept and shotlist to editing, sound design and subtitles.',
    serviceC: 'FUNNEL LOGIC',
    serviceCBody: '6-month strategy: Awareness → Consideration → Conversion.',

    pricingKicker: 'PRICING',
    pricingTitle: 'PACKAGES',
    includes: 'INCLUDES',
    recommended: 'RECOMMENDED',
    depositTitle: 'PAYMENT',
    deposit: (d: number) => `${Math.round(d * 100)}% deposit · balance on delivery.`,
    vatNote: (v: number) => `*VAT ${Math.round(v * 100)}% not included`,
    discountKicker: 'EARLY BIRD',
    discountTitle: (p: number, m: number) => `−${Math.round(p * 100)}% FOR THE FIRST ${m} MONTHS`,
    discountSub: 'Introductory offer — one time, for new partners.',

    timelineKicker: 'WORKFLOW',
    timelineTitle: 'HOW WE WORK',
    step1: 'FILMING',
    step1body: 'Within the month, on agreed calendar dates.',
    step2: 'DELIVERY',
    step2body: 'Batch delivery within 5–10 business days of filming.',
    step3: 'REVISIONS',
    step3body: '1 round of minor corrections per video (titles, trims, minor edits).',
    timelineNote: 'Changes requiring re-editing or a new concept are billed separately.',

    closeKicker: 'NEXT STEP',
    closeQuestion: 'READY?',
    closeSubtitle: 'Ready to produce content that actually sells?',
    thankYou: 'THANK YOU',
    validUntil: (d: string) => `VALID UNTIL ${d}`,
  },
} as const;

type Locale = keyof typeof T;

// =====================================================================
// Types
// =====================================================================

export interface ProposalPDFPackage {
  id: string;
  name: string;
  video_count: number | null;
  shooting_days: number | null;
  price: number;
  inclusions: string[];
  description?: string | null;
}

export interface ProposalPDFProps {
  clientName: string;
  competitiveAdvantage?: string | null;
  clientNeed?: string | null;
  packages: ProposalPDFPackage[];
  includeDiscount: boolean;
  discountPercent: number;
  discountMonths: number;
  vatPercent: number;
  depositPercent: number;
  validUntil?: string | null;
  locale?: Locale;
  logoBase64?: string;
  logoWhiteBase64?: string;
  clientLogosBase64?: { name: string; src: string }[]; // for trusted-by grid
  providerEmail?: string;
  providerPhone?: string;
  proposalRef?: string; // short code for the slate
}

// =====================================================================
// Styles
// =====================================================================

const FONT = 'NotoSans';

const S = StyleSheet.create({
  // Page bases
  darkPage: {
    fontFamily: FONT,
    fontSize: 10,
    color: C.white,
    backgroundColor: C.ink,
    position: 'relative',
  },
  creamPage: {
    fontFamily: FONT,
    fontSize: 10,
    color: C.text,
    backgroundColor: C.cream,
    position: 'relative',
  },

  // Left rail — magazine section marker (vertical label + big number)
  rail: {
    position: 'absolute',
    top: 40,
    bottom: 40,
    left: 40,
    width: 60,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  railNumber: {
    fontSize: 54,
    fontWeight: 'bold',
    letterSpacing: -2,
    lineHeight: 1,
  },
  railLabel: {
    fontSize: 8,
    letterSpacing: 3,
    textTransform: 'uppercase' as const,
  },
  railBar: {
    width: 1,
    height: 40,
    marginTop: 12,
    marginBottom: 12,
  },

  // Right content area when using rail
  railContent: {
    position: 'absolute',
    top: 40,
    bottom: 72,
    left: 120,
    right: 50,
  },

  // Content without rail
  fullContent: {
    flex: 1,
    paddingHorizontal: 50,
    paddingTop: 40,
    paddingBottom: 72,
  },

  // Top chrome (brand + client badge)
  topChrome: {
    position: 'absolute',
    top: 30,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandTag: {
    fontSize: 8,
    letterSpacing: 3,
  },

  // Bottom slate (film-style metadata)
  slate: {
    position: 'absolute',
    bottom: 24,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slateCell: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  slateLabel: {
    fontSize: 7,
    letterSpacing: 2,
  },
  slateValue: {
    fontSize: 8,
  },

  // Typography
  kicker: {
    fontSize: 9,
    letterSpacing: 4,
    marginBottom: 20,
    textTransform: 'uppercase' as const,
  },
  display: {
    fontSize: 56,
    fontWeight: 'bold',
    letterSpacing: -2,
    lineHeight: 0.95,
  },
  displayL: {
    fontSize: 72,
    fontWeight: 'bold',
    letterSpacing: -3,
    lineHeight: 0.9,
  },
  h1: {
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: -1,
    lineHeight: 1.05,
  },
  h2: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0,
  },
  body: {
    fontSize: 10.5,
    lineHeight: 1.7,
  },
  bodyLg: {
    fontSize: 12,
    lineHeight: 1.7,
  },

  mono: {
    fontFamily: FONT,
    fontSize: 8,
    letterSpacing: 1,
  },

  // -----------------------------------------------------------------
  // Cover
  // -----------------------------------------------------------------
  coverWrap: {
    flex: 1,
    paddingHorizontal: 50,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  coverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  coverBadgeLogo: {
    width: 90,
    height: 22,
    objectFit: 'contain' as const,
  },
  coverCross: {
    fontSize: 12,
    color: C.gold,
  },
  coverClientName: {
    fontSize: 11,
    letterSpacing: 4,
    color: C.gold,
  },
  coverStack: {
    gap: 2,
  },
  coverAccentBar: {
    position: 'absolute',
    top: 0,
    right: 40,
    width: 1,
    height: '100%',
    backgroundColor: C.gold,
    opacity: 0.5,
  },
  coverYear: {
    color: C.gold,
  },
  coverSubtitle: {
    fontSize: 11,
    marginTop: 24,
    color: C.textMutedDark,
    maxWidth: 380,
    lineHeight: 1.5,
  },

  // -----------------------------------------------------------------
  // Body page (2-col magazine layout)
  // -----------------------------------------------------------------
  twoCol: {
    flexDirection: 'row',
    gap: 40,
    flex: 1,
  },
  colNarrow: {
    width: 150,
  },
  colWide: {
    flex: 1,
  },

  // -----------------------------------------------------------------
  // Clients grid
  // -----------------------------------------------------------------
  clientsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  clientCell: {
    width: 96,
    height: 48,
    padding: 8,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.creamDeep,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientLogo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain' as const,
  },

  // -----------------------------------------------------------------
  // Strategy bullets
  // -----------------------------------------------------------------
  bulletList: {
    marginTop: 24,
    gap: 18,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  bulletIndex: {
    fontSize: 28,
    fontWeight: 'bold',
    color: C.gold,
    width: 40,
    lineHeight: 1,
    letterSpacing: -1,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 1.6,
    paddingTop: 2,
  },

  // -----------------------------------------------------------------
  // Services stripes
  // -----------------------------------------------------------------
  stripeStack: {
    marginTop: 24,
    gap: 18,
  },
  stripe: {
    flexDirection: 'row',
    gap: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: C.creamDeep,
  },
  stripeNum: {
    width: 60,
    fontSize: 26,
    fontWeight: 'bold',
    color: C.gold,
    letterSpacing: -1,
  },
  stripeContent: {
    flex: 1,
    gap: 6,
  },
  stripeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  stripeBody: {
    fontSize: 10.5,
    lineHeight: 1.6,
    color: C.textSoft,
  },

  // -----------------------------------------------------------------
  // Pricing cards
  // -----------------------------------------------------------------
  packagesRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
  },
  pkgCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.rule,
    padding: 18,
    position: 'relative',
    minHeight: 260,
  },
  pkgCardFeatured: {
    backgroundColor: C.ink,
    borderColor: C.gold,
  },
  pkgAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: C.gold,
  },
  pkgBadge: {
    position: 'absolute',
    top: -10,
    right: 14,
    backgroundColor: C.gold,
    color: C.ink,
    fontSize: 8,
    letterSpacing: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontWeight: 'bold',
  },
  pkgName: {
    fontSize: 11,
    letterSpacing: 2,
    color: C.textMutedDark,
    marginTop: 8,
    marginBottom: 8,
  },
  pkgPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: C.goldBright,
    letterSpacing: -1,
  },
  pkgMeta: {
    fontSize: 8,
    letterSpacing: 1,
    color: C.textMutedDark,
    marginTop: 6,
  },
  pkgDivider: {
    height: 1,
    backgroundColor: C.rule,
    marginVertical: 14,
  },
  pkgIncHeader: {
    fontSize: 8,
    letterSpacing: 2,
    color: C.gold,
    marginBottom: 8,
  },
  pkgIncItem: {
    fontSize: 9.5,
    lineHeight: 1.6,
    color: C.white,
    marginBottom: 4,
    paddingLeft: 10,
    position: 'relative',
  },
  pkgIncDot: {
    position: 'absolute',
    left: 0,
    top: 6,
    width: 4,
    height: 4,
    backgroundColor: C.gold,
  },

  // Terms section
  termsRow: {
    marginTop: 26,
    flexDirection: 'row',
    gap: 40,
  },
  termCol: {
    flex: 1,
  },
  termLabel: {
    fontSize: 8,
    letterSpacing: 2,
    color: C.gold,
    marginBottom: 6,
  },
  termText: {
    fontSize: 9.5,
    color: C.textMutedDark,
    lineHeight: 1.6,
  },

  // -----------------------------------------------------------------
  // Discount hero
  // -----------------------------------------------------------------
  discountHero: {
    marginTop: 20,
    padding: 22,
    backgroundColor: C.gold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  discountHeroLeft: {
    flex: 1,
    gap: 4,
  },
  discountHeroKicker: {
    fontSize: 9,
    letterSpacing: 3,
    color: C.ink,
  },
  discountHeroTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: C.ink,
    letterSpacing: 1,
  },
  discountHeroSub: {
    fontSize: 10,
    color: C.ink,
    opacity: 0.7,
  },
  discountHeroBig: {
    fontSize: 72,
    fontWeight: 'bold',
    color: C.ink,
    letterSpacing: -3,
    lineHeight: 1,
  },
  pkgPriceRowStriked: {
    fontSize: 12,
    color: C.textMutedDark,
    textDecoration: 'line-through',
  },
  pkgPriceArrow: {
    color: C.gold,
    fontSize: 12,
  },

  // -----------------------------------------------------------------
  // Timeline
  // -----------------------------------------------------------------
  timelineWrap: {
    marginTop: 32,
    flexDirection: 'row',
    gap: 0,
    position: 'relative',
  },
  timelineCol: {
    flex: 1,
    paddingRight: 24,
    gap: 10,
  },
  timelineNum: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.ink,
    color: C.cream,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingTop: 8,
  },
  timelineStepTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 14,
  },
  timelineStepBody: {
    fontSize: 10,
    lineHeight: 1.6,
    color: C.textSoft,
  },
  timelineNote: {
    marginTop: 40,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: C.creamDeep,
    fontSize: 9.5,
    color: C.textMuted,
  },

  // -----------------------------------------------------------------
  // Close page
  // -----------------------------------------------------------------
  closeWrap: {
    flex: 1,
    paddingHorizontal: 50,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  closeQuestion: {
    fontSize: 108,
    fontWeight: 'bold',
    letterSpacing: -5,
    lineHeight: 0.9,
    color: C.white,
  },
  closeSub: {
    fontSize: 14,
    color: C.textMutedDark,
    marginTop: 20,
    maxWidth: 420,
    lineHeight: 1.5,
  },
  closeGoldAccent: {
    width: 60,
    height: 2,
    backgroundColor: C.gold,
    marginBottom: 24,
  },
  closeThankYou: {
    fontSize: 10,
    letterSpacing: 5,
    color: C.gold,
    marginBottom: 10,
  },
  closeContactRow: {
    flexDirection: 'row',
    gap: 28,
    marginTop: 14,
  },
  closeContactCell: {
    gap: 3,
  },
  closeContactLabel: {
    fontSize: 7,
    letterSpacing: 2,
    color: C.gold,
  },
  closeContactValue: {
    fontSize: 11,
    color: C.white,
  },
});

// =====================================================================
// Helpers
// =====================================================================

function euro(n: number): string {
  return `€${n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

// =====================================================================
// Shared page chrome
// =====================================================================

function TopChrome({
  t,
  clientName,
  dark,
}: {
  t: (typeof T)[Locale];
  clientName: string;
  dark: boolean;
}) {
  const color = dark ? C.textMutedDark : C.textMuted;
  return (
    <View style={S.topChrome}>
      <Text style={[S.brandTag, { color: dark ? C.gold : C.gold }]}>{t.brand}</Text>
      <Text style={[S.brandTag, { color }]}>× {clientName.toUpperCase()}</Text>
    </View>
  );
}

function Slate({
  t,
  pageNum,
  pageTotal,
  ref_,
  dark,
}: {
  t: (typeof T)[Locale];
  pageNum: string;
  pageTotal: string;
  ref_: string;
  dark: boolean;
}) {
  const label = dark ? C.gold : C.text;
  const value = dark ? C.textMutedDark : C.textMuted;
  return (
    <View style={S.slate}>
      <View style={S.slateCell}>
        <Text style={[S.slateLabel, { color: label }]}>{t.fileLabel}</Text>
        <Text style={[S.slateValue, { color: value }]}>{ref_}</Text>
      </View>
      <View style={S.slateCell}>
        <Text style={[S.slateLabel, { color: label }]}>{t.dateLabel}</Text>
        <Text style={[S.slateValue, { color: value }]}>{todayISO()}</Text>
      </View>
      <View style={S.slateCell}>
        <Text style={[S.slateLabel, { color: label }]}>{t.pageLabel}</Text>
        <Text style={[S.slateValue, { color: value }]}>
          {pageNum} / {pageTotal}
        </Text>
      </View>
    </View>
  );
}

function Rail({ number, label, dark }: { number: string; label: string; dark: boolean }) {
  const numColor = dark ? C.white : C.text;
  const labelColor = dark ? C.gold : C.gold;
  const barColor = dark ? C.rule : C.creamDeep;
  return (
    <View style={S.rail}>
      <View>
        <Text style={[S.railNumber, { color: numColor }]}>{number}</Text>
        <View style={[S.railBar, { backgroundColor: barColor }]} />
      </View>
      <Text style={[S.railLabel, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

// =====================================================================
// Component
// =====================================================================

export function ProposalPDFTemplate({
  clientName,
  competitiveAdvantage,
  clientNeed,
  packages,
  includeDiscount,
  discountPercent,
  discountMonths,
  vatPercent,
  depositPercent,
  validUntil,
  locale = 'el',
  logoBase64,
  logoWhiteBase64,
  clientLogosBase64 = [],
  providerEmail = 'angelos@devremedia.com',
  providerPhone = '+30 698 459 2968',
  proposalRef,
}: ProposalPDFProps) {
  const t = T[locale];
  const advantage = competitiveAdvantage?.trim() || (locale === 'el' ? 'ποιότητα' : 'quality');
  const ref_ =
    proposalRef || `DM-${todayISO().replace(/\./g, '')}-${clientName.slice(0, 6).toUpperCase()}`;

  // Total pages count (for slate footer)
  const totalPages = 8 + (includeDiscount ? 1 : 0);
  const P = (n: number) => String(n).padStart(2, '0');
  const PT = P(totalPages);

  // Recommend the middle package if 3+ selected
  const recommendedIdx = packages.length >= 3 ? 1 : -1;

  return (
    <Document>
      {/* ================================================================= */}
      {/* PAGE 1 — COVER                                                     */}
      {/* ================================================================= */}
      <Page size="A4" style={S.darkPage}>
        {/* Right vertical gold accent */}
        <Svg style={{ position: 'absolute', top: 0, right: 38, width: 4, height: 842 }}>
          <Line x1="2" y1="0" x2="2" y2="842" stroke={C.gold} strokeWidth="1" strokeOpacity="0.5" />
        </Svg>

        <View style={S.coverWrap}>
          {/* Top badge */}
          <View style={S.coverBadge}>
            {logoWhiteBase64 ? (
              <Image src={logoWhiteBase64} style={S.coverBadgeLogo} />
            ) : logoBase64 ? (
              <Image src={logoBase64} style={S.coverBadgeLogo} />
            ) : (
              <Text style={[S.brandTag, { color: C.gold }]}>{t.brand}</Text>
            )}
            <Text style={S.coverCross}>×</Text>
            <Text style={S.coverClientName}>{clientName.toUpperCase()}</Text>
          </View>

          {/* Title block */}
          <View style={S.coverStack}>
            <Text style={[S.displayL, { color: C.white }]}>{t.cover1}</Text>
            <Text style={[S.displayL, { color: C.white, marginLeft: 60 }]}>{t.cover2}</Text>
            <Text style={[S.displayL, S.coverYear, { marginLeft: 120 }]}>{t.year}</Text>
            <Text style={S.coverSubtitle}>{t.subtitleLine(clientName)}</Text>
          </View>

          {/* Slate */}
          <View />
        </View>
        <Slate t={t} pageNum="01" pageTotal={PT} ref_={ref_} dark />
      </Page>

      {/* ================================================================= */}
      {/* PAGE 2 — COMPANY (CREAM)                                           */}
      {/* ================================================================= */}
      <Page size="A4" style={S.creamPage}>
        <TopChrome t={t} clientName={clientName} dark={false} />
        <Rail number="01" label={t.sec01} dark={false} />

        <View style={S.railContent}>
          <Text style={[S.kicker, { color: C.gold }]}>{t.whoWeAreKicker}</Text>
          <Text style={[S.h1, { color: C.text, marginBottom: 24 }]}>{t.whoWeAreTitle}</Text>
          <Text style={[S.bodyLg, { color: C.textSoft, maxWidth: 420 }]}>{t.whoWeAreBody}</Text>

          {clientLogosBase64.length > 0 && (
            <View style={{ marginTop: 40 }}>
              <Text style={[S.kicker, { color: C.textMuted, fontSize: 8, marginBottom: 12 }]}>
                {t.trustedBy}
              </Text>
              <View style={S.clientsGrid}>
                {clientLogosBase64.slice(0, 8).map((logo, i) => (
                  <View key={i} style={S.clientCell}>
                    <Image src={logo.src} style={S.clientLogo} />
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <Slate t={t} pageNum="02" pageTotal={PT} ref_={ref_} dark={false} />
      </Page>

      {/* ================================================================= */}
      {/* PAGE 3 — STRATEGY (DARK)                                           */}
      {/* ================================================================= */}
      <Page size="A4" style={S.darkPage}>
        <TopChrome t={t} clientName={clientName} dark />
        <Rail number="02" label={t.sec02} dark />

        <View style={S.railContent}>
          <Text style={[S.kicker, { color: C.gold }]}>{t.strategyKicker}</Text>

          <View>
            <Text style={[S.display, { color: C.white }]}>{t.strategyTitle1}</Text>
            <Text style={[S.display, { color: C.gold, marginLeft: 40, marginTop: -6 }]}>
              {t.strategyTitle2}
            </Text>
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: C.gold,
              width: 60,
              marginTop: 26,
              marginBottom: 26,
            }}
          />

          <Text style={[S.bodyLg, { color: C.textMutedDark, maxWidth: 420 }]}>
            {t.strategyIntro}
          </Text>

          <View style={S.bulletList}>
            <View style={S.bulletRow}>
              <Text style={S.bulletIndex}>01</Text>
              <Text style={[S.bulletText, { color: C.white }]}>
                {t.strategyBullet1(clientName)}
              </Text>
            </View>
            <View style={S.bulletRow}>
              <Text style={S.bulletIndex}>02</Text>
              <Text style={[S.bulletText, { color: C.white }]}>
                {t.strategyBullet2(clientName, advantage)}
              </Text>
            </View>
            <View style={S.bulletRow}>
              <Text style={S.bulletIndex}>03</Text>
              <Text style={[S.bulletText, { color: C.white }]}>{t.strategyBullet3}</Text>
            </View>
          </View>

          {clientNeed?.trim() && (
            <View style={{ marginTop: 34, maxWidth: 420 }}>
              <Text style={[S.kicker, { color: C.gold, marginBottom: 10, fontSize: 8 }]}>
                {t.needKicker}
              </Text>
              <Text
                style={[
                  S.body,
                  {
                    color: C.white,
                    borderLeftWidth: 2,
                    borderLeftColor: C.gold,
                    paddingLeft: 14,
                  },
                ]}
              >
                “{clientNeed}”
              </Text>
            </View>
          )}
        </View>

        <Slate t={t} pageNum="03" pageTotal={PT} ref_={ref_} dark />
      </Page>

      {/* ================================================================= */}
      {/* PAGE 4 — SERVICES (CREAM)                                          */}
      {/* ================================================================= */}
      <Page size="A4" style={S.creamPage}>
        <TopChrome t={t} clientName={clientName} dark={false} />
        <Rail number="03" label={t.sec03} dark={false} />

        <View style={S.railContent}>
          <Text style={[S.kicker, { color: C.gold }]}>{t.servicesKicker}</Text>
          <Text style={[S.h1, { color: C.text, marginBottom: 8 }]}>{t.servicesTitle}</Text>

          <View style={S.stripeStack}>
            <View style={S.stripe}>
              <Text style={S.stripeNum}>01</Text>
              <View style={S.stripeContent}>
                <Text style={S.stripeTitle}>{t.serviceA}</Text>
                <Text style={S.stripeBody}>{t.serviceABody}</Text>
              </View>
            </View>
            <View style={S.stripe}>
              <Text style={S.stripeNum}>02</Text>
              <View style={S.stripeContent}>
                <Text style={S.stripeTitle}>{t.serviceB}</Text>
                <Text style={S.stripeBody}>{t.serviceBBody}</Text>
              </View>
            </View>
            <View style={[S.stripe, { borderBottomWidth: 0 }]}>
              <Text style={S.stripeNum}>03</Text>
              <View style={S.stripeContent}>
                <Text style={S.stripeTitle}>{t.serviceC}</Text>
                <Text style={S.stripeBody}>{t.serviceCBody}</Text>
              </View>
            </View>
          </View>
        </View>

        <Slate t={t} pageNum="04" pageTotal={PT} ref_={ref_} dark={false} />
      </Page>

      {/* ================================================================= */}
      {/* PAGE 5 — PRICING (DARK)                                            */}
      {/* ================================================================= */}
      <Page size="A4" style={S.darkPage}>
        <TopChrome t={t} clientName={clientName} dark />
        <Rail number="04" label={t.sec04} dark />

        <View style={S.railContent}>
          <Text style={[S.kicker, { color: C.gold }]}>{t.pricingKicker}</Text>
          <Text style={[S.h1, { color: C.white }]}>{t.pricingTitle}</Text>

          <View style={S.packagesRow}>
            {packages.map((p, idx) => {
              const featured = idx === recommendedIdx;
              return (
                <View key={p.id} style={[S.pkgCard, featured ? S.pkgCardFeatured : {}]}>
                  <View style={S.pkgAccent} />
                  {featured && <Text style={S.pkgBadge}>{t.recommended}</Text>}

                  <Text style={S.pkgName}>{p.name.toUpperCase()}</Text>
                  <Text style={S.pkgPrice}>{euro(p.price)}</Text>
                  {(p.video_count != null || p.shooting_days != null) && (
                    <Text style={S.pkgMeta}>
                      {p.video_count != null ? `${p.video_count} VIDEOS` : ''}
                      {p.video_count != null && p.shooting_days != null ? '  ·  ' : ''}
                      {p.shooting_days != null ? `${p.shooting_days} DAYS` : ''}
                    </Text>
                  )}

                  <View style={S.pkgDivider} />
                  {p.inclusions.length > 0 && (
                    <>
                      <Text style={S.pkgIncHeader}>{t.includes}</Text>
                      {p.inclusions.map((inc, i) => (
                        <View key={i} style={{ position: 'relative' }}>
                          <View style={S.pkgIncDot} />
                          <Text style={S.pkgIncItem}>{inc}</Text>
                        </View>
                      ))}
                    </>
                  )}
                </View>
              );
            })}
          </View>

          <View style={S.termsRow}>
            <View style={S.termCol}>
              <Text style={S.termLabel}>{t.depositTitle}</Text>
              <Text style={S.termText}>{t.deposit(depositPercent)}</Text>
            </View>
            <View style={S.termCol}>
              <Text style={S.termLabel}>VAT</Text>
              <Text style={S.termText}>{t.vatNote(vatPercent)}</Text>
            </View>
          </View>
        </View>

        <Slate t={t} pageNum="05" pageTotal={PT} ref_={ref_} dark />
      </Page>

      {/* ================================================================= */}
      {/* PAGE 6 — DISCOUNT (optional)                                       */}
      {/* ================================================================= */}
      {includeDiscount && packages.length > 0 && (
        <Page size="A4" style={S.darkPage}>
          <TopChrome t={t} clientName={clientName} dark />
          <Rail number="04" label={t.sec04b} dark />

          <View style={S.railContent}>
            <Text style={[S.kicker, { color: C.gold }]}>{t.discountKicker}</Text>
            <Text style={[S.h1, { color: C.white }]}>{t.pricingTitle}</Text>

            <View style={S.discountHero}>
              <View style={S.discountHeroLeft}>
                <Text style={S.discountHeroKicker}>{t.discountKicker}</Text>
                <Text style={S.discountHeroTitle}>
                  {t.discountTitle(discountPercent, discountMonths)}
                </Text>
                <Text style={S.discountHeroSub}>{t.discountSub}</Text>
              </View>
              <Text style={S.discountHeroBig}>−{Math.round(discountPercent * 100)}%</Text>
            </View>

            <View style={S.packagesRow}>
              {packages.map((p, idx) => {
                const featured = idx === recommendedIdx;
                const discounted = p.price * (1 - discountPercent);
                return (
                  <View key={p.id} style={[S.pkgCard, featured ? S.pkgCardFeatured : {}]}>
                    <View style={S.pkgAccent} />
                    {featured && <Text style={S.pkgBadge}>{t.recommended}</Text>}

                    <Text style={S.pkgName}>{p.name.toUpperCase()}</Text>
                    <Text style={S.pkgPriceRowStriked}>{euro(p.price)}</Text>
                    <Text style={S.pkgPrice}>{euro(discounted)}</Text>

                    <View style={S.pkgDivider} />
                    {p.inclusions.length > 0 && (
                      <>
                        <Text style={S.pkgIncHeader}>{t.includes}</Text>
                        {p.inclusions.map((inc, i) => (
                          <View key={i} style={{ position: 'relative' }}>
                            <View style={S.pkgIncDot} />
                            <Text style={S.pkgIncItem}>{inc}</Text>
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                );
              })}
            </View>

            <View style={S.termsRow}>
              <View style={S.termCol}>
                <Text style={S.termText}>{t.vatNote(vatPercent)}</Text>
              </View>
            </View>
          </View>

          <Slate t={t} pageNum="06" pageTotal={PT} ref_={ref_} dark />
        </Page>
      )}

      {/* ================================================================= */}
      {/* PAGE 7 — TIMELINE (CREAM)                                          */}
      {/* ================================================================= */}
      <Page size="A4" style={S.creamPage}>
        <TopChrome t={t} clientName={clientName} dark={false} />
        <Rail number={includeDiscount ? '05' : '05'} label={t.sec05} dark={false} />

        <View style={S.railContent}>
          <Text style={[S.kicker, { color: C.gold }]}>{t.timelineKicker}</Text>
          <Text style={[S.h1, { color: C.text, marginBottom: 8 }]}>{t.timelineTitle}</Text>

          <View style={S.timelineWrap}>
            {/* Connecting line */}
            <Svg
              style={{
                position: 'absolute',
                top: 18,
                left: 18,
                right: 18,
                height: 1,
              }}
            >
              <Line
                x1="0"
                y1="0"
                x2="460"
                y2="0"
                stroke={C.creamDeep}
                strokeWidth="1"
                strokeDasharray="2 4"
              />
            </Svg>

            <View style={S.timelineCol}>
              <Text style={S.timelineNum}>1</Text>
              <Text style={S.timelineStepTitle}>{t.step1}</Text>
              <Text style={S.timelineStepBody}>{t.step1body}</Text>
            </View>
            <View style={S.timelineCol}>
              <Text style={S.timelineNum}>2</Text>
              <Text style={S.timelineStepTitle}>{t.step2}</Text>
              <Text style={S.timelineStepBody}>{t.step2body}</Text>
            </View>
            <View style={S.timelineCol}>
              <Text style={S.timelineNum}>3</Text>
              <Text style={S.timelineStepTitle}>{t.step3}</Text>
              <Text style={S.timelineStepBody}>{t.step3body}</Text>
            </View>
          </View>

          <Text style={S.timelineNote}>* {t.timelineNote}</Text>
        </View>

        <Slate
          t={t}
          pageNum={includeDiscount ? '07' : '06'}
          pageTotal={PT}
          ref_={ref_}
          dark={false}
        />
      </Page>

      {/* ================================================================= */}
      {/* PAGE 8 — CLOSE (DARK)                                              */}
      {/* ================================================================= */}
      <Page size="A4" style={S.darkPage}>
        <TopChrome t={t} clientName={clientName} dark />

        <View style={S.closeWrap}>
          <View>
            <Text style={[S.kicker, { color: C.gold, marginTop: 30 }]}>{t.closeKicker}</Text>
          </View>

          <View>
            <View style={S.closeGoldAccent} />
            <Text style={S.closeQuestion}>{t.closeQuestion}</Text>
            <Text style={S.closeSub}>{t.closeSubtitle}</Text>

            <View style={{ marginTop: 60 }}>
              <Text style={S.closeThankYou}>{t.thankYou}</Text>
              <View style={S.closeContactRow}>
                <View style={S.closeContactCell}>
                  <Text style={S.closeContactLabel}>EMAIL</Text>
                  <Text style={S.closeContactValue}>{providerEmail}</Text>
                </View>
                <View style={S.closeContactCell}>
                  <Text style={S.closeContactLabel}>PHONE</Text>
                  <Text style={S.closeContactValue}>{providerPhone}</Text>
                </View>
                {validUntil && (
                  <View style={S.closeContactCell}>
                    <Text style={S.closeContactLabel}>VALID UNTIL</Text>
                    <Text style={S.closeContactValue}>{validUntil}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View />
        </View>

        <Slate t={t} pageNum={includeDiscount ? '08' : '07'} pageTotal={PT} ref_={ref_} dark />
      </Page>
    </Document>
  );
}
