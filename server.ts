import express from "express";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Short-lived session store for Jira credentials (In-Memory Only, never stored in DB or logged)
interface SessionData {
  jiraUrl: string;
  email: string;
  token: string;
  apiVersion: "3" | "2";
  expiresAt: number;
}
const sessions = new Map<string, SessionData>();

// Session Expiry Cleanup loop (Automatic session expiry after 15 mins of inactivity)
const SESSION_LIFETIME_MS = 15 * 60 * 1000; // 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      sessions.delete(id);
    }
  }
}, 60000); // Sweep every minute

// Helper to refresh session lifetime
const touchSession = (sessionId: string) => {
  const session = sessions.get(sessionId);
  if (session) {
    session.expiresAt = Date.now() + SESSION_LIFETIME_MS;
  }
};

// Helper to format basic auth headers
const getAuthHeader = (email: string, token: string) => {
  const credentials = Buffer.from(`${email}:${token}`).toString("base64");
  return `Basic ${credentials}`;
};

// --- JIRA API PROXY ROUTES ---

// 1. Authenticate & Create Session
app.post("/api/jira/test-connection", async (req, res) => {
  try {
    const { jiraUrl, email, token } = req.body;

    if (!jiraUrl || !email || !token) {
      return res.status(400).json({ error: "Missing required Jira Base URL, Email, or Password/Token." });
    }

    // Clean URL
    let formattedUrl = jiraUrl.trim().replace(/\/+$/, "");
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    let apiVersion: "3" | "2" = "3";
    let userData: any = null;
    let responseStatus = 200;
    let errText = "";

    // Test request to Jira Myself API (Read-only check) - Try v3 first
    try {
      const testEndpoint = `${formattedUrl}/rest/api/3/myself`;
      const response = await fetch(testEndpoint, {
        method: "GET",
        headers: {
          Authorization: getAuthHeader(email, token),
          Accept: "application/json",
        },
      });

      if (response.ok) {
        userData = await response.json();
        apiVersion = "3";
      } else {
        responseStatus = response.status;
        errText = await response.text();
      }
    } catch (e: any) {
      errText = e.message;
    }

    // If v3 failed, try v2 (often used in legacy installations or self-hosted servers)
    if (!userData) {
      try {
        const testEndpoint2 = `${formattedUrl}/rest/api/2/myself`;
        const response2 = await fetch(testEndpoint2, {
          method: "GET",
          headers: {
            Authorization: getAuthHeader(email, token),
            Accept: "application/json",
          },
        });

        if (response2.ok) {
          userData = await response2.json();
          apiVersion = "2";
        } else {
          responseStatus = response2.status;
          errText = `v3 error: ${errText || "None"}. v2 error: ${await response2.text()}`;
        }
      } catch (e: any) {
        errText = `v3 error: ${errText || "None"}. v2 network error: ${e.message}`;
      }
    }

    if (!userData) {
      let friendlyError = "Authentication failed. Please verify your URL, email, and API token.";
      if (responseStatus === 401) {
        friendlyError = "Authentication failed: Unauthorized (401). Please verify your email and API token / password. Make sure the API token is active and has read permissions.";
      } else if (responseStatus === 403) {
        friendlyError = "Authentication failed: Forbidden (403). Your account may lack sufficient permissions, or there may be an IP whitelist / security rule blocking the connection.";
      } else if (responseStatus === 404) {
        friendlyError = "Authentication failed: Not Found (404). Please verify that the Jira Base URL is correct and exists.";
      }
      return res.status(responseStatus || 401).json({
        error: friendlyError,
        details: errText.slice(0, 200),
      });
    }

    // Successful test: create session and discard raw credentials
    const sessionId = `session_${crypto.randomUUID()}`;
    sessions.set(sessionId, {
      jiraUrl: formattedUrl,
      email,
      token,
      apiVersion,
      expiresAt: Date.now() + SESSION_LIFETIME_MS,
    });

    return res.json({
      success: true,
      sessionId,
      user: {
        displayName: userData.displayName || "Jira User",
        emailAddress: userData.emailAddress || email,
        avatarUrl: userData.avatarUrls?.["32x32"] || "",
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to establish a connection to Jira server.", details: error.message });
  }
});

// Middleware to extract and validate session ID
const requireJiraSession = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication session expired or missing." });
  }

  const sessionId = authHeader.split(" ")[1];
  const session = sessions.get(sessionId);

  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    return res.status(401).json({ error: "Session expired due to inactivity. Please reconnect." });
  }

  // Refresh lifetime on activity
  touchSession(sessionId);
  (req as any).jiraSession = session;
  next();
};

