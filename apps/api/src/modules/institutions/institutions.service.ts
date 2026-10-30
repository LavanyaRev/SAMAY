import { Injectable } from "@nestjs/common";
import { SystemClockService } from "../../common/clock/clock.service";

@Injectable()
export class InstitutionsService {
  constructor(private readonly clock: SystemClockService) {}

  listAll() {
    return {
      total: 0,
      data: [],
      retrievedAt: this.clock.isoString(),
    };
  }

  getById(id: string) {
    return {
      id,
      aictePermanentId: "1-1002345671",
      name: "Sample Engineering & Technology Institute",
      status: "ACTIVE",
      lastVerifiedAt: this.clock.isoString(),
    };
  }
}
