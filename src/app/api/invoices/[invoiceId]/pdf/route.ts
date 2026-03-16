import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePDFTemplate } from '@/lib/pdf/invoice-template';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  try {
    const { invoiceId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*, client:clients(*), project:projects(*)')
      .eq('id', invoiceId)
      .single();

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Verify access: admins can access any invoice, clients only their own
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile && ['super_admin', 'admin'].includes(profile.role);
    if (!isAdmin) {
      const client = invoice.client as { user_id?: string | null } | null;
      if (!client?.user_id || client.user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const buffer = await renderToBuffer(
      InvoicePDFTemplate({
        invoice: {
          invoice_number: invoice.invoice_number,
          issue_date: invoice.issue_date,
          due_date: invoice.due_date,
          status: invoice.status,
          subtotal: invoice.subtotal,
          tax_amount: invoice.tax_amount,
          total: invoice.total,
          currency: invoice.currency || 'EUR',
          notes: invoice.notes,
          tax_rate: invoice.tax_rate,
          line_items: invoice.line_items as Array<{
            description: string;
            quantity: number;
            unit_price: number;
          }>,
        },
        clientName: invoice.client?.contact_name || invoice.client?.company_name || 'Unknown',
        clientEmail: invoice.client?.email || '',
        clientAddress: invoice.client?.address || '',
        projectTitle: invoice.project?.title || '',
      }),
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${invoice.invoice_number}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
