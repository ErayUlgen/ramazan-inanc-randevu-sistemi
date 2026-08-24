import { BadRequestException } from '@nestjs/common';

export function normalizeTurkishMobile(value: string): string {
  const normalized = tryNormalizeTurkishMobile(value);
  if (!normalized) {
    throw new BadRequestException(
      'Geçerli bir Türkiye cep telefonu numarası girin.',
    );
  }
  return normalized;
}

export function tryNormalizeTurkishMobile(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (/^5\d{9}$/.test(digits)) return `+90${digits}`;
  if (/^05\d{9}$/.test(digits)) return `+9${digits}`;
  if (/^905\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 7) return '***';
  return `+${digits.slice(0, 2)} *** *** ${digits.slice(-4)}`;
}
