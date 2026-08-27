const eurFormatters = new Map<number, Intl.NumberFormat>();

function eurFormatter(maxFractionDigits: number): Intl.NumberFormat {
  const cached = eurFormatters.get(maxFractionDigits);
  if (cached) return cached;
  const fmt = new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: maxFractionDigits === 0 ? 0 : 2,
    maximumFractionDigits: maxFractionDigits,
  });
  eurFormatters.set(maxFractionDigits, fmt);
  return fmt;
}

export function formatEur(amount: number): string {
  return eurFormatter(2).format(amount);
}

export function formatEurInt(amount: number): string {
  return eurFormatter(0).format(amount);
}

export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  if (currency === 'EUR') return formatEur(amount);
  return new Intl.NumberFormat('el-GR', { style: 'currency', currency }).format(amount);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function getInitials(name: string | null | undefined, fallback: string = '?'): string {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function dateFormatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify(options);
  const cached = dateFormatters.get(key);
  if (cached) return cached;
  const fmt = new Intl.DateTimeFormat('el-GR', options);
  dateFormatters.set(key, fmt);
  return fmt;
}

export function formatDate(
  date: string | number | Date,
  options: Intl.DateTimeFormatOptions,
): string {
  return dateFormatter(options).format(new Date(date));
}

export function formatPathSegment(segment: string): string {
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
