import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { SystemClockService } from "../../common/clock/clock.service";
import { PrismaService } from "../../common/prisma/prisma.service";

export const KOLKATA_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // UTC+05:30
export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEKEND_DAYS_SETTING_KEY = "working_calendar_weekend_days";

export interface HolidayRecord {
  id: string;
  date: string; // YYYY-MM-DD in Asia/Kolkata
  name: string;
  description: string | null;
  regionId: string | null;
  isNational: boolean;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_SEEDED_HOLIDAYS: Array<{
  date: string;
  name: string;
  isNational: boolean;
  regionId?: string | null;
}> = [
  { date: "2026-01-26", name: "Republic Day", isNational: true },
  { date: "2026-03-04", name: "Holi", isNational: true },
  { date: "2026-04-03", name: "Good Friday", isNational: true },
  { date: "2026-04-14", name: "Dr. B.R. Ambedkar Jayanti", isNational: true },
  { date: "2026-05-01", name: "Maharashtra Din (WRO Regional)", isNational: false, regionId: "WRO" },
  { date: "2026-08-15", name: "Independence Day", isNational: true },
  { date: "2026-10-02", name: "Mahatma Gandhi Jayanti", isNational: true },
  { date: "2026-10-20", name: "Dussehra (Vijayadashami)", isNational: true },
  { date: "2026-11-09", name: "Diwali (Deepavali)", isNational: true },
  { date: "2026-11-24", name: "Guru Nanak Jayanti", isNational: true },
  { date: "2026-12-25", name: "Christmas Day", isNational: true },
  { date: "2027-01-26", name: "Republic Day 2027", isNational: true },
  { date: "2027-03-22", name: "Holi 2027", isNational: true },
  { date: "2027-08-15", name: "Independence Day 2027", isNational: true },
  { date: "2027-10-02", name: "Mahatma Gandhi Jayanti 2027", isNational: true },
];

@Injectable()
export class WorkingDayCalendarService {
  private readonly holidays = new Map<string, HolidayRecord>();

  constructor(
    private readonly clock: SystemClockService,
    private readonly prisma: PrismaService,
  ) {
    this.clock.setSystemSetting(WEEKEND_DAYS_SETTING_KEY, [0, 6]);
    this.resetDefaultHolidays();
  }

  resetDefaultHolidays(): void {
    this.holidays.clear();
    const nowIso = this.clock.isoString();
    for (const h of DEFAULT_SEEDED_HOLIDAYS) {
      const id = randomUUID();
      this.holidays.set(id, {
        id,
        date: h.date,
        name: h.name,
        description: h.isNational ? "National Gazetted Holiday" : "Regional Holiday",
        regionId: h.regionId ?? null,
        isNational: h.isNational,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }
  }

  /**
   * Returns configured weekend days (0 = Sunday, 6 = Saturday by default).
   */
  getWeekendDays(): number[] {
    return (
      this.clock.getSystemSetting<number[]>(WEEKEND_DAYS_SETTING_KEY) ?? [0, 6]
    );
  }

  /**
   * Configures weekend days in system_settings (e.g. [0, 6] or [0]).
   */
  setWeekendDays(days: number[]): number[] {
    const sanitized = Array.from(
      new Set(days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)),
    ).sort();
    this.clock.setSystemSetting(WEEKEND_DAYS_SETTING_KEY, sanitized);
    return sanitized;
  }

  private toDate(input: Date | string): Date {
    if (typeof input === "string") {
      // If YYYY-MM-DD date string is passed, anchor it at 09:00:00 Asia/Kolkata (+05:30)
      if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
        return this.clock.parseIso(`${input}T09:00:00+05:30`);
      }
      return this.clock.parseIso(input);
    }
    return this.clock.fromEpochMs(input.getTime());
  }

