# OmniSync Suite

<div align="center">

![OmniSync Banner](https://img.shields.io/badge/OmniSync%20Suite-Enterprise%20Jira%20PMO%20%26%20Metrics-6366f1?style=for-the-badge&logo=jira&logoColor=white)

**High-Velocity Agile Jira Reporting, PMO Analytics & Predictive Intelligence Engine**

[![Tests](https://img.shields.io/badge/tests-vitest-10b981?style=flat-badge&logo=vitest&logoColor=white)](#-developer--engineering-guide)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.0-61dafb?style=flat-badge&logo=react&logoColor=black)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=flat-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Universal Storage](https://img.shields.io/badge/Storage-Adapter%20Pattern-003b57?style=flat-badge&logo=sqlite&logoColor=white)](src/db/storageAdapter.ts)
[![Electron](https://img.shields.io/badge/Electron-Desktop%20Ready-47848F?style=flat-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Roadmap](https://img.shields.io/badge/Roadmap-Active%20Plan-6366f1?style=flat-badge)](ROADMAP.md)

</div>

---

## 📑 Table of Contents
1. [Executive Summary & Current State of Software](#-executive-summary--current-state-of-software)
2. [For CTOs & Engineering Leadership (Architecture, Security & Risk)](#-for-ctos--engineering-leadership)
3. [For End Users & PMO Teams (Features & Operations)](#-for-end-users--pmo-teams)
4. [For Developers & Engineers (Setup, Testing & Extensibility)](#-for-developers--engineers)
5. [Project status](#-project-status)
6. [Roadmap & Scalability Path](#-roadmap--scalability-path)

---

## 🌟 Executive Summary & Current State of Software

**OmniSync Suite** is a Jira analytics and PMO automation platform. It bridges raw Atlassian issue tracking with real-time velocity modeling, Monte Carlo probabilistic forecasting, cumulative flow diagrams (CFD), anomaly detection, and automated report exports (PDF, PNG, CSV, JSON).

### Current State of the Software (v1.0.0 release candidate)
- **Targets:** desktop (Electron) and single-tenant/internal web (Cloud Run or Docker).
- **Verification:** automated Vitest suite; run `npm test` for the current count and result.
- **Security Profile:** Hardened backend gateway with in-memory session vaults, SSRF IP sanitization, contextual CSP headers, and zero client-side credential storage.
- **Platform Agnostic:** Runs identically in modern web browsers (Cloud Run / Docker) and offline desktop environments (Electron).

---

## 🏛️ For CTOs & Engineering Leadership

### System Architecture Overview
OmniSync operates on a decoupled full-stack architecture built to prevent vendor lock-in while ensuring strict credential isolation:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION TIER (SPA)                           │
│       React 18 • TypeScript • Tailwind CSS • D3.js • Recharts • Framer      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                  HTTP REST Proxy (Ephemeral Session Bearer)
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    API GATEWAY & ORCHESTRATION LAYER                        │
│  • Ephemeral Credential Vault (In-memory, tokens never logged or persisted) │
│  • SSRF Ingress Filter (RFC 1918 / Loopback / AWS Metadata IP blocking)     │
│  • Embedded SQLite Engine (`better-sqlite3` for preferences & report data)  │
│  • Gemini GenAI PMO Assistant (@google/genai with heuristic fallback)      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                     HTTPS REST Proxy (Scoped Atlassian Auth)
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                         EXTERNAL ATLASSIAN CLOUD                            │
│                         Jira Cloud REST API v2/v3                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Risk & Compliance Profile

| Area | Implementation & Controls | Risk Rating |
| :--- | :--- | :---: |
| **Credential Storage** | Jira API tokens and Discord webhooks remain in backend server RAM. The browser holds only an ephemeral session ID. | **LOW** |
| **SSRF Mitigation** | Target URLs are validated against private IP blocks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.1`, `169.254.169.254`). | **LOW** |
| **AI Dependency** | Gemini AI is strictly advisory; rate-limiting or network outage degrades gracefully to statistical algorithms. | **LOW** |
| **Electron Security** | Desktop sandbox enabled: `contextIsolation: true`, `nodeIntegration: false`, strict IPC whitelist. | **LOW** |
| **Cloud Multi-Tenancy** | Single-node SQLite storage. High-volume horizontal cloud clustering requires migration to Cloud SQL / Firestore. | **MEDIUM** |

---

## 👥 For End Users & PMO Teams

OmniSync is built for **Product Managers, Scrum Masters, Release Trains, and Engineering Directors**.

### Key Workflows & Features

```
+-----------------------------------------------------------------------------+
|                          OMNISYNC CAPABILITY MATRIX                         |
+-----------------------------------------------------------------------------+
|  [1] Live Jira Sync ──► [2] Custom Workflow Mapper ──► [3] Agile Analytics  |
|                                                                 │           |
|  [6] One-Click Export ◄── [5] AI Copilot (Gemini) ◄── [4] Anomaly Detection |
+-----------------------------------------------------------------------------+
```

1. **Jira Live Connection & JQL Search**:
   - Connect securely to Jira Cloud instances with custom JQL queries and quick search presets.
   - Built-in JQL syntax parser validates query tokens in real time.
2. **Custom Status & Workflow Mapping**:
   - Map arbitrary Jira statuses (e.g., `In Review`, `QA Verification`, `Ready for Prod`) into canonical Agile stages (`To Do`, `In Progress`, `Done`).
3. **Deep Agile Metrics & Visualizations**:
   - **Velocity Standard Deviation**: Track team throughput stability.
   - **Cycle & Lead Time Distributions**: Identify bottlenecks and delivery lag.
   - **Monte Carlo Probabilistic Forecasting**: Forecast release completion dates at 50th, 85th, and 95th confidence percentiles.
   - **Cumulative Flow Diagrams (CFD)** & **Sprint Burnup Charts** powered by D3.js.
4. **Algorithmic Anomaly Detection**:
   - Automatically surfaces stale tickets (>14 days unworked), story point outliers, and scope creep.
5. **Gemini AI PMO Assistant**:
   - Generates natural language executive summaries, identifies delivery risks, and answers ad-hoc queries about sprint health.
6. **Multi-Format Export Engine**:
   - One-click export to **PDF / Print stylesheets**, high-res **PNG canvas snapshots**, **CSV**, and **JSON**.

---

## 💻 For Developers & Engineers

### Tech Stack
- **Frontend**: React 18, TypeScript 5.0, Tailwind CSS v4, Lucide Icons, Recharts, D3.js, Framer Motion
- **Backend Server**: Node.js, Express 4.21, `better-sqlite3`, `zod`, `helmet`, `@google/genai`
- **Build System**: Vite (client), `esbuild` (server CJS bundle), `tsx` (dev runtime)
- **Testing**: Vitest (Unit & Integration), Playwright (E2E)
- **Desktop Runtime**: Electron 31+ with preload context isolation

### Local Development Setup

```bash
# 1. Clone repository & install dependencies
git clone https://github.com/eshanbarua/omnisync-suite.git
cd omnisync-suite
npm install

# 2. Configure environment variables
cp .env.example .env
# Edit .env to set your GEMINI_API_KEY (optional for local non-AI runs)

# 3. Start development server (Web & API on Port 3000)
npm run dev

# 4. (Optional) Run Electron desktop harness
npm run electron:dev
```

### Automated Testing & Quality Checks

```bash
# Run unit & API integration test suites (Vitest)
npm run test:unit

# Run full TypeScript type verification & linter
npm run lint

# Compile production bundle (Vite + esbuild server.cjs)
npm run build

# Run end-to-end user journey tests (Playwright)
npm run test:e2e
```

### Directory Structure
```
omnisync-suite/
├── electron/               # Electron main and preload context bridges
│   ├── main.ts
│   └── preload.ts
├── src/
│   ├── components/         # Modular UI panels (Metrics, AI Chat, Export, Scope, etc.)
│   ├── utils/              # Calculation engines (Monte Carlo, JQL AST, Exporters)
│   ├── db/                 # SQLite schema & database interface (better-sqlite3)
│   ├── server.ts           # Express API gateway, SSRF guard, Jira proxy
│   ├── App.tsx             # Root UI layout and state coordinator
│   └── types.ts            # Shared TypeScript interfaces & models
├── tests/
│   ├── unit/               # 7 unit test suites (Security, API, Metrics, JQL, etc.)
│   └── e2e/                # Playwright browser automation tests
└── package.json            # Scripts and dependencies
```

---

## 📋 Project status

Built and maintained by AIPG. Not externally audited or certified. What the code implements, and how to check it:

| Area | Implemented | Check |
| :--- | :--- | :--- |
| Architecture | Decoupled backend, Universal Storage Adapter, memory fallback | Code review |
| Code quality | Strict TypeScript, Zod runtime contracts | `npx tsc --noEmit` |
| Tests | Vitest unit/integration suites, Playwright config | `npm test` |
| Security | SSRF blocklist, in-memory credential vault, sandboxed Electron IPC | Code review; no third-party pen test yet |
| UX | Simple PM vs Power PMO density toggle | Manual |

---

## 🗺️ Roadmap & Strategic Plan

For full multi-phase architectural milestones, refer to the [OmniSync Strategic Roadmap (ROADMAP.md)](ROADMAP.md).

- [x] **v1.0.0 (Phase 1 Baseline)**: Core Jira JQL engine, agile metrics, Monte Carlo simulations, export engine, Universal Storage Adapter, Persona Mode toggle, tests passing.
- [ ] **v1.1.0 (Phase 2 - Q4 2026)**: Multi-Tenant Cloud SQL (PostgreSQL) adapter, Atlassian OAuth 2.0 3LO flow, Microsoft Teams & Slack webhooks.
- [ ] **v1.2.0 (Phase 3 - Q1 2027)**: Web Worker background processing for datasets >50,000 issues; domain React Context state decoupling; `React.lazy` bundle chunking.
- [ ] **v2.0.0 (Phase 4 - Q2 2027)**: Multi-board Jira instance federation, Autonomous Gemini GenAI Retrospective Agent, preparation for an external security review.

---

## 📄 License

Distributed under the [MIT License](LICENSE.md). Open-source and free for personal and enterprise use.
