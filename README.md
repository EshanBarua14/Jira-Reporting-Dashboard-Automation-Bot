# Eshan Barua's OmniSync Suite

An enterprise-grade, cross-platform glassmorphic project intelligence desktop suite designed for high-performance PMO auditing, real-time ticket analytics, and automated multi-channel reporting. This suite consolidates complex development metrics across Jira boards, Confluence workspace wikis, and Discord engineering streams into clean, actionable executive summaries and pristine printed PDFs.

---

## 🚀 Key Features

### 1. Advanced Jira PMO Analytics
- **Dynamic JQL Parsing:** Run complex queries with dynamic filters (projects, statuses, sprints, and assignees) with full history persistence.
- **Multi-Sprint Velocity Auditing:** Compare metrics across consecutive sprints to identify drift in developer bandwidth, bug-to-story ratios, and delivery velocity.
- **Custom Status Mapping:** Translate disparate workspace configurations into uniform development phases (`To Do`, `In Progress`, `Done`, `Blocked`).

### 2. Confluence Wiki Auditing & Indexing
- **Space Metadata Indexing:** Scan and catalog page titles, draft states, and active wiki spaces.
- **Content Calibration:** Calculate document word counts, contributor engagement levels, and publication ratios.

### 3. Discord Team Engagement Intelligence
- **Message Stream Velocity:** Track chat volumes to determine peak collaboration hours.
- **Engagement Analytics:** Map team communication patterns, core posters, and average message reaction rates.

### 4. Interactive Agile Analytics Studio & Correlation Analyzer
- **Interactive D3 Dual-Axis Charts:** Dynamically render correlation graphs tracking primary and secondary KPIs across 12 sprint snapshots.
- **Click-and-Drag Precision Zooming:** Focus on specific sprint timeline segments with instantaneous UI re-scaling.
- **Rolling Volatility & Outlier Alerting:** Automatically monitor deviations and alert PMOs of abnormal metric variations exceeding 20% of the historical average baseline.
- **Statistical Regression & Pearson Correlation:** Overlay dynamic linear regression trendlines with calculated slope and Pearson correlation coefficient ($r$) indexes to discover deep operational relationships.
- **Comprehensive Historical Datasets:** Export full 12-entry sprint historical metrics as highly structured JSON logs for persistent reporting.

### 5. Smart NLP Executive Digests
- **Automated Summary Briefs:** Instantly compile raw ticket data into high-level executive statements, detailing current progress, operational bottlenecks, and recommended actions using the Gemini model.
- **Configurable KPI Overrides:** Adjust critical metrics on the fly and trigger live re-calculations without database roundtrips.

### 6. Secure Desktop-First Storage & Local Database
- **Home Directory Persistence:** Moves away from browser-only `localStorage` towards a secure, server-backed JSON database located at `~/.jira-analytics-suite/secure_store.json` on your PC.
- **Transparent Bridge Synchronization:** Synchronizes configurations, custom category colors, metrics histories, recent searches, and shared export logs.
- **Credentials Isolation:** High-security, short-lived session store keeps your sensitive tokens in-memory and completely isolated from disk logs.

### 7. Built-in Desktop Auto-Update Engine
- **Periodic Checks:** Automatically queries a remote release manifest on startup and every 6 hours.
- **Interactive Update Panel:** Prompts you with version comparisons and rich markdown release notes when an upgrade is available.

---

## 🛠️ Architecture & Technology Stack

The application is engineered as a highly responsive, cross-platform desktop application:

- **Desktop Framework:** Electron + Electron Builder for compiling native cross-platform binaries.
- **Frontend:** React 18 with Vite, styled with Tailwind CSS, and powered by smooth framer-motion micro-interactions.
- **Backend Service:** Node.js + Express background proxy running inside Electron.
- **Styling Paradigm:** Visual glassmorphic design that scales elegantly from compact laptops to wide PMO control monitors.
- **Optimization:** 15-minute automated memory-sweeping prevents memory leaks and secures access credentials.

---

## ⚙️ How to Clone, Build, and Run on Your PC

Follow this step-by-step guide to run the application locally or package it as a standalone executable (`.exe` / `.app`).

### Prerequisites
Make sure you have the following installed on your PC:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Git](https://git-scm.com/)

---

### Step 1: Clone the Repository
Open your terminal (Command Prompt, PowerShell, or Git Bash) and run:
```bash
git clone https://github.com/baruaeshan333/jira-analytics-suite.git
cd jira-analytics-suite
```

---

### Step 2: Install Dependencies
Install all package dependencies for the React frontend, Express backend, and Electron main processes:
```bash
npm install
```

---

### Step 3: Configure Environment Variables
Create a file named `.env` in the root directory and add your API keys:
```env
# Optional: Add your Gemini API key to unlock automated NLP executive summaries
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Override the default port
PORT=3000
```

---

### Step 4: Run the Application Locally

#### Option A: Running as a Full-Stack Web App (In the Browser)
To boot the Node/Express backend and Vite frontend development environment:
```bash
npm run dev
```
Once booted, open `http://localhost:3000` in any web browser.

#### Option B: Running as a Desktop App (In Electron Dev Mode)
To launch the application inside a native desktop window with hot reloading active:
```bash
npm run electron:dev
```

---

### Step 5: Package as a Standalone Executable (`.exe`)

To package the application into a standalone, portable Windows `.exe` installer:

```bash
npm run build:desktop
```

#### What This Script Does:
1. **Frontend Compilation:** Bundles your React app into highly optimized static assets inside `dist/`.
2. **Server Compilation:** Bundles the Express server into a single, self-contained `dist/server.cjs` file using `esbuild`.
3. **Electron Builder Packager:** Compiles the Electron shell and the server bundle into a standalone, single-file native installer in `dist-desktop/`.

#### Finding Your Executables:
Once the build completes, open the `dist-desktop/` folder. You will find:
- **`Eshan Barua's OmniSync Suite <version>.exe`** (The standalone installer for distribution)
- **`portable/`** folder containing a zero-installation portable launcher.

---

## 🔒 Security & Data Privacy
- **Read-Only Proxying:** The application is designed strictly around read-only auditing and does not possess write privileges to modify your Jira workflows or delete records.
- **Local Database Isolation:** All configuration parameters are saved locally on your own filesystem (`~/.jira-analytics-suite/secure_store.json`). No telemetry or analytics are ever uploaded to external servers.

---

Designed and developed with precision by **Eshan Barua** • [Connect on LinkedIn](https://www.linkedin.com/in/eshanbarua)
