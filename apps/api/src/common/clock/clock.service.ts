import { Injectable } from "@nestjs/common";
import { IClockService } from "@samay/shared";

export const CLOCK_SERVICE_TOKEN = "CLOCK_SERVICE_TOKEN";
export const SYSTEM_SETTING_CLOCK_OFFSET_KEY = "demo_clock_offset_ms";

export interface DemoClockState {
  isDemoClockActive: boolean;
  offsetMs: number;
  offsetHours: number;
  offsetDays: number;
  currentIso: string;
  realTimeIso: string;
  timezone: "Asia/Kolkata";
  bannerText: string | null;
}

/**
 * System Clock Service
 * Single authoritative provider of system time for SAMAY.
 * Exempt from ESLint new Date() / Date.now() restrictions.
 *
 * Returns real time (or deterministic simulation base time) plus an offset
 * stored in system_settings (`demo_clock_offset_ms`).
 */
@Injectable()
export class SystemClockService implements IClockService {
  private offsetMs = 0;
  private simulatedBaseEpochMs: number | null = null;
  private readonly systemSettingsCache = new Map<string, unknown>([
    [SYSTEM_SETTING_CLOCK_OFFSET_KEY, { offsetMs: 0 }],
  ]);

  now(): Date {
    const baseMs =
      this.simulatedBaseEpochMs !== null
        ? this.simulatedBaseEpochMs
        : new Date().getTime();
    return new Date(baseMs + this.offsetMs);
  }

  isoString(): string {
    return this.now().toISOString();
  }

  timestamp(): number {
    return this.now().getTime();
  }

  parseIso(iso: string): Date {
    return new Date(iso);
  }

  fromEpochMs(ms: number): Date {
    return new Date(ms);
  }

  getOffsetMs(): number {
    return this.offsetMs;
  }

  /**
   * Sets the clock offset in milliseconds (stored in system_settings).
   */
  setOffsetMs(offsetMs: number): DemoClockState {
    this.offsetMs = offsetMs;
    this.systemSettingsCache.set(SYSTEM_SETTING_CLOCK_OFFSET_KEY, {
      offsetMs: this.offsetMs,
      updatedAt: this.isoString(),
    });
    return this.getDemoClockState();
  }

  /**
   * Advances the clock offset by N days and/or M hours.
   */
  advanceBy(params: { days?: number; hours?: number }): DemoClockState {
    const daysMs = (params.days ?? 0) * 24 * 60 * 60 * 1000;
    const hoursMs = (params.hours ?? 0) * 60 * 60 * 1000;
    return this.setOffsetMs(this.offsetMs + daysMs + hoursMs);
  }

  /**
   * Resets offset to 0 (and clears any fixed simulation anchor).
   */
  resetOffset(): DemoClockState {
    this.offsetMs = 0;
    this.simulatedBaseEpochMs = null;
    this.systemSettingsCache.set(SYSTEM_SETTING_CLOCK_OFFSET_KEY, {
      offsetMs: 0,
      updatedAt: new Date().toISOString(),
    });
    return this.getDemoClockState();
  }

  getDemoClockState(): DemoClockState {
    const realNowIso = new Date().toISOString();
    const currentIso = this.isoString();
    const isDemoClockActive =
      this.offsetMs !== 0 || this.simulatedBaseEpochMs !== null;
    const offsetHours =
      Math.round((this.offsetMs / (1000 * 60 * 60)) * 100) / 100;
    const offsetDays =
      Math.round((this.offsetMs / (1000 * 60 * 60 * 24)) * 100) / 100;

    return {
      isDemoClockActive,
      offsetMs: this.offsetMs,
      offsetHours,
      offsetDays,
      currentIso,
      realTimeIso: realNowIso,
      timezone: "Asia/Kolkata",
      bannerText: isDemoClockActive
        ? `DEMO CLOCK ACTIVE (${currentIso.slice(0, 16).replace("T", " ")} UTC • Offset: ${offsetDays >= 0 ? "+" : ""}${offsetDays}d / ${offsetHours >= 0 ? "+" : ""}${offsetHours}h)`
        : null,
    };
  }

  getSystemSetting<T = unknown>(key: string): T | undefined {
    return this.systemSettingsCache.get(key) as T | undefined;
  }

  setSystemSetting(key: string, value: unknown): void {
    this.systemSettingsCache.set(key, value);
  }

  /**
   * Deterministic simulation helpers for unit & 180-day simulation tests.
   */
  setSimulatedTime(isoOrEpoch: string | number | Date): void {
    this.offsetMs = 0;
    if (typeof isoOrEpoch === "number") {
      this.simulatedBaseEpochMs = isoOrEpoch;
    } else if (typeof isoOrEpoch === "string") {
      this.simulatedBaseEpochMs = new Date(isoOrEpoch).getTime();
    } else {
      this.simulatedBaseEpochMs = isoOrEpoch.getTime();
    }
    this.systemSettingsCache.set(SYSTEM_SETTING_CLOCK_OFFSET_KEY, {
      offsetMs: this.offsetMs,
      simulatedBaseEpochMs: this.simulatedBaseEpochMs,
    });
  }

  advanceDays(days: number): Date {
    this.advanceBy({ days });
    return this.now();
  }

  advanceHours(hours: number): Date {
    this.advanceBy({ hours });
    return this.now();
  }

  resetToSystemTime(): void {
    this.resetOffset();
  }

  plusDays(days: number): Date {
    const d = this.now();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    return d;
  }

  minusDays(days: number): Date {
    const d = this.now();
    d.setTime(d.getTime() - days * 24 * 60 * 60 * 1000);
    return d;
  }

  isBefore(date1: Date, date2: Date): boolean {
    return date1.getTime() < date2.getTime();
  }

  isAfter(date1: Date, date2: Date): boolean {
    return date1.getTime() > date2.getTime();
  }
}
