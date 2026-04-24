import React from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { readFileSync } from 'fs';
import path from 'path';
import { createClient } from '@/lib/supabase/server';
import { getProposal } from '@/lib/actions/proposals';
import { getProposalPackages } from '@/lib/actions/proposal-packages';
import { getCostSettings } from '@/lib/actions/cost-model';
import { getCompanySettings } from '@/lib/actions/settings';
import { ProposalPDFTemplate, type ProposalPDFPackage } from '@/lib/pdf/proposal-template';

// Cache logos as base64 at module level (read once per server start)
function readAsBase64(p: string, mime = 'image/png'): string | undefined {
  try {
    return `data:${mime};base64,${readFileSync(p).toString('base64')}`;
  } catch {
    return undefined;
  }
}

const logoBase64 = readAsBase64(
  path.join(process.cwd(), 'public', 'images', 'Logo_Horizontal_Transparent.png'),
);
const logoWhiteBase64 = readAsBase64(
  path.join(process.cwd(), 'public', 'images', 'LOGO_WhiteLetter.png'),
);

// Client logos for the "trusted by" grid
const CLIENT_LOGO_FILES: { name: string; file: string; mime?: string }[] = [
  { name: 'Ophthalmica', file: 'ophthalmica.png' },
  { name: 'Mavri Thalassa', file: 'mavri-thalassa.png' },
  { name: 'Technomat', file: 'technomat.jpeg', mime: 'image/jpeg' },
  { name: 'Almeco', file: 'almeco.png' },
  { name: 'Alpha', file: 'alpha.png' },
  { name: 'Ariston', file: 'ariston.png' },
  { name: 'Delli', file: 'delli.png' },
  { name: 'Stammdesign', file: 'stammdesign.png' },
];

const clientLogosBase64 = CLIENT_LOGO_FILES.map((c) => ({
  name: c.name,
  src: readAsBase64(
    path.join(process.cwd(), 'public', 'images', 'clients', c.file),
    c.mime ?? 'image/png',
  ),
})).filter((c): c is { name: string; src: string } => Boolean(c.src));

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> },
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

    const { proposalId } = await params;

    const [proposalRes, packagesRes, settingsRes, companyRes] = await Promise.all([
      getProposal(proposalId),
      getProposalPackages({ include_inactive: true }),
      getCostSettings(),
      getCompanySettings(),
    ]);

    if (proposalRes.error || !proposalRes.data) {
      return NextResponse.json(
        { error: proposalRes.error || 'Proposal not found' },
        { status: 404 },
      );
    }
    if (packagesRes.error || !packagesRes.data) {
      return NextResponse.json(
        { error: packagesRes.error || 'Packages not available' },
        { status: 500 },
      );
    }

    const proposal = proposalRes.data;
    const allPackages = packagesRes.data;
    const settings = settingsRes.data;
    const company = companyRes.data;

    // Resolve selected packages in order, with overrides applied
    const selected: ProposalPDFPackage[] = proposal.selected_packages
      .map((s): ProposalPDFPackage | null => {
        const pkg = allPackages.find((p) => p.id === s.package_id);
        if (!pkg) return null;
        return {
          id: pkg.id,
          name: s.label_override?.trim() || pkg.name,
          video_count: pkg.video_count,
          shooting_days: pkg.shooting_days,
          price: s.price_override != null ? Number(s.price_override) : pkg.computed_price,
          inclusions: pkg.inclusions,
          description: pkg.description,
        };
      })
      .filter((p): p is ProposalPDFPackage => p !== null);

    const pdfBuffer = await renderToBuffer(
      React.createElement(ProposalPDFTemplate, {
        clientName: proposal.client_name,
        competitiveAdvantage: proposal.competitive_advantage,
        clientNeed: proposal.client_need,
        packages: selected,
        includeDiscount: proposal.include_discount,
        discountPercent: Number(settings?.discount_first_percent ?? 0.1),
        discountMonths: Number(settings?.discount_first_months ?? 6),
        vatPercent: Number(settings?.vat_percent ?? 0.24),
        depositPercent: Number(settings?.deposit_percent ?? 0.5),
        validUntil: proposal.valid_until,
        locale: proposal.locale,
        logoBase64,
        logoWhiteBase64,
        clientLogosBase64,
        providerEmail: company?.email ?? undefined,
        providerPhone: company?.phone ?? undefined,
        proposalRef: `DM-${proposal.id.slice(-6).toUpperCase()}`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    );

    const inline = request.nextUrl.searchParams.get('inline') === 'true';
    const slug =
      proposal.client_name
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 40) || 'proposal';
    const filename = `proposal-${slug}-${proposalId.slice(-6)}.pdf`;
    const disposition = inline
      ? `inline; filename="${filename}"`
      : `attachment; filename="${filename}"`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
      },
    });
  } catch (err) {
    console.error('Proposal PDF generation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate PDF' },
      { status: 500 },
    );
  }
}
