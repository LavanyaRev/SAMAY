# SAMAY — Smart AICTE Monitoring & Approval Yojana

<div align="center">

![SAMAY AICTE Banner](https://img.shields.io/badge/AICTE-APH%202024--2027-EC642A?style=for-the-badge&logo=gov.in&logoColor=white)
![Regulatory Status](https://img.shields.io/badge/Regulatory%20Safeguard-HUMAN%20SUPREMACY-2E7D32?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Next.js 15](<https://img.shields.io/badge/Next.js-15.0%20(App%20Router)-000000?style=for-the-badge&logo=next.js&logoColor=white>)
![NestJS](https://img.shields.io/badge/NestJS-10.x-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20%2B%20pgvector-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Design System](https://img.shields.io/badge/Design%20System-Sunflower%20%26%20Cream-FAAA21?style=for-the-badge)

<br/>

**A Unified Digital Platform for AICTE Approval Workflow Automation, Regulatory Compliance & Institutional Monitoring**

_Automate the process. Assist the authority. Preserve human accountability._

</div>

---

## 📑 Table of Contents

- [1. Overview](#1-overview)
- [2. Problem Statement](#2-problem-statement)
- [3. Our Solution](#3-our-solution)
- [4. Objectives](#4-objectives)
- [5. Key Features](#5-key-features)
- [6. System Architecture](#6-system-architecture)
- [7. Technology Stack](#7-technology-stack)
- [8. User Roles and Portals](#8-user-roles-and-portals)
- [9. Application Workflow & Statutory Routes](#9-application-workflow--statutory-routes)
- [10. Core System Modules](#10-core-system-modules)
- [11. APH Clause Intelligence Engine](#11-aph-clause-intelligence-engine)
- [12. Deficiency and Re-Scrutiny Management](#12-deficiency-and-re-scrutiny-management)
- [13. Deadline Management and Escalation](#13-deadline-management-and-escalation)
- [14. Security Mechanisms & Regulatory Safeguards](#14-security-mechanisms--regulatory-safeguards)
- [15. Database and Data Management](#15-database-and-data-management)
- [16. User Interface and Design System](#16-user-interface-and-design-system)
- [17. Project Structure](#17-project-structure)
- [18. Getting Started](#18-getting-started)
- [19. Environment Configuration](#19-environment-configuration)
- [20. Running the Application](#20-running-the-application)
- [21. Testing and Verification](#21-testing-and-verification)
- [22. End-to-End Demonstration Guide](#22-end-to-end-demonstration-guide)
- [23. Limitations and Transparency](#23-limitations-and-transparency)
- [24. Future Enhancements](#24-future-enhancements)
- [25. Impact and Expected Outcomes](#25-impact-and-expected-outcomes)
- [26. Contributing](#26-contributing)
- [27. Disclaimer](#27-disclaimer)

---

## 1. Overview

**SAMAY** (_Smart AICTE Monitoring & Approval Yojana_) is a centralized digital platform designed to streamline, automate, and monitor the institutional approval and regulatory compliance lifecycle governed by the **All India Council for Technical Education (AICTE)**.

Governing thousands of technical institutions, polytechnics, engineering colleges, and management institutes across India, SAMAY addresses operational challenges associated with fragmented approval stages, manual document verification, pendency bottlenecks, delayed scrutiny, deficiency resolution, inspection scheduling, statutory deadlines, and post-approval compliance monitoring.

SAMAY integrates these processes through a unified, role-based application management architecture, combining:

- **Configurable approval workflow automation** (Routes 1–5 derived from APH 2024–2027).
- **APH-based document and clause intelligence** (RAG chunking and semantic clause matching).
- **Structured 8-point deficiency identification and re-scrutiny**.
- **Expert Visit Committee (EVC)** conflict-screened scheduling and report submission.
- **Time-bound undertaking lifecycle management** with conditional approvals.
- **Statutory document validity monitoring** (Validity Radar).
- **Deadline tracking and multi-tier escalation** with injectable deterministic clocks.
- **Centralized regulatory policy management** (`statutory_policies`).
- **Sequential SHA-256 hash-chained audit ledger with integrity verification**.
- **Role-specific portals** (Institution, Regional Officer, Committee Expert, Bureau HQ, System Admin).

> **Core Foundational Principle**:  
> _Automate the process. Assist the authority. Preserve human accountability._  
> SAMAY empowers regulatory officers and institutional stakeholders with explainable intelligence, but it **never replaces statutory authorities or autonomously grants legal approvals**.

---

## 2. Problem Statement

Institutional approval and compliance management involves multiple statutory stakeholders, diverse regulatory criteria, hundreds of pages of legal documentation, on-site inspections, and time-bound commitments across regional offices:

### 2.1 Fragmented Approval Workflows

Different application categories (Extension of Approval, New Institutions, Course Variations, Supernumerary Seats, Institutional Closures) mandate distinct evaluation stages, committee benches, and scrutiny depths. Disconnected legacy systems prevent a single source of truth for an application's lifecycle.

### 2.2 Manual Document Verification

Institutions submit voluminous regulatory proof:

- Land ownership titles and registered lease deeds _(subject to verification against applicable official APH tenure requirements)_.
- Fire safety NOCs adhering to National Building Code (NBC Part 4).
- Structural stability and municipal building completion certificates.
- Faculty cadre ratios, pay-scale affidavits, and roster declarations.
- University affiliation orders and state government NOCs.
- Financial instruments (FDRs, bank guarantees, and encumbrance certificates).

Manually identifying applicable APH clauses and checking completeness creates severe operational backlogs.

### 2.3 Application Pendency & Opaque Ownership

Applications frequently stagnate between regional desks without clear accountability regarding:

- Who currently holds the dossier (_Ball with Institutional vs. Regional Officer vs. Committee_).
- Active queue and workflow stage.
- Elapsed working days against statutory SLA targets.
- Reason for delay or missing documentation.

### 2.4 Deficiency Management Challenges

Deficiency letters often lack structured clarity. Multiple informal communication loops occur via email or paper letters, making it difficult to maintain a verifiable audit trail of defect issuance, cure deadlines, replacement evidence uploads, and subsequent re-scrutiny outcomes.

### 2.5 Inspection Panel Coordination

Expert Visit Committees (EVC) must be scheduled while evaluating potential conflicts of interest (such as institutional affiliations, geographic proximity, or consultancy engagements).

### 2.6 Post-Approval Compliance Blind Spots

Issuance of an approval order (Letter of Approval or Extension of Approval) does not conclude compliance. Conditional approvals hinge on time-bound affidavits and expiring documents that require continuous tracking.

---

## 3. Our Solution

SAMAY unifies institutions, regional officers, inspection experts, bureau authorities, and system administrators on a single reactive state-machine substrate.

```mermaid
flowchart LR
    A["1. Institution Submits Dossier"] --> B["2. APH Clause Intelligence Analyzes Proof"]
    B --> C["3. Regional Scrutiny Triage"]
    C -->|"Deficiency"| D["4. 8-Point Defect Memo Issued"]
    D -->|"Resolve & Resubmit"| C
    C -->|"Physical Check"| E["5. EVC Inspection Panel"]
    E --> F["6. Structured Advisory Report Filed"]
    F --> G["7. Bureau Competent Authority Decision"]
    G --> H["8. Post-Approval Validity Radar & Undertakings"]

    classDef proc fill:#FFF9F5,stroke:#EC642A,stroke-width:1.5px;
    classDef dec fill:#E8F5E9,stroke:#2E7D32,stroke-width:1.5px;
    class A,B,C,D,E,F,H proc;
    class G dec;
```

---

## 4. Objectives

1. **Workflow Standardization**: Enforce versioned, DSL-driven approval workflows for all canonical APH application categories.
2. **Regulatory Traceability**: Link every compliance observation directly to official Approval Process Handbook (APH 2024–2027) chapters and clauses.
3. **Reduced Scrutiny Overhead**: Assist officers through automated document classification, structural completeness checks, and clause pre-mapping.
4. **Institutional Transparency**: Provide applicant colleges with real-time tracking of their application's queue position, current custodian, and active deadlines.
5. **Proactive Pendency Elimination**: Calculate working-day SLAs, pause clocks during institutional cure periods, and route escalation notifications for overdue tasks.
6. **Coordinated Inspections**: Support EVC panel allocation with conflict screening and structured inspection report capture.
7. **Continuous Post-Approval Monitoring**: Track affidavit commitments, lease expirations, and FDR renewals through an active Validity Radar.
8. **Auditability**: Provide verifiable audit history and tamper detection using client-side SHA-256 document fingerprinting, transactional outboxes, and sequential hash-chained audit ledgers.

---

## 5. Key Features

| Feature                                 | Statutory Scope & Technical Capability                                                                                             |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Dynamic APH Workflow Engine**         | Declarative JSON/Zod workflow DSL orchestrating Routes 1–5 based on institutional category and statutory criteria.                 |
| **APH Clause Intelligence (RAG)**       | In-memory semantic vector chunking and clause retrieval linking affidavits directly to governing APH articles.                     |
| **Live Regional Scrutiny Queue**        | Real-time triage queue with affirmative 3-part OR filtering (`SUBMITTED`, `DEFICIENCY_RESOLVED_RESUBMITTED`, `REGIONAL_SCRUTINY`). |
| **8-Point Deficiency Protocol**         | Standardized defect logging with configurable cure deadlines, broadcasting alerts to applicant portals.                            |
| **Re-Scrutiny Lifecycle**               | Multi-cycle audit trail preserving repeated observations, replacement evidence hashes, and officer verification outcomes.          |
| **EVC Management & Panel Queue**        | Conflict screening, panel deployment, and on-site inspection report submission.                                                    |
| **Appellate Workflows (SAC / SHC)**     | Tiered hearing mechanisms for Standing Appeal Committee (SAC) and Standing Hearing Committee (SHC).                                |
| **TER Payment Engine**                  | Technical Education Regulatory fee calculation, multi-mode transaction tracking (UPI, NEFT/RTGS), and receipt verification.        |
| **Time-Bound Undertakings**             | Post-approval compliance tracking for conditional approvals, affidavits, and infrastructure commitments.                           |
| **Statutory Validity Radar**            | Expiration monitoring for statutory land deeds, building certificates, fire NOCs, and FDRs.                                        |
| **Deterministic Deadline Engine**       | Working-day SLA calculation supporting Indian Standard Time, national holidays, and clock suspension.                              |
| **Multi-Tier Escalation Ladder**        | Configurable escalation (L0 ➔ L1 Regional ➔ L2 Bureau ➔ L3 Council) for overdue compliance milestones.                             |
| **Sequential SHA-256 Audit Ledger**     | Sequentially linked audit records enabling integrity verification and tamper detection.                                            |
| **Time-Travel Simulation Console**      | Deterministic `SystemClockService` manipulation to simulate temporal audits, leap years, and SLA escalations.                      |
| **Bilingual Interface & Accessibility** | Full English and Hindi (`हिन्दी`) localization designed with WCAG 2.1 AA accessibility considerations.                             |

---

## 6. System Architecture

SAMAY follows a clean, decoupled modular monorepo architecture:

```mermaid
flowchart TB
    U["Stakeholders: Institutions • Regional Officers • Experts • Bureau HQ • Admins"]

    subgraph FRONTEND["Frontend Web Portal (Next.js 15 + React 19)"]
        IP["Institution Portal (/institution)"]
        RO["Regional Officer Portal (/regional)"]
        CP["Committee Member Portal (/committee)"]
        BP["Bureau Officer Portal (/bureau)"]
        AP["System Admin Portal (/admin)"]
    end

    subgraph BACKEND["Backend Modular API (NestJS 10)"]
        AUTH["Authentication & RBAC Guard"]
        APP_SVC["Application State Machine Service"]
        WF_ENG["APH Workflow DSL Engine"]
        RAG_SVC["APH Clause Intelligence (RAG)"]
        DEF_SVC["Deficiency & Re-Scrutiny Service"]
        EVC_SVC["EVC Scheduling & Panel Allocation"]
        DEAD_SVC["Deterministic Deadline & SLA Engine"]
        AUD_SVC["Hash-Chained Audit Ledger Service"]
        DASH_SVC["Regional & National Analytics Service"]
    end

    subgraph PERSISTENCE["Data & Infrastructure"]
        DB[("PostgreSQL 16 + pgvector")]
        REDIS[("Redis 7 (Jobs & Cache)")]
        OUTBOX[("Transactional Outbox")]
        S3[("MinIO Document Storage")]
    end

    U --> FRONTEND
    FRONTEND -->|"REST / JSON APIs"| BACKEND

    AUTH --> APP_SVC
    APP_SVC --> WF_ENG
    APP_SVC --> RAG_SVC
    WF_ENG --> DEF_SVC
    WF_ENG --> EVC_SVC
    WF_ENG --> DEAD_SVC
    APP_SVC --> AUD_SVC

    APP_SVC --> DB
    WF_ENG --> DB
    DEAD_SVC --> REDIS
    APP_SVC --> OUTBOX
    RAG_SVC --> S3
    DASH_SVC --> DB
```

### Architectural Principles

1. **Workflow Definitions as DATA**: Stages, gates, roles, and transitions are versioned JSON/Zod schemas (`PipelineDsl`), never hardcoded in procedural logic.
2. **Atomic State Changes & Audit Ledger**: Every state transition and its SHA-256 audit entry execute within the **exact same database transaction**.
3. **Injectable Clock Service (Zero System Date Calls)**: All timestamps, SLAs, and countdowns derive exclusively from `SystemClockService` (`IClockService`). Direct calls to `new Date()` or `Date.now()` outside the clock infrastructure are banned by AST ESLint rules.
4. **Transactional Outbox Pattern**: Asynchronous communications (emails, SMS, alerts) are committed to an Outbox table within the mutation's transaction and dispatched by idempotent workers.
5. **Strict Job Idempotency**: Scheduled crons, queue processors, and webhooks enforce idempotency keys to eliminate duplicate triggers.

---

## 7. Technology Stack

| Layer                       | Component                       | Version       | Purpose & Rationale                                                                     |
| --------------------------- | ------------------------------- | ------------- | --------------------------------------------------------------------------------------- |
| **Frontend Framework**      | Next.js (App Router)            | `15.0.0`      | React 19, Server Components, streaming SSR, and optimized client bundles                |
| **Language**                | TypeScript                      | `5.7.0`       | Strict end-to-end type safety across apps and shared packages                           |
| **Styling & Design System** | Tailwind CSS & Tokens           | `3.4.1`       | Custom Sunflower & Cream tokens, designed with WCAG 2.1 AA accessibility considerations |
| **Icons & Visuals**         | Lucide Icons & ECharts          | `0.454 / 5.5` | Crisp regulatory iconography and drill-down analytics visualizations                    |
| **Data Fetching & State**   | TanStack Query & Reactive Store | `5.59.0`      | Real-time cross-tab synchronization and mutation caching                                |
| **Backend Framework**       | NestJS                          | `10.4.0`      | Modular monolith with dependency injection and OpenAPI/Swagger generators               |
| **Database & ORM**          | PostgreSQL + Prisma             | `16.0 / 5.22` | pgvector vector extensions, Row-Level Security (RLS), ACID transactions                 |
| **Cache & Queue**           | Redis                           | `7.0`         | Resilient task queues, cache layers, and pub/sub notification dispatch                  |
| **Contract Validation**     | Zod                             | `3.23.8`      | Single-source boundary validation shared between client and server                      |
| **Testing Engine**          | Jest & Supertest                | `29.7.0`      | Unit domain tests, fake clock simulations, and state-machine integration                |
| **Monorepo Tooling**        | pnpm & Turborepo                | `9.12 / 2.2`  | Workspace dependency isolation, caching, and atomic task execution                      |

---

## 8. User Roles and Portals

SAMAY provides 5 tailored portals with distinct statutory authorizations:

### 8.1 Institution Portal (`/institution`)

- **Target Role**: College Principals, Trust Representatives, Authorized Institutional Signatories.
- **Key Modules**:
  - `/institution/workspace`: Central institutional overview, compliance score, application milestones.
  - `/institution/applications`: Application submission, fee acknowledgment, draft recovery.
  - `/institution/undertakings`: Deficiency cure desk, replacement evidence upload, affidavit tracking.
  - `/institution/validity`: Institutional Validity Radar tracking lease, land title, and fire NOC expiration countdowns.

### 8.2 Regional Officer Portal (`/regional`)

- **Target Role**: AICTE Regional Officers responsible for scrutiny, verification, and application processing.
- **Key Modules**:
  - `/regional/scrutiny`: Live triage queue with 3-tier actions (_Accept & Clear Scrutiny_, _Mark 8-Point Deficiency_, _Forward to Committee_).
  - `/regional/evc`: Expert Visit Committee inspection coordination and conflict screening.
  - `/regional/pendency`: Regional SLA breach monitoring and ageing analysis.
  - `/regional/scn`: Show Cause Notice desk and compliance tracking.

### 8.3 Committee Member Portal (`/committee`)

- **Target Role**: External Experts, EVC Panel Members, Appellate/Hearing Members.
- **Key Modules**:
  - `/committee/panel-queue`: Assigned inspection cases and conflict-free verification acknowledgments.
  - `/committee/evc-visits`: Inspection checklist (infrastructure, built-up area, faculty, fire safety) and report submission.
  - `/committee/sac`: Standing Appeal Committee appellate review.
  - `/committee/shc`: Standing Hearing Committee hearing dossiers.

### 8.4 Bureau Officer Portal (`/bureau`)

- **Target Role**: AICTE Approval Bureau Officers, Member Secretary, Competent Authority.
- **Key Modules**:
  - `/bureau/hq`: Pan-India application control center and Executive Final Approval Desk.
  - `/bureau/policy-matrix`: Centralized APH rule configuration and statutory policy editing.
  - `/bureau/escalations`: Multi-tier escalation registry for overdue regional reviews.
  - `/bureau/scn`: National Show Cause Notice adjudication support.

### 8.5 System Administrator Portal (`/admin`)

- **Target Role**: Compliance Auditors, DevOps Engineers, System Administrators.
- **Key Modules**:
  - `/admin/governance`: System services health, RLS policy enforcement, Redis queue metrics.
  - `/admin/audit-tamper`: SHA-256 hash-chain inspection and deliberate tamper simulation engine.
  - `/admin/time-travel`: Deterministic clock offset console for leap-year, SLA, and calendar rollover testing.

---

## 9. Application Workflow & Statutory Routes

SAMAY uses a configurable workflow engine to govern application progression according to institutional category:

### 9.1 Statutory Processing Routes

| Route       | Application Category                                     | Processing Path                                                         |
| ----------- | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Route 1** | Extension of Approval (EoA) / applicable self-disclosure | Application submission → documentary scrutiny → applicable processing   |
| **Route 2** | New Institution                                          | Application → scrutiny → applicable EVC inspection → authority decision |
| **Route 3** | Course Variation / Intake Change                         | Application → category-specific scrutiny → applicable decision          |
| **Route 4** | Supernumerary Seats                                      | Application → eligibility verification → applicable decision            |
| **Route 5** | Institution Closure                                      | Application → regulatory verification → applicable decision             |

### 9.2 Lifecycle State Transitions

```mermaid
flowchart TD
    START(["Institution Files Application"]) --> R{Resolve APH Route}

    R -->|Route 1: EoA| R1["Only Scrutiny Evaluation"]
    R -->|Route 2: New Inst| R2["Scrutiny + EVC Inspection"]
    R -->|Route 3: Intake Change| R3["Category Scrutiny"]
    R -->|Route 4: Supernumerary| R4["Eligibility Scrutiny"]
    R -->|Route 5: Closure| R5["Regulatory Verification"]

    R1 --> ST1["Regional Scrutiny Desk"]
    R2 --> ST1
    R3 --> ST1
    R4 --> ST1
    R5 --> ST1

    ST1 --> DEF{"Deficiency Flagged?"}
    DEF -->|Yes| DEF_MEMO["Issue 8-Point Deficiency Memo"]
    DEF_MEMO --> DEF_FIX["Institution Uploads Corrected Proof"]
    DEF_FIX --> RESCRUTINY["Officer Re-Scrutiny"]
    RESCRUTINY --> DEF

    DEF -->|No| FORWARD{"Requires EVC?"}
    FORWARD -->|Yes| EVC1["EVC Panel Inspection"]
    FORWARD -->|No| EXEC["Executive Committee Final Review"]

    EVC1 --> EVC_REP["Submit Structured Inspection Dossier"]
    EVC_REP --> EXEC

    EXEC --> DECISION{"Competent Authority Sign-Off"}
    DECISION -->|Approved| APP_ORDER["Issue Extension of Approval (EoA) / LoA"]
    DECISION -->|Rejected| REJ_ORDER["Issue Rejection Decree / SCN"]

    APP_ORDER --> RADAR["Continuous Compliance & Validity Radar"]
```

---

## 10. Core System Modules

### 10.1 Application Management Engine

Maintains institutional application creation, validation against schema rules, unique reference assignment (e.g. `EOA-2027-1042`), stage tracking, and persistent data storage.

### 10.2 Configurable APH Workflow Engine (`AphWorkflowEngine`)

Determines valid state transitions for active cycles, guarantees that old cycles remain backwards-compatible, and enforces role-based action permissions.

### 10.3 Centralized Statutory Policy Engine (`statutory_policies`)

Versioned repository centralizing processing timelines, cure periods, fee schedules, inspection requirements, and escalation thresholds. Parameters cite governing APH editions, chapters, and clauses.

> _Note: Quantitative parameters such as faculty ratios and fee structures are configurable records verified against official handbook schedules._

### 10.4 Technical Education Regulatory (TER) Payment Engine

Calculates processing fees based on programme type, intake count, and statutory category. Tracks BHIM UPI, RTGS/NEFT, and Net Banking payment references.

### 10.5 Time-Bound Undertaking Engine

Monitors institutional commitments made under conditional approval:

```mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> Submitted: Evidence Uploaded
    Submitted --> UnderVerification: Officer Assigned
    UnderVerification --> Verified: Compliance Confirmed
    UnderVerification --> Rejected: Evidence Inadequate
    Rejected --> Submitted: Revised Proof Uploaded
    Pending --> Overdue: SLA Expiry
    Overdue --> Submitted: Late Resolution
    Verified --> [*]
```

### 10.6 Statutory Validity Radar

Continuously scans expiration dates on statutory land deeds, building completion certificates, fire safety NOCs, university affiliations, and financial instruments (FDRs), triggering automated alerts prior to lapse.

---

## 11. APH Clause Intelligence Engine

SAMAY's APH Clause Intelligence Assistant (`apps/api/src/rag/`) bridges uploaded documents with governing provisions of the Approval Process Handbook:

1. **Document Classification**: Identifies document types (Land Titles, Registered Leases, Fire NOCs, Structural Stability Certificates, Faculty Affidavits) from uploaded PDF metadata and text layers.
2. **Text & Entity Extraction**: Extracts structured fields including institution name, registration identifiers, executing authorities, validity ranges, and statutory declarations.
3. **APH Clause Chunking & Indexing**: Canonical handbook chapters and clauses are pre-chunked with statutory weights into an indexed vector/semantic repository (`aph-rag.data.ts`).
4. **Semantic Similarity Matching**: Uses cosine similarity and keyword-weighted embeddings (`searchAphPolicyRag`) to link extracted document text to applicable clauses:
   - _Clause 1.4.3 & 6.4_: Land ownership and lease tenure provisions.
   - _Clause 2.1 & 2.4_: Faculty cadre ratio and pay-scale adherence.
   - _Clause 2.9_: National Building Code Part 4 fire safety norms.
5. **Missing Information Identification**: Structural checks detect missing elements such as lack of authorized signatures, missing registration numbers, or expired validity periods.
6. **Bidirectional Source Linking**: Every finding links back directly to the source uploaded file (with SHA-256 digest) and citations to the specific handbook article.
7. **Human Verification & Override**: All findings are tagged as **`ADVISORY`**. Regional officers independently review the evidence and record the definitive statutory verification outcome.

---

## 12. Deficiency and Re-Scrutiny Management

Replaces unstructured communication with a standardized **8-Point Deficiency Record**:

| Field # | Standardized Attribute   | Statutory Purpose                                                           |
| ------- | ------------------------ | --------------------------------------------------------------------------- |
| **1**   | `deficiencyId`           | Unique statutory identifier (`DEF-2027-WRO-1042-01`)                        |
| **2**   | `aphClause`              | Governing APH clause reference and requirement                              |
| **3**   | `dateIdentified`         | Official date deficiency was recorded by scrutiny desk                      |
| **4**   | `responsibleInstitution` | Target college and sponsoring trust details                                 |
| **5**   | `responseDeadline`       | Configurable policy deadline based on governing guidelines                  |
| **6**   | `requiredEvidence`       | Mandatory documentary proof required for rectification                      |
| **7**   | `verificationStatus`     | Status (`PENDING_SUBMISSION`, `SUBMITTED`, `VERIFIED_ACCEPTED`, `REJECTED`) |
| **8**   | `historyTrail`           | Complete append-only audit trail of observations, uploads, and sign-offs    |

---

## 13. Deadline Management and Escalation

- **Working-Day Engine**: Accounts for Saturdays/Sundays, gazetted national holidays, and regional observances.
- **Deterministic SLA Clocks**: Clocks pause during institutional cure periods and resume upon replacement evidence submission.
- **Tiered Escalation Matrix**:
  - **Level 0 (L0)**: Direct warning to assigned officer and institutional applicant (T-3 days).
  - **Level 1 (L1)**: Alert dispatched to AICTE Regional Officer upon deadline lapse.
  - **Level 2 (L2)**: Escalation to Approval Bureau Officer at AICTE Headquarters (+5 overdue days).
  - **Level 3 (L3)**: High-priority breach docket routed to Member Secretary / Council (+10 overdue days).

---

## 14. Security Mechanisms & Regulatory Safeguards

SAMAY strictly distinguishes between security mechanisms and security guarantees:

### 14.1 Authentication & Credential Security

- **Password Hashing**: Passwords derive via cryptographic scrypt (`scryptSync` with unique cryptographic salt per user), stored as `scrypt$salt$derived`.
- **JWT Validation & Expiry**: Stateless Bearer tokens signed with HMAC-SHA256, strictly validated per request with explicit expiration times (`JWT_EXPIRES_IN`).
- **Keycloak Integration**: Architecture supports production OpenID Connect (OIDC) via Keycloak (`KEYCLOAK_URL`, `KEYCLOAK_REALM`), with a local mock provider for development isolation.

### 14.2 Authorization & Data Isolation

- **Role-Based Access Control (RBAC)**: Enforces least-privilege access across `INSTITUTION`, `REGIONAL_OFFICER`, `COMMITTEE_MEMBER`, `BUREAU_OFFICER`, and `ADMIN`.
- **PostgreSQL Row-Level Security (RLS)**: Database policies (`samay_app` user) isolate regional jurisdictions and institutional records at the SQL engine level.
- **Multi-Tenant Isolation**: Institutions can only query applications and undertakings belonging to their registered permanent ID.

### 14.3 File Upload Security & Client-Side Fingerprinting

- **Input Validation**: Uploaded documents are restricted by MIME type (`application/pdf`), maximum size (10MB/15MB), and structural integrity checks.
- **Client-Side SHA-256 Fingerprinting**: Computes a client-side SHA-256 digest before upload to verify transmission integrity and track version history.
  > **Important Distinction**: Client-side fingerprinting detects document alterations and ensures transmission integrity; it **does not independently prove the authenticity of the document itself**, which requires verified digital signatures (PKI) or issuing authority validation.

### 14.4 Concurrency & Integrity

- **Optimistic Concurrency Control**: Entity mutations check an integer `version` column; stale concurrent writes return `409 Conflict`.
- **Sequential SHA-256 Audit Ledger**: Chained hashing `SHA256(index + prevHash + actor + action + payload + timestamp)` provides verifiable audit history and detects historical record tampering.
- **Transactional Outbox & Idempotency**: Asynchronous notifications commit atomically with application mutations; background workers enforce idempotency keys to prevent duplicate dispatches.
- **Human Authority Supremacy**: Under no circumstance shall any background worker, cron job, or algorithmic rule autonomously transition an application into an approved state without affirmative human sign-off.

---

## 15. Database and Data Management

- **PostgreSQL 16**: Primary relational database with ACID guarantees.
- **pgvector**: High-dimensional vector embeddings for APH RAG clause search.
- **Prisma ORM**: Type-safe schema migrations and database access.
- **Core Entities**: Users, Regions, Institutions, Applications, StageInstances, DeficiencyRecords, EvcInspections, Undertakings, DueItems, AuditLogs, OutboxEvents.

---

## 16. User Interface and Design System

SAMAY's UI is designed with a **Sunflower & Cream** palette with WCAG 2.1 AA accessibility considerations:

| Design Token          | Hex Code  | Purpose                                              |
| --------------------- | --------- | ---------------------------------------------------- |
| **Canvas Background** | `#FAFAFA` | Soft, neutral canvas reducing eye fatigue            |
| **Surface Card**      | `#FFFFFF` | Elevated card surfaces with subtle borders           |
| **Regulatory Border** | `#E5E0D8` | Hairline statutory container separators              |
| **Terracotta Orange** | `#EC642A` | Primary action CTAs and active process highlights    |
| **Deep Cocoa**        | `#642D0A` | High-contrast statutory titles and headings          |
| **Body Typography**   | `#2A1810` | High-legibility text (contrast ratio > 7:1)          |
| **On-Track SLA**      | `#1B7340` | Success green for cleared milestones and active SLAs |
| **Due Soon SLA**      | `#8A5C04` | Amber indicator for impending deadlines              |
| **Overdue SLA**       | `#B3261E` | High-urgency red for breached statutory timelines    |

---

## 17. Project Structure

The monorepo structure accurately maps to the codebase:

```
SAMAY/
├── apps/
│   ├── api/                              # NestJS 10 Modular Backend
│   │   ├── src/
│   │   │   ├── common/                   # ClockService, Prisma RLS, Seeded Fallback
│   │   │   ├── modules/
│   │   │   │   ├── admin/                # Governance, Time-Travel, System Settings
│   │   │   │   ├── applications/         # Application State Machine & Scrutiny
│   │   │   │   ├── audit/                # Hash-Chained Audit Ledger Service
│   │   │   │   ├── auth/                 # Keycloak & JWT Authentication Guard
│   │   │   │   ├── dashboards/           # National & Regional Analytics
│   │   │   │   ├── deadlines/            # Deterministic Working-Day Deadline Engine
│   │   │   │   ├── documents/            # File Metadata & Upload Validation
│   │   │   │   ├── evc/                  # Inspection Scheduling & Panel Allocation
│   │   │   │   ├── institutions/         # Registered Institution Registry
│   │   │   │   ├── notifications/        # Transactional Outbox & Notification Dispatch
│   │   │   │   ├── reports/              # Dossier & Summary Report Generation
│   │   │   │   ├── undertakings/         # Time-Bound Undertakings Service
│   │   │   │   └── workflow/             # Dynamic APH Pipeline Engine (Routes 1–5)
│   │   │   ├── rag/                      # APH Policy RAG Engine & Chunking
│   │   │   │   ├── aph-rag.controller.ts
│   │   │   │   ├── aph-rag.service.ts
│   │   │   │   ├── aph-rag.data.ts
│   │   │   │   ├── aph-rag.types.ts
│   │   │   │   ├── aph-rag.module.ts
│   │   │   │   └── aph-rag.spec.ts
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   └── test/                         # End-to-end and RLS integration test suites
│   └── web/                              # Next.js 15 Web Portal (App Router)
│       ├── src/
│       │   ├── app/                      # Role-Based Route Trees
│       │   │   ├── admin/                # Audit-Tamper, Governance, Time-Travel
│       │   │   ├── applications/         # Application Detail & Progress Views
│       │   │   ├── bureau/               # HQ Desk, Policy Matrix, SCN, Escalations
│       │   │   ├── committee/            # Panel Queue, EVC Visits, SAC, SHC
│       │   │   ├── dashboards/           # Drill-down charts & metrics
│       │   │   ├── institution/          # Applications, Undertakings, Validity Radar, Workspace
│       │   │   ├── login/                # Role-Based Authentication
│       │   │   ├── regional/             # Scrutiny Queue, EVC Coordination, Pendency, SCN
│       │   │   └── undertakings/         # Undertaking Verification Desk
│       │   ├── components/               # Dropzones, Timelines, Cards, Shells
│       │   ├── lib/                      # Regulatory Reactive Store, Web Clock, API Client
│       │   └── styles/                   # Sunflower Design System Tokens
├── packages/
│   ├── database/                         # Prisma Database Workspace
│   │   ├── prisma/
│   │   │   ├── migrations/               # PostgreSQL RLS & Analytics View SQL
│   │   │   └── schema.prisma             # Canonical Prisma Database Schema
│   │   └── src/
│   │       ├── index.ts                  # Database Client & Helpers
│   │       ├── migrate.ts                # Migration Runner
│   │       └── seed.ts                   # Deterministic Statutory Seeder
│   └── shared/                           # Shared Domain Library (@samay/shared)
│       └── src/
│           ├── auth/                     # Role & Token Definitions
│           ├── dsl/                      # Workflow DSL & Statutory Policies Seed
│           │   ├── aph-engine.ts         # Route Evaluation Engine
│           │   ├── clause-intelligence.ts# Document Analysis Logic
│           │   ├── statutory-policies.ts # APH 2024–27 Canonical Rules
│           │   └── index.ts
│           ├── schemas/                  # Zod Boundary Schemas
│           ├── types/                    # Shared TypeScript Types & Enums
│           └── index.ts
├── infra/                                # Infrastructure Orchestration
│   ├── keycloak/                         # Realm export & OIDC config
│   ├── postgres-init/                    # pgvector & Extension initialization SQL
│   └── docker-compose.yml                # PostgreSQL 16, Redis 7, MinIO, Keycloak
├── .env.example                          # Canonical environment configuration template
├── AGENTS.md                             # Architectural laws and regulatory rules
└── README.md                             # Master documentation
```

---

## 18. Getting Started

### Prerequisites

- **Node.js**: `>= 20.10.0` (Recommended: `Node 22 LTS`)
- **pnpm**: `>= 9.0.0`
- **Docker**: (Optional, for running PostgreSQL, Redis, and MinIO)

### 1. Clone the Repository

```bash
git clone https://github.com/LavanyaRev/SAMAY.git
cd SAMAY
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

### 4. Build Shared Packages

```bash
pnpm --filter @samay/shared build
```

---

## 19. Environment Configuration

The provided [`.env.example`](file:///.env.example) contains safe defaults:

```env
# Application
NODE_ENV=development
PORT=4000
API_PREFIX=api/v1

# Database (PostgreSQL 16)
DATABASE_URL="postgresql://samay_app:samay_app_password@localhost:5432/samay_db?schema=public"
TEST_DATABASE_URL="postgresql://samay_app:samay_app_password@localhost:5432/samay_test_db?schema=public"

# Frontend Portal
NEXT_PUBLIC_API_URL="http://localhost:4000/api/v1"
API_INTERNAL_URL="http://localhost:4000"

# Authentication & Keys
JWT_SECRET=samay-regulatory-dev-secret-key-32chars-minimum-entropy
KEYCLOAK_URL="http://localhost:8080"
KEYCLOAK_REALM="samay"

# Storage & Notifications
MAILPIT_SMTP_HOST="127.0.0.1"
MAILPIT_SMTP_PORT=1025
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
```

---

## 20. Running the Application

### Option A: Local Development (With In-Memory Resilient Fallbacks)

```bash
# Starts both Backend API (Port 4000) and Web Portal (Port 3000)
pnpm run dev
```

### Option B: Full Infrastructure Mode (Docker + PostgreSQL)

```bash
# 1. Start PostgreSQL, Redis, MinIO
docker compose -f infra/docker-compose.yml up -d

# 2. Run migrations and database seeding
pnpm --filter @samay/database migrate
pnpm --filter @samay/database seed

# 3. Start development servers
pnpm run dev
```

---

## 21. Testing and Verification

```bash
# Run unit tests across all monorepo packages
pnpm run test

# Run regional scrutiny dispatch & 5-stage lifecycle state-machine tests
pnpm --filter @samay/api test -- regional-scrutiny-dispatch.spec.ts

# Run APH Policy RAG semantic retrieval tests
pnpm --filter @samay/api test -- aph-rag.spec.ts

# Run TypeScript typechecks (Zero errors)
pnpm run typecheck

# Run architectural ESLint rules (Enforcing Zero System Date Calls)
pnpm run lint
```

---

## 22. End-to-End Demonstration Guide

The recommended demonstration follows one complete application journey through its entire lifecycle:

```
Step 1: Institution creates and submits an application
        ↓
Step 2: Institution uploads supporting documents
        ↓
Step 3: APH Clause Intelligence analyzes documents and identifies potential deficiencies
        ↓
Step 4: Regional Officer opens the scrutiny docket in the live queue
        ↓
Step 5: Officer reviews AI advisory findings and records an official deficiency
        ↓
Step 6: Institution receives deficiency notification on its portal
        ↓
Step 7: Institution uploads replacement evidence
        ↓
Step 8: Regional Officer manually verifies the corrected evidence in re-scrutiny
        ↓
Step 9: Application proceeds to the applicable EVC or committee stage
        ↓
Step 10: Competent authority records the final decision (EoA or Rejection)
        ↓
Step 11: Audit ledger records the complete history with hash-chain verification
```

1. **Step 1 & 2 (Application Creation & Document Upload)**:  
   Navigate to [`/institution/applications`](http://localhost:3000/institution/applications). Select an application category, enter programme details, and upload an affidavit or land lease document. Notice the instant client-side SHA-256 fingerprint generation.
2. **Step 3 (APH Clause Intelligence Analysis)**:  
   Observe the APH Clause Intelligence assistant analyzing the uploaded document, mapping it to governing clauses (e.g., APH Clause 1.4.3), and displaying advisory structural checks and potential deficiencies.
3. **Step 4 (Regional Scrutiny Docket)**:  
   Switch to the Regional Officer portal at [`/regional/scrutiny`](http://localhost:3000/regional/scrutiny). The submitted application appears in the active triage queue (`status: 'SUBMITTED'`).
4. **Step 5 (Deficiency Recording)**:  
   Review the application dossier and click **"Mark Deficiency"**. Enter observations, select the governing APH clause, set the response deadline, and confirm. The application transitions to `SCRUTINY_DEFICIENT` and is removed from the active scrutiny queue.
5. **Step 6 & 7 (Deficiency Alert & Corrected Evidence Upload)**:  
   Switch back to [`/institution/undertakings`](http://localhost:3000/institution/undertakings). The institution sees the urgent deficiency alert. Upload the replacement evidence and click **"Resolve Defect & Resubmit"**.
6. **Step 8 (Officer Re-Scrutiny)**:  
   Return to [`/regional/scrutiny`](http://localhost:3000/regional/scrutiny). The application has automatically reappeared in the queue with status `DEFICIENCY_RESOLVED_RESUBMITTED`. The officer reviews the replacement evidence and clears scrutiny.
7. **Step 9 (EVC Inspection Stage)**:  
   The officer clicks **"Forward to Committee"**. Switch to [`/regional/evc`](http://localhost:3000/regional/evc) to confirm panel allocation. As a committee member at [`/committee/evc`](http://localhost:3000/committee/evc), complete the inspection checklist and submit the structured advisory report.
8. **Step 10 (Final Competent Authority Decision)**:  
   Open the Executive Approval Desk at [`/bureau/hq`](http://localhost:3000/bureau/hq). The competent authority reviews the scrutiny and EVC findings, then clicks **"Issue Final Approval (EoA)"** or **"Issue Rejection Decree"**.
9. **Step 11 (Audit History & Verification)**:  
   Open [`/admin/audit-tamper`](http://localhost:3000/admin/audit-tamper) to view the sequentially linked SHA-256 audit ledger capturing every action, actor, timestamp, and hash link.

---

## 23. Limitations and Transparency

- **Advisory Prototype**: SAMAY is a prototype demonstrating statutory automation. It does not replace the official AICTE web portal or legal Gazette notifications.
- **Malware Scanning**: Antivirus verification operates in simulated ClamAV sandbox mode; production deployment requires air-gapped enterprise security gateways.
- **Handbook Edition Tracking**: Canonical clauses reflect the AICTE Approval Process Handbook (APH 2024–2027); future handbook revisions require versioned policy updates.

---

## 24. Future Enhancements

- **DigiLocker & Land Registry Integrations**: Direct API verification of state revenue land records and registered lease deeds.
- **Aadhaar-based e-Sign (CDAC / NSDL)**: Native digital signing of scrutiny summary sheets and inspection reports.
- **Multi-Modal Document Verification**: Automated OCR for bilingual Hindi and regional language revenue deeds.
- **Mobile PWA for Inspection Panels**: Offline geo-fenced inspection logging with biometric inspector verification.

---

## 25. Impact and Expected Outcomes

- **Document Fingerprinting & Traceability**: Client-side fingerprinting and traceable version history for submitted evidence.
- **Improved Traceability of Actions**: Verifiable audit records preserving every officer observation, upload, and status transition.
- **Elimination of Pendency Blind Spots**: Clear ownership tagging (_Ball With_) and proactive SLA escalations.
- **Structured Communication**: Replaces informal correspondence with standardized 8-point deficiency dockets.

---

## 26. Contributing

We welcome contributions adhering to SAMAY's regulatory engineering standards:

1. Ensure all business logic remains inside dedicated backend modules.
2. Strictly enforce **Zero System Date Calls** by using `SystemClockService`.
3. Follow conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.
4. Run `pnpm run lint`, `pnpm run typecheck`, and `pnpm run test` before submitting PRs.

---

## 27. Disclaimer

SAMAY (_Smart AICTE Monitoring & Approval Yojana_) is developed as a comprehensive regulatory automation platform demonstrating AICTE Approval Process Handbook workflows. It is not an official government notification and does not autonomously exercise statutory powers. All legal approvals and regulatory decrees remain the exclusive prerogative of the competent authority of AICTE.

<div align="center">

**SAMAY — Making Regulatory Workflows More Transparent, Traceable, and Accountable.**  
_One platform. Connected workflows. Informed decisions. Continuous compliance._

</div>
