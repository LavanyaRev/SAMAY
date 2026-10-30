import { PrismaClient } from '@prisma/client';
import { randomUUID, scryptSync } from 'crypto';

const prisma = new PrismaClient();

export function hashPassword(password: string, salt = 'samay-statutory-salt-2026'): string {
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

// Deterministic Pseudo-Random Number Generator (Mulberry32)
function createPrng(seed: number) {
  let s = seed;
  return function () {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const prng = createPrng(20261030);

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(prng() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(prng() * (max - min + 1)) + min;
}

const FIRST_NAMES = [
  'Aarav', 'Aditi', 'Amit', 'Anand', 'Ananya', 'Anita', 'Deepak', 'Gaurav', 'Isha',
  'Kavita', 'Manish', 'Neha', 'Nitin', 'Pooja', 'Pradeep', 'Priya', 'Rahul', 'Rajesh',
  'Ramesh', 'Ritu', 'Rohit', 'Sachin', 'Sanjay', 'Santosh', 'Shilpa', 'Sneha', 'Suresh',
  'Swati', 'Vikas', 'Vikram', 'Vinod', 'Vivek'
];

const LAST_NAMES = [
  'Agrawal', 'Banerjee', 'Bhat', 'Chauhan', 'Das', 'Deshmukh', 'Gupta', 'Iyer',
  'Jadhav', 'Jain', 'Joshi', 'Kadam', 'Kulkarni', 'Kumar', 'Mehta', 'Mishra',
  'Mukherjee', 'Nair', 'Patel', 'Patil', 'Pawar', 'Prasad', 'Rao', 'Reddy',
  'Sharma', 'Shinde', 'Singh', 'Verma', 'Yadav'
];

function generatePersonName(prefix = 'Dr.'): string {
  return `${prefix} ${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`;
}

const ALL_REGION_DEFINITIONS = [
  { code: 'WRO', name: 'Western', states: ['Maharashtra', 'Goa', 'Gujarat'] },
  { code: 'NRO', name: 'Northern', states: ['Uttar Pradesh', 'Uttarakhand'] },
  { code: 'NWRO', name: 'North-West', states: ['Punjab', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Delhi', 'Chandigarh'] },
  { code: 'CRO', name: 'Central', states: ['Madhya Pradesh', 'Chhattisgarh'] },
  { code: 'ERO', name: 'Eastern', states: ['West Bengal', 'Bihar', 'Jharkhand', 'Odisha'] },
  { code: 'SRO', name: 'Southern', states: ['Tamil Nadu', 'Puducherry'] },
  { code: 'SWRO', name: 'South-West', states: ['Karnataka', 'Kerala'] },
  { code: 'NERO', name: 'North-Eastern', states: ['Assam', 'Meghalaya', 'Manipur', 'Mizoram', 'Nagaland', 'Tripura', 'Arunachal Pradesh', 'Sikkim'] },
];

const INSTITUTION_PREFIXES = [
  'Shri', 'Government', 'Mahatma Gandhi', 'Dr. B.R. Ambedkar', 'Sardar Vallabhbhai Patel',
  'Netaji Subhash', 'Swami Vivekananda', 'Visvesvaraya', 'Ramanujan', 'Rajarshi Shahu',
  'Indira Gandhi', 'Jawaharlal Nehru', 'Maulana Azad', 'National', 'Premier', 'Bharati'
];

const INSTITUTION_TYPES = [
  'ENGINEERING_TECHNOLOGY',
  'MANAGEMENT',
  'PHARMACY',
  'POLYTECHNIC',
  'APPLIED_ARTS',
];

const APPLICATION_STAGES = [
  { stage: 'SUBMISSION', status: 'DRAFT' },
  { stage: 'SUBMISSION', status: 'SUBMITTED' },
  { stage: 'SCRUTINY', status: 'UNDER_SCRUTINY' },
  { stage: 'SCRUTINY', status: 'SCRUTINY_DEFICIENT' },
  { stage: 'SCRUTINY', status: 'SCRUTINY_VERIFIED' },
  { stage: 'EVC', status: 'EVC_SCHEDULED' },
  { stage: 'EVC', status: 'EVC_IN_PROGRESS' },
  { stage: 'EVC', status: 'EVC_COMPLETED' },
  { stage: 'SAC_SHC', status: 'SAC_HEARING_SCHEDULED' },
  { stage: 'SAC_SHC', status: 'SAC_RECOMMENDED' },
  { stage: 'FINAL_DECISION', status: 'APPROVED' },
  { stage: 'FINAL_DECISION', status: 'REJECTED' },
];

export async function seedDatabase() {
  const TARGET_REGIONS = Number(process.env.SEED_REGIONS || 6);
  const TARGET_INSTITUTIONS = Number(process.env.SEED_INSTITUTIONS || 40);
  const TARGET_APPLICATIONS = Number(process.env.SEED_APPLICATIONS || 500);
  const REGION_DEFINITIONS = ALL_REGION_DEFINITIONS.slice(0, Math.min(TARGET_REGIONS, ALL_REGION_DEFINITIONS.length));

  console.log(`--- Starting SAMAY Database Seeding (Regions=${REGION_DEFINITIONS.length}, Institutions=${TARGET_INSTITUTIONS}, Applications=${TARGET_APPLICATIONS}) ---`);

  // 1. Seed Regions
  console.log(`Seeding ${REGION_DEFINITIONS.length} AICTE Regions...`);
  const regionsMap = new Map<string, string>(); // code -> id

  for (const reg of REGION_DEFINITIONS) {
    const existing = await prisma.region.findUnique({ where: { code: reg.code } });
    if (existing) {
      regionsMap.set(reg.code, existing.id);
    } else {
      const created = await prisma.region.create({
        data: {
          code: reg.code,
          name: reg.name,
          states: reg.states,
          isActive: true,
        },
      });
      regionsMap.set(reg.code, created.id);
    }
  }

  // 2. Seed Application Types
  console.log('Seeding Application Types...');
  const appTypes = [
    { code: 'NEW_INSTITUTION', name: 'Setting up New Technical Institution', description: 'Initial statutory approval for setting up institution' },
    { code: 'EXTENSION_OF_APPROVAL', name: 'Extension of Approval (EoA)', description: 'Annual continuation of approval' },
    { code: 'INCREASE_INTAKE', name: 'Increase in Intake / Additional Course', description: 'Adding division or new specialized program' },
    { code: 'CHANGE_SITE', name: 'Change of Site or Location', description: 'Physical relocation of campus' },
    { code: 'CLOSURE_INSTITUTION', name: 'Closure of Institution / Course', description: 'Voluntary progressive closure' },
  ];

  const appTypeMap = new Map<string, string>();
  for (const at of appTypes) {
    const existing = await prisma.applicationType.findUnique({ where: { code: at.code } });
    if (existing) {
      appTypeMap.set(at.code, existing.id);
    } else {
      const created = await prisma.applicationType.create({ data: at });
      appTypeMap.set(at.code, created.id);
    }
  }
  const appTypeIds = Array.from(appTypeMap.values());

  // 3. Seed Pipeline Definitions (ONLY_SCRUTINY and SCRUTINY_EVC)
  // Immutability Rule: New versions never mutate old ones; applications pin their pipelineDefinitionId.
  console.log('Seeding Pipeline Definitions (ONLY_SCRUTINY & SCRUTINY_EVC) as versioned DATA...');
  const pipelineSeeds = [
    {
      id: '66666666-6666-4666-8666-666666666601',
      code: 'ONLY_SCRUTINY',
      version: '1.0.0',
      // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
      aphEdition: 'APH-2024-27-TODO(APH-VERIFY)',
      definition: {
        code: 'ONLY_SCRUTINY',
        name: 'Statutory Scrutiny-Only Approval Pipeline (Placeholder)',
        initial_stage: 'DRAFT',
        escalation_policy_ref: 'ESC_POLICY_STANDARD_SCRUTINY_TODO_APH_VERIFY',
        metadata: {
          aph_edition: 'APH-2024-27-TODO(APH-VERIFY)',
          version: '1.0.0',
          effective_from: '2026-04-01T00:00:00.000Z',
        },
      },
    },
    {
      id: '66666666-6666-4666-8666-666666666602',
      code: 'SCRUTINY_EVC',
      version: '1.0.0',
      // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
      aphEdition: 'APH-2024-27-TODO(APH-VERIFY)',
      definition: {
        code: 'SCRUTINY_EVC',
        name: 'Statutory Scrutiny & EVC Inspection Pipeline (Placeholder)',
        initial_stage: 'DRAFT',
        escalation_policy_ref: 'ESC_POLICY_NEW_INST_EVC_STRICT_TODO_APH_VERIFY',
        metadata: {
          aph_edition: 'APH-2024-27-TODO(APH-VERIFY)',
          version: '1.0.0',
          effective_from: '2026-04-01T00:00:00.000Z',
        },
      },
    },
  ];

  const seededPipelines: { id: string; code: string }[] = [];
  for (const ps of pipelineSeeds) {
    let existingPipeline = await prisma.pipelineDefinition.findUnique({
      where: { code_version: { code: ps.code, version: ps.version } },
    });
    if (!existingPipeline) {
      // Never mutate existing versions; only create if (code, version) does not exist
      existingPipeline = await prisma.pipelineDefinition.create({
        data: {
          id: ps.id,
          code: ps.code,
          version: ps.version,
          aphEdition: ps.aphEdition,
          isActive: true,
          definition: ps.definition,
        },
      });
    }
    seededPipelines.push({ id: existingPipeline.id, code: existingPipeline.code });
  }
  const pipeline = seededPipelines[0];

  // 4. Seed Institutions across the configured regions
  const existingInstCount = await prisma.institution.count();
  const institutionsToCreate = Math.max(0, TARGET_INSTITUTIONS - existingInstCount);

  console.log(`Institutions in DB: ${existingInstCount}. Generating ${institutionsToCreate} synthetic institutions...`);

  const institutionIds: { id: string; regionId: string }[] = [];

  if (institutionsToCreate > 0) {
    const CHUNK_SIZE = 200;
    let currentBatch: any[] = [];

    for (let i = 0; i < institutionsToCreate; i++) {
      const globalIndex = existingInstCount + i + 1;
      const regDef = REGION_DEFINITIONS[i % REGION_DEFINITIONS.length];
      const regionId = regionsMap.get(regDef.code)!;
      const id = randomUUID();
      const instType = randomChoice(INSTITUTION_TYPES);
      const prefix = randomChoice(INSTITUTION_PREFIXES);
      const state = randomChoice(regDef.states);
      const principalName = generatePersonName('Dr.');
      const permanentId = `1-${(1000000000 + globalIndex).toString()}`;

      currentBatch.push({
        id,
        aictePermanentId: permanentId,
        name:
          globalIndex === 1
            ? 'Walchand College of Engineering, Sangli'
            : `${prefix} ${instType.replace(/_/g, ' ')} Institute (${regDef.name} #${globalIndex})`,
        type: instType,
        regionId,
        state,
        district: `${state} District ${randomInt(1, 20)}`,
        address: `${randomInt(10, 999)}, Institutional Area, Sector ${randomInt(1, 50)}, ${state}`,
        pincode: `${randomInt(11, 85)}${randomInt(1000, 9999)}`,
        principalName,
        principalEmail: `principal.${globalIndex}@aicte-sample.edu.in`,
        principalPhone: `98${randomInt(10000000, 99999999)}`,
        establishedYear: randomInt(1985, 2024),
        isMinority: prng() < 0.15,
      });

      institutionIds.push({ id, regionId });

      if (currentBatch.length >= CHUNK_SIZE || i === institutionsToCreate - 1) {
        await prisma.institution.createMany({ data: currentBatch, skipDuplicates: true });
        console.log(`  Inserted institutions: ${i + 1}/${institutionsToCreate}`);
        currentBatch = [];
      }
    }
  } else {
    const existingInsts = await prisma.institution.findMany({
      select: { id: true, regionId: true },
      take: TARGET_INSTITUTIONS,
      orderBy: { aictePermanentId: 'asc' },
    });
    institutionIds.push(...existingInsts);
  }

  // 5. Seed Demo Users (one per statutory role + additional regional officers) with hashed passwords
  console.log('Seeding Administrative Users, Regional Officers & Demo Users per role...');
  const defaultPasswordHash = hashPassword('Password123!');
  const firstInstitution = institutionIds[0];

  const demoUsers = [
    {
      keycloakId: 'keycloak-admin-uuid',
      email: 'admin@aicte.gov.in',
      fullName: 'Dr. Rameshwar Prasad (Super Admin)',
      role: 'ADMIN',
      passwordHash: defaultPasswordHash,
      regionId: null,
      institutionId: null,
    },
    {
      keycloakId: 'keycloak-bureau-uuid',
      email: 'bureau.officer@aicte.gov.in',
      fullName: 'Dr. Anita Deshmukh (Bureau Head)',
      role: 'BUREAU_OFFICER',
      passwordHash: defaultPasswordHash,
      regionId: null,
      institutionId: null,
    },
    {
      keycloakId: 'keycloak-ro-western-uuid',
      email: 'ro.western@aicte.gov.in',
      fullName: 'Dr. Suresh Patil (RO Western)',
      role: 'REGIONAL_OFFICER',
      passwordHash: defaultPasswordHash,
      regionId: regionsMap.get('WRO') ?? null,
      institutionId: null,
    },
    {
      keycloakId: 'keycloak-ro-northern-uuid',
      email: 'ro.northern@aicte.gov.in',
      fullName: 'Dr. Rajesh Sharma (RO Northern)',
      role: 'REGIONAL_OFFICER',
      passwordHash: defaultPasswordHash,
      regionId: regionsMap.get('NRO') ?? null,
      institutionId: null,
    },
    {
      keycloakId: 'keycloak-committee-uuid',
      email: 'committee.member@aicte.gov.in',
      fullName: 'Prof. Vikram Rao (Scrutiny & EVC Expert)',
      role: 'COMMITTEE_MEMBER',
      passwordHash: defaultPasswordHash,
      regionId: null,
      institutionId: null,
    },
    {
      keycloakId: 'keycloak-institution-uuid',
      email: 'institution@aicte.gov.in',
      fullName: 'Dr. Arvind Kulkarni (Principal, Walchand College)',
      role: 'INSTITUTION',
      passwordHash: defaultPasswordHash,
      regionId: firstInstitution?.regionId ?? regionsMap.get('WRO') ?? null,
      institutionId: firstInstitution?.id ?? null,
    },
  ];

  for (const du of demoUsers) {
    await prisma.user.upsert({
      where: { email: du.email },
      update: du,
      create: du,
    });
  }

  // 6. Seed Applications across varied stages and ages
  const existingAppCount = await prisma.application.count();
  const applicationsToCreate = Math.max(0, TARGET_APPLICATIONS - existingAppCount);

  console.log(`Applications in DB: ${existingAppCount}. Generating ${applicationsToCreate} synthetic applications...`);

  if (applicationsToCreate > 0 && institutionIds.length > 0) {
    const CHUNK_SIZE = 250;
    let currentBatch: any[] = [];
    const academicYears = ['2024-25', '2025-26', '2026-27'];
    const baseEpochMs = 1761830000000; // Deterministic reference timestamp

    for (let i = 0; i < applicationsToCreate; i++) {
      const inst = institutionIds[i % institutionIds.length];
      const stagePair = randomChoice(APPLICATION_STAGES);
      const appTypeId = randomChoice(appTypeIds);
      const academicYear = randomChoice(academicYears);
      const ageDays = randomInt(5, 250);
      const createdAt = new Date(baseEpochMs - ageDays * 24 * 60 * 60 * 1000);
      const submittedAt =
        stagePair.status !== 'DRAFT'
          ? new Date(createdAt.getTime() + randomInt(1, 5) * 24 * 60 * 60 * 1000)
          : null;

      const advisory =
        stagePair.status !== 'DRAFT'
          ? [
              {
                classification: 'ADVISORY',
                ruleId: 'RULE-FACULTY-RATIO-01',
                // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
                aphClause: 'TODO(APH-VERIFY)',
                summary: 'Cadre ratio and student-faculty compliance advisory',
                rationale:
                  'Calculated faculty ratio meets statutory AICTE threshold with minor variance in assistant professors.',
                score: randomInt(75, 98),
                generatedAt: createdAt.toISOString(),
              },
            ]
          : [];

      currentBatch.push({
        id: randomUUID(),
        institutionId: inst.id,
        regionId: inst.regionId,
        applicationTypeId: appTypeId,
        academicYear,
        stage: stagePair.stage,
        status: stagePair.status,
        pipelineDefinitionId: pipeline.id,
        version: 1,
        submittedAt,
        advisoryRecommendations: advisory,
        createdAt,
        updatedAt: createdAt,
      });

      if (currentBatch.length >= CHUNK_SIZE || i === applicationsToCreate - 1) {
        await prisma.application.createMany({ data: currentBatch, skipDuplicates: true });
        console.log(`  Inserted applications: ${i + 1}/${applicationsToCreate}`);
        currentBatch = [];
      }
    }
  }

  // 7. Seed Holiday Calendar for Next Two Years (2026 - 2027)
  console.log('Seeding 2-year Holiday Calendar (2026-2027)...');
  const holidays = [
    { date: new Date('2026-01-26'), name: 'Republic Day', isNational: true },
    { date: new Date('2026-03-03'), name: 'Holi', isNational: false },
    { date: new Date('2026-03-21'), name: 'Id-ul-Fitr', isNational: true },
    { date: new Date('2026-04-03'), name: 'Good Friday', isNational: true },
    { date: new Date('2026-04-14'), name: 'Dr. B.R. Ambedkar Jayanti', isNational: true },
    { date: new Date('2026-05-27'), name: 'Bakrid / Eid-ul-Adha', isNational: true },
    { date: new Date('2026-08-15'), name: 'Independence Day', isNational: true },
    { date: new Date('2026-09-04'), name: 'Janmashtami', isNational: false },
    { date: new Date('2026-10-02'), name: 'Mahatma Gandhi Jayanti', isNational: true },
    { date: new Date('2026-10-20'), name: 'Dussehra / Vijayadashami', isNational: true },
    { date: new Date('2026-11-08'), name: 'Diwali (Deepavali)', isNational: true },
    { date: new Date('2026-11-24'), name: 'Guru Nanak Jayanti', isNational: true },
    { date: new Date('2026-12-25'), name: 'Christmas Day', isNational: true },
    { date: new Date('2027-01-26'), name: 'Republic Day', isNational: true },
    { date: new Date('2027-03-10'), name: 'Id-ul-Fitr', isNational: true },
    { date: new Date('2027-03-22'), name: 'Holi', isNational: false },
    { date: new Date('2027-03-26'), name: 'Good Friday', isNational: true },
    { date: new Date('2027-04-14'), name: 'Dr. B.R. Ambedkar Jayanti', isNational: true },
    { date: new Date('2027-05-16'), name: 'Bakrid / Eid-ul-Adha', isNational: true },
    { date: new Date('2027-08-15'), name: 'Independence Day', isNational: true },
    { date: new Date('2027-08-25'), name: 'Janmashtami', isNational: false },
    { date: new Date('2027-10-02'), name: 'Mahatma Gandhi Jayanti', isNational: true },
    { date: new Date('2027-10-10'), name: 'Dussehra / Vijayadashami', isNational: true },
    { date: new Date('2027-10-29'), name: 'Diwali (Deepavali)', isNational: true },
    { date: new Date('2027-11-13'), name: 'Guru Nanak Jayanti', isNational: true },
    { date: new Date('2027-12-25'), name: 'Christmas Day', isNational: true },
  ];

  for (const h of holidays) {
    const existing = await prisma.holidayCalendar.findFirst({
      where: { date: h.date, name: h.name },
    });
    if (!existing) {
      await prisma.holidayCalendar.create({ data: h });
    }
  }

  console.log('--- SAMAY Seeding Successfully Completed ---');
}

if (require.main === module) {
  seedDatabase()
    .catch((err) => {
      console.error('Fatal error during seed execution:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
