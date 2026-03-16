import { StyleSheet } from '@react-pdf/renderer';

// Brand palette
export const C = {
  primary: '#0f172a',
  accent: '#2563eb',
  accentDim: '#3b82f6',
  muted: '#64748b',
  mutedLight: '#94a3b8',
  border: '#e2e8f0',
  surface: '#f8fafc',
  white: '#ffffff',
  text: '#1e293b',
  green: '#16a34a',
};

export const contractStyles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 70,
    paddingHorizontal: 0,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: C.white,
    color: C.text,
  },

  // Header
  header: {
    backgroundColor: C.primary,
    paddingHorizontal: 48,
    paddingTop: 28,
    paddingBottom: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  companyName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    letterSpacing: 3,
  },
  companyTagline: {
    fontSize: 8,
    color: '#93c5fd',
    marginTop: 3,
    letterSpacing: 1.5,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  docType: {
    fontSize: 9,
    color: '#93c5fd',
    letterSpacing: 2,
    fontFamily: 'Helvetica-Bold',
  },
  contractRef: {
    fontSize: 8,
    color: C.mutedLight,
    marginTop: 4,
  },

  // Accent stripe
  stripe: {
    backgroundColor: C.accent,
    height: 3,
  },

  // Body
  body: {
    paddingHorizontal: 48,
    paddingTop: 28,
  },

  // Date row
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  dateLabel: {
    fontSize: 8,
    color: C.muted,
    letterSpacing: 0.5,
  },
  dateValue: {
    fontSize: 9,
    color: C.text,
    fontFamily: 'Helvetica-Bold',
  },

  // Section title
  sectionTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: C.accent,
    letterSpacing: 2,
    marginBottom: 10,
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
    borderLeftColor: C.accent,
  },
  partyRole: {
    fontSize: 7,
    color: C.muted,
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  partyName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: C.primary,
    marginBottom: 2,
  },
  partyDetail: {
    fontSize: 8.5,
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
    color: C.primary,
    lineHeight: 1.6,
    fontFamily: 'Helvetica-Bold',
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
    color: C.muted,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  financialValueLarge: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: C.primary,
  },
  financialValueMed: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: C.primary,
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
    color: C.accent,
    fontFamily: 'Helvetica-Bold',
    width: 14,
    flexShrink: 0,
  },
  termText: {
    fontSize: 8.5,
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
    fontFamily: 'Helvetica-Bold',
    color: C.text,
  },
  sigDate: {
    fontSize: 7.5,
    color: C.muted,
    marginTop: 2,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.primary,
    paddingHorizontal: 48,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7.5,
    color: '#475569',
  },
});

export const CONTRACT_TERMS = [
  'The service provider agrees to deliver the services described above within the agreed timeline.',
  'Payment is due according to the agreed payment terms. Late payments may incur additional fees.',
  'Client revision requests must be communicated within 7 days of final delivery.',
  'Upon receipt of full payment, the Client receives a license to use the final deliverables for their intended purpose. Provider retains the right to use the work in their portfolio unless otherwise agreed in writing.',
  'Either party may cancel with written notice. Advance payments are non-refundable unless otherwise agreed.',
  "Provider's liability is limited to the total amount paid under this Agreement.",
  'This Agreement constitutes the entire understanding between the parties and supersedes all prior negotiations, representations, or agreements.',
];
