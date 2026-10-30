import { Test, TestingModule } from "@nestjs/testing";
import { SystemClockService } from "./clock.service";

describe("SystemClockService", () => {
  let service: SystemClockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SystemClockService],
    }).compile();

    service = module.get<SystemClockService>(SystemClockService);
  });

  it("should be defined and return valid date instances", () => {
    expect(service).toBeDefined();
    const now = service.now();
    expect(now).toBeInstanceOf(Date);
    expect(service.isoString()).toContain("T");
    expect(typeof service.timestamp()).toBe("number");
  });

  it("should accurately compute future and past offsets", () => {
    const today = service.now();
    const in5Days = service.plusDays(5);
    const before5Days = service.minusDays(5);

    expect(service.isBefore(today, in5Days)).toBe(true);
    expect(service.isAfter(today, before5Days)).toBe(true);
  });
});
