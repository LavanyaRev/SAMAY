import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

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
    const rlsSqlPath = join(__dirname, '..', 'prisma', 'migrations', '00_init_rls.sql');
    const sql = readFileSync(rlsSqlPath, 'utf8');

    // Execute statements sequentially
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
        )`,
    ];

    void sql;
    for (const stmt of statements) {
      await prisma.$executeRawUnsafe(stmt);
    }
    console.log('--- Prisma Schema & PostgreSQL RLS Policies Applied Successfully ---');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  applySchemaAndRls().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

