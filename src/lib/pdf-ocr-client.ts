/**
 * Client-side invoice upload → server-side AI extraction via OpenAI vision.
 * Sends raw PDF to API route; GPT-4o-mini handles the rest.
 */
import type { ParsedInvoice } from '@/lib/invoice-parser';

/** Parse an invoice PDF: sends to server API for OpenAI extraction */
export async function parseInvoiceClientSide(file: File): Promise<ParsedInvoice> {
  const arrayBuffer = await file.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
  );

  const response = await fetch('/api/invoices/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdf: base64 }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error ?? 'Parse failed');
  }

  return response.json();
}
