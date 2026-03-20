import React from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { readFileSync } from 'fs';
import path from 'path';
import { createClient } from '@/lib/supabase/server';
import { getContract } from '@/lib/actions/contracts';
import { ContractPDFTemplate } from '@/lib/pdf/contract-template';

// Cache logo as base64 at module level (read once)
const logoPath = path.join(process.cwd(), 'public', 'images', 'Logo_Horizontal_Transparent.png');
const logoBase64 = `data:image/png;base64,${readFileSync(logoPath).toString('base64')}`;

const provider = {
  companyName: process.env.PROVIDER_COMPANY_NAME ?? '',
  vatNumber: process.env.PROVIDER_VAT_NUMBER ?? '',
  taxOffice: process.env.PROVIDER_TAX_OFFICE ?? '',
  address: process.env.PROVIDER_ADDRESS ?? '',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contractId } = await params;
    const result = await getContract(contractId);

    if (result.error || !result.data) {
      return NextResponse.json({ error: result.error || 'Contract not found' }, { status: 404 });
    }

    const contract = result.data;
    const locale = (contract.locale === 'en' ? 'en' : 'el') as 'el' | 'en';

    // Extract signature_image from signature_data for backwards compat with old signed contracts
    const signatureImage =
      (contract as any).signature_image ??
      ((contract.signature_data as Record<string, unknown> | null)?.['signature_image'] as
        | string
        | undefined);

    // TODO: @react-pdf/renderer type mismatch — createElement returns JSX.Element, renderToBuffer expects ReactElement<DocumentProps>
    const pdfBuffer = await renderToBuffer(
      React.createElement(ContractPDFTemplate, {
        contract: { ...contract, signature_image: signatureImage ?? null },
        clientName: contract.client?.contact_name || contract.client?.company_name || undefined,
        projectTitle: contract.project?.title || undefined,
        locale,
        logoBase64,
        provider,
      }) as any,
    );

    // Check for inline preview vs download
    const inline = request.nextUrl.searchParams.get('inline') === 'true';
    const disposition = inline
      ? `inline; filename="contract-${contractId}.pdf"`
      : `attachment; filename="contract-${contractId}.pdf"`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
      },
    });
  } catch (err) {
    console.error('PDF generation error:', err);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
