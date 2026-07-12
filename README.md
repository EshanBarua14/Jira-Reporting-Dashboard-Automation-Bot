# Eshan Barua's Jira Analytics Suite

An enterprise-grade, glassmorphic project intelligence dashboard designed for high-performance PMO auditing, real-time ticket analytics, and automated multi-channel reporting. This suite consolidates complex development metrics across Jira, Confluence workspace wikis, and Discord engineering streams into clean, actionable executive summaries and pristine printed PDFs.

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

### 4. Smart NLP Executive Digests
- **Automated Summary Briefs:** Instantly compile raw ticket data into high-level executive statements, detailing current progress, operational bottlenecks, and recommended actions.
- **Configurable KPI Overrides:** Adjust critical metrics on the fly and trigger live re-calculations without database roundtrips.

### 5. High-Fidelity Print & Export Automation
- **Printers-First Layout System:** Beautifully configured CSS stylesheets target page-breaks and typography to guarantee flawless paper printing.
- **Custom Watermarking & Briefings:** Secure documents with dynamic "CONFIDENTIAL" or "INTERNAL USE ONLY" watermarks and insert custom leadership notes before saving.
- **Multi-Format Pipeline:** Securely download data in **PDF**, **CSV**, **JSON**, or sync directly with custom cloud configurations.

---

## 🛠️ Architecture & Technology Stack

The application is engineered as a highly responsive, full-stack monorepo featuring state-of-the-art web technologies:

- **Frontend:** React 18 with Vite, styled with Tailwind CSS, and powered by smooth framer-motion micro-interactions.
- **Backend:** Node.js + Express proxy server providing secure, read-only REST client requests.
- **Styling Paradigm:** High-fidelity custom glassmorphism design that scales elegantly from compact laptops to wide PMO control monitors.
- **Optimization:** 15-minute automated memory-sweeping prevents browser cache leaks and secures access credentials.

---

## ⚙️ Quick Start & Setup

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation
1. Clone the repository and navigate to the project root.
2. Install the application dependencies:
   ```bash
   npm install
   ```
3. Set up your local environment file (`.env`):
   ```env
   # Configure your secret API keys safely
   PORT=3000
   ```
4. Launch the local development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to `http://localhost:3000` to explore the live suite.

---

Designed and developed by **Eshan Barua** • [Connect on LinkedIn](https://www.linkedin.com/in/eshanbarua)
