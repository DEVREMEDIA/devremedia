import { describe, it, expect } from 'vitest';
import { resolvePaymentInstructions, type BankDetails } from './payment-instructions';

const bank = (overrides: Partial<BankDetails> = {}): BankDetails => ({
  beneficiary: 'Devre Media',
  iban: 'GR16 0110 1250 0000 0001 2300 695',
  bankName: 'Εθνική Τράπεζα',
  ...overrides,
});

describe('resolvePaymentInstructions', () => {
  it('prefers the RF code and carries the bank details alongside it', () => {
    const result = resolvePaymentInstructions({ rfCode: 'RF12 3456 7890', bankDetails: bank() });

    expect(result).toEqual({
      kind: 'rf',
      rfCode: 'RF12 3456 7890',
      bankDetails: bank(),
    });
  });

  it('returns the RF code with null bank details when no account is configured', () => {
    const result = resolvePaymentInstructions({ rfCode: 'RF987', bankDetails: null });

    expect(result).toEqual({ kind: 'rf', rfCode: 'RF987', bankDetails: null });
  });

  it('trims the RF code', () => {
    const result = resolvePaymentInstructions({ rfCode: '  RF987  ', bankDetails: null });

    expect(result).toEqual({ kind: 'rf', rfCode: 'RF987', bankDetails: null });
  });

  it('treats a whitespace-only RF code as absent and falls back to the bank details', () => {
    const result = resolvePaymentInstructions({ rfCode: '   ', bankDetails: bank() });

    expect(result).toEqual({ kind: 'bank', bankDetails: bank() });
  });

  it('treats an empty RF code as absent and falls back to the bank details', () => {
    const result = resolvePaymentInstructions({ rfCode: '', bankDetails: bank() });

    expect(result).toEqual({ kind: 'bank', bankDetails: bank() });
  });

  it('falls back to the bank details when there is no RF code at all', () => {
    const result = resolvePaymentInstructions({ rfCode: null, bankDetails: bank() });

    expect(result).toEqual({ kind: 'bank', bankDetails: bank() });
  });

  it('keeps a bank account whose name is missing — IBAN and beneficiary are enough', () => {
    const result = resolvePaymentInstructions({
      rfCode: null,
      bankDetails: bank({ bankName: '   ' }),
    });

    expect(result).toEqual({
      kind: 'bank',
      bankDetails: { beneficiary: 'Devre Media', iban: bank().iban, bankName: null },
    });
  });

  it('returns none when neither an RF code nor bank details exist', () => {
    expect(resolvePaymentInstructions({ rfCode: null, bankDetails: null })).toEqual({
      kind: 'none',
    });
  });

  it('returns none for an IBAN without a beneficiary', () => {
    const result = resolvePaymentInstructions({
      rfCode: null,
      bankDetails: bank({ beneficiary: '  ' }),
    });

    expect(result).toEqual({ kind: 'none' });
  });

  it('returns none for a beneficiary without an IBAN', () => {
    const result = resolvePaymentInstructions({ rfCode: null, bankDetails: bank({ iban: null }) });

    expect(result).toEqual({ kind: 'none' });
  });

  it('still returns the RF code when the bank details are only partially filled in', () => {
    const result = resolvePaymentInstructions({
      rfCode: 'RF42',
      bankDetails: bank({ iban: '' }),
    });

    expect(result).toEqual({ kind: 'rf', rfCode: 'RF42', bankDetails: null });
  });
});