  /**
   * Formats a Date into `YYYY-MM-DD` in `Asia/Kolkata` timezone (UTC+05:30).
   */
  toKolkataDateKey(input: Date | string): string {
    const d = this.toDate(input);
    const kolkataShifted = this.clock.fromEpochMs(
      d.getTime() + KOLKATA_OFFSET_MS,
    );
    const year = kolkataShifted.getUTCFullYear();
    const month = String(kolkataShifted.getUTCMonth() + 1).padStart(2, "0");
    const day = String(kolkataShifted.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * Returns day of week (0 = Sunday .. 6 = Saturday) in `Asia/Kolkata` timezone.
   */
  getKolkataDayOfWeek(input: Date | string): number {
    const d = this.toDate(input);
    const kolkataShifted = this.clock.fromEpochMs(
      d.getTime() + KOLKATA_OFFSET_MS,
    );
    return kolkataShifted.getUTCDay();
  }

  /**
   * Checks whether the given date is a working day in `Asia/Kolkata` timezone,
   * accounting for configured weekend days and national/regional holidays.
   */
  isWorkingDay(input: Date | string, regionId?: string | null): boolean {
    const dow = this.getKolkataDayOfWeek(input);
    const weekendDays = this.getWeekendDays();
    if (weekendDays.includes(dow)) {
      return false;
    }

    const dateKey = this.toKolkataDateKey(input);
    for (const h of this.holidays.values()) {
      if (h.date === dateKey) {
        if (h.isNational) return false;
        if (regionId && h.regionId === regionId) return false;
      }
    }
    return true;
  }

  /**
   * Adds `n` working days to `startDate` in `Asia/Kolkata` timezone.
   * Supports positive `n`, `n = 0`, and negative `n`.
   */
  addWorkingDays(
    startDate: Date | string,
    n: number,
    regionId?: string | null,
  ): Date {
    let cursor = this.toDate(startDate);

    if (n === 0) {
      while (!this.isWorkingDay(cursor, regionId)) {
        cursor = this.clock.fromEpochMs(cursor.getTime() + DAY_MS);
      }
      return cursor;
    }

    const direction = n > 0 ? 1 : -1;
    let remaining = Math.abs(Math.trunc(n));

    while (remaining > 0) {
      cursor = this.clock.fromEpochMs(cursor.getTime() + direction * DAY_MS);
      if (this.isWorkingDay(cursor, regionId)) {
        remaining--;
      }
    }

    return cursor;
  }

  /**
   * Computes the signed number of working days between `startDate` and `endDate`
   * in `Asia/Kolkata` timezone.
   * If `endDate` is before `startDate`, returns a negative integer.
   */
  workingDaysBetween(
    startDate: Date | string,
    endDate: Date | string,
    regionId?: string | null,
  ): number {
    const startKey = this.toKolkataDateKey(startDate);
    const endKey = this.toKolkataDateKey(endDate);
    if (startKey === endKey) {
      return 0;
    }

    const startAnchored = this.toDate(startKey);
    const endAnchored = this.toDate(endKey);
    const isForward = endAnchored.getTime() > startAnchored.getTime();
    const direction = isForward ? 1 : -1;

    let cursor = startAnchored;
    let count = 0;

    while (this.toKolkataDateKey(cursor) !== endKey) {
      cursor = this.clock.fromEpochMs(cursor.getTime() + direction * DAY_MS);
      if (this.isWorkingDay(cursor, regionId)) {
        count += direction;
      }
    }

    return count;
  }

  /**
   * Admin CRUD for Holiday Calendar
   */
  listHolidays(regionId?: string): HolidayRecord[] {
    const all = Array.from(this.holidays.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    if (!regionId) return all;
    return all.filter((h) => h.isNational || h.regionId === regionId);
  }

  async createHoliday(input: {
    date: string;
    name: string;
    description?: string;
    regionId?: string | null;
    isNational?: boolean;
  }): Promise<HolidayRecord> {
    const id = randomUUID();
    const dateKey = this.toKolkataDateKey(input.date);
    const nowIso = this.clock.isoString();
    const record: HolidayRecord = {
      id,
      date: dateKey,
      name: input.name,
      description: input.description ?? null,
      regionId: input.regionId ?? null,
      isNational: input.isNational ?? !input.regionId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    this.holidays.set(id, record);

    if (this.prisma.isConnected) {
      await this.prisma.holidayCalendar.create({
        data: {
          id,
          date: this.clock.parseIso(`${dateKey}T00:00:00.000Z`),
          name: record.name,
          description: record.description,
          regionId: record.regionId,
          isNational: record.isNational,
        },
      });
    }
    return record;
  }

  async updateHoliday(
    id: string,
    input: Partial<{
      date: string;
      name: string;
      description: string | null;
      regionId: string | null;
      isNational: boolean;
    }>,
  ): Promise<HolidayRecord> {
    const existing = this.holidays.get(id);
    if (!existing) {
      throw new NotFoundException(`Holiday ${id} not found`);
    }

    const updated: HolidayRecord = {
      ...existing,
      date: input.date ? this.toKolkataDateKey(input.date) : existing.date,
      name: input.name ?? existing.name,
      description:
        input.description !== undefined
          ? input.description
          : existing.description,
      regionId:
        input.regionId !== undefined ? input.regionId : existing.regionId,
      isNational:
        input.isNational !== undefined ? input.isNational : existing.isNational,
      updatedAt: this.clock.isoString(),
    };
    this.holidays.set(id, updated);
    return updated;
  }

  async deleteHoliday(id: string): Promise<{ deleted: boolean; id: string }> {
    if (!this.holidays.has(id)) {
      throw new NotFoundException(`Holiday ${id} not found`);
    }
    this.holidays.delete(id);
    if (this.prisma.isConnected) {
      await this.prisma.holidayCalendar
        .delete({ where: { id } })
        .catch(() => null);
    }
    return { deleted: true, id };
  }
}

