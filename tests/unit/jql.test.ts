import { describe, it, expect } from "vitest";

// Helper function mirroring JQL string construction from scope form inputs
export function generateJqlQuery(params: {
  selectedProjects?: string[];
  selectedIssueTypes?: string[];
  selectedStatuses?: string[];
  selectedSprint?: string;
  createdDateStart?: string;
  createdDateEnd?: string;
}) {
  const parts: string[] = [];

  if (params.selectedProjects && params.selectedProjects.length > 0) {
    if (params.selectedProjects.length === 1) {
      parts.push(`project = "${params.selectedProjects[0]}"`);
    } else {
      parts.push(`project IN (${params.selectedProjects.map((p) => `"${p}"`).join(", ")})`);
    }
  }

  if (params.selectedIssueTypes && params.selectedIssueTypes.length > 0) {
    if (params.selectedIssueTypes.length === 1) {
      parts.push(`issuetype = "${params.selectedIssueTypes[0]}"`);
    } else {
      parts.push(`issuetype IN (${params.selectedIssueTypes.map((t) => `"${t}"`).join(", ")})`);
    }
  }

  if (params.selectedStatuses && params.selectedStatuses.length > 0) {
    if (params.selectedStatuses.length === 1) {
      parts.push(`status = "${params.selectedStatuses[0]}"`);
    } else {
      parts.push(`status IN (${params.selectedStatuses.map((s) => `"${s}"`).join(", ")})`);
    }
  }

  if (params.selectedSprint) {
    parts.push(`sprint = "${params.selectedSprint}"`);
  }

  if (params.createdDateStart) {
    parts.push(`created >= "${params.createdDateStart}"`);
  }

  if (params.createdDateEnd) {
    parts.push(`created <= "${params.createdDateEnd}"`);
  }

  return parts.length > 0 ? parts.join(" AND ") + " ORDER BY created DESC" : "ORDER BY created DESC";
}

// Helper syntax validator
export function validateJqlQuery(query: string) {
  if (!query.trim()) return { isValid: true, warning: "Empty JQL query." };

  const quoteCount = (query.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    return { isValid: false, warning: "Syntax Error: Unmatched string quote (\")." };
  }

  const openParen = (query.match(/\(/g) || []).length;
  const closeParen = (query.match(/\)/g) || []).length;
  if (openParen !== closeParen) {
    return { isValid: false, warning: "Syntax Error: Unmatched parentheses." };
  }

  return { isValid: true, warning: null };
}

describe("JQL Query Builder Engine & Syntax Validator", () => {
  it("should construct single project JQL query", () => {
    const query = generateJqlQuery({ selectedProjects: ["PROJ-A"] });
    expect(query).toBe('project = "PROJ-A" ORDER BY created DESC');
  });

  it("should construct multi-project JQL query with IN operator", () => {
    const query = generateJqlQuery({ selectedProjects: ["PROJ-A", "PROJ-B"] });
    expect(query).toBe('project IN ("PROJ-A", "PROJ-B") ORDER BY created DESC');
  });

  it("should combine project, issue type, status, sprint, and date filters with AND", () => {
    const query = generateJqlQuery({
      selectedProjects: ["DEMO"],
      selectedIssueTypes: ["Bug", "Story"],
      selectedStatuses: ["In Progress"],
      selectedSprint: "Sprint 42",
      createdDateStart: "2026-01-01",
      createdDateEnd: "2026-06-30",
    });

    expect(query).toBe(
      'project = "DEMO" AND issuetype IN ("Bug", "Story") AND status = "In Progress" AND sprint = "Sprint 42" AND created >= "2026-01-01" AND created <= "2026-06-30" ORDER BY created DESC'
    );
  });

  it("should validate valid JQL statements", () => {
    const validResult = validateJqlQuery('project = "ALPHA" AND status IN ("In Progress", "Done")');
    expect(validResult.isValid).toBe(true);
    expect(validResult.warning).toBeNull();
  });

  it("should detect unmatched quotes in invalid JQL statements", () => {
    const invalidResult = validateJqlQuery('project = "ALPHA AND status = "Done"');
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.warning).toContain("Unmatched string quote");
  });

  it("should detect unmatched parentheses in invalid JQL statements", () => {
    const invalidResult = validateJqlQuery('status IN ("To Do", "Done"');
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.warning).toContain("Unmatched parentheses");
  });
});
