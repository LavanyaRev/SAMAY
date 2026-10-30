import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.setGlobalPrefix("api/v1");

  // Code-first OpenAPI documentation configuration
  const config = new DocumentBuilder()
    .setTitle("SAMAY API - Smart AICTE Monitoring & Approval Yojana")
    .setDescription(
      "Modular monolith API orchestrating AICTE statutory approval workflows, EVC scheduling, undertakings, and pendency monitoring.",
    )
    .setVersion("1.0.0")
    .addTag("Auth", "Keycloak identity and access governance")
    .addTag("Institutions", "College & Polytechnic profiles")
    .addTag("Applications", "Statutory approval applications")
    .addTag("Workflow", "Data-driven state machine transitions & gates")
    .addTag("Deadlines", "Regulatory SLA countdowns & escalations")
    .addTag("Notifications", "Transactional outbox notifications")
    .addTag("EVC", "Expert Visit Committee inspections")
    .addTag("Undertakings", "Time-bound compliance commitments")
    .addTag("Documents", "Lease deed & document validity tracking")
    .addTag("Dashboards", "Real-time pendency metrics")
    .addTag("Reports", "Statutory compliance syntheses")
    .addTag("Audit", "Immutable transactional audit trail")
    .addTag("Admin", "System governance & APH cycle config")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`SAMAY API running on http://localhost:${port}/api/v1`);
  console.log(
    `OpenAPI documentation available at http://localhost:${port}/api/docs`,
  );
}

// Bootstrap if not in test environment
if (process.env.NODE_ENV !== "test") {
  bootstrap();
}
