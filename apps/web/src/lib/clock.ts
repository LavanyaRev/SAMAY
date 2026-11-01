import type { IClockService } from "@samay/shared";

export class WebClockService implements IClockService {
  now(): Date {
    return new Date();
  }
  isoString(): string {
    return new Date().toISOString();
  }
  timestamp(): number {
    return Date.now();
  }
  plusDays(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  }
  minusDays(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  }
  isBefore(date1: Date, date2: Date): boolean {
    return date1.getTime() < date2.getTime();
  }
  isAfter(date1: Date, date2: Date): boolean {
    return date1.getTime() > date2.getTime();
  }
}

export const webClock = new WebClockService();

export function addDaysToIsoString(baseIso: string, days: number): string {
  const ms = Date.parse(baseIso) + days * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString();
}
