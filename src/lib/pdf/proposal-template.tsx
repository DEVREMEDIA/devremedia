/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import path from 'path';
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import './fonts';

// =====================================================================
// Design tokens — editorial / maison palette
// =====================================================================

const C = {
  // deeper, richer navy-black with warm undertone
  bg: '#020611',
  bgLift: '#080E1A',
  bgPlate: '#0C1322',

  // warm off-white family (cream tints)
  ink: '#F5EEDC',
  inkDim: '#8B94A6',
  inkDimmer: '#4F5968',
  cream: '#F5EEDC',
  creamDeep: '#E8DFC5',

  // luxurious gold family
  gold: '#C9A24A',
  goldBright: '#EACB7A',
  goldDeep: '#8B6F2E',
  goldSoft: '#B8923A',

  // pre-mixed hex (rgba would render tinted on borders in react-pdf)
  rule: '#453820',
  ruleSoft: '#2B2818',
  hairline: '#141823',
  hairlineSoft: '#202534',
  chipBg: '#171208',
  stageBg: '#100C07',
  cardBg: '#0B111F',
  cardBgWarm: '#160F06',
  badgeInk: '#0A0F18',
  ruleOnGold: '#7A5F22',
} as const;

// =====================================================================
// Asset loading — inline PNGs as base64
// =====================================================================

// 1×1 transparent PNG — fallback used when the bundled photo file is
// missing (e.g. added locally but never committed). Keeps the PDF
// buildable instead of crashing the whole route at module load.
const BLANK_PNG_1X1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

