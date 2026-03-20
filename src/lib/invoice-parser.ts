/**
 * Invoice text parser — extracts structured data from Greek invoice text.
 * Ported from parse_invoice.py. Works with OCR output or PDF text layer.
 */

export interface ParsedInvoice {
  date: string | null;
  invoiceNumber: string | null;
  invoiceType: string | null;
  mark: string | null;
  issuerName: string | null;
  issuerAfm: string | null;
  customerName: string | null;
  customerAfm: string | null;
  description: string | null;
  netAmount: number | null;
  vatPercent: number | null;
  vatAmount: number | null;
  totalAmount: number | null;
}

/** Parse EU format amount: "1.240,00" → 1240.00 */
export function parseEuAmount(s: string): number | null {
  const cleaned = s.trim().replace(/\s/g, '');

  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(cleaned)) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
  }
  if (/^\d+(,\d{1,2})$/.test(cleaned)) {
    return parseFloat(cleaned.replace(',', '.'));
  }
  if (/^\d+(\.\d{1,2})$/.test(cleaned)) {
    return parseFloat(cleaned);
  }
  if (/^\d+$/.test(cleaned)) {
    return parseFloat(cleaned);
  }
  return null;
}

/** Extract dates (DD/MM/YYYY etc.) → convert to YYYY-MM-DD */
export function extractDates(text: string): string[] {
  const pattern = /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/g;
  const dates: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const [, d, m, y] = match;
    const day = parseInt(d, 10);
    const month = parseInt(m, 10);
    const year = parseInt(y, 10);

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000 && year <= 2099) {
      const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      if (!dates.includes(iso)) dates.push(iso);
    }
  }
  return dates;
}

/** Extract ΑΦΜ (9-digit numbers after ΑΦΜ/Α.Φ.Μ.) */
export function extractAfm(text: string): { issuerAfm: string | null; customerAfm: string | null } {
  const matches = text.match(/(?:ΑΦΜ|Α\.?Φ\.?Μ\.?)\s*:?\s*(\d{9})/g);
  const afms: string[] = [];

  if (matches) {
    for (const m of matches) {
      const digits = m.match(/(\d{9})/);
      if (digits && !afms.includes(digits[1])) afms.push(digits[1]);
    }
  }

  return { issuerAfm: afms[0] ?? null, customerAfm: afms[1] ?? null };
}

/** Extract invoice number, type (ΤΠΥ/ΤΔΑ/ΑΠΥ), and ΜΑΡΚ */
export function extractInvoiceNumber(text: string): {
  invoiceNumber: string | null;
  invoiceType: string | null;
  mark: string | null;
} {
  const result = {
    invoiceNumber: null as string | null,
    invoiceType: null as string | null,
    mark: null as string | null,
  };

  const typeMatch = text.match(
    /(ΤΠΥ|ΤΔΑ|ΑΠΥ|ΤΠΑ)\s+(?:(\d+)\s+)?(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{10,20})?/,
  );
  if (typeMatch) {
    result.invoiceType = typeMatch[1];
    if (typeMatch[2]) result.invoiceNumber = typeMatch[2];
    if (typeMatch[4]) result.mark = typeMatch[4];
  }

  if (!result.invoiceNumber) {
    const aaMatch = text.match(/Α\.?Α\.?\s*:?\s*(\d+)/);
    if (aaMatch) result.invoiceNumber = aaMatch[1];
  }
  if (!result.mark) {
    const markMatch = text.match(/ΜΑΡΚ\s*:?\s*(\d{10,20})/);
    if (markMatch) result.mark = markMatch[1];
  }
  if (!result.invoiceType) {
    const seiraMatch = text.match(/Σειρά\s*:?\s*([A-ZΑ-Ω]{1,5})/);
    if (seiraMatch) result.invoiceType = seiraMatch[1];
  }

  return result;
}

