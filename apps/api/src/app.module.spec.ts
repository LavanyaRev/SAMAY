import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "./app.module";
import { SystemClockService } from "./common/clock/clock.service";
import { WorkflowService } from "./modules/workflow/workflow.service";
import { ApplicationsService } from "./modules/applications/applications.service";
import { EvcService } from "./modules/evc/evc.service";
import { UndertakingsService } from "./modules/undertakings/undertakings.service";
import { DeadlinesService } from "./modules/deadlines/deadlines.service";

describe("AppModule Modular Monolith", () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  it("should compile and wire all 13 domain modules and ClockService", () => {
    expect(module).toBeDefined();

    const clock = module.get(SystemClockService);
    expect(clock).toBeDefined();

    const workflow = module.get(WorkflowService);
    expect(workflow).toBeDefined();
    expect(workflow.getActiveDefinition().transitions.length).toBeGreaterThan(
      0,
    );

    const applications = module.get(ApplicationsService);
    expect(applications).toBeDefined();

    const evc = module.get(EvcService);
    expect(evc).toBeDefined();

    const undertakings = module.get(UndertakingsService);
    expect(undertakings).toBeDefined();

    const deadlines = module.get(DeadlinesService);
    expect(deadlines).toBeDefined();
  });
});
