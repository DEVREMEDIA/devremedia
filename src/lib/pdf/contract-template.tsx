import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { PAYMENT_METHOD_LABELS } from '@/lib/constants';
import { C, contractStyles as styles, CONTRACT_TERMS } from './contract-pdf-styles';

export interface ContractPDFTemplateProps {
  contract: {
    id: string;
    title: string;
    content: string;
    created_at: string;
    signed_at?: string | null;
    signature_image?: string | null;
    signature_data?: Record<string, unknown> | null;
    status: string;
    service_type?: string | null;
    agreed_amount?: number | null;
    payment_method?: string | null;
    expires_at?: string | null;
  };
  clientName?: string;
  projectTitle?: string;
}

export function ContractPDFTemplate({
  contract,
  clientName,
  projectTitle,
}: ContractPDFTemplateProps) {
  const signatureImage =
    contract.signature_image ??
    (contract.signature_data?.['signature_image'] as string | undefined);

  const contractRef = `DM-${format(new Date(contract.created_at), 'yyyy')}-${contract.id.slice(-6).toUpperCase()}`;
  const createdDate = format(new Date(contract.created_at), 'MMMM d, yyyy');

  const paymentLabel = contract.payment_method
    ? (PAYMENT_METHOD_LABELS[contract.payment_method] ?? contract.payment_method)
    : '—';

  const amountFormatted =
    contract.agreed_amount != null
      ? `€${contract.agreed_amount.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : '—';

  const scopeText = contract.service_type || contract.title;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>DEVRE MEDIA</Text>
            <Text style={styles.companyTagline}>VIDEOGRAPHY & PRODUCTION</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docType}>SERVICE AGREEMENT</Text>
            <Text style={styles.contractRef}>{contractRef}</Text>
          </View>
        </View>

        {/* Accent stripe */}
        <View style={styles.stripe} />

        {/* Body */}
        <View style={styles.body}>
          {/* Date row */}
          <View style={styles.dateRow}>
            <View>
              <Text style={styles.dateLabel}>AGREEMENT DATE</Text>
              <Text style={styles.dateValue}>{createdDate}</Text>
            </View>
            {contract.expires_at && (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.dateLabel}>SIGNATURE DEADLINE</Text>
                <Text style={styles.dateValue}>
                  {format(new Date(contract.expires_at), 'MMMM d, yyyy')}
                </Text>
              </View>
            )}
          </View>

          {/* Parties */}
          <Text style={styles.sectionTitle}>PARTIES</Text>
          <View style={styles.partiesRow}>
            <View style={styles.partyCard}>
              <Text style={styles.partyRole}>SERVICE PROVIDER</Text>
              <Text style={styles.partyName}>Devre Media</Text>
              <Text style={styles.partyDetail}>Videography & Production</Text>
            </View>
            <View style={styles.partyCard}>
              <Text style={styles.partyRole}>CLIENT</Text>
              <Text style={styles.partyName}>{clientName || '—'}</Text>
              {projectTitle ? <Text style={styles.partyDetail}>{projectTitle}</Text> : null}
            </View>
          </View>

          {/* Scope */}
          <Text style={styles.sectionTitle}>SCOPE OF SERVICES</Text>
          <View style={styles.scopeBox}>
            <Text style={styles.scopeText}>{scopeText}</Text>
          </View>

          {/* Financial Terms */}
          <Text style={styles.sectionTitle}>FINANCIAL TERMS</Text>
          <View style={styles.financialRow}>
            <View style={[styles.financialCard, { borderTopColor: C.accent }]}>
              <Text style={styles.financialLabel}>TOTAL AMOUNT</Text>
              <Text style={styles.financialValueLarge}>{amountFormatted}</Text>
            </View>
            <View style={[styles.financialCard, { borderTopColor: C.mutedLight }]}>
              <Text style={styles.financialLabel}>PAYMENT METHOD</Text>
              <Text style={styles.financialValueMed}>{paymentLabel}</Text>
            </View>
          </View>

          {/* Terms */}
          <Text style={styles.sectionTitle}>TERMS & CONDITIONS</Text>
          <View style={styles.termsList}>
            {CONTRACT_TERMS.map((term, i) => (
              <View key={i} style={styles.termRow}>
                <Text style={styles.termNum}>{i + 1}.</Text>
                <Text style={styles.termText}>{term}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          {/* Signatures */}
          <Text style={styles.sectionTitle}>SIGNATURES</Text>
          <View style={styles.signaturesRow}>
            {/* Client */}
            <View style={styles.sigBlock}>
              <Text style={styles.sigLabel}>CLIENT</Text>
              {contract.status === 'signed' && signatureImage ? (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image src={signatureImage} style={styles.sigImage} />
              ) : (
                <View style={styles.sigLine} />
              )}
              <Text style={styles.sigName}>{clientName || '—'}</Text>
              {contract.signed_at && (
                <Text style={styles.sigDate}>
                  Signed: {format(new Date(contract.signed_at), 'MMM d, yyyy')}
                </Text>
              )}
            </View>

            {/* Provider */}
            <View style={styles.sigBlock}>
              <Text style={styles.sigLabel}>SERVICE PROVIDER</Text>
              <View style={styles.sigLine} />
              <Text style={styles.sigName}>Devre Media</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Legally binding document · {contractRef}</Text>
          <Text style={styles.footerText}>devre.media</Text>
        </View>
      </Page>
    </Document>
  );
}
