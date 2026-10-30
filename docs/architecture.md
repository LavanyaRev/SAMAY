# SAMAY Architecture Specification

## 1. System Overview

**SAMAY (Smart AICTE Monitoring & Approval Yojana)** is built as a high-assurance modular monolith across `@samay/api`, `@samay/web`, `@samay/shared`, and `@samay/database`.

## 2. Architectural Laws

1. **Workflow Definitions as Versioned Data**:
   - Pipelines (`ONLY_SCRUTINY`, `SCRUTINY_EVC`) and escalation policies are validated by Zod schemas in `@samay/shared` and stored as immutable versioned JSON definitions.
2. **Atomic State Transitions & SHA-256 Audit Ledger**:
   - Every transition in `WorkflowService` writes both the state change and a canonical SHA-256 hash-chained `audit_log` row in the same database transaction.
3. **Injectable Clock (`IClockService`)**:
   - Direct calls to `new Date()` or `Date.now()` are banned by AST-based ESLint rules outside `SystemClockService`, enabling deterministic SLA sweeps and the Admin Time-Travel Console.
4. **Transactional Outbox & Multi-Channel Delivery**:
   - Deadline warnings and L0/L1/L2/L3 escalations are persisted in `outbox_events` and dispatched idempotently across SSE (`IN_APP`), SMTP (`Mailpit`), and SMS (`MockSmsGatewayAdapter`).
5. **PostgreSQL Row-Level Security (RLS)**:
   - Regional Officers and Institutions are isolated at the database layer via `SET LOCAL ROLE samay_app` and `app.current_user_*` session settings.
