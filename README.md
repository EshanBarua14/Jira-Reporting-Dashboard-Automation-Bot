# OmniSync Suite

[![Build Status](https://github.com/omnisync/omnisync-suite/workflows/Deploy%20&%20Build%20Pipeline/badge.svg)](https://github.com/omnisync/omnisync-suite/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.0-cyan)](https://react.dev/)

**OmniSync Suite** is an enterprise-grade Agile Jira Reporting, Analytics, and Intelligence platform. Built for engineering managers, product owners, and PMO leads, OmniSync Suite turns complex Jira issue streams into actionable executive reports, interactive dashboards, velocity trend analytics, and automated multi-format exports.

---

## ✨ Key Features

- 📊 **Executive Agile Dashboard**: High-fidelity visualization of project metrics, sprint progress, and workload allocation.
- 🤖 **AI-Powered Executive Summaries**: Automatically generates concise, executive-ready health checks and recommendations based on issue backlogs and sprint velocity.
- 🎯 **JQL Intelligence & Presets**: Rapidly scope reports using smart JQL presets like *My Active Bugs*, *Sprint Review*, and *Critical Escalations*.
- 📉 **Burn Down & Velocity Metrics**: Live interactive Sprint Burndown chart, Historical Trend Analysis, and Issue Density Heatmaps.
- 📄 **Print & PDF Engine**: Includes applied filter summaries, breakdown metrics, and custom company branding on printed PDF reports.
- ⚡ **Multi-Format Exporting**: Export reports directly to PDF, CSV, formatted JSON, or dispatch updates directly to Slack via Webhooks with confirmation safeguards.
- 🎛️ **Drag-and-Drop Card Layouts**: Customize visual hierarchy with drag handles across summary cards and issue analysis matrices.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide React, Framer Motion
- **Data Visuals**: D3.js, Recharts
- **Backend / Proxy**: Node.js, Express, Vite
- **AI Integration**: AI Executive Summaries via Server Proxy

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: v18.x or v20.x
- **npm** or **bun**: Package manager

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/omnisync-suite.git
   cd omnisync-suite
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and set your configuration variables:
   ```env
   GEMINI_API_KEY="your_api_key_here"
   APP_URL="http://localhost:3000"
   PORT=3000
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Navigate to `http://localhost:3000` in your browser.

---

## 📦 Production Build & Deployment

To create a production-ready bundled application:

```bash
# Typecheck and lint
npm run lint

# Build production assets and bundle Express backend
npm run build

# Start production server
npm run start
```

### Container / Cloud Run Deployment

OmniSync Suite includes a bundled Express server that serves static SPA assets and handles proxy requests.

1. Build docker image:
   ```bash
   docker build -t omnisync-suite .
   ```
2. Run container:
   ```bash
   docker run -p 3000:3000 -e GEMINI_API_KEY="your_api_key_here" omnisync-suite
   ```

---

## 🛡️ Security & Privacy

- **No Secrets in Repo**: All API keys and secrets are handled via environment variables and never checked into source control.
- **Server-Side Proxying**: Secret credentials are maintained exclusively server-side to prevent browser exposure.

---

## 📄 License

Distributed under the [MIT License](LICENSE.md). Free for personal and commercial use.
