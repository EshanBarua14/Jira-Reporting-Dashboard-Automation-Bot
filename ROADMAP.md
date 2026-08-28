# OmniSync Suite — Strategic Gap Mitigation & Future Roadmap

**Target Platform:** OmniSync Suite (Enterprise Jira Analytics, Agile Metrics Engine & AI PMO Copilot)  
**Document Version:** 1.1.0  
**Status:** Active Execution Plan  

---

## 1. Gap Mitigation Matrix (Current vs. Mitigated State)

| Identified Gap / Risk | Architectural Impact | Mitigation Strategy Implemented | Long-Term Evolution |
| :--- | :--- | :--- | :--- |
| **1. Embedded SQLite Single-Node Limit** | In horizontal cloud environments (e.g., multi-instance Cloud Run), local SQLite files are ephemeral. | **Universal Storage Adapter (`IStorageAdapter`)** implemented with polymorphic drivers (`SQLiteStorageAdapter` + `MemoryStorageAdapter` fallback). | Cloud SQL / PostgreSQL / Firestore cloud driver integration in Phase 2. |
| **2. Heavy Thread-Blocking Computations** | Running Monte Carlo simulations (5k-50k iterations) and rolling cycle distributions on 10k+ Jira issues could cause UI stutter. | **Asynchronous Chunked Computation Engine (`computationEngine.ts`)** yielding frame slices to the event loop. | Web Worker offloading for massive dataset parallelization in Phase 3. |
| **3. High Cognitive Load for Non-Technical PMs** | Overwhelming visual complexity from simultaneously displaying raw AST JQL, CFD, Monte Carlo, and status mappers. | **Persona Density Switcher ("Simple PM" vs. "Power PMO")** added to header navigation with local preference persistence. | Guided onboarding wizard and role-based workspace presets in Phase 2. |
| **4. In-Memory Session Eviction on Container Restarts** | When container restarts, active in-memory Jira proxy sessions require re-authentication. | Precedence-based server store auto-synchronization and lightweight token heartbeat verification. | Distributed Redis / Firestore encrypted session cache in Phase 2. |
| **5. Monolithic State in `src/App.tsx`** | High state coupling in main component (>5k LOC). | Decomposition into modular feature panels (`src/components/`) and dedicated utility engines (`src/utils/`). | Migration to domain-driven React Contexts (`useJiraSync`, `usePMOMetrics`, `useExportPipeline`) in Phase 3. |

---

## 2. Multi-Phase Future Plan & Delivery Roadmap

```
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                           OMNISYNC PRODUCT ROADMAP                          │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │  PHASE 1 (COMPLETED): Hardened Foundation & Desktop Release                 │
  │  • Dual-Target Runtime (Electron + Cloud Run)                               │
  │  • Universal Storage Adapter & Async Computation Engine                     │
  │  • 38/38 Automated Unit & Security Test Suites                              │
  │  • Simple PM vs Power PMO Persona Switcher                                  │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │  PHASE 2 (Q4 2026): Cloud Multi-Tenancy & Enterprise Integrations           │
  │  • Multi-Tenant Cloud SQL (PostgreSQL) / Firestore Adapter Switch           │
  │  • Atlassian Marketplace OAuth 2.0 3LO App Certification                    │
  │  • Microsoft Teams & Slack Live Notification Webhooks                       │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │  PHASE 3 (Q1 2027): High-Scale Processing & Domain Architecture            │
  │  • Dedicated Web Worker Computation Pipeline (>50k issue scale)             │
  │  • React Context State Decoupling (`useJiraSync`, `usePMOMetrics`)          │
  │  • `React.lazy` Dynamic Bundle Chunking (<500 KB initial JS)                │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │  PHASE 4 (Q2 2027): Autonomous PMO Agent & Multi-Board Federation           │
  │  • Multi-Project / Multi-Instance Jira Federation Querying                  │
  │  • Autonomous Gemini GenAI Sprint Retrospective & Risk Mitigation Copilot   │
  │  • SOC2 Type II and ISO 27001 Compliance Certification Readiness            │
  └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Phase Breakdown

### Phase 1: Hardened Foundation (v1.0.0 GA — Current Baseline)
- [x] **Universal Storage Adapter**: Implemented `IStorageAdapter` with `better-sqlite3` and `MemoryStorageAdapter`.
- [x] **Asynchronous Computation Engine**: Added `executeInChunks`, vectorized Monte Carlo simulation, and rolling cycle-time velocity variance calculators in `computationEngine.ts`.
- [x] **Persona Mode Switcher**: Added "Simple PM" (streamlined executive view) vs. "Power PMO" (deep analytics) toggles.
- [x] **Comprehensive Test Verification**: 38 automated test cases passing across 8 test suites.
- [x] **Electron Desktop Distribution**: Packaged desktop builds with context-isolated IPC channels.

### Phase 2: Cloud Multi-Tenancy & Enterprise Integrations (v1.1.0)
- **Database Scalability**:
  - Implement `CloudSqlStorageAdapter` to connect directly to managed PostgreSQL / Cloud SQL instances for horizontally scaled web SaaS deployments.
- **Enterprise Collaboration**:
  - Direct integration with Microsoft Teams and Slack webhooks for automated sprint risk broadcasts and daily burn-up notifications.
- **OAuth 2.0 3LO (Three-Legged OAuth)**:
  - Add native Atlassian Cloud OAuth 2.0 user consent flow alongside existing API token sessions.

### Phase 3: High-Scale Processing & State Refactoring (v1.2.0)
- **Web Worker Background Threading**:
  - Offload massive historical dataset parsing (>50,000 Jira issues) and continuous Monte Carlo simulations to browser Web Workers (`src/workers/analyticsWorker.ts`).
- **Domain State Decoupling**:
  - Split remaining monolithic state in `App.tsx` into modular React Context Providers:
    - `JiraSessionContext`: Token management, heartbeat, and metadata syncing.
    - `MetricsEngineContext`: Live KPI calculations, anomaly detectors, and velocity statistics.
    - `ExportPipelineContext`: Multi-format PDF, PNG, and CSV generation queue.
- **Dynamic Bundle Splitting**:
  - Wrap heavy visualization panels (`VisualizationPanel`, `ReportDashboard`) with `React.lazy()` to reduce initial load footprint to <500 KB.

### Phase 4: Autonomous PMO Copilot & Enterprise Federation (v2.0.0)
- **Multi-Instance Jira Federation**:
  - Query, aggregate, and normalize issues across multiple separate Jira Cloud instances or projects in a single unified portfolio view.
- **Autonomous Gemini GenAI Agent**:
  - Autonomous triage agent capable of suggesting ticket re-allocations, identifying team burnout risks, and drafting complete sprint retrospective decks automatically.
- **Enterprise Governance & SOC2**:
  - Granular Role-Based Access Control (RBAC), signed export watermarks, and cryptographic audit log verification.

---

## 4. Verification & Quality Assurance Standards

All future pull requests and phase milestones must uphold the following non-negotiable baselines:
1. `tsc --noEmit` must pass with **0 TypeScript errors**.
2. Vitest unit/integration suite must maintain **100% pass rate**.
3. All network endpoints must pass through the **SSRF CIDR blocklist and Zod schema validators**.
4. No sensitive credentials (API tokens, OAuth secrets) may be written to browser `localStorage` or logged in server telemetry.
