import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseInvoiceText } from '@/lib/invoice-parser';
import type { ParsedInvoice } from '@/lib/invoice-parser';

export const maxDuration = 60;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ParsedInvoice | { error: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Strategy 1: Try text layer extraction (fast, for digital PDFs)
    let text = await extractTextLayer(buffer);

    // Check if text layer returned valid Greek text (not garbled font encoding)
    if (!hasValidGreekText(text)) {
      console.log('Text layer invalid or garbled, falling back to OCR...');
      text = '';
    }

    // Strategy 2: OCR fallback (for scanned PDFs or garbled text layers)
    if (text.length < 50) {
      console.log('Starting OCR fallback...');
      text = await ocrFallback(buffer);
      console.log('OCR result length:', text.length);
      console.log('OCR text:', text.slice(0, 500));
    }

    // If still no text, return empty result — user fills form manually
    if (text.length < 50) {
      const empty: ParsedInvoice = {
        date: null,
        invoiceNumber: null,
        invoiceType: null,
        mark: null,
        issuerName: null,
        issuerAfm: null,
        customerName: null,
        customerAfm: null,
        description: null,
        netAmount: null,
        vatPercent: null,
        vatAmount: null,
        totalAmount: null,
      };
      return NextResponse.json(empty);
    }

    const parsed = parseInvoiceText(text);
    console.log('Parsed result:', JSON.stringify(parsed, null, 2));
    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error('Invoice parse error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to parse invoice' },
      { status: 500 },
    );
  }
}

/**
 * Check if text contains actual Greek Unicode characters (Α-Ω, α-ω).
 * PDFs with custom font encoding return garbled Latin Extended characters instead.
 */
function hasValidGreekText(text: string): boolean {
  const greekChars = text.match(/[\u0370-\u03FF\u1F00-\u1FFF]/g);
  return (greekChars?.length ?? 0) > 10;
}

/** Extract text layer from PDF using pdfjs-dist (no canvas needed) */
async function extractTextLayer(buffer: Buffer): Promise<string> {
  try {
    // @ts-expect-error — pdfjs-dist ESM module, no matching .d.ts for .mjs path
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    const textParts: string[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .filter(
          (item: unknown): item is { str: string } =>
            typeof item === 'object' && item !== null && 'str' in item,
        )
        .map((item: { str: string }) => item.str)
        .join(' ');
      textParts.push(pageText);
    }

    return textParts.join('\n');
  } catch (err) {
    console.error('PDF text extraction failed:', err);
    return '';
  }
}

/** OCR fallback: call Python pytesseract via subprocess (reliable for Greek invoices) */
async function ocrFallback(buffer: Buffer): Promise<string> {
  const { writeFile, unlink } = await import('fs/promises');
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const path = await import('path');
  const os = await import('os');

  const execFileAsync = promisify(execFile);
  const tmpPath = path.join(os.tmpdir(), `invoice-${Date.now()}.pdf`);

  try {
    await writeFile(tmpPath, buffer);

    const scriptPath = path.join(process.cwd(), 'scripts', 'ocr-invoice.py');
    const { stdout } = await execFileAsync('python', [scriptPath, tmpPath], {
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
    });

    return stdout;
  } catch (err) {
    console.error('OCR fallback failed:', err);
    return '';
  } finally {
    try {
      await unlink(tmpPath);
    } catch {
      // ignore cleanup errors
    }
  }
}
