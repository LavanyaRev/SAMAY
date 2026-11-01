import { hashPassword } from "@samay/database";

export interface SeededRegion {
  id: string;
  code: string;
  name: string;
  states: string[];
}

export interface SeededUser {
  id: string;
  keycloakId: string;
  email: string;
  fullName: string;
  role: string;
  passwordHash: string;
  regionId: string | null;
  regionCode: string | null;
  institutionId: string | null;
  isActive: boolean;
  deletedAt: Date | null;
}

export interface SeededApplication {
  id: string;
  applicationRef?: string;
  institutionId: string;
  regionId: string;
  applicationTypeId: string;
  academicYear: string;
  stage: string;
  status: string;
  pipelineDefinitionId: string;
  ballWith?: string;
  currentQueue?: string;
  version: number;
  deletedAt: Date | null;
  institution: {
    id: string;
    name: string;
    aictePermanentId: string;
    state: string;
    district: string;
  };
  region: {
    id: string;
    code: string;
    name: string;
  };
}

const DEFAULT_HASH = hashPassword("Password123!");

export const SEEDED_REGIONS: Record<string, SeededRegion> = {
  WRO: {
    id: "11111111-1111-4111-8111-111111111101",
    code: "WRO",
    name: "Western Region",
    states: ["Maharashtra", "Goa", "Gujarat"],
  },
  NRO: {
    id: "11111111-1111-4111-8111-111111111102",
    code: "NRO",
    name: "Northern Region",
    states: ["Uttar Pradesh", "Uttarakhand"],
  },
  SRO: {
    id: "11111111-1111-4111-8111-111111111103",
    code: "SRO",
    name: "Southern Region",
    states: ["Tamil Nadu", "Puducherry"],
  },
};

export const SEEDED_USERS: SeededUser[] = [
  {
    id: "22222222-2222-4222-8222-222222222201",
    keycloakId: "keycloak-admin-uuid",
    email: "admin@aicte.gov.in",
    fullName: "Dr. Rameshwar Prasad (Super Admin)",
    role: "ADMIN",
    passwordHash: DEFAULT_HASH,
    regionId: null,
    regionCode: null,
    institutionId: null,
    isActive: true,
    deletedAt: null,
  },
  {
    id: "22222222-2222-4222-8222-222222222202",
    keycloakId: "keycloak-bureau-uuid",
    email: "bureau.officer@aicte.gov.in",
    fullName: "Dr. Anita Deshmukh (Bureau Head)",
    role: "BUREAU_OFFICER",
    passwordHash: DEFAULT_HASH,
    regionId: null,
    regionCode: null,
    institutionId: null,
    isActive: true,
    deletedAt: null,
  },
  {
    id: "22222222-2222-4222-8222-222222222203",
    keycloakId: "keycloak-ro-western-uuid",
    email: "ro.western@aicte.gov.in",
    fullName: "Dr. Suresh Patil (RO Western)",
    role: "REGIONAL_OFFICER",
    passwordHash: DEFAULT_HASH,
    regionId: SEEDED_REGIONS.WRO.id,
    regionCode: "WRO",
    institutionId: null,
    isActive: true,
    deletedAt: null,
  },
  {
    id: "22222222-2222-4222-8222-222222222204",
    keycloakId: "keycloak-ro-northern-uuid",
    email: "ro.northern@aicte.gov.in",
    fullName: "Dr. Rajesh Sharma (RO Northern)",
    role: "REGIONAL_OFFICER",
    passwordHash: DEFAULT_HASH,
    regionId: SEEDED_REGIONS.NRO.id,
    regionCode: "NRO",
    institutionId: null,
    isActive: true,
    deletedAt: null,
  },
  {
    id: "22222222-2222-4222-8222-222222222205",
    keycloakId: "keycloak-committee-uuid",
    email: "committee.member@aicte.gov.in",
    fullName: "Prof. Vikram Rao (Scrutiny & EVC Expert)",
    role: "COMMITTEE_MEMBER",
    passwordHash: DEFAULT_HASH,
    regionId: null,
    regionCode: null,
    institutionId: null,
    isActive: true,
    deletedAt: null,
  },
  {
    id: "22222222-2222-4222-8222-222222222206",
    keycloakId: "keycloak-institution-uuid",
    email: "institution@aicte.gov.in",
    fullName: "Dr. Arvind Kulkarni (Principal, Walchand College)",
    role: "INSTITUTION",
    passwordHash: DEFAULT_HASH,
    regionId: SEEDED_REGIONS.WRO.id,
    regionCode: "WRO",
    institutionId: "33333333-3333-4333-8333-333333333301",
    isActive: true,
    deletedAt: null,
  },
  // Test fixture aliases
  {
    id: "22222222-2222-4222-8222-222222222207",
    keycloakId: "kc-ro-a",
    email: "officer.a@aicte.gov.in",
    fullName: "Dr. Suresh Patil (RO Western)",
    role: "REGIONAL_OFFICER",
    passwordHash: DEFAULT_HASH,
    regionId: SEEDED_REGIONS.WRO.id,
    regionCode: "WRO",
    institutionId: null,
    isActive: true,
    deletedAt: null,
  },
  {
    id: "22222222-2222-4222-8222-222222222208",
    keycloakId: "kc-bureau",
    email: "bureau.hq@aicte.gov.in",
    fullName: "Dr. Anita Deshmukh (Bureau Officer)",
    role: "BUREAU_OFFICER",
    passwordHash: DEFAULT_HASH,
    regionId: null,
    regionCode: null,
    institutionId: null,
    isActive: true,
    deletedAt: null,
  },
];