/** Extract amounts: Πληρωτέο, Καθαρή αξία, ΦΠΑ */
export function extractAmounts(text: string): {
  netAmount: number | null;
  vatPercent: number | null;
  vatAmount: number | null;
  totalAmount: number | null;
} {
  const result = {
    netAmount: null as number | null,
    vatPercent: null as number | null,
    vatAmount: null as number | null,
    totalAmount: null as number | null,
  };

  const pliroteoMatch = text.match(/Πληρωτέο\s*\(?€?\)?\s*:?\s*([\d.,]+)/);
  if (pliroteoMatch) result.totalAmount = parseEuAmount(pliroteoMatch[1]);

  const synolaMatch = text.match(/Σύνολα?\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/);
  if (synolaMatch) {
    const vals = [1, 2, 3, 4].map((i) => parseEuAmount(synolaMatch[i]));
    const nonZero = vals.filter((v): v is number => v !== null && v > 0);
    if (nonZero.length >= 2) {
      result.netAmount = nonZero[0];
      if (nonZero.length >= 3) result.vatAmount = nonZero[1];
    }
  }

  const axiaMatch = text.match(/Συνολ\.?\s*Αξία[^0-9]*([\d.,]+)/);
  if (axiaMatch) {
    const v = parseEuAmount(axiaMatch[1]);
    if (v && v > 0) result.netAmount = result.netAmount ?? v;
  }

  const fpaMatch = text.match(/(\d{1,2})\s*%/);
  if (fpaMatch) result.vatPercent = parseInt(fpaMatch[1], 10);

  const itemRow = text.match(
    /([\d][\d.,]+)\s+0,00\s+([\d][\d.,]+)\s+(\d+)%\s+([\d][\d.,]+)\s+([\d][\d.,]+)/,
  );
  if (itemRow) {
    result.netAmount = result.netAmount ?? parseEuAmount(itemRow[2]);
    result.vatPercent = result.vatPercent ?? parseInt(itemRow[3], 10);
    result.vatAmount = result.vatAmount ?? parseEuAmount(itemRow[4]);
  }

  if (!result.totalAmount) {
    const allAmounts = text.match(/[\d]{1,3}(?:\.[\d]{3})*,\d{2}/g);
    if (allAmounts) {
      const parsed = allAmounts.map((a) => parseEuAmount(a)).filter((v): v is number => v !== null);
      if (parsed.length > 0) result.totalAmount = Math.max(...parsed);
    }
  }

  return result;
}

/** Extract issuer and customer names (Επωνυμία) */
export function extractNames(text: string): {
  issuerName: string | null;
  customerName: string | null;
} {
  const result = { issuerName: null as string | null, customerName: null as string | null };

  const names = [...text.matchAll(/Επωνυμ[ίι]α\s*:?\s*(.+)/g)];
  if (names.length >= 1) result.issuerName = names[0][1].trim();
  if (names.length >= 2) result.customerName = names[1][1].trim();

  if (!result.customerName) {
    const pelatiMatch = text.match(
      /Στοιχεία\s*Πελάτη[\s\S]*?Α\.?Φ\.?Μ\.?\s*:?\s*\d{9}\s*\n\s*(.+)/,
    );
    if (pelatiMatch) {
      let name = pelatiMatch[1].trim().split('\n')[0].trim();
      name = name.replace(/^Επωνυμ[ίι]α\s*:?\s*/, '');
      if (name.length > 2) result.customerName = name;
    }
  }

  return result;
}

/** Extract service/product description */
export function extractDescription(text: string): string | null {
  const match = text.match(/Περιγραφή[\s\S]*?\n([\s\S]+?)(?:Σύνολα|Σύνολο)/);
  if (!match) return null;

  const words: string[] = [];
  for (const line of match[1].split('\n')) {
    const trimmed = line.trim();
    if (/^[\d.,\s%€]+$/.test(trimmed)) continue;
    const cleaned = trimmed.replace(/[0-9.,€%\s]/g, '');
    if (cleaned.length > 2) words.push(cleaned);
  }

  return words.length > 0 ? words.join(' ').trim() : null;
}

/** Main parser: extract all fields from invoice text */
export function parseInvoiceText(text: string): ParsedInvoice {
  const dates = extractDates(text);
  const afm = extractAfm(text);
  const amounts = extractAmounts(text);
  const invoiceNum = extractInvoiceNumber(text);
  const names = extractNames(text);

  return {
    date: dates[0] ?? null,
    invoiceNumber: invoiceNum.invoiceNumber,
    invoiceType: invoiceNum.invoiceType,
    mark: invoiceNum.mark,
    issuerName: names.issuerName,
    issuerAfm: afm.issuerAfm,
    customerName: names.customerName,
    customerAfm: afm.customerAfm,
    description: extractDescription(text),
    netAmount: amounts.netAmount,
    vatPercent: amounts.vatPercent,
    vatAmount: amounts.vatAmount,
    totalAmount: amounts.totalAmount,
  };
}
