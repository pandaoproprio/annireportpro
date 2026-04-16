import { describe, it, expect } from 'vitest';
import { maskPhone, maskCpfCnpj, maskCpf, maskCnpj } from '@/lib/masks';

describe('maskPhone', () => {
  it('returns empty for empty input', () => {
    expect(maskPhone('')).toBe('');
  });

  it('formats partial DDD', () => {
    expect(maskPhone('21')).toBe('(21');
  });

  it('formats landline (10 digits)', () => {
    expect(maskPhone('2133445566')).toBe('(21) 3344-5566');
  });

  it('formats mobile (11 digits)', () => {
    expect(maskPhone('21999887766')).toBe('(21) 99988-7766');
  });

  it('strips non-digit characters', () => {
    expect(maskPhone('(21) 9998-8776')).toBe('(21) 99988-776');
  });

  it('truncates beyond 11 digits', () => {
    expect(maskPhone('219998877661234')).toBe('(21) 99988-7766');
  });
});

describe('maskCpf', () => {
  it('formats a complete CPF', () => {
    expect(maskCpf('12345678901')).toBe('123.456.789-01');
  });

  it('formats partial CPF', () => {
    expect(maskCpf('1234')).toBe('123.4');
  });

  it('handles empty input', () => {
    expect(maskCpf('')).toBe('');
  });
});

describe('maskCnpj', () => {
  it('formats a complete CNPJ', () => {
    expect(maskCnpj('12345678000195')).toBe('12.345.678/0001-95');
  });

  it('formats partial CNPJ', () => {
    expect(maskCnpj('123456')).toBe('12.345.6');
  });
});

describe('maskCpfCnpj', () => {
  it('auto-detects CPF (11 digits)', () => {
    expect(maskCpfCnpj('12345678901')).toBe('123.456.789-01');
  });

  it('auto-detects CNPJ (14 digits)', () => {
    expect(maskCpfCnpj('12345678000195')).toBe('12.345.678/0001-95');
  });

  it('handles intermediate lengths', () => {
    expect(maskCpfCnpj('123456789')).toBe('123.456.789');
  });
});
