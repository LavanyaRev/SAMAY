import { Global, Module } from "@nestjs/common";
import { CLOCK_SERVICE_TOKEN, SystemClockService } from "./clock.service";

@Global()
@Module({
  providers: [
    {
      provide: CLOCK_SERVICE_TOKEN,
      useClass: SystemClockService,
    },
    SystemClockService,
  ],
  exports: [CLOCK_SERVICE_TOKEN, SystemClockService],
})
export class ClockModule {}
