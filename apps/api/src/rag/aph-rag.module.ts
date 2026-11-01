import { Module } from "@nestjs/common";
import { ClockModule } from "../common/clock/clock.module";
import { AphRagController } from "./aph-rag.controller";
import { AphRagService } from "./aph-rag.service";

@Module({
  imports: [ClockModule],
  controllers: [AphRagController],
  providers: [AphRagService],
  exports: [AphRagService],
})
export class AphRagModule {}