export const SEEDED_APPLICATIONS: SeededApplication[] = [
  {
    id: "sc-01",
    applicationRef: "EOA-2027-1042",
    institutionId: "33333333-3333-4333-8333-333333333301",
    regionId: SEEDED_REGIONS.WRO.id,
    applicationTypeId: "55555555-5555-4555-8555-555555555501",
    academicYear: "2026-27",
    stage: "SCRUTINY",
    status: "UNDER_SCRUTINY",
    pipelineDefinitionId: "66666666-6666-4666-8666-666666666601",
    ballWith: "REGIONAL_OFFICE",
    version: 1,
    deletedAt: null,
    institution: {
      id: "33333333-3333-4333-8333-333333333301",
      name: "Sahyadri Institute of Technology",
      aictePermanentId: "1-4000000001",
      state: "Maharashtra",
      district: "Pune",
    },
    region: {
      id: SEEDED_REGIONS.WRO.id,
      code: "WRO",
      name: "Western Region",
    },
  },
  {
    id: "sc-02",
    applicationRef: "EOA-2027-1086",
    institutionId: "33333333-3333-4333-8333-333333333302",
    regionId: SEEDED_REGIONS.WRO.id,
    applicationTypeId: "55555555-5555-4555-8555-555555555501",
    academicYear: "2026-27",
    stage: "SCRUTINY",
    status: "UNDER_SCRUTINY",
    pipelineDefinitionId: "66666666-6666-4666-8666-666666666601",
    ballWith: "REGIONAL_OFFICE",
    version: 1,
    deletedAt: null,
    institution: {
      id: "33333333-3333-4333-8333-333333333302",
      name: "Konkan Technical College",
      aictePermanentId: "1-4000000002",
      state: "Maharashtra",
      district: "Ratnagiri",
    },
    region: {
      id: SEEDED_REGIONS.WRO.id,
      code: "WRO",
      name: "Western Region",
    },
  },
  {
    id: "sc-03",
    applicationRef: "LOA-2027-1128",
    institutionId: "33333333-3333-4333-8333-333333333303",
    regionId: SEEDED_REGIONS.WRO.id,
    applicationTypeId: "55555555-5555-4555-8555-555555555502",
    academicYear: "2026-27",
    stage: "SCRUTINY",
    status: "SCRUTINY_DEFICIENT",
    pipelineDefinitionId: "66666666-6666-4666-8666-666666666601",
    ballWith: "INSTITUTION",
    version: 1,
    deletedAt: null,
    institution: {
      id: "33333333-3333-4333-8333-333333333303",
      name: "Narmada Polytechnic",
      aictePermanentId: "1-4000000003",
      state: "Gujarat",
      district: "Bharuch",
    },
    region: {
      id: SEEDED_REGIONS.WRO.id,
      code: "WRO",
      name: "Western Region",
    },
  },
  {
    id: "44444444-4444-4444-8444-444444444401",
    applicationRef: "EOA-2027-1001",
    institutionId: "33333333-3333-4333-8333-333333333301",
    regionId: SEEDED_REGIONS.WRO.id,
    applicationTypeId: "55555555-5555-4555-8555-555555555501",
    academicYear: "2026-27",
    stage: "SCRUTINY",
    status: "UNDER_SCRUTINY",
    pipelineDefinitionId: "66666666-6666-4666-8666-666666666601",
    version: 1,
    deletedAt: null,
    institution: {
      id: "33333333-3333-4333-8333-333333333301",
      name: "Walchand College of Engineering, Sangli",
      aictePermanentId: "1-2000000001",
      state: "Maharashtra",
      district: "Sangli",
    },
    region: {
      id: SEEDED_REGIONS.WRO.id,
      code: "WRO",
      name: "Western Region",
    },
  },
  {
    id: "44444444-4444-4444-8444-444444444402",
    institutionId: "33333333-3333-4333-8333-333333333302",
    regionId: SEEDED_REGIONS.WRO.id,
    applicationTypeId: "55555555-5555-4555-8555-555555555501",
    academicYear: "2026-27",
    stage: "EVC",
    status: "EVC_SCHEDULED",
    pipelineDefinitionId: "66666666-6666-4666-8666-666666666601",
    version: 1,
    deletedAt: null,
    institution: {
      id: "33333333-3333-4333-8333-333333333302",
      name: "Veermata Jijabai Technological Institute (VJTI), Mumbai",
      aictePermanentId: "1-2000000014",
      state: "Maharashtra",
      district: "Mumbai City",
    },
    region: {
      id: SEEDED_REGIONS.WRO.id,
      code: "WRO",
      name: "Western Region",
    },
  },
  {
    id: "44444444-4444-4444-8444-444444444403",
    institutionId: "33333333-3333-4333-8333-333333333303",
    regionId: SEEDED_REGIONS.NRO.id,
    applicationTypeId: "55555555-5555-4555-8555-555555555501",
    academicYear: "2026-27",
    stage: "SCRUTINY",
    status: "UNDER_SCRUTINY",
    pipelineDefinitionId: "66666666-6666-4666-8666-666666666601",
    version: 1,
    deletedAt: null,
    institution: {
      id: "33333333-3333-4333-8333-333333333303",
      name: "Harcourt Butler Technical University, Kanpur",
      aictePermanentId: "1-3000000002",
      state: "Uttar Pradesh",
      district: "Kanpur",
    },
    region: {
      id: SEEDED_REGIONS.NRO.id,
      code: "NRO",
      name: "Northern Region",
    },
  },
  {
    id: "44444444-4444-4444-8444-444444444404",
    institutionId: "33333333-3333-4333-8333-333333333303",
    regionId: SEEDED_REGIONS.NRO.id,
    applicationTypeId: "55555555-5555-4555-8555-555555555501",
    academicYear: "2026-27",
    stage: "SAC_SHC",
    status: "SAC_HEARING_SCHEDULED",
    pipelineDefinitionId: "66666666-6666-4666-8666-666666666601",
    version: 1,
    deletedAt: null,
    institution: {
      id: "33333333-3333-4333-8333-333333333303",
      name: "Harcourt Butler Technical University, Kanpur",
      aictePermanentId: "1-3000000002",
      state: "Uttar Pradesh",
      district: "Kanpur",
    },
    region: {
      id: SEEDED_REGIONS.NRO.id,
      code: "NRO",
      name: "Northern Region",
    },
  },
  ...Array.from({ length: 50 }, (_, idx): SeededApplication => {
    const num = idx + 1;
    const isEvcPipeline = num % 2 === 0;
    const isWro = num % 3 !== 0;
    const region = isWro ? SEEDED_REGIONS.WRO : SEEDED_REGIONS.NRO;
    const instId = isWro
      ? "33333333-3333-4333-8333-333333333301"
      : "33333333-3333-4333-8333-333333333303";
    return {
      id: `44444444-4444-4444-8444-444444444${(500 + num).toString().padStart(3, "0")}`,
      institutionId: instId,
      regionId: region.id,
      applicationTypeId: isEvcPipeline
        ? "55555555-5555-4555-8555-555555555501"
        : "55555555-5555-4555-8555-555555555502",
      academicYear: "2026-27",
      stage: "DRAFT",
      status: "DRAFT",
      pipelineDefinitionId: isEvcPipeline
        ? "66666666-6666-4666-8666-666666666602"
        : "66666666-6666-4666-8666-666666666601",
      version: 1,
      deletedAt: null,
      institution: {
        id: instId,
        name: isWro
          ? `Walchand College of Engineering, Sangli (Proposal #${num})`
          : `Harcourt Butler Technical University, Kanpur (Proposal #${num})`,
        aictePermanentId: `1-${(2000000100 + num).toString()}`,
        state: isWro ? "Maharashtra" : "Uttar Pradesh",
        district: isWro ? "Sangli" : "Kanpur",
      },
      region: {
        id: region.id,
        code: region.code,
        name: region.name,
      },
    };
  }),
];
