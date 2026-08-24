import { BadRequestException } from '@nestjs/common';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const ISTANBUL_OFFSET = '+03:00';

export function assertDateKey(value: string): string {
  if (!DATE_PATTERN.test(value))
    throw new BadRequestException('Tarih geçerli değil.');
  const date = new Date(`${value}T12:00:00${ISTANBUL_OFFSET}`);
  if (Number.isNaN(date.getTime()) || toDateKey(date) !== value) {
    throw new BadRequestException('Tarih geçerli değil.');
  }
  return value;
}

export function assertTimeLabel(value: string): string {
  if (!TIME_PATTERN.test(value))
    throw new BadRequestException('Saat geçerli değil.');
  return value;
}

export function toBranchDateTime(date: string, time: string): Date {
  assertDateKey(date);
  assertTimeLabel(time);
  return new Date(`${date}T${time}:00${ISTANBUL_OFFSET}`);
}

export function branchDayBounds(date: string): { start: Date; end: Date } {
  assertDateKey(date);
  const start = new Date(`${date}T00:00:00${ISTANBUL_OFFSET}`);
  return { start, end: new Date(start.getTime() + 86_400_000) };
}

export function toDateKey(value: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Europe/Istanbul',
  }).format(value);
}

export function todayInBranch(now = new Date()): string {
  return toDateKey(now);
}

export function weekdayForDate(date: string): number {
  assertDateKey(date);
  return new Date(`${date}T12:00:00${ISTANBUL_OFFSET}`).getUTCDay();
}

export function minuteOfDay(value: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Istanbul',
  }).formatToParts(value);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === 'minute')?.value ?? 0,
  );
  return hour * 60 + minute;
}

export function minuteToLabel(minute: number): string {
  const hour = Math.floor(minute / 60)
    .toString()
    .padStart(2, '0');
  const rest = (minute % 60).toString().padStart(2, '0');
  return `${hour}:${rest}`;
}

export function timeLabelToMinute(value: string): number {
  assertTimeLabel(value);
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

export function dateKeyFromDbDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
