import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';

import { PAYMENT_METHOD_LABELS } from '@/lib/constants';
import { PDF_TRANSLATIONS } from './contract-pdf-i18n';
import { C, contractStyles as styles } from './contract-pdf-styles';

import type { PdfLocale } from './contract-pdf-i18n';

export interface ContractPDFTemplateProps {
  contract: {
    id: string;
    title: string;
    created_at: string;
    signed_at?: string | null;
    signature_image?: string | null;
    signature_data?: Record<string, unknown> | null;
    status: string;
    service_type?: string | null;
    agreed_amount?: number | null;
    payment_method?: string | null;
    expires_at?: string | null;
    scope_description?: string | null;
    special_terms?: string | null;
  };
  clientName?: string;
  projectTitle?: string;
  locale?: PdfLocale;
  logoBase64?: string;
  provider?: {
    companyName: string;
    vatNumber: string;
    taxOffice: string;
    address: string;
  };
}

const DEFAULT_PROVIDER = {
  companyName: 'ΝΤΕΒΡΕΝΤΛΗΣ ΑΓΓΕΛΟΣ ΝΙΚΟΛΑΟΣ',
  vatNumber: '160594763',
  taxOffice: 'ΚΑΛΑΜΑΡΙΑΣ',
  address: 'ΣΟΦΟΥΛΗ ΘΕΜΙΣΤΟΚΛΗ 88, ΚΑΛΑΜΑΡΙΑ',
};

function formatAmount(amount: number): string {
  return `\u20AC${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function ContractPDFTemplate({
  contract,
  clientName,
  projectTitle,
  locale = 'el',
  logoBase64,
  provider = DEFAULT_PROVIDER,
}: ContractPDFTemplateProps) {
  const t = PDF_TRANSLATIONS[locale];

  const signatureImage =
    contract.signature_image ??
    (contract.signature_data?.['signature_image'] as string | undefined);

  const contractRef = `DM-${format(new Date(contract.created_at), 'yyyy')}-${contract.id.slice(-6).toUpperCase()}`;
  const createdDate = format(new Date(contract.created_at), 'MMMM d, yyyy');

  const paymentLabel = contract.payment_method
    ? (PAYMENT_METHOD_LABELS[contract.payment_method] ?? contract.payment_method)
    : '\u2014';

  const amountFormatted =
    contract.agreed_amount != null ? formatAmount(contract.agreed_amount) : '\u2014';

  const scopeText = contract.scope_description || contract.service_type || contract.title;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Dark header */}
        <View style={styles.header}>
          {logoBase64 ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={logoBase64} style={styles.headerLogo} />
          ) : (
            <View style={styles.headerLogo} />
          )}
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>{t.serviceAgreement}</Text>
            <Text style={styles.contractRef}>{contractRef}</Text>
          </View>
        </View>

        {/* Gold stripe */}
        <View style={styles.stripe} />

        {/* Body */}
        <View style={styles.body}>
          {/* Date row */}
          <View style={styles.dateRow}>
            <View>
              <Text style={styles.dateLabel}>{t.agreementDate}</Text>
              <Text style={styles.dateValue}>{createdDate}</Text>
            </View>
            {contract.expires_at && (
              <View style={{ alignItems: 'flex-end' as const }}>
                <Text style={styles.dateLabel}>{t.signatureDeadline}</Text>
                <Text style={styles.dateValue}>
                  {format(new Date(contract.expires_at), 'MMMM d, yyyy')}
                </Text>
              </View>
            )}
          </View>

          {/* Parties */}
          <View wrap={false}>
            <Text style={styles.sectionTitle}>{t.parties}</Text>
            <View style={styles.partiesRow}>
              <View style={styles.partyCard}>
                <Text style={styles.partyRole}>{t.provider}</Text>
                <Text style={styles.partyName}>{provider.companyName}</Text>
                <Text style={styles.partyDetail}>
                  {t.vatNumber}: {provider.vatNumber} {'\u00B7'} {t.taxOffice}: {provider.taxOffice}
                </Text>
                <Text style={styles.partyDetail}>{provider.address}</Text>
              </View>
              <View style={styles.partyCardClient}>
                <Text style={styles.partyRole}>{t.client}</Text>
                <Text style={styles.partyName}>{clientName || '\u2014'}</Text>
                {projectTitle ? <Text style={styles.partyDetail}>{projectTitle}</Text> : null}
              </View>
            </View>
          </View>

          {/* Scope */}
          <View wrap={false}>
            <Text style={styles.sectionTitle}>{t.scopeOfServices}</Text>
            <View style={styles.scopeBox}>
              <Text style={styles.scopeText}>{scopeText}</Text>
            </View>
          </View>

          {/* Financial Terms */}
          <View wrap={false}>
            <Text style={styles.sectionTitle}>{t.financialTerms}</Text>
            <View style={styles.financialRow}>
              <View style={[styles.financialCard, { borderTopColor: C.gold }]}>
                <Text style={styles.financialLabel}>{t.totalAmount}</Text>
                <Text style={styles.financialValueLarge}>{amountFormatted}</Text>
              </View>
              <View style={[styles.financialCard, { borderTopColor: C.dark }]}>
                <Text style={styles.financialLabel}>{t.paymentMethod}</Text>
                <Text style={styles.financialValueMed}>{paymentLabel}</Text>
              </View>
            </View>
          </View>

          {/* Special Terms — only if non-empty */}
          {contract.special_terms ? (
            <View wrap={false}>
              <Text style={styles.sectionTitle}>{t.specialTerms}</Text>
              <View style={styles.scopeBox}>
                <Text style={styles.termText}>{contract.special_terms}</Text>
              </View>
            </View>
          ) : null}

          {/* General Terms */}
          <Text style={styles.sectionTitle}>{t.generalTerms}</Text>
          <View style={styles.termsList}>
            {t.terms.map((term, i) => (
              <View key={i} style={styles.termRow}>
                <Text style={styles.termNum}>{i + 1}.</Text>
                <Text style={styles.termText}>{term}</Text>
              </View>
            ))}
          </View>

          <View wrap={false}>
            <View style={styles.divider} />

            {/* Signatures */}
            <Text style={styles.sectionTitle}>{t.signatures}</Text>
            <View style={styles.signaturesRow}>
              {/* Client */}
              <View style={styles.sigBlock}>
                <Text style={styles.sigLabel}>{t.client}</Text>
                {contract.status === 'signed' && signatureImage ? (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <Image src={signatureImage} style={styles.sigImage} />
                ) : (
                  <View style={styles.sigLine} />
                )}
                <Text style={styles.sigName}>{clientName || '\u2014'}</Text>
                {contract.signed_at && (
                  <Text style={styles.sigDate}>
                    {format(new Date(contract.signed_at), 'MMM d, yyyy')}
                  </Text>
                )}
              </View>

              {/* Provider */}
              <View style={styles.sigBlock}>
                <Text style={styles.sigLabel}>{t.provider}</Text>
                <View style={styles.sigLine} />
                <Text style={styles.sigName}>{provider.companyName}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer — fixed, dark bg, page numbers */}
        <View style={styles.footer} fixed>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
              `${t.legallyBinding} \u00B7 ${contractRef}    ${t.page} ${pageNumber}/${totalPages}`
            }
          />
          <Text style={styles.footerText}>devremedia.com</Text>
        </View>
      </Page>
    </Document>
  );
}
