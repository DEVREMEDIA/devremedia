import path from 'path';
import { Font, StyleSheet } from '@react-pdf/renderer';

// Register Noto Sans for Greek character support
Font.register({
  family: 'NotoSans',
  fonts: [
    {
      src: path.join(process.cwd(), 'public', 'fonts', 'NotoSans-Regular.ttf'),
      fontWeight: 'normal',
    },
    {
      src: path.join(process.cwd(), 'public', 'fonts', 'NotoSans-Bold.ttf'),
      fontWeight: 'bold',
    },
  ],
});

// Brand palette
export const C = {
  dark: '#09090b',
  darkCard: '#18181b',
  darkBorder: '#27272a',
  gold: '#d4a843',
  goldDark: '#b8942e',
  white: '#ffffff',
  surface: '#fafafa',
  muted: '#71717a',
  mutedLight: '#a1a1aa',
  text: '#09090b',
  border: '#e4e4e7',
};

export const contractStyles = StyleSheet.create({
  // Page
  page: {
    paddingTop: 0,
    paddingBottom: 50,
    paddingHorizontal: 0,
    fontSize: 9,
    fontFamily: 'NotoSans',
    backgroundColor: C.white,
    color: C.text,
  },

  // Header — dark bg, compact
  header: {
    backgroundColor: C.dark,
    paddingHorizontal: 40,
    paddingTop: 18,
    paddingBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLogo: {
    width: 140,
    height: 30,
    objectFit: 'contain' as const,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 8,
    fontFamily: 'NotoSans',
    fontWeight: 'bold',
    color: C.gold,
    letterSpacing: 2,
  },
  contractRef: {
    fontSize: 7,
    fontFamily: 'NotoSans',
    color: C.mutedLight,
    marginTop: 3,
  },

  // Gold accent stripe
  stripe: {
    backgroundColor: C.gold,
    height: 2,
  },

  // Body — tighter padding
  body: {
    paddingHorizontal: 40,
    paddingTop: 16,
    backgroundColor: C.white,
  },

  // Date row
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dateLabel: {
    fontSize: 7,
    fontFamily: 'NotoSans',
    color: C.muted,
    letterSpacing: 0.5,
  },
  dateValue: {
    fontSize: 8,
    fontFamily: 'NotoSans',
    fontWeight: 'bold',
    color: C.text,
  },

  // Section title — gold, uppercase
  sectionTitle: {
    fontSize: 7,
    fontFamily: 'NotoSans',
    fontWeight: 'bold',
    color: C.gold,
    letterSpacing: 2,
    marginBottom: 6,
    textTransform: 'uppercase',
  },

  // Parties grid
  partiesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  partyCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 4,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: C.gold,
  },
  partyCardClient: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 4,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: C.darkBorder,
  },
  partyRole: {
    fontSize: 6.5,
    fontFamily: 'NotoSans',
    color: C.muted,
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  partyName: {
    fontSize: 11,
    fontFamily: 'NotoSans',
    fontWeight: 'bold',
    color: C.dark,
    marginBottom: 2,
  },
  partyDetail: {
    fontSize: 7.5,
    fontFamily: 'NotoSans',
    color: C.muted,
  },

  // Scope box
  scopeBox: {
    backgroundColor: C.surface,
    borderRadius: 4,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  scopeText: {
    fontSize: 9,
    fontFamily: 'NotoSans',
    fontWeight: 'bold',
    color: C.dark,
    lineHeight: 1.5,
  },

  // Financial cards
  financialRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  financialCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 4,
    padding: 10,
    borderTopWidth: 3,
  },
  financialLabel: {
    fontSize: 6.5,
    fontFamily: 'NotoSans',
    color: C.muted,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  financialValueLarge: {
    fontSize: 16,
    fontFamily: 'NotoSans',
    fontWeight: 'bold',
    color: C.dark,
  },
  financialValueMed: {
    fontSize: 11,
    fontFamily: 'NotoSans',
    fontWeight: 'bold',
    color: C.dark,
  },

  // Terms
  termsList: {
    marginBottom: 14,
  },
  termRow: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: 6,
  },
  termNum: {
    fontSize: 7.5,
    fontFamily: 'NotoSans',
    fontWeight: 'bold',
    color: C.gold,
    width: 12,
    flexShrink: 0,
  },
  termText: {
    fontSize: 7.5,
    fontFamily: 'NotoSans',
    color: C.text,
    lineHeight: 1.45,
    flex: 1,
  },

  // Divider
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginBottom: 12,
  },

  // Signatures — compact
  signaturesRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 10,
  },
  sigBlock: {
    flex: 1,
  },
  sigLabel: {
    fontSize: 6.5,
    fontFamily: 'NotoSans',
    color: C.muted,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  sigImage: {
    width: 130,
    height: 45,
    marginBottom: 4,
  },
  sigLine: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    height: 35,
    marginBottom: 4,
  },
  sigName: {
    fontSize: 8,
    fontFamily: 'NotoSans',
    fontWeight: 'bold',
    color: C.text,
  },
  sigDate: {
    fontSize: 7,
    fontFamily: 'NotoSans',
    color: C.muted,
    marginTop: 2,
  },

  // Footer — dark bg, absolute bottom, compact
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.dark,
    paddingHorizontal: 40,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7,
    fontFamily: 'NotoSans',
    color: C.mutedLight,
  },
});
