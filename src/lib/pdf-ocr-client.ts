/**
 * Client-side PDF OCR using pdfjs-dist (browser) + tesseract.js (WASM).
 * Runs entirely in the browser — no server dependencies.
 */
import { parseInvoiceText } from '@/lib/invoice-parser';
import type { ParsedInvoice } from '@/lib/invoice-parser';

/** Parse a PDF file entirely in the browser: render → OCR → regex extract */
export async function parseInvoiceClientSide(file: File): Promise<ParsedInvoice> {
  const arrayBuffer = await file.arrayBuffer();

  // Copy buffer — pdfjs-dist detaches the original after getDocument()
  const bufferCopy = arrayBuffer.slice(0);

  // Strategy 1: Try text layer extraction
  let text = await extractTextLayerBrowser(arrayBuffer);

  // Check if text is valid Greek (not garbled font encoding)
  if (!hasValidGreekText(text)) {
    console.log('Text layer invalid, running browser OCR...');
    text = await ocrInBrowser(bufferCopy);
  }

  if (text.length < 50) {
    return {
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
  }

  return parseInvoiceText(text);
}

function hasValidGreekText(text: string): boolean {
  const greekChars = text.match(/[\u0370-\u03FF\u1F00-\u1FFF]/g);
  return (greekChars?.length ?? 0) > 10;
}

/** Extract text layer from PDF using pdfjs-dist browser build */
async function extractTextLayerBrowser(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');

    // Set worker source for browser
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const textParts: string[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .filter((item): item is { str: string } => 'str' in item)
        .map((item) => item.str)
        .join(' ');
      textParts.push(pageText);
    }

    return textParts.join('\n');
  } catch (err) {
    console.error('Text layer extraction failed:', err);
    return '';
  }
}

/** OCR PDF pages in the browser: render to canvas → tesseract.js WASM */
async function ocrInBrowser(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    const Tesseract = await import('tesseract.js');

    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const worker = await Tesseract.createWorker('ell+eng');
    const textParts: string[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });

      // Create browser canvas
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;

      await page.render({ canvasContext: ctx, viewport }).promise;

      // Convert canvas to blob → tesseract
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png');
      });

      const {
        data: { text },
      } = await worker.recognize(blob);
      if (text.trim().length > 0) {
        textParts.push(text);
      }

      // Cleanup
      canvas.width = 0;
      canvas.height = 0;
    }

    await worker.terminate();
    return textParts.join('\n');
  } catch (err) {
    console.error('Browser OCR failed:', err);
    return '';
  }
}