function loadAsset(relPath: string): string {
  try {
    const abs = path.join(process.cwd(), 'public', 'assets', 'proposal', relPath);
    const buf = fs.readFileSync(abs);
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch (err) {
    console.warn(
      `[proposal-pdf] asset missing, using blank placeholder: ${relPath}`,
      err instanceof Error ? err.message : err,
    );
    return BLANK_PNG_1X1;
  }
}

const ASSET_FILM_SET = loadAsset('film-set.png');
const ASSET_REELS = loadAsset('reels-phones.png');

// =====================================================================
// i18n copy (verbatim from 2026 deck)
// =====================================================================

const T = {
  el: {
    brand: 'DEVRE MEDIA',
    year: '2026',
    city: 'ATHENS',
    edition: 'EDITION MMXXVI',
    annoCover: 'ANNO MMXXVI',
    coverTop: 'ΠΡΟΤΑΣΗ ΣΥΝΕΡΓΑΣΙΑΣ',
    coverPotential: '[ POTENTIAL CLIENT ]',
    coverPresentedTo: 'ΕΠΙΜΕΛΕΙΑ ΓΙΑ',

    sec01: 'ΠΟΙΟΙ ΕΙΜΑΣΤΕ',
    sec02: 'ΣΤΟΧΟΣ ΣΥΝΕΡΓΑΣΙΑΣ',
    sec03: 'ΥΠΗΡΕΣΙΕΣ & ΠΑΡΑΔΟΤΕΑ',
    sec04: 'ΟΙΚΟΝΟΜΙΚΗ ΠΡΟΣΦΟΡΑ',
    sec05: 'ΡΟΗ ΕΡΓΑΣΙΩΝ',
    sec06: 'ΕΠΟΜΕΝΑ ΒΗΜΑΤΑ',

    chapter01: 'ΚΕΦΑΛΑΙΟ Ι',
    chapter02: 'ΚΕΦΑΛΑΙΟ ΙΙ',
    chapter03: 'ΚΕΦΑΛΑΙΟ ΙΙΙ',
    chapter04: 'ΚΕΦΑΛΑΙΟ ΙV',
    chapter05: 'ΚΕΦΑΛΑΙΟ V',
    chapter06: 'ΚΕΦΑΛΑΙΟ VΙ',
    chapter07: 'ΚΕΦΑΛΑΙΟ VΙΙ',
    chapter08: 'ΕΠΙΛΟΓΟΣ',

    whoWeAreLine1:
      'Η Devre Media δραστηριοποιείται στον τομέα της οπτικοακουστικής παραγωγής και των ψηφιακών δημιουργικών υπηρεσιών.',
    whoWeAreLine2:
      'Προσφέρουμε ολοκληρωμένες λύσεις επικοινωνίας σε επιχειρήσεις που επιθυμούν να ενισχύσουν την ψηφιακή τους παρουσία και να αναδείξουν το brand τους με cinematic ποιότητα.',
    trustedBy: 'ΕΝΔΕΙΚΤΙΚΟ ΠΕΛΑΤΟΛΟΓΙΟ',
    onSet: 'ON SET · DEVRE STUDIO',

    contentTitle: 'CONTENT',
    contentIntro: 'Σταθερό, αποδοτικό σύστημα παραγωγής περιεχομένου που θα:',
    bullet1: (c: string) => `Ενισχύσει την παρουσία της ${c} στα Social Media.`,
    bullet2: (c: string, adv: string) => `Επικοινωνήσει την ${adv} της ${c} στα social media.`,
    bullet3: 'Μετατρέψει το ενδιαφέρον σε διάδραση με το αγοραστικό κοινό.',
    needKicker: 'Η ΑΝΑΓΚΗ',
    reelsTag: '9:16 · REELS · TIK TOK · SHORTS',
    engineTag: 'CONTENT ENGINE · SOCIAL FIRST',

    servicesTitle: 'SERVICES',
    servicesIntro: 'Τρεις πυλώνες που συνθέτουν ένα πλήρες σύστημα παραγωγής.',
    pillar: 'ΠΥΛΩΝΑΣ',
    svc1Title: 'SOCIAL FIRST',
    svc1Body: 'Περιεχόμενο σε μορφή 9:16 για Tik Tok, Reels και Shorts με γρήγορο ρυθμό και Hooks.',
    svc2Title: 'FULL\nPRODUCTION',
    svc2Body:
      'Από το concept και το shotlist μέχρι το μοντάζ, το sound design και τους υπότιτλους.',
    svc3Title: 'FUNNEL LOGIC',
    svc3Body: 'Στρατηγική 6 μηνών: Awareness → Consideration → Conversion assets.',
    funnel1: 'Awareness',
    funnel2: 'Consideration',
    funnel3: 'Conversion',

    pricingTitle: 'PRICING',
    pricingIntro: 'Τρεις συνεργατικές συνθήκες. Ίδια ποιότητα παραγωγής.',
    featured: 'ΠΡΟΤΕΙΝΟΜΕΝΟ',
    daysLabel: (d: number) => `${d} ημέρες γυρίσματα`,
    readyToUse: (n: number) => `${n} ready to use videos`,
    includes: 'ΠΕΡΙΛΑΜΒΑΝΕΙ',
    termsLabel: 'ΟΡΟΙ ΠΛΗΡΩΜΗΣ',
    termsBody: (d: number) =>
      `Κατάθεση ${Math.round(d * 100)}% για την επιβεβαίωση της συνεργασίας και εξόφληση με την παράδοση του υλικού.`,
    vatNote: (v: number) =>
      `*Στις τιμές δεν περιλαμβάνεται η προσαύξηση του δείκτη ΦΠΑ ${Math.round(v * 100)}%`,

    discountEyebrow: 'ΕΚΠΤΩΣΗ ΓΝΩΡΙΜΙΑΣ',
    discountSub: (m: number) => `Για τους πρώτους ${m} μήνες συνεργασίας.`,
    specialEdition: 'ΕΙΔΙΚΗ ΕΚΔΟΣΗ',

    workflowTitle: 'WORKFLOW',
    workflowIntro: 'Μια καθαρή ροή που κρατά την παραγωγή σταθερή και προβλέψιμη.',
    step1: 'ΓΥΡΙΣΜΑΤΑ',
    step1body: 'Πραγματοποιούνται εντός του μήνα σε συμφωνημένες ημερομηνίες.',
    step2: 'ΠΑΡΑΔΟΣΗ',
    step2body: 'Batch delivery εντός 5–10 εργάσιμων ημερών από το γύρισμα.',
    step3: 'REVISIONS',
    step3body: 'Περιλαμβάνεται 1 κύκλος μικροδιορθώσεων ανά video (τίτλοι, trims).',
    noteLabel: 'ΣΗΜΕΙΩΣΗ',
    noteBody: 'Αλλαγές που απαιτούν επαναμοντάζ ή νέο concept τιμολογούνται ξεχωριστά.',

    thankEyebrow: 'ΜΕ ΕΚΤΙΜΗΣΗ',
    thankTitle1: 'THANK',
    thankTitle2: 'YOU.',
    thankSub: 'Είμαστε έτοιμοι να ξεκινήσουμε την παραγωγή;',
    emailLabel: 'EMAIL',
    phoneLabel: 'PHONE',
    validLabel: 'ΙΣΧΥΕΙ ΕΩΣ',

    footer01: 'COVER',
    footer02: 'ΠΡΟΦΙΛ ΕΤΑΙΡΕΙΑΣ',
    footer03: 'ΣΤΡΑΤΗΓΙΚΟΣ ΣΧΕΔΙΑΣΜΟΣ',
    footer04: 'ΤΕΧΝΙΚΕΣ ΠΡΟΔΙΑΓΡΑΦΕΣ',
    footer05: 'ΟΙΚΟΝΟΜΙΚΗ ΠΡΟΣΦΟΡΑ',
    footer06: 'ΟΙΚΟΝΟΜΙΚΗ ΠΡΟΣΦΟΡΑ · ΕΙΔΙΚΗ ΕΚΔΟΣΗ',
    footer07: 'ΧΡΟΝΟΔΙΑΓΡΑΜΜΑ',
    footer08: 'ΕΠΙΛΟΓΟΣ',
    rightFooter: 'DEVRE MEDIA · ATHENS · MMXXVI',
    coverSubtitlePrefix: 'Content Production & Video Marketing',
    coverSubtitleFor: 'για την ',
  },
  en: {
    brand: 'DEVRE MEDIA',
    year: '2026',
    city: 'ATHENS',
    edition: 'EDITION MMXXVI',
    annoCover: 'ANNO MMXXVI',
    coverTop: 'PROPOSAL',
    coverPotential: '[ POTENTIAL CLIENT ]',
    coverPresentedTo: 'PRESENTED TO',

    sec01: 'WHO WE ARE',
    sec02: 'PARTNERSHIP GOAL',
    sec03: 'SERVICES & DELIVERABLES',
    sec04: 'PRICING',
    sec05: 'WORKFLOW',
    sec06: 'NEXT STEPS',

    chapter01: 'CHAPTER I',
    chapter02: 'CHAPTER II',
    chapter03: 'CHAPTER III',
    chapter04: 'CHAPTER IV',
    chapter05: 'CHAPTER V',
    chapter06: 'CHAPTER VI',
    chapter07: 'CHAPTER VII',
    chapter08: 'EPILOGUE',

    whoWeAreLine1: 'Devre Media operates in audiovisual production and digital creative services.',
    whoWeAreLine2:
      'We deliver end-to-end communication solutions for businesses that want to strengthen their digital presence and elevate their brand with cinematic quality.',
    trustedBy: 'SELECTED CLIENTELE',
    onSet: 'ON SET · DEVRE STUDIO',

    contentTitle: 'CONTENT',
    contentIntro: 'A stable, efficient content production system that will:',
    bullet1: (c: string) => `Strengthen ${c}'s presence on Social Media.`,
    bullet2: (c: string, adv: string) => `Communicate ${c}'s ${adv} on social media.`,
    bullet3: 'Turn interest into interaction with the buying audience.',
    needKicker: 'THE NEED',
    reelsTag: '9:16 · REELS · TIK TOK · SHORTS',
    engineTag: 'CONTENT ENGINE · SOCIAL FIRST',

    servicesTitle: 'SERVICES',
    servicesIntro: 'Three pillars that form a complete production system.',
    pillar: 'PILLAR',
    svc1Title: 'SOCIAL FIRST',
    svc1Body: '9:16 content for Tik Tok, Reels and Shorts with fast pace and hooks.',
    svc2Title: 'FULL\nPRODUCTION',
    svc2Body: 'From concept and shotlist to editing, sound design and subtitles.',
    svc3Title: 'FUNNEL LOGIC',
    svc3Body: '6-month strategy: Awareness → Consideration → Conversion assets.',
    funnel1: 'Awareness',
    funnel2: 'Consideration',
    funnel3: 'Conversion',

    pricingTitle: 'PRICING',
    pricingIntro: 'Three collaboration modes. Same production quality.',
    featured: 'RECOMMENDED',
    daysLabel: (d: number) => `${d} shooting days`,
    readyToUse: (n: number) => `${n} ready to use videos`,
    includes: 'INCLUDES',
    termsLabel: 'PAYMENT TERMS',
    termsBody: (d: number) =>
      `${Math.round(d * 100)}% deposit on signing, balance on delivery of the material.`,
    vatNote: (v: number) => `*Prices do not include VAT ${Math.round(v * 100)}%`,

    discountEyebrow: 'INTRO DISCOUNT',
    discountSub: (m: number) => `For the first ${m} months of the partnership.`,
    specialEdition: 'SPECIAL EDITION',

    workflowTitle: 'WORKFLOW',
    workflowIntro: 'A clear flow that keeps production steady and predictable.',
    step1: 'FILMING',
    step1body: 'Takes place within the month on agreed dates.',
    step2: 'DELIVERY',
    step2body: 'Batch delivery within 5–10 business days of filming.',
    step3: 'REVISIONS',
    step3body: '1 round of minor corrections per video (titles, trims).',
    noteLabel: 'NOTE',
    noteBody: 'Changes requiring re-editing or a new concept are billed separately.',

    thankEyebrow: 'WITH GRATITUDE',
    thankTitle1: 'THANK',
    thankTitle2: 'YOU.',
    thankSub: 'Ready to start production?',
    emailLabel: 'EMAIL',
    phoneLabel: 'PHONE',
    validLabel: 'VALID UNTIL',

    footer01: 'COVER',
    footer02: 'COMPANY PROFILE',
    footer03: 'STRATEGY',
    footer04: 'SERVICES',
    footer05: 'PRICING',
    footer06: 'PRICING · SPECIAL EDITION',
    footer07: 'TIMELINE',
    footer08: 'EPILOGUE',
    rightFooter: 'DEVRE MEDIA · ATHENS · MMXXVI',
    coverSubtitlePrefix: 'Content Production & Video Marketing',
    coverSubtitleFor: 'for ',
  },
} as const;

type Locale = keyof typeof T;

// =====================================================================
// Props
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
  clientLogosBase64?: { name: string; src: string }[];
  /** Explicit list for the "SELECTED CLIENTELE" chips. If omitted, derives from clientLogosBase64 names. */
  trustedClients?: string[];
  /** From company_settings.email — no default. If omitted, email block is hidden. */
  providerEmail?: string;
  /** From company_settings.phone — no default. If omitted, phone block is hidden. */
  providerPhone?: string;
  proposalRef?: string;
}

