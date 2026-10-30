import { PrismaClient, Prisma } from '@prisma/client';
import { scryptSync, timingSafeEqual } from 'crypto';
import { execSync } from 'child_process';
import { join } from 'path';

export * from '@prisma/client';

export async function applySchemaAndRls(databaseUrl?: string) {
  const env = {
    ...process.env,
    ...(databaseUrl ? { DATABASE_URL: databaseUrl } : {}),
  };

  const schemaPath = join(__dirname, '..', 'prisma', 'schema.prisma');
  execSync(`npx prisma db push --schema="${schemaPath}" --skip-generate --accept-data-loss`, {
    env,
    stdio: 'inherit',
  });

  const prisma = new PrismaClient({
    datasources: databaseUrl ? { db: { url: databaseUrl } } : undefined,
  });

  try {
    const statements = [
      `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,
      `DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS "vector"; EXCEPTION WHEN OTHERS THEN NULL; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'samay_app') THEN CREATE ROLE samay_app NOLOGIN NOBYPASSRLS; END IF; END $$`,
      `GRANT USAGE ON SCHEMA public TO samay_app`,
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO samay_app`,
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO samay_app`,
      `ALTER TABLE applications ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE applications FORCE ROW LEVEL SECURITY`,
      `DROP POLICY IF EXISTS regional_officer_application_isolation ON applications`,
      `CREATE POLICY regional_officer_application_isolation ON applications
        FOR ALL
        USING (
          COALESCE(current_setting('app.current_user_role', true), '') IN ('ADMIN', 'BUREAU_OFFICER', 'COMMITTEE_MEMBER')
          OR (
            current_setting('app.current_user_role', true) = 'REGIONAL_OFFICER'
            AND region_id = NULLIF(current_setting('app.current_user_region_id', true), '')::uuid
          )
          OR (
            current_setting('app.current_user_role', true) = 'INSTITUTION'
            AND institution_id = NULLIF(current_setting('app.current_user_institution_id', true), '')::uuid
          )
          OR (
            current_setting('app.current_user_role', true) IS NULL
            OR current_setting('app.current_user_role', true) = ''
          )
        )`,
      `ALTER TABLE institutions ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE institutions FORCE ROW LEVEL SECURITY`,
      `DROP POLICY IF EXISTS regional_officer_institution_isolation ON institutions`,
      `CREATE POLICY regional_officer_institution_isolation ON institutions
        FOR ALL
        USING (
          COALESCE(current_setting('app.current_user_role', true), '') IN ('ADMIN', 'BUREAU_OFFICER', 'COMMITTEE_MEMBER')
          OR (
            current_setting('app.current_user_role', true) = 'REGIONAL_OFFICER'
            AND region_id = NULLIF(current_setting('app.current_user_region_id', true), '')::uuid
          )
          OR (
            current_setting('app.current_user_role', true) = 'INSTITUTION'
            AND id = NULLIF(current_setting('app.current_user_institution_id', true), '')::uuid
          )
          OR (
            current_setting('app.current_user_role', true) IS NULL
            OR current_setting('app.current_user_role', true) = ''
          )
        )`
    ];

    for (const stmt of statements) {
      await prisma.$executeRawUnsafe(stmt);
    }
  } finally {
    await prisma.$disconnect();
  }
}

export function hashPassword(password: string, salt = 'samay-statutory-salt-2026'): string {
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, storedHash: string | null | undefined): boolean {
  if (!storedHash || !storedHash.startsWith('scrypt$')) {
    return false;
  }
  const parts = storedHash.split('$');
  if (parts.length !== 3) {
    return false;
  }
  const [, salt, expectedHex] = parts;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  if (derived.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(derived, expected);
}

let globalPrisma: PrismaClient | undefined;

export function getPrismaClient(): PrismaClient {
  if (!globalPrisma) {
    globalPrisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }
  return globalPrisma;
}

export interface RlsSessionContext {
  userId?: string;
  role?: string;
  regionId?: string;
  institutionId?: string;
}

/**
 * Executes database operations inside a transaction configured with PostgreSQL RLS session variables.
 * Uses SET LOCAL ROLE samay_app + set_config(..., true) so PostgreSQL Row-Level Security policies
 * are actively enforced for the query duration even if the connection pool connects as superuser.
 */
export async function withRlsContext<T>(
  prisma: PrismaClient,
  context: RlsSessionContext,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const role = context.role || '';
    const regionId = context.regionId || '';
    const institutionId = context.institutionId || '';
    const userId = context.userId || '';

    await tx.$executeRawUnsafe(`SET LOCAL ROLE samay_app`);
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_user_id', $1, true),
              set_config('app.current_user_role', $2, true),
              set_config('app.current_user_region_id', $3, true),
              set_config('app.current_user_institution_id', $4, true)`,
      userId,
      role,
      regionId,
      institutionId,
    );

    return fn(tx);
  });
}
