# SAMAY — Smart AICTE Monitoring & Approval Yojana

**SAMAY** (_Smart AICTE Monitoring & Approval Yojana_) is a unified statutory regulatory platform designed for the **All India Council for Technical Education (AICTE)**. It orchestrates and monitors the end-to-end institutional approval, scrutiny, Expert Visit Committee (EVC), undertaking, and document compliance lifecycle under the Approval Process Handbook (APH 2024-27).

---

## Monorepo Architecture

- [`apps/api`](./apps/api): NestJS modular monolith API with code-first OpenAPI/Swagger documentation, PostgreSQL Row-Level Security (RLS), SHA-256 hash-chained append-only audit ledger, injectable `SystemClockService`, transactional outbox notifications, EVC conflict-of-interest engine, and analytics views.
- [`apps/web`](./apps/web): Next.js 15 statutory portal with WCAG 2.1 AA contrast-verified design tokens, bilingual English & Hindi (`हिन्दी`) translations, ECharts drill-down dashboards, Time-Travel Console, Audit Tamper Demo, Compliance Health Score (`ADVISORY`), and Rule-Change Impact Simulator.
- [`packages/shared`](./packages/shared): `@samay/shared` Zod boundary schemas, workflow pipeline DSL (`ONLY_SCRUTINY`, `SCRUTINY_EVC`), and statutory role definitions.
- [`packages/database`](./packages/database): `@samay/database` Prisma schema, PostgreSQL RLS policies (`samay_app`), analytics SQL views/materialized views, and deterministic seeder.

---

## Core Commands

```bash
pnpm install
pnpm run lint
pnpm run typecheck
pnpm run test
```
