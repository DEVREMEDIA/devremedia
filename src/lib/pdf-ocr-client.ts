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

  // DEBUG: log OCR text so we can tune regex
  console.log('--- FINAL TEXT FOR PARSING ---');
  console.log(text);
  console.log('--- END ---');

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

/** OCR PDF pages in the browser: render to canvas → preprocess → tesseract.js WASM */
async function ocrInBrowser(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    const Tesseract = await import('tesseract.js');

    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const worker = await Tesseract.createWorker('ell+eng');

    // Configure tesseract for invoice-style documents
    await worker.setParameters({
      tessedit_pageseg_mode: '6', // Assume uniform block of text
    });

    const textParts: string[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      // Higher scale = better OCR accuracy (3x instead of 2x)
      const viewport = page.getViewport({ scale: 3.0 });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;

      // White background (some PDFs have transparent bg → black in OCR)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport }).promise;

      // Preprocess: convert to grayscale + increase contrast for better OCR
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let j = 0; j < data.length; j += 4) {
        // Grayscale
        const gray = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
        // Sharpen contrast: push toward black or white
        const sharp = gray < 128 ? Math.max(0, gray - 30) : Math.min(255, gray + 30);
        data[j] = data[j + 1] = data[j + 2] = sharp;
      }
      ctx.putImageData(imageData, 0, 0);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png');
      });

      const {
        data: { text },
      } = await worker.recognize(blob);
      if (text.trim().length > 0) {
        textParts.push(text);
      }

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
