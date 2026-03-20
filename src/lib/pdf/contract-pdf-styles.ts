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
    paddingBottom: 70,
    paddingHorizontal: 0,
    fontSize: 10,
    fontFamily: 'NotoSans',
    backgroundColor: C.white,
    color: C.text,
  },

  // Header — dark bg, flex row
  header: {
    backgroundColor: C.dark,
    paddingHorizontal: 48,
    paddingTop: 28,
    paddingBottom: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLogo: {
    width: 120,
    height: 45,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 9,
    fontFamily: 'NotoSans',
    fontWeight: 'bold',
    color: C.gold,
    letterSpacing: 2,
  },
  contractRef: {
    fontSize: 8,
    fontFamily: 'NotoSans',
    color: C.mutedLight,
    marginTop: 4,
  },

  // Gold accent stripe
  stripe: {
    backgroundColor: C.gold,
    height: 3,
  },

  // Body
  body: {
    paddingHorizontal: 48,
    paddingTop: 28,
    backgroundColor: C.white,
  },

  // Date row
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  dateLabel: {
    fontSize: 8,
    fontFamily: 'NotoSans',
    color: C.muted,
    letterSpacing: 0.5,
  },
  dateValue: {
    fontSize: 9,
    fontFamily: 'NotoSans',
    fontWeight: 'bold',
    color: C.text,
  },

  // Section title — gold, uppercase, letter-spacing
  sectionTitle: {
    fontSize: 7.5,
    fontFamily: 'NotoSans',
    fontWeight: 'bold',
    color: C.gold,
    letterSpacing: 2,
    marginBottom: 10,
    textTransform: 'uppercase',
  },

  // Parties grid
  partiesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  partyCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 4,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: C.gold,
  },
  partyCardClient: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 4,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: C.darkBorder,
  },
  partyRole: {
    fontSize: 7,
    fontFamily: 'NotoSans',
    color: C.muted,
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  partyName: {
    fontSize: 13,
    fontFamily: 'NotoSans',
    fontWeight: 'bold',
    color: C.dark,
    marginBottom: 2,
  },
  partyDetail: {
    fontSize: 8.5,
    fontFamily: 'NotoSans',
    color: C.muted,
  },

  // Scope box
  scopeBox: {
    backgroundColor: C.surface,
    borderRadius: 4,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  scopeText: {
    fontSize: 11,
    fontFamily: 'NotoSans',
    fontWeight: 'bold',
    color: C.dark,
    lineHeight: 1.6,
  },

  // Financial cards
  financialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  financialCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 4,
    padding: 14,
    borderTopWidth: 3,
  },
  financialLabel: {
    fontSize: 7,
    fontFamily: 'NotoSans',
    color: C.muted,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  financialValueLarge: {
    fontSize: 18,
    fontFamily: 'NotoSans',
    fontWeight: 'bold',
    color: C.dark,
  },
  financialValueMed: {
    fontSize: 12,
    fontFamily: 'NotoSans',
    fontWeight: 'bold',
    color: C.dark,
  },

  // Terms
  termsList: {
    marginBottom: 24,
  },
  termRow: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 8,
  },
  termNum: {
    fontSize: 8.5,
    fontFamily: 'NotoSans',
    fontWeight: 'bold',
    color: C.gold,
    width: 14,
    flexShrink: 0,
  },
  termText: {
    fontSize: 8.5,
    fontFamily: 'NotoSans',
    color: C.text,
    lineHeight: 1.55,
    flex: 1,
  },

  // Divider
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginBottom: 20,
  },

  // Signatures
  signaturesRow: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 20,
  },
  sigBlock: {
    flex: 1,
  },
  sigLabel: {
    fontSize: 7,
    fontFamily: 'NotoSans',
    color: C.muted,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  sigImage: {
    width: 150,
    height: 55,
    marginBottom: 6,
  },
  sigLine: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    height: 50,
    marginBottom: 6,
  },
  sigName: {
    fontSize: 9,
    fontFamily: 'NotoSans',
    fontWeight: 'bold',
    color: C.text,
  },
  sigDate: {
    fontSize: 7.5,
    fontFamily: 'NotoSans',
    color: C.muted,
    marginTop: 2,
  },

  // Footer — dark bg, absolute bottom
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.dark,
    paddingHorizontal: 48,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7.5,
    fontFamily: 'NotoSans',
    color: C.mutedLight,
  },
});