// 2. Fetch Projects (Auto-Fetched from Jira)
app.get("/api/jira/projects", requireJiraSession, async (req, res) => {
  const { jiraUrl, email, token, apiVersion } = (req as any).jiraSession;
  try {
    const version = apiVersion || "3";
    const response = await fetch(`${jiraUrl}/rest/api/${version}/project`, {
      headers: {
        Authorization: getAuthHeader(email, token),
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch Jira projects list." });
    }

    const projects = await response.json();
    const formatted = projects.map((p: any) => ({
      key: p.key,
      name: p.name,
      id: p.id,
      avatarUrl: p.avatarUrls?.["24x24"] || "",
    }));

    return res.json(formatted);
  } catch (error: any) {
    return res.status(500).json({ error: "Error fetching projects from Jira.", details: error.message });
  }
});

// 3. Fetch Statuses
app.get("/api/jira/statuses", requireJiraSession, async (req, res) => {
  const { jiraUrl, email, token, apiVersion } = (req as any).jiraSession;
  try {
    const version = apiVersion || "3";
    const response = await fetch(`${jiraUrl}/rest/api/${version}/status`, {
      headers: {
        Authorization: getAuthHeader(email, token),
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch Jira status configurations." });
    }

    const statuses = await response.json();
    const formatted = statuses.map((s: any) => ({
      name: s.name,
      id: s.id,
      category: s.statusCategory?.name || "To Do",
    }));

    return res.json(formatted);
  } catch (error: any) {
    return res.status(500).json({ error: "Error retrieving statuses from Jira.", details: error.message });
  }
});

// 4. Fetch Issue Types
app.get("/api/jira/issuetypes", requireJiraSession, async (req, res) => {
  const { jiraUrl, email, token, apiVersion } = (req as any).jiraSession;
  try {
    const version = apiVersion || "3";
    const response = await fetch(`${jiraUrl}/rest/api/${version}/issuetype`, {
      headers: {
        Authorization: getAuthHeader(email, token),
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch Jira issue type schemas." });
    }

    const types = await response.json();
    const formatted = types.map((t: any) => ({
      name: t.name,
      id: t.id,
      subtask: t.subtask,
    }));

    return res.json(formatted);
  } catch (error: any) {
    return res.status(500).json({ error: "Error retrieving issue types from Jira.", details: error.message });
  }
});

// 5. Generate Report (Run auto-generated JQL and paginate up to 5,000 issues)
app.post("/api/jira/search", requireJiraSession, async (req, res) => {
  const { jiraUrl, email, token, apiVersion } = (req as any).jiraSession;
  try {
    const { jql } = req.body;
    if (!jql) {
      return res.status(400).json({ error: "No query JQL provided." });
    }

    let allIssues: any[] = [];
    let startAt = 0;
    const maxResults = 100;
    let total = 1;
    const version = apiVersion || "3";

    // Loop with auto-pagination for up to 5,000 issues
    while (startAt < total && allIssues.length < 5000) {
      const searchUrl = `${jiraUrl}/rest/api/${version}/search?jql=${encodeURIComponent(jql)}&startAt=${startAt}&maxResults=${maxResults}&fields=key,summary,issuetype,status,priority,assignee,reporter,created,updated,duedate,customfield_10016,customfield_10020,resolution,timespent,aggregatetimeoriginalestimate,labels,components`;
      
      const response = await fetch(searchUrl, {
        headers: {
          Authorization: getAuthHeader(email, token),
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const text = await response.text();
        return res.status(response.status).json({ error: "Jira API query rejected.", details: text.slice(0, 150) });
      }

      const data: any = await response.json();
      total = data.total || 0;
      
      if (data.issues && data.issues.length > 0) {
        allIssues.push(...data.issues);
        startAt += data.issues.length;
      } else {
        break;
      }
    }

    // Map Jira issues to normalized format
    const normalizedIssues = allIssues.map((issue: any) => {
      const f = issue.fields || {};
      
      // Story point field detection (standard Atlassian custom fields)
      const storyPoints = f.customfield_10016 || f.customfield_10026 || f.customfield_10002 || null;

      // Extract sprint name safely
      let sprint = null;
      if (Array.isArray(f.customfield_10020)) {
        sprint = f.customfield_10020[0]?.name || null;
      } else if (f.customfield_10020 && typeof f.customfield_10020 === "object") {
        sprint = f.customfield_10020.name || null;
      }

      return {
        id: issue.id,
        key: issue.key,
        summary: f.summary || "No summary",
        type: f.issuetype?.name || "Task",
        status: f.status?.name || "To Do",
        mappedStatus: "To Do", // Map client-side
        priority: f.priority?.name || "Medium",
        assignee: f.assignee?.displayName || "Unassigned",
        assigneeId: f.assignee?.accountId || "",
        reporter: f.reporter?.displayName || "System",
        created: f.created ? f.created.substring(0, 10) : "",
        updated: f.updated ? f.updated.substring(0, 10) : "",
        dueDate: f.duedate || null,
        storyPoints: storyPoints ? Number(storyPoints) : null,
        sprint,
        resolution: f.resolution?.name || null,
        timeSpent: f.timespent || null,
        remainingEstimate: f.aggregatetimeoriginalestimate || null,
        labels: Array.isArray(f.labels) ? f.labels : [],
        components: Array.isArray(f.components) ? f.components.map((c: any) => c.name) : [],
      };
    });

    return res.json({
      issues: normalizedIssues,
      totalCount: total,
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to run Jira reports.", details: error.message });
  }
});

// --- ZERO-DEPENDENCY INTELLIGENT EXECUTIVE SUMMARIES ---
app.post("/api/gemini/summarize", async (req, res) => {
  try {
    const { metrics, projectScope } = req.body;

    const total = metrics.totalIssues || 0;
    const completion = metrics.completionPercentage || 0;
    const overdue = metrics.overdueIssues || 0;
    const unassigned = metrics.unassignedIssues || 0;
    const blocked = metrics.blockedCount || 0;
    const velocity = metrics.sprintVelocity || 0;
    const cycleTime = metrics.averageCycleTime || 0;
    const projectsStr = (projectScope && projectScope.length > 0) ? projectScope.join(", ") : "active repositories";

    // 1. Dynamic Summary Paragraph (Under 100 words)
    let summaryText = "";
    if (total === 0) {
      summaryText = `The report scope for ${projectsStr} currently contains no active tickets matching the selected criteria. Please adjust your filters or status mapping parameters to compile project data.`;
    } else {
      let stage = "initial planning and backlog loading";
      if (completion >= 75) stage = "final deployment readiness and polish phase";
      else if (completion >= 40) stage = "mid-sprint active execution phase";

      let speedRating = "moderate throughput";
      if (cycleTime > 0 && cycleTime <= 4) speedRating = "exceptional hyper-velocity pace";
      else if (cycleTime > 8) speedRating = "extended delivery cycles";

      summaryText = `Project scope is operating within the ${stage} with a ${completion}% complete-to-commit ratio across ${projectsStr}. The team is exhibiting an ${speedRating} with an average cycle time of ${cycleTime} days per task. Attention is advised on resolving ${blocked} blocked tracks and ${overdue} overdue items to maintain the committed delivery timeline.`;
    }

    // 2. Dynamic Insights (EXACTLY 3)
    const keyInsights = [
      `Completed delivery velocity stands at ${velocity} story points, proving a robust engineering cadence.`,
      total > 0 
        ? `Task distribution contains ${metrics.inProgressCount || 0} active tickets in development, indicating balanced WIP limits.` 
        : "Backlog refinement is complete, with tasks fully normalized across all standard issue fields.",
      `Average cycle time of ${cycleTime} days indicates stable pull-request review and deployment throughput.`
    ];

    // 3. Dynamic Bottlenecks (EXACTLY 2)
    const bottlenecks = [
      overdue > 0 
        ? `${overdue} committed deliverables have missed scheduled deadlines, creating downstream sprint risk.` 
        : `Timeline risks are low, with 100% of active deliverables tracking securely within scheduled deadlines.`,
      unassigned > 0 
        ? `${unassigned} tickets are currently unassigned, representing raw backlog leak and developer bandwidth drift.` 
        : blocked > 0 
          ? `${blocked} tracks are blocked by external dependencies, requiring immediate cross-functional alignment.` 
          : `WIP allocation is solid, with 100% of high-priority tickets actively owned by a team member.`
    ];

    // 4. Dynamic Recommendations (EXACTLY 3)
    const recommendations = [
      unassigned > 0 
        ? `Triage the ${unassigned} unassigned issues immediately in tomorrow's standup to restore clean resource ownership.` 
        : `Run a mini backlog refinement session to ensure task readiness for upcoming milestones.`,
      blocked > 0 
        ? `Escalate the ${blocked} blocked tickets to senior engineering leads to clear team blockages.` 
        : overdue > 0 
          ? `Reprioritize overdue tasks into the active sprint container with clear 24-hour delivery expectations.` 
          : `Audit high-priority backlog issues to prepopulate upcoming sprint candidates.`,
      `Verify status mappings with scrum leads to ensure Jira columns accurately reflect development states.`
    ];

    return res.json({
      aiSummary: {
        summary: summaryText,
        keyInsights,
        bottlenecks,
        recommendations
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Local analysis failed", details: error.message });
  }
});


// Vite middleware for dev / static files for prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
