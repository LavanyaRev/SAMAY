# AGENTS.md - SAMAY Engineering & Regulatory Rules

This document defines the architectural laws, regulatory mandates, coding standards, and operational guidelines for **SAMAY (Smart AICTE Monitoring & Approval Yojana)**. All engineering agents and human contributors must strictly comply with these rules.

---

## 1. Product Summary

SAMAY is a unified regulatory platform designed for the All India Council for Technical Education (AICTE). It automates and monitors the end-to-end institutional approval and compliance lifecycle, including:

- **Approval Workflows**: Automated routing through statutory evaluation stages: **Scrutiny**, **EVC (Expert Visit Committee)**, and **SAC/SHC (Standing Appeal Committee / Standing Hearing Committee)**.
- **Pendency Monitoring**: Real-time tracking of institutional applications across regional offices, committees, and approval bureaus.
- **EVC Scheduling**: Intelligent, conflict-free scheduling and allocation of expert inspection panels.
- **Time-bound Undertakings**: Automated lifecycle management for deficiencies rectified under conditional approvals and affidavits.
- **Validity Tracking**: Continuous monitoring of statutory lease deeds, land ownership titles, FDRs, encumbrance certificates, and institutional affiliations.
- **Automated Escalation**: Proactive alerts and tiered escalations for overdue reviews, inspection delays, and impending document expirations.

---

## 2. Regulatory Safeguard

> **MANDATE**: The system supports but **NEVER** replaces statutory scrutiny, verification, inspections, or decisions of the competent authority.

1. **Advisory Tagging**: Every automated recommendation, compliance score, AI extraction, and checklist pre-fill must be explicitly tagged and displayed as **`ADVISORY`**.
2. **Human Supremacy**: Final decisions (approval, rejection, issuance of Letter of Approval / Extension of Approval, penalty imposition, or show-cause notice) are **always human actions performed by an authorised role** with verified digital signatures / credentials.
3. **No Autonomous Approvals**: Under no circumstance shall any automated worker, background job, or algorithmic rule autonomously transition an application into an approved state without affirmative human sign-off.
4. **Transparent Rationale**: Any automated recommendation must preserve full explainability, citing the exact rule evaluated and underlying applicant data.

---

## 3. Architecture Rules

1. **Workflow Definitions as DATA**:
   - Workflow stages, transitions, required roles, and condition gates must be stored and processed as **versioned DATA (JSON schemas validated by Zod)**, never hardcoded in procedural logic.
   - Version bumps in workflow schemas must maintain backwards compatibility for active cycles.
2. **Atomic State Changes & Audit Ledger**:
   - Every state transition must execute exclusively through the dedicated `WorkflowService`.
   - The state transition and an immutable audit entry must be written in the **exact same database transaction**. If the audit write fails, the state transition rolls back.
3. **Injectable Clock Service (Zero System Date Calls)**:
   - All time, timestamps, timeouts, and deadline calculations must come strictly from an injectable `ClockService` (`IClockService`).
   - Direct calls to `new Date()` or `Date.now()` outside the clock infrastructure are strictly forbidden and enforced by AST-based ESLint rules.
   - This enables deterministic simulation of compliance deadlines, leap years, and temporal audits during testing.
4. **Transactional Outbox Pattern**:
   - All asynchronous communications (emails, SMS, web push notifications, bureau alerts) must be written to an Outbox table within the mutation's database transaction.
   - A dedicated, resilient outbox processor dispatches messages to messaging providers.
5. **Strict Job Idempotency**:
   - All scheduled cron jobs, queue workers, and event handlers must be strictly idempotent.
   - Every job must check execution idempotency keys to ensure duplicate triggers cause no repeated side effects.

---

## 4. Regulatory Content Rule

> **RULE**: Never invent Approval Process Handbook (APH) clause numbers, statutory timelines, penalty percentages, or stage names.

- When drafting regulatory logic, schemas, or configurations without a verified official reference, engineers must use clearly marked placeholder configurations accompanied by the standardized comment:
  ```typescript
  // TODO(APH-VERIFY): Verify exact clause reference, timeline, and fee schedule against AICTE Approval Process Handbook (APH 2024-27).
  ```
- All such markers will be tracked and audited before each deployment milestone.

---

## 5. Conventions

1. **Conventional Commits**:
   - Follow standard prefixes: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `perf:`, `ci:`.
2. **Small, Atomic Pull Requests**:
   - PRs must remain focused on a single responsibility with minimal surface area for rapid peer and regulatory review.
3. **Boundary Validation with Zod**:
   - Every HTTP endpoint, webhook, and inter-service contract must validate inputs and outputs using Zod schemas from `@samay/shared`.
4. **Code-First OpenAPI Documentation**:
   - OpenAPI/Swagger specs must be generated automatically from code decorators and schemas. No manually drifted YAML/JSON specs.
5. **Zero Secrets in Repository**:
   - Secrets, private keys, API credentials, and database passwords must never be committed. Pre-commit hooks and CI prevent secret leaks. Use `.env.example` templates.
6. **Bilingual & i18n-Ready UI**:
   - All user-facing strings must be internationalized with ready support for **English** and **Hindi (हिन्दी)**.
7. **WCAG 2.1 AA Accessibility**:
   - All UI components must meet WCAG 2.1 AA accessibility guidelines, supporting keyboard navigation, high-contrast modes, and screen readers.

---

## 6. Testing Rules

1. **Domain Logic Unit Tests**:
   - Pure domain business logic, workflow rule evaluations, scoring algorithms, and deadline calculators must have thorough unit test coverage using deterministic fake clocks.
2. **Integration Tests via Testcontainers**:
   - All database repositories, outbox workers, and multi-service flows must run against real PostgreSQL and Redis instances hosted in ephemeral Testcontainers. Mocks of SQL engines are prohibited.
3. **Phase-Level End-to-End Tests**:
   - The test suite must include at least one complete end-to-end integration scenario per major regulatory phase:
     - **Phase 1**: Application Submission & Scrutiny Committee Verification.
     - **Phase 2**: EVC Panel Scheduling, Inspection Report Submission, and Advisory Generation.
     - **Phase 3**: SAC/SHC Hearing, Deficiencies Rectification, and Competent Authority Decision.
