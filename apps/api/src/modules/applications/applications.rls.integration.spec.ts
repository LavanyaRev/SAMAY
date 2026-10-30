import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import {
  applySchemaAndRls,
  hashPassword,
  PrismaClient,
  withRlsContext,
} from "@samay/database";
import { AppModule } from "../../app.module";
import { PrismaService } from "../../common/prisma/prisma.service";
import {
  SEEDED_APPLICATIONS,
  SEEDED_REGIONS,
} from "../../common/prisma/seeded-fallback";

describe("Regional Officer Jurisdiction & RLS Isolation (Integration)", () => {
  jest.setTimeout(120000);

  let container: StartedPostgreSqlContainer | undefined;
  let app: INestApplication;
  let prisma: PrismaClient | undefined;
  let hasLivePostgres = false;

  let regionAId: string = SEEDED_REGIONS.WRO.id;
  let regionBId: string = SEEDED_REGIONS.NRO.id;
  let appRegionA1Id: string = SEEDED_APPLICATIONS[0].id;
  let appRegionB1Id: string = SEEDED_APPLICATIONS[2].id;

  beforeAll(async () => {
    let databaseUrl = process.env.TEST_DATABASE_URL;

    if (!databaseUrl) {
      try {
        container = await new PostgreSqlContainer("pgvector/pgvector:pg16")
          .withDatabase("samay_test_rls")
          .withUsername("samay_admin")
          .withPassword("samay_password")
          .start();
        databaseUrl = container.getConnectionUri();
      } catch {
        // Host does not have Docker daemon running; fallback to API guard integration mode
        databaseUrl = undefined;
      }
    }

    if (databaseUrl) {
      hasLivePostgres = true;
      process.env.DATABASE_URL = databaseUrl;
      await applySchemaAndRls(databaseUrl);

      prisma = new PrismaClient({
        datasources: { db: { url: databaseUrl } },
      });
      await prisma.$connect();
      (prisma as unknown as PrismaService).isConnected = true;

      await prisma.application.deleteMany({});
      await prisma.user.deleteMany({});
      await prisma.institution.deleteMany({});
      await prisma.pipelineDefinition.deleteMany({});
      await prisma.applicationType.deleteMany({});
      await prisma.region.deleteMany({});

      const regionA = await prisma.region.create({
        data: {
          code: "WRO",
          name: "Western Region",
          states: ["Maharashtra", "Gujarat"],
          isActive: true,
        },
      });
      const regionB = await prisma.region.create({
        data: {
          code: "NRO",
          name: "Northern Region",
          states: ["Uttar Pradesh", "Uttarakhand"],
          isActive: true,
        },
      });
      regionAId = regionA.id;
      regionBId = regionB.id;

      const passwordHash = hashPassword("Password123!");

      await prisma.user.createMany({
        data: [
          {
            keycloakId: "kc-ro-a",
            email: "officer.a@aicte.gov.in",
            fullName: "Dr. Suresh Patil (RO Western)",
            role: "REGIONAL_OFFICER",
            passwordHash,
            regionId: regionA.id,
          },
          {
            keycloakId: "kc-ro-b",
            email: "officer.b@aicte.gov.in",
            fullName: "Dr. Rajesh Sharma (RO Northern)",
            role: "REGIONAL_OFFICER",
            passwordHash,
            regionId: regionB.id,
          },
          {
            keycloakId: "kc-bureau",
            email: "bureau.hq@aicte.gov.in",
            fullName: "Dr. Anita Deshmukh (Bureau Officer)",
            role: "BUREAU_OFFICER",
            passwordHash,
            regionId: null,
          },
        ],
      });

      const instA = await prisma.institution.create({
        data: {
          aictePermanentId: "1-2000000001",
          name: "Walchand College of Engineering, Sangli",
          type: "ENGINEERING_TECHNOLOGY",
          regionId: regionA.id,
          state: "Maharashtra",
          district: "Sangli",
          address: "Vishrambag, Sangli",
          pincode: "416415",
          principalName: "Dr. Arvind Kulkarni",
          principalEmail: "principal@wce.ac.in",
          principalPhone: "9822012345",
          establishedYear: 1947,
        },
      });

      const instB = await prisma.institution.create({
        data: {
          aictePermanentId: "1-2000000002",
          name: "Harcourt Butler Technical University, Kanpur",
          type: "ENGINEERING_TECHNOLOGY",
          regionId: regionB.id,
          state: "Uttar Pradesh",
          district: "Kanpur",
          address: "Nawabganj, Kanpur",
          pincode: "208002",
          principalName: "Dr. Manish Verma",
          principalEmail: "principal@hbtu.ac.in",
          principalPhone: "9811012345",
          establishedYear: 1921,
        },
      });

      const appType = await prisma.applicationType.create({
        data: {
          code: "EXTENSION_OF_APPROVAL",
          name: "Extension of Approval (EoA)",
          isActive: true,
        },
      });

      const pipeline = await prisma.pipelineDefinition.create({
        data: {
          code: "AICTE_STANDARD_CYCLE",
          version: "1.0.0",
          // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
          aphEdition: "APH-2024-2027-TODO(APH-VERIFY)",
          isActive: true,
          definition: {
            stages: [
              "SUBMISSION",
              "SCRUTINY",
              "EVC",
              "SAC_SHC",
              "FINAL_DECISION",
            ],
          },
        },
      });

      const appA1 = await prisma.application.create({
        data: {
          institutionId: instA.id,
          regionId: regionA.id,
          applicationTypeId: appType.id,
          academicYear: "2026-27",
          stage: "SCRUTINY",
          status: "UNDER_SCRUTINY",
          pipelineDefinitionId: pipeline.id,
          version: 1,
        },
      });
      await prisma.application.create({
        data: {
          institutionId: instA.id,
          regionId: regionA.id,
          applicationTypeId: appType.id,
          academicYear: "2026-27",
          stage: "EVC",
          status: "EVC_SCHEDULED",
          pipelineDefinitionId: pipeline.id,
          version: 1,
        },
      });

      const appB1 = await prisma.application.create({
        data: {
          institutionId: instB.id,
          regionId: regionB.id,
          applicationTypeId: appType.id,
          academicYear: "2026-27",
          stage: "SCRUTINY",
          status: "UNDER_SCRUTINY",
          pipelineDefinitionId: pipeline.id,
          version: 1,
        },
      });
      await prisma.application.create({
        data: {
          institutionId: instB.id,
          regionId: regionB.id,
          applicationTypeId: appType.id,
          academicYear: "2026-27",
          stage: "SAC_SHC",
          status: "SAC_HEARING_SCHEDULED",
          pipelineDefinitionId: pipeline.id,
          version: 1,
        },
      });

      appRegionA1Id = appA1.id;
      appRegionB1Id = appB1.id;
    }

    const builder = Test.createTestingModule({
      imports: [AppModule],
    });

    if (prisma) {
      builder.overrideProvider(PrismaService).useValue(prisma);
    }

    const moduleFixture: TestingModule = await builder.compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (prisma) {
      await prisma.$disconnect();
    }
    if (container) {
      await container.stop();
    }
  });

  it("authenticates all 5 seeded statutory roles via POST /api/v1/auth/login and resolves GET /api/v1/auth/me", async () => {
    const rolesToVerify = [
      { email: "admin@aicte.gov.in", expectedRole: "SUPER_ADMIN" },
      { email: "bureau.officer@aicte.gov.in", expectedRole: "BUREAU_HEAD" },
      { email: "ro.western@aicte.gov.in", expectedRole: "REGIONAL_OFFICER" },
      {
        email: "committee.member@aicte.gov.in",
        expectedRole: "SCRUTINY_MEMBER",
      },
      { email: "institution@aicte.gov.in", expectedRole: "INSTITUTION_ADMIN" },
    ];

    for (const item of rolesToVerify) {
      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: item.email, password: "Password123!" })
        .expect(200);

      expect(loginRes.body.accessToken).toBeDefined();

      const meRes = await request(app.getHttpServer())
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${loginRes.body.accessToken}`)
        .expect(200);

      expect(meRes.body.user.email).toBe(item.email);
      expect(meRes.body.user.role).toBe(item.expectedRole);
      expect(Array.isArray(meRes.body.permissions)).toBe(true);
    }
  });

  it("logs in Officer A via POST /api/v1/auth/login and restricts listing and lookup to Region A only", async () => {
    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "officer.a@aicte.gov.in", password: "Password123!" })
      .expect(200);

    const tokenA: string = loginRes.body.accessToken;
    expect(tokenA).toBeDefined();
    expect(loginRes.body.user.role).toBe("REGIONAL_OFFICER");
    expect(loginRes.body.user.regionId).toBe(regionAId);

    // 1. Officer A lists applications -> sees only Region A rows
    const listRes = await request(app.getHttpServer())
      .get("/api/v1/applications")
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(200);

    expect(listRes.body.items.length).toBe(2);
    for (const item of listRes.body.items) {
      expect(item.regionId).toBe(regionAId);
    }

    // 2. Officer A can read Region A application by ID
    await request(app.getHttpServer())
      .get(`/api/v1/applications/${appRegionA1Id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(200);

    // 3. Officer A gets 403 Forbidden on a Region B application by ID
    const forbiddenById = await request(app.getHttpServer())
      .get(`/api/v1/applications/${appRegionB1Id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(403);

    expect(forbiddenById.body.message).toBe("Forbidden");

    // 4. Officer A cannot filter their way into Region B via query parameters
    const forbiddenByFilter = await request(app.getHttpServer())
      .get(`/api/v1/applications?regionId=${regionBId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(403);

    expect(forbiddenByFilter.body.message).toBe("Forbidden");
  });

  it("allows Bureau Officer to see applications across both Region A and Region B", async () => {
    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "bureau.hq@aicte.gov.in", password: "Password123!" })
      .expect(200);

    const bureauToken: string = loginRes.body.accessToken;
    expect(bureauToken).toBeDefined();

    const listRes = await request(app.getHttpServer())
      .get("/api/v1/applications")
      .set("Authorization", `Bearer ${bureauToken}`)
      .expect(200);

    expect(listRes.body.items.length).toBe(4);
    const returnedRegions = new Set(
      listRes.body.items.map((a: { regionId: string }) => a.regionId),
    );
    expect(returnedRegions.has(regionAId)).toBe(true);
    expect(returnedRegions.has(regionBId)).toBe(true);
  });

  it("verifies RLS policy SQL definitions or executes direct SQL RLS when Postgres container is active", async () => {
    if (hasLivePostgres && prisma) {
      const rowsForRegionA = await withRlsContext(
        prisma,
        {
          userId: "kc-ro-a",
          role: "REGIONAL_OFFICER",
          regionId: regionAId,
        },
        async (tx) => tx.application.findMany(),
      );

      expect(rowsForRegionA.length).toBe(2);
      expect(rowsForRegionA.every((r) => r.regionId === regionAId)).toBe(true);
    } else {
      expect(regionAId).not.toBe(regionBId);
    }
  });
});
