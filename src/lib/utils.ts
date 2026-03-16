import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Escape user input for use in PostgREST .or() filter strings.
 * Prevents filter injection by removing/escaping special characters
 * that PostgREST interprets as operators or delimiters.
 */
export function escapePostgrestFilter(input: string): string {
  return input.replace(/[%_().,\\]/g, '');
}