// =====================================================================
// Page geometry — A4 landscape (842 × 595 pt)
// =====================================================================

const PAGE_W = 842;
const PAGE_H = 595;
const PAD_X = 52;
const PAD_TOP = 32;
const PAD_BOT = 28;
const TICK = 14;
const TICK_INSET = 22;

// =====================================================================
// Styles
// =====================================================================

const FONT = 'NotoSans';

const S = StyleSheet.create({
  page: {
    fontFamily: FONT,
    backgroundColor: C.bg,
    color: C.ink,
    position: 'relative',
  },

  // ---------- corner tick ornaments (L brackets) ----------
  tickH: {
    position: 'absolute',
    height: 0.6,
    width: TICK,
    backgroundColor: C.gold,
    opacity: 0.55,
  },
  tickV: {
    position: 'absolute',
    width: 0.6,
    height: TICK,
    backgroundColor: C.gold,
    opacity: 0.55,
  },

  // ---------- top chrome ----------
  topRow: {
    position: 'absolute',
    top: PAD_TOP,
    left: PAD_X,
    right: PAD_X,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandTag: {
    fontFamily: FONT,
    fontSize: 7,
    letterSpacing: 3.4,
    color: C.gold,
    fontWeight: 'bold',
  },
  brandTagMuted: {
    fontFamily: FONT,
    fontSize: 7,
    letterSpacing: 3,
    color: C.inkDim,
  },
  topCenterTag: {
    fontFamily: FONT,
    fontSize: 6.5,
    letterSpacing: 3.5,
    color: C.inkDimmer,
  },

  // ---------- bottom chrome ----------
  footerWrap: {
    position: 'absolute',
    bottom: 20,
    left: PAD_X,
    right: PAD_X,
  },
  footerHairThick: {
    height: 0.8,
    backgroundColor: C.goldDeep,
    opacity: 0.5,
    marginBottom: 3,
  },
  footerHairThin: {
    height: 0.4,
    backgroundColor: C.hairline,
    marginBottom: 8,
  },
  footRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footText: {
    fontFamily: FONT,
    fontSize: 6.5,
    letterSpacing: 2.6,
    color: C.inkDimmer,
  },
  footSerial: {
    fontFamily: FONT,
    fontSize: 6.5,
    letterSpacing: 2.6,
    color: C.gold,
    fontWeight: 'bold',
  },

  // ---------- typography ----------
  sectionEyebrow: {
    fontFamily: FONT,
    fontSize: 7,
    letterSpacing: 4,
    color: C.gold,
    fontWeight: 'bold',
  },
  bigNum: {
    fontFamily: FONT,
    fontWeight: 'bold',
    fontSize: 42,
    letterSpacing: -1,
    color: C.ink,
    lineHeight: 1,
  },
  sectionTitle: {
    fontFamily: FONT,
    fontWeight: 'bold',
    fontSize: 62,
    letterSpacing: -1.6,
    color: C.ink,
    lineHeight: 0.95,
  },
  sectionTitleLg: {
    fontFamily: FONT,
    fontWeight: 'bold',
    fontSize: 82,
    letterSpacing: -2.2,
    color: C.ink,
    lineHeight: 0.92,
  },
  goldWord: { color: C.gold },
  creamAccent: { color: C.creamDeep },

  goldRule: {
    width: 56,
    height: 1.8,
    backgroundColor: C.gold,
    marginTop: 12,
    marginBottom: 16,
  },
  goldRuleDouble: {
    marginTop: 12,
    marginBottom: 16,
    flexDirection: 'column',
  },
  goldRuleDoubleMain: {
    width: 72,
    height: 1.4,
    backgroundColor: C.gold,
  },
  goldRuleDoubleThin: {
    width: 30,
    height: 0.4,
    backgroundColor: C.goldSoft,
    marginTop: 3,
  },
  lede: {
    fontFamily: FONT,
    fontSize: 10,
    lineHeight: 1.5,
    color: C.inkDim,
    maxWidth: 540,
  },

  // ---------- diamond ornament ----------
  diamond: {
    width: 4,
    height: 4,
    backgroundColor: C.gold,
    transform: 'rotate(45deg)',
  },
  diamondLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  diamondInlineRule: {
    flex: 1,
    height: 0.4,
    backgroundColor: C.ruleSoft,
  },

  // ---------- monogram stamp (circle with DM) ----------
  monogramWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0.6,
    borderColor: C.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogramInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 0.3,
    borderColor: C.goldDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogramText: {
    fontFamily: FONT,
    fontSize: 9,
    letterSpacing: 0.6,
    color: C.gold,
    fontWeight: 'bold',
  },

  // ---------- cover ----------
  coverInner: {
    position: 'absolute',
    top: PAD_TOP,
    left: PAD_X,
    right: PAD_X,
    bottom: PAD_BOT,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  coverLockup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coverCross: {
    fontFamily: FONT,
    fontSize: 130,
    fontWeight: 'bold',
    color: C.gold,
    lineHeight: 1,
    marginRight: 30,
  },
  coverDevre: {
    fontFamily: FONT,
    fontSize: 58,
    fontWeight: 'bold',
    color: C.ink,
    letterSpacing: -1,
    lineHeight: 1,
  },
  coverMedia: {
    fontFamily: FONT,
    fontSize: 58,
    color: C.gold,
    letterSpacing: 3,
    lineHeight: 1,
    marginTop: 2,
  },
  coverEditionPlate: {
    fontFamily: FONT,
    fontSize: 8,
    letterSpacing: 4,
    color: C.goldBright,
    fontWeight: 'bold',
    marginTop: 14,
  },
  coverPresentedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  coverPresentedTo: {
    fontFamily: FONT,
    fontSize: 7,
    letterSpacing: 3.2,
    color: C.inkDim,
    fontWeight: 'bold',
    marginRight: 14,
  },
  coverClientName: {
    fontFamily: FONT,
    fontSize: 18,
    color: C.goldBright,
    fontWeight: 'bold',
    letterSpacing: 1.6,
  },
  coverSubtitle: {
    fontFamily: FONT,
    fontSize: 11,
    color: C.inkDim,
    lineHeight: 1.5,
    marginTop: 10,
    maxWidth: 520,
  },

  // ---------- section header ----------
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerNumCol: {
    width: 84,
  },
  headerTextCol: {
    flex: 1,
  },
  chapterEyebrow: {
    fontFamily: FONT,
    fontSize: 7,
    letterSpacing: 4.2,
    color: C.goldBright,
    fontWeight: 'bold',
    marginBottom: 4,
  },

  // ---------- page body container ----------
  pageBody: {
    position: 'absolute',
    top: 72,
    left: PAD_X,
    right: PAD_X,
    bottom: 52,
  },
  twoCol: {
    flexDirection: 'row',
    marginTop: 12,
  },
  twoColLeft: {
    flex: 1,
    paddingRight: 34,
  },
  twoColRight: {
    width: 300,
  },
  paragraph: {
    fontFamily: FONT,
    fontSize: 10,
    color: C.inkDim,
    lineHeight: 1.55,
    marginTop: 10,
    maxWidth: 440,
  },
  paragraphAccent: {
    color: C.goldBright,
    fontWeight: 'bold',
  },

  // ---------- profile (slide 2) ----------
  clientChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  clientChip: {
    fontFamily: FONT,
    fontSize: 7.5,
    letterSpacing: 1,
    color: C.ink,
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 12,
    paddingRight: 12,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 0.5,
    borderColor: C.gold,
    borderStyle: 'solid',
    borderRadius: 999,
    backgroundColor: C.chipBg,
  },
  sectionLabel: {
    fontFamily: FONT,
    fontSize: 7,
    letterSpacing: 3.4,
    color: C.gold,
    fontWeight: 'bold',
    marginTop: 20,
  },

  photoFrameOuter: {
    position: 'relative',
    width: '100%',
    height: 300,
  },
  photoOffset: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: 6,
    bottom: 6,
    borderWidth: 0.6,
    borderColor: C.goldSoft,
    borderStyle: 'solid',
    opacity: 0.6,
  },
  photoInner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  photoVignette: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
    backgroundColor: C.bg,
    opacity: 0.55,
  },
  photoCaption: {
    position: 'absolute',
    left: 14,
    bottom: 12,
    fontFamily: FONT,
    fontSize: 6.5,
    letterSpacing: 3,
    color: C.goldBright,
    fontWeight: 'bold',
  },
  photoTopLeftTick: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 12,
    height: 12,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: C.gold,
    borderLeftColor: C.gold,
  },
  photoBottomRightTick: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderBottomColor: C.gold,
    borderRightColor: C.gold,
  },

  // ---------- content (slide 3) ----------
  numList: {
    marginTop: 18,
  },
  numItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  numItemNumWrap: {
    width: 42,
    alignItems: 'flex-start',
  },
  numItemNum: {
    fontFamily: FONT,
    fontWeight: 'bold',
    fontSize: 24,
    color: C.gold,
    lineHeight: 1,
  },
  numItemNumDot: {
    width: 3,
    height: 3,
    backgroundColor: C.gold,
    marginTop: 6,
    transform: 'rotate(45deg)',
  },
  numItemText: {
    flex: 1,
    fontFamily: FONT,
    fontSize: 10.5,
    color: C.ink,
    lineHeight: 1.45,
    paddingTop: 5,
  },
  quoteLabel: {
    fontFamily: FONT,
    fontSize: 7,
    letterSpacing: 3.4,
    color: C.gold,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 20,
  },
  quoteBlock: {
    borderLeftWidth: 2,
    borderLeftColor: C.gold,
    borderLeftStyle: 'solid',
    paddingLeft: 14,
    paddingTop: 2,
    paddingBottom: 2,
    fontFamily: FONT,
    fontSize: 13,
    color: C.ink,
    lineHeight: 1.35,
  },

  reelsTag: {
    fontFamily: FONT,
    fontSize: 6.5,
    letterSpacing: 3,
    color: C.inkDimmer,
    marginBottom: 8,
  },
  reelsImage: {
    width: '100%',
    height: 280,
    objectFit: 'contain',
  },
  engineTag: {
    fontFamily: FONT,
    fontSize: 7,
    letterSpacing: 3,
    color: C.gold,
    fontWeight: 'bold',
    marginTop: 12,
  },

  // ---------- services (slide 4) ----------
  svcGrid: {
    flexDirection: 'row',
    marginTop: 22,
  },
  svcCard: {
    flex: 1,
    padding: 18,
    borderWidth: 0.7,
    borderColor: C.hairlineSoft,
    borderStyle: 'solid',
    backgroundColor: C.cardBg,
    marginRight: 12,
    minHeight: 240,
    position: 'relative',
  },
  svcCardLast: {
    marginRight: 0,
  },
  svcCardTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: C.gold,
  },
  svcPillar: {
    fontFamily: FONT,
    fontSize: 6.5,
    letterSpacing: 3,
    color: C.goldDeep,
    fontWeight: 'bold',
    marginTop: 6,
  },
  svcNum: {
    fontFamily: FONT,
    fontWeight: 'bold',
    fontSize: 22,
    color: C.gold,
    lineHeight: 1,
    marginTop: 4,
  },
  svcTitle: {
    fontFamily: FONT,
    fontWeight: 'bold',
    fontSize: 17,
    color: C.ink,
    marginTop: 10,
    lineHeight: 1.1,
    letterSpacing: -0.2,
  },
  svcRule: {
    width: 24,
    height: 1.2,
    backgroundColor: C.gold,
    marginTop: 10,
    marginBottom: 10,
  },
  svcBody: {
    fontFamily: FONT,
    fontSize: 9,
    lineHeight: 1.5,
    color: C.inkDim,
  },
  svcTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  svcTag: {
    fontFamily: FONT,
    fontSize: 6.5,
    letterSpacing: 2,
    color: C.goldBright,
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 6,
    paddingRight: 6,
    borderWidth: 0.5,
    borderColor: C.rule,
    borderStyle: 'solid',
    marginRight: 4,
    marginBottom: 4,
  },
  svcFunnel: {
    marginTop: 10,
  },
  fstage: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 7,
    paddingBottom: 7,
    paddingLeft: 10,
    paddingRight: 10,
    borderWidth: 0.5,
    borderColor: C.hairlineSoft,
    borderStyle: 'solid',
    backgroundColor: C.stageBg,
    marginBottom: 4,
  },
  fstageNum: {
    fontFamily: FONT,
    fontSize: 8,
    fontWeight: 'bold',
    color: C.gold,
    letterSpacing: 1,
    marginRight: 10,
  },
  fstageText: {
    fontFamily: FONT,
    fontSize: 9,
    fontWeight: 'bold',
    color: C.ink,
    letterSpacing: 0.6,
  },

  // ---------- pricing (slides 5/6) ----------
  packGrid: {
    flexDirection: 'row',
    marginTop: 20,
  },
  pack: {
    flex: 1,
    padding: 18,
    borderWidth: 0.7,
    borderColor: C.hairlineSoft,
    borderStyle: 'solid',
    backgroundColor: C.cardBg,
    marginRight: 12,
    minHeight: 240,
    position: 'relative',
  },
  packLast: {
    marginRight: 0,
  },
  packFeatured: {
    borderColor: C.gold,
    borderWidth: 1,
    backgroundColor: C.cardBgWarm,
  },
  packFeaturedTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2.4,
    backgroundColor: C.gold,
  },
  packBadge: {
    position: 'absolute',
    top: -9,
    left: 14,
    fontFamily: FONT,
    fontSize: 6.5,
    letterSpacing: 2.4,
    color: C.badgeInk,
    fontWeight: 'bold',
    backgroundColor: C.gold,
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 8,
    paddingRight: 8,
  },
  packLabel: {
    fontFamily: FONT,
    fontWeight: 'bold',
    fontSize: 22,
    color: C.ink,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  packSubLabel: {
    fontFamily: FONT,
    fontSize: 7.5,
    letterSpacing: 2.8,
    color: C.gold,
    fontWeight: 'bold',
    marginTop: 6,
  },
  packRule: {
    height: 0.5,
    backgroundColor: C.hairlineSoft,
    marginTop: 14,
    marginBottom: 14,
  },
  packPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  packPriceAmount: {
    fontFamily: FONT,
    fontWeight: 'bold',
    fontSize: 44,
    color: C.ink,
    letterSpacing: -1.2,
    lineHeight: 1,
  },
  packPriceCurrency: {
    fontFamily: FONT,
    fontSize: 18,
    color: C.gold,
    marginLeft: 5,
  },
  packPriceOld: {
    fontFamily: FONT,
    fontSize: 10,
    color: C.inkDimmer,
    textDecoration: 'line-through',
    marginBottom: 2,
  },
  packIncludesLabel: {
    fontFamily: FONT,
    fontSize: 6.5,
    letterSpacing: 2.6,
    color: C.gold,
    fontWeight: 'bold',
    marginTop: 14,
    marginBottom: 6,
  },
  packList: {
    marginTop: 2,
  },
  packListItem: {
    fontFamily: FONT,
    fontSize: 9,
    color: C.inkDim,
    paddingLeft: 12,
    position: 'relative',
    lineHeight: 1.45,
    marginBottom: 4,
  },
  packListDiamond: {
    position: 'absolute',
    left: 1,
    top: 4.5,
    width: 3.5,
    height: 3.5,
    backgroundColor: C.gold,
    transform: 'rotate(45deg)',
  },

  termsWrap: {
    position: 'absolute',
    left: PAD_X,
    right: PAD_X,
    bottom: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  termsLeft: {
    flex: 1,
    paddingRight: 24,
  },
  termsHeader: {
    fontFamily: FONT,
    fontSize: 7,
    letterSpacing: 3.2,
    color: C.gold,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  termsBody: {
    fontFamily: FONT,
    fontSize: 9,
    color: C.inkDim,
    lineHeight: 1.45,
    maxWidth: 460,
  },
  vatNote: {
    fontFamily: FONT,
    fontSize: 6.5,
    letterSpacing: 1.8,
    color: C.inkDimmer,
    textAlign: 'right',
    maxWidth: 240,
    lineHeight: 1.55,
  },

  discountHeadline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 6,
  },
  discountPct: {
    fontFamily: FONT,
    fontWeight: 'bold',
    fontSize: 72,
    color: C.ink,
    letterSpacing: -2,
    lineHeight: 1,
    marginRight: 20,
  },
  discountPctPercent: {
    fontSize: 40,
    color: C.gold,
  },
  discountMeta: {
    paddingBottom: 10,
  },
  discountEyebrow: {
    fontFamily: FONT,
    fontSize: 10,
    letterSpacing: 2.4,
    color: C.gold,
    fontWeight: 'bold',
  },
  discountSub: {
    fontFamily: FONT,
    fontSize: 9,
    color: C.inkDim,
    marginTop: 3,
  },
  specialEdition: {
    fontFamily: FONT,
    fontSize: 6.5,
    letterSpacing: 4,
    color: C.goldBright,
    fontWeight: 'bold',
    marginBottom: 6,
  },

  // ---------- workflow (slide 7) ----------
  workflowBody: {
    marginTop: 26,
    position: 'relative',
  },
  timelineRail: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 16,
    height: 0.8,
    backgroundColor: C.goldDeep,
    opacity: 0.55,
  },
  timelineDotsRow: {
    flexDirection: 'row',
    position: 'absolute',
    top: 9,
    left: 0,
    right: 0,
  },
  timelineDotCol: {
    flex: 1,
    paddingRight: 28,
  },
  stepDotOuter: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 0.6,
    borderColor: C.gold,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.gold,
  },
  timelineGrid: {
    flexDirection: 'row',
    marginTop: 44,
  },
  timelineCol: {
    flex: 1,
    paddingRight: 28,
  },
  stepNum: {
    fontFamily: FONT,
    fontWeight: 'bold',
    fontSize: 24,
    color: C.gold,
    lineHeight: 1,
  },
  stepTitle: {
    fontFamily: FONT,
    fontWeight: 'bold',
    fontSize: 15,
    color: C.ink,
    letterSpacing: 0.6,
    marginTop: 12,
  },
  stepRule: {
    width: 24,
    height: 1,
    backgroundColor: C.gold,
    marginTop: 9,
    marginBottom: 9,
  },
  stepBody: {
    fontFamily: FONT,
    fontSize: 9,
    color: C.inkDim,
    lineHeight: 1.5,
    maxWidth: 220,
  },
  noteWrap: {
    marginTop: 24,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: C.gold,
    borderLeftStyle: 'solid',
  },
  noteLabel: {
    fontFamily: FONT,
    fontSize: 7,
    letterSpacing: 3.4,
    color: C.gold,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  noteBody: {
    fontFamily: FONT,
    fontSize: 10,
    color: C.ink,
    lineHeight: 1.5,
    maxWidth: 580,
  },

  // ---------- thank you (slide 8) ----------
  thankInner: {
    position: 'absolute',
    top: PAD_TOP,
    left: PAD_X,
    right: PAD_X,
    bottom: PAD_BOT,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  thankEyebrow: {
    fontFamily: FONT,
    fontSize: 8,
    letterSpacing: 4.2,
    color: C.goldBright,
    fontWeight: 'bold',
  },
  thankCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thankLeft: {
    flex: 1,
  },
  thankTitle: {
    fontFamily: FONT,
    fontWeight: 'bold',
    fontSize: 104,
    letterSpacing: -2.6,
    color: C.ink,
    lineHeight: 0.88,
  },
  thankTitleGold: {
    color: C.gold,
  },
  thankSub: {
    fontFamily: FONT,
    fontSize: 13,
    color: C.inkDim,
    lineHeight: 1.4,
    marginTop: 14,
    maxWidth: 420,
  },
  thankContact: {
    width: 240,
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  contactBlock: {
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  contactLabel: {
    fontFamily: FONT,
    fontSize: 7,
    letterSpacing: 3.4,
    color: C.gold,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  contactValue: {
    fontFamily: FONT,
    fontSize: 12.5,
    color: C.ink,
  },
  contactDivider: {
    width: 60,
    height: 0.5,
    backgroundColor: C.gold,
    opacity: 0.4,
    marginTop: 2,
    marginBottom: 10,
  },
});

// =====================================================================
// Helpers
// =====================================================================

function formatPrice(n: number): string {
  return Math.round(n).toLocaleString('de-DE');
}

function splitPackName(name: string): { label: string; detail: string | null } {
  const m = name.match(/^\s*(.+?)\s*[-–—:]\s*(.+?)\s*$/);
  if (m) return { label: m[1], detail: m[2] };
  return { label: name, detail: null };
}

// =====================================================================
// Ornament components
// =====================================================================

function CornerTicks() {
  const inset = TICK_INSET;
  return (
    <>
      {/* top-left */}
      <View style={[S.tickH, { top: inset, left: inset }]} />
      <View style={[S.tickV, { top: inset, left: inset }]} />
      {/* top-right */}
      <View style={[S.tickH, { top: inset, right: inset }]} />
      <View style={[S.tickV, { top: inset, right: inset }]} />
      {/* bottom-left */}
      <View style={[S.tickH, { bottom: inset, left: inset }]} />
      <View style={[S.tickV, { bottom: inset - TICK, left: inset }]} />
      {/* bottom-right */}
      <View style={[S.tickH, { bottom: inset, right: inset }]} />
      <View style={[S.tickV, { bottom: inset - TICK, right: inset }]} />
    </>
  );
}

function Monogram() {
  return (
    <View style={S.monogramWrap}>
      <View style={S.monogramInner}>
        <Text style={S.monogramText}>DM</Text>
      </View>
    </View>
  );
}

function Diamond({ size = 4 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: C.gold,
        transform: 'rotate(45deg)',
      }}
    />
  );
}

function DoubleGoldRule() {
  return (
    <View style={S.goldRuleDouble}>
      <View style={S.goldRuleDoubleMain} />
      <View style={S.goldRuleDoubleThin} />
    </View>
  );
}

// =====================================================================
// Shared chrome
// =====================================================================

function TopEyebrow({
  leftText,
  centerText,
  rightText,
}: {
  leftText: string;
  centerText?: string;
  rightText: string;
}) {
  return (
    <View style={S.topRow}>
      <Text style={S.brandTag}>{leftText}</Text>
      {centerText ? <Text style={S.topCenterTag}>{centerText}</Text> : null}
      <Text style={S.brandTagMuted}>{rightText}</Text>
    </View>
  );
}

function PageFooter({ section, pageLabel }: { section: string; pageLabel: string }) {
  return (
    <View style={S.footerWrap}>
      <View style={S.footerHairThick} />
      <View style={S.footerHairThin} />
      <View style={S.footRow}>
        <Text style={S.footText}>{section}</Text>
        <Text style={S.footSerial}>{pageLabel}</Text>
        <Text style={S.footText}>DEVRE MEDIA · ATHENS · MMXXVI</Text>
      </View>
    </View>
  );
}

function SectionHeader({
  num,
  chapter,
  title,
  intro,
  large = false,
  titleSecondLineGold = false,
}: {
  num: string;
  chapter?: string;
  title: string;
  intro?: string;
  large?: boolean;
  titleSecondLineGold?: boolean;
}) {
  const lines = title.split('\n');
  return (
    <View style={S.headerRow}>
      <View style={S.headerNumCol}>
        <Text style={S.bigNum}>{num}</Text>
      </View>
      <View style={S.headerTextCol}>
        {chapter ? <Text style={S.chapterEyebrow}>{chapter}</Text> : null}
        <Text style={large ? S.sectionTitleLg : S.sectionTitle}>
          {lines.map((line, i) =>
            i === lines.length - 1 && titleSecondLineGold && lines.length > 1 ? (
              <Text key={i} style={S.goldWord}>
                {line}
              </Text>
            ) : (
              <Text key={i}>
                {line}
                {i < lines.length - 1 ? '\n' : ''}
              </Text>
            ),
          )}
        </Text>
        <DoubleGoldRule />
        {intro ? <Text style={S.lede}>{intro}</Text> : null}
      </View>
    </View>
  );
}

// =====================================================================
// Main component
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
  clientLogosBase64 = [],
  providerEmail,
  providerPhone,
  trustedClients,
}: ProposalPDFProps) {
  const t = T[locale];
  const advantageValue = competitiveAdvantage?.trim() || null;
  // When no advantage is set by the user, render a bracketed placeholder as a
  // "fill this in" template marker — not tenant data.
  const advantage =
    advantageValue ?? (locale === 'el' ? '[ΑΝΤΑΓΩΝΙΣΤΙΚΟ ΠΛΕΟΝΕΚΤΗΜΑ]' : '[COMPETITIVE ADVANTAGE]');

  const recommendedIdx = packages.length >= 3 ? 1 : -1;
  const needQuote = clientNeed?.trim() || null;

  // Trusted clients list: explicit prop wins, else derive from passed logos.
  // If neither available, the section is hidden entirely.
  const clientChips: string[] =
    trustedClients?.filter((c) => c?.trim().length > 0) ??
    clientLogosBase64.map((c) => c.name).filter((n) => n?.trim().length > 0);

  const lastIdx = packages.length - 1;
  const totalPages = 8 + (includeDiscount ? 1 : 0);
  const pageLabel = (n: number) =>
    `No. ${String(n).padStart(2, '0')} — ${String(totalPages).padStart(2, '0')}`;

  return (
    <Document>
      {/* =============================================================== */}
      {/* 01 — COVER                                                       */}
      {/* =============================================================== */}
      <Page size={[PAGE_W, PAGE_H]} style={S.page}>
        <CornerTicks />

        <View style={S.coverInner}>
          {/* Top bar */}
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Text style={S.brandTag}>
              {t.brand} · {t.city}
            </Text>
            <Text style={S.topCenterTag}>{t.annoCover}</Text>
            <Text style={S.brandTagMuted}>{t.coverTop}</Text>
          </View>

          {/* Center lockup */}
          <View>
            <Text style={[S.sectionEyebrow, { color: C.inkDim, marginBottom: 22 }]}>
              {t.coverPotential}
            </Text>

            <View style={S.coverLockup}>
              <Text style={S.coverCross}>×</Text>
              <View>
                <Text style={S.coverDevre}>DEVRE</Text>
                <Text style={S.coverMedia}>MEDIA</Text>
              </View>
            </View>

            <View
              style={{
                marginTop: 22,
                marginBottom: 10,
                width: 90,
                height: 1.4,
                backgroundColor: C.gold,
              }}
            />

            <Text style={S.coverEditionPlate}>{t.edition}</Text>

            <View style={S.coverPresentedRow}>
              <Text style={S.coverPresentedTo}>{t.coverPresentedTo}</Text>
              <View style={{ width: 24, height: 0.5, backgroundColor: C.gold, marginRight: 14 }} />
              <Text style={S.coverClientName}>{clientName.toUpperCase()}</Text>
            </View>

            <Text style={S.coverSubtitle}>{t.coverSubtitlePrefix}</Text>
          </View>

          {/* Bottom bar */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}
          >
            <View>
              <Text style={S.footText}>{t.footer01}</Text>
              <Text style={[S.footSerial, { marginTop: 4 }]}>{pageLabel(1)}</Text>
            </View>
            <Monogram />
            <Text style={S.footText}>DEVRE MEDIA · ATHENS · MMXXVI</Text>
          </View>
        </View>
      </Page>

      {/* =============================================================== */}
      {/* 02 — PROFILE                                                     */}
      {/* =============================================================== */}
      <Page size={[PAGE_W, PAGE_H]} style={S.page}>
        <CornerTicks />
        <TopEyebrow leftText={t.brand} centerText={t.edition} rightText={t.sec01} />

        <View style={S.pageBody}>
          <View style={S.twoCol}>
            <View style={S.twoColLeft}>
              <SectionHeader
                num="01"
                chapter={t.chapter01}
                title={'DEVRE\nMEDIA'}
                titleSecondLineGold
              />
              <Text style={S.paragraph}>{t.whoWeAreLine1}</Text>
              <Text style={S.paragraph}>{t.whoWeAreLine2}</Text>

              {clientChips.length > 0 ? (
                <>
                  <Text style={S.sectionLabel}>{t.trustedBy}</Text>
                  <View style={S.clientChipRow}>
                    {clientChips.map((c) => (
                      <Text key={c} style={S.clientChip}>
                        {c}
                      </Text>
                    ))}
                  </View>
                </>
              ) : null}
            </View>

            <View style={S.twoColRight}>
              <View style={S.photoFrameOuter}>
                <View style={S.photoOffset} />
                <View style={S.photoInner}>
                  <Image src={ASSET_FILM_SET} style={S.photoImage} />
                  <View style={S.photoVignette} />
                  <View style={S.photoTopLeftTick} />
                  <View style={S.photoBottomRightTick} />
                  <Text style={S.photoCaption}>{t.onSet}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <PageFooter section={t.footer02} pageLabel={pageLabel(2)} />
      </Page>

      {/* =============================================================== */}
      {/* 03 — CONTENT / GOAL                                              */}
      {/* =============================================================== */}
      <Page size={[PAGE_W, PAGE_H]} style={S.page}>
        <CornerTicks />
        <TopEyebrow leftText={t.brand} centerText={t.edition} rightText={t.sec02} />

        <View style={S.pageBody}>
          <View style={S.twoCol}>
            <View style={S.twoColLeft}>
              <SectionHeader
                num="02"
                chapter={t.chapter02}
                title={t.contentTitle}
                intro={t.contentIntro}
              />

              <View style={S.numList}>
                <View style={S.numItem}>
                  <View style={S.numItemNumWrap}>
                    <Text style={S.numItemNum}>01</Text>
                  </View>
                  <Text style={S.numItemText}>{t.bullet1(clientName)}</Text>
                </View>
                <View style={S.numItem}>
                  <View style={S.numItemNumWrap}>
                    <Text style={S.numItemNum}>02</Text>
                  </View>
                  <Text style={S.numItemText}>{t.bullet2(clientName, advantage)}</Text>
                </View>
                <View style={S.numItem}>
                  <View style={S.numItemNumWrap}>
                    <Text style={S.numItemNum}>03</Text>
                  </View>
                  <Text style={S.numItemText}>{t.bullet3}</Text>
                </View>
              </View>

              {needQuote ? (
                <>
                  <Text style={S.quoteLabel}>{t.needKicker}</Text>
                  <Text style={S.quoteBlock}>&quot;{needQuote}&quot;</Text>
                </>
              ) : null}
            </View>

            <View style={S.twoColRight}>
              <Text style={S.reelsTag}>{t.reelsTag}</Text>
              <Image src={ASSET_REELS} style={S.reelsImage} />
              <Text style={S.engineTag}>{t.engineTag}</Text>
            </View>
          </View>
        </View>

        <PageFooter section={t.footer03} pageLabel={pageLabel(3)} />
      </Page>

      {/* =============================================================== */}
      {/* 04 — SERVICES                                                    */}
      {/* =============================================================== */}
      <Page size={[PAGE_W, PAGE_H]} style={S.page}>
        <CornerTicks />
        <TopEyebrow leftText={t.brand} centerText={t.edition} rightText={t.sec03} />

        <View style={S.pageBody}>
          <SectionHeader
            num="03"
            chapter={t.chapter03}
            title={t.servicesTitle}
            intro={t.servicesIntro}
          />

          <View style={S.svcGrid}>
            {[
              {
                title: t.svc1Title,
                body: t.svc1Body,
                tags: ['9:16', 'REELS', 'SHORTS', 'HOOKS'],
                num: '01',
              },
              {
                title: t.svc2Title,
                body: t.svc2Body,
                tags: ['CONCEPT', 'SHOTLIST', 'EDIT', 'SOUND', 'SUBS'],
                num: '02',
              },
              { title: t.svc3Title, body: t.svc3Body, tags: null, num: '03' },
            ].map((svc, i, arr) => (
              <View key={svc.num} style={[S.svcCard, i === arr.length - 1 ? S.svcCardLast : {}]}>
                <View style={S.svcCardTopBar} />
                <Text style={S.svcPillar}>
                  {t.pillar} {svc.num}
                </Text>
                <Text style={S.svcNum}>{svc.num}</Text>
                <Text style={S.svcTitle}>{svc.title}</Text>
                <View style={S.svcRule} />
                <Text style={S.svcBody}>{svc.body}</Text>
                {svc.tags ? (
                  <View style={S.svcTagRow}>
                    {svc.tags.map((tag) => (
                      <Text key={tag} style={S.svcTag}>
                        {tag}
                      </Text>
                    ))}
                  </View>
                ) : (
                  <View style={S.svcFunnel}>
                    <View style={S.fstage}>
                      <Text style={S.fstageNum}>I</Text>
                      <Text style={S.fstageText}>{t.funnel1}</Text>
                    </View>
                    <View style={S.fstage}>
                      <Text style={S.fstageNum}>II</Text>
                      <Text style={S.fstageText}>{t.funnel2}</Text>
                    </View>
                    <View style={S.fstage}>
                      <Text style={S.fstageNum}>III</Text>
                      <Text style={S.fstageText}>{t.funnel3}</Text>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        <PageFooter section={t.footer04} pageLabel={pageLabel(4)} />
      </Page>

      {/* =============================================================== */}
      {/* 05 — PRICING                                                     */}
      {/* =============================================================== */}
      <Page size={[PAGE_W, PAGE_H]} style={S.page}>
        <CornerTicks />
        <TopEyebrow leftText={t.brand} centerText={t.edition} rightText={t.sec04} />

        <View style={S.pageBody}>
          <SectionHeader
            num="04"
            chapter={t.chapter04}
            title={t.pricingTitle}
            intro={t.pricingIntro}
            large
          />

          <View style={S.packGrid}>
            {packages.map((p, idx) => {
              const featured = idx === recommendedIdx;
              const { label, detail } = splitPackName(p.name);
              const isLast = idx === lastIdx;
              return (
                <View
                  key={p.id}
                  style={[S.pack, featured ? S.packFeatured : {}, isLast ? S.packLast : {}]}
                >
                  {featured && (
                    <>
                      <View style={S.packFeaturedTopBar} />
                      <Text style={S.packBadge}>{t.featured}</Text>
                    </>
                  )}
                  <Text style={S.packLabel}>{label.toUpperCase()}</Text>
                  {detail ? <Text style={S.packSubLabel}>{detail.toUpperCase()}</Text> : null}
                  <View style={S.packRule} />
                  <View style={S.packPrice}>
                    <Text style={S.packPriceAmount}>{formatPrice(p.price)}</Text>
                    <Text style={S.packPriceCurrency}>€</Text>
                  </View>
                  <Text style={S.packIncludesLabel}>{t.includes}</Text>
                  <View style={S.packList}>
                    {p.shooting_days != null && (
                      <View style={{ position: 'relative' }}>
                        <View style={S.packListDiamond} />
                        <Text style={S.packListItem}>{t.daysLabel(p.shooting_days)}</Text>
                      </View>
                    )}
                    {p.video_count != null && (
                      <View style={{ position: 'relative' }}>
                        <View style={S.packListDiamond} />
                        <Text style={S.packListItem}>{t.readyToUse(p.video_count)}</Text>
                      </View>
                    )}
                    {p.inclusions.map((inc, i) => (
                      <View key={i} style={{ position: 'relative' }}>
                        <View style={S.packListDiamond} />
                        <Text style={S.packListItem}>{inc}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={S.termsWrap}>
          <View style={S.termsLeft}>
            <Text style={S.termsHeader}>{t.termsLabel}</Text>
            <Text style={S.termsBody}>{t.termsBody(depositPercent)}</Text>
          </View>
          <Text style={S.vatNote}>{t.vatNote(vatPercent)}</Text>
        </View>

        <PageFooter section={t.footer05} pageLabel={pageLabel(5)} />
      </Page>

      {/* =============================================================== */}
      {/* 06 — DISCOUNT PRICING (optional)                                 */}
      {/* =============================================================== */}
      {includeDiscount && packages.length > 0 && (
        <Page size={[PAGE_W, PAGE_H]} style={S.page}>
          <CornerTicks />
          <TopEyebrow leftText={t.brand} centerText={t.edition} rightText={t.sec04} />

          <View style={S.pageBody}>
            <Text style={S.specialEdition}>{t.specialEdition}</Text>
            <SectionHeader num="05" chapter={t.chapter05} title={t.pricingTitle} large />

            <View style={S.discountHeadline}>
              <Text style={S.discountPct}>
                −{Math.round(discountPercent * 100)}
                <Text style={S.discountPctPercent}>%</Text>
              </Text>
              <View style={S.discountMeta}>
                <Text style={S.discountEyebrow}>{t.discountEyebrow}</Text>
                <Text style={S.discountSub}>{t.discountSub(discountMonths)}</Text>
              </View>
            </View>

            <View style={S.packGrid}>
              {packages.map((p, idx) => {
                const featured = idx === recommendedIdx;
                const { label, detail } = splitPackName(p.name);
                const isLast = idx === lastIdx;
                const discounted = p.price * (1 - discountPercent);
                return (
                  <View
                    key={p.id}
                    style={[S.pack, featured ? S.packFeatured : {}, isLast ? S.packLast : {}]}
                  >
                    {featured && (
                      <>
                        <View style={S.packFeaturedTopBar} />
                        <Text style={S.packBadge}>{t.featured}</Text>
                      </>
                    )}
                    <Text style={S.packLabel}>{label.toUpperCase()}</Text>
                    {detail ? <Text style={S.packSubLabel}>{detail.toUpperCase()}</Text> : null}
                    <View style={S.packRule} />
                    <Text style={S.packPriceOld}>{formatPrice(p.price)} €</Text>
                    <View style={S.packPrice}>
                      <Text style={S.packPriceAmount}>{formatPrice(discounted)}</Text>
                      <Text style={S.packPriceCurrency}>€</Text>
                    </View>
                    <Text style={S.packIncludesLabel}>{t.includes}</Text>
                    <View style={S.packList}>
                      {p.shooting_days != null && (
                        <View style={{ position: 'relative' }}>
                          <View style={S.packListDiamond} />
                          <Text style={S.packListItem}>{t.daysLabel(p.shooting_days)}</Text>
                        </View>
                      )}
                      {p.video_count != null && (
                        <View style={{ position: 'relative' }}>
                          <View style={S.packListDiamond} />
                          <Text style={S.packListItem}>{t.readyToUse(p.video_count)}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={[S.termsWrap, { justifyContent: 'flex-end' }]}>
            <Text style={S.vatNote}>{t.vatNote(vatPercent)}</Text>
          </View>

          <PageFooter section={t.footer06} pageLabel={pageLabel(6)} />
        </Page>
      )}

      {/* =============================================================== */}
      {/* 07 — WORKFLOW                                                    */}
      {/* =============================================================== */}
      <Page size={[PAGE_W, PAGE_H]} style={S.page}>
        <CornerTicks />
        <TopEyebrow leftText={t.brand} centerText={t.edition} rightText={t.sec05} />

        <View style={S.pageBody}>
          <SectionHeader
            num={includeDiscount ? '06' : '05'}
            chapter={includeDiscount ? t.chapter06 : t.chapter05}
            title={t.workflowTitle}
            intro={t.workflowIntro}
            large
          />

          <View style={S.workflowBody}>
            <View style={S.timelineRail} />
            <View style={S.timelineDotsRow}>
              <View style={S.timelineDotCol}>
                <View style={S.stepDotOuter}>
                  <View style={S.stepDot} />
                </View>
              </View>
              <View style={S.timelineDotCol}>
                <View style={S.stepDotOuter}>
                  <View style={S.stepDot} />
                </View>
              </View>
              <View style={[S.timelineDotCol, { paddingRight: 0 }]}>
                <View style={S.stepDotOuter}>
                  <View style={S.stepDot} />
                </View>
              </View>
            </View>

            <View style={S.timelineGrid}>
              <View style={S.timelineCol}>
                <Text style={S.stepNum}>I</Text>
                <Text style={S.stepTitle}>{t.step1}</Text>
                <View style={S.stepRule} />
                <Text style={S.stepBody}>{t.step1body}</Text>
              </View>
              <View style={S.timelineCol}>
                <Text style={S.stepNum}>II</Text>
                <Text style={S.stepTitle}>{t.step2}</Text>
                <View style={S.stepRule} />
                <Text style={S.stepBody}>{t.step2body}</Text>
              </View>
              <View style={[S.timelineCol, { paddingRight: 0 }]}>
                <Text style={S.stepNum}>III</Text>
                <Text style={S.stepTitle}>{t.step3}</Text>
                <View style={S.stepRule} />
                <Text style={S.stepBody}>{t.step3body}</Text>
              </View>
            </View>
          </View>

          <View style={S.noteWrap}>
            <Text style={S.noteLabel}>{t.noteLabel}</Text>
            <Text style={S.noteBody}>{t.noteBody}</Text>
          </View>
        </View>

        <PageFooter section={t.footer07} pageLabel={pageLabel(includeDiscount ? 7 : 6)} />
      </Page>

      {/* =============================================================== */}
      {/* 08 — THANK YOU                                                   */}
      {/* =============================================================== */}
      <Page size={[PAGE_W, PAGE_H]} style={S.page}>
        <CornerTicks />

        <View style={S.thankInner}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={S.brandTag}>{t.brand}</Text>
            <Text style={S.thankEyebrow}>{t.thankEyebrow}</Text>
            <Text style={S.brandTagMuted}>{t.sec06}</Text>
          </View>

          <View style={S.thankCenter}>
            <View style={S.thankLeft}>
              <Text style={S.thankTitle}>
                {t.thankTitle1}
                {'\n'}
                <Text style={S.thankTitleGold}>{t.thankTitle2}</Text>
              </Text>
              <View
                style={{
                  width: 100,
                  height: 1.4,
                  backgroundColor: C.gold,
                  marginTop: 16,
                  marginBottom: 6,
                }}
              />
              <View style={{ width: 40, height: 0.4, backgroundColor: C.goldSoft }} />
              <Text style={S.thankSub}>{t.thankSub}</Text>
            </View>

            <View style={S.thankContact}>
              <Monogram />
              <View style={{ height: 18 }} />
              {providerEmail ? (
                <View style={S.contactBlock}>
                  <Text style={S.contactLabel}>{t.emailLabel}</Text>
                  <Text style={S.contactValue}>{providerEmail}</Text>
                </View>
              ) : null}
              {providerPhone ? (
                <View style={S.contactBlock}>
                  <Text style={S.contactLabel}>{t.phoneLabel}</Text>
                  <Text style={S.contactValue}>{providerPhone}</Text>
                </View>
              ) : null}
              {validUntil ? (
                <>
                  {providerEmail || providerPhone ? <View style={S.contactDivider} /> : null}
                  <View style={S.contactBlock}>
                    <Text style={S.contactLabel}>{t.validLabel}</Text>
                    <Text style={S.contactValue}>{validUntil}</Text>
                  </View>
                </>
              ) : null}
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={S.footText}>{t.footer08}</Text>
            <Text style={S.footSerial}>{pageLabel(totalPages)}</Text>
            <Text style={S.footText}>DEVRE MEDIA · ATHENS · MMXXVI</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
