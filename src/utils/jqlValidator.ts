export interface JqlValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fixSuggestions: string[];
}

const VALID_JQL_FIELDS = [
  "PROJECT", "ISSUETYPE", "STATUS", "ASSIGNEE", "REPORTER", "SPRINT",
  "PRIORITY", "CREATED", "UPDATED", "DUEDATE", "RESOLUTION", "LABELS",
  "COMPONENTS", "SUMMARY", "DESCRIPTION", "EPIC LINK", "FIXVERSION",
  "AFFECTSVERSION", "WORKLOGDATE", "CATEGORY", "KEY", "TYPE"
];

const VALID_KEYWORDS = [
  "AND", "OR", "NOT", "IN", "NOT IN", "ORDER BY", "ASC", "DESC",
  "WAS", "CHANGED", "IS", "IS NOT", "EMPTY", "NULL"
];

export function validateJqlSyntax(query: string): JqlValidationResult {
  const result: JqlValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    fixSuggestions: [],
  };

  const trimmed = query.trim();
  if (!trimmed) {
    result.warnings.push("Query is empty. Defaulting to all accessible issues.");
    return result;
  }

  // 1. Unmatched quotes check
  const doubleQuotes = (trimmed.match(/"/g) || []).length;
  if (doubleQuotes % 2 !== 0) {
    result.isValid = false;
    result.errors.push('Unterminated string literal: missing matching double quote (").');
    result.fixSuggestions.push('Add a closing double quote (") at the end of the string value.');
  }

  const singleQuotes = (trimmed.match(/'/g) || []).length;
  if (singleQuotes % 2 !== 0) {
    result.isValid = false;
    result.errors.push("Unterminated string literal: missing matching single quote (').");
    result.fixSuggestions.push("Add a closing single quote (') at the end of the string.");
  }

  // 2. Unmatched parentheses check
  const openParen = (trimmed.match(/\(/g) || []).length;
  const closeParen = (trimmed.match(/\)/g) || []).length;
  if (openParen !== closeParen) {
    result.isValid = false;
    result.errors.push(`Unmatched parentheses: found ${openParen} '(' and ${closeParen} ')'.`);
    result.fixSuggestions.push("Ensure every '(' has a corresponding closing ')' in clause groups or IN (...) lists.");
  }

  // 3. Check trailing AND / OR or dangling operators
  if (/\b(AND|OR|NOT)\s*$/i.test(trimmed)) {
    result.isValid = false;
    result.errors.push("Dangling logical operator at end of query statement.");
    result.fixSuggestions.push("Complete the expression after 'AND' / 'OR' or remove the trailing operator.");
  }

  if (/[=><!~]\s*$/i.test(trimmed)) {
    result.isValid = false;
    result.errors.push("Dangling comparison operator at end of expression.");
    result.fixSuggestions.push("Provide a value after the comparison operator (e.g., status = 'In Progress').");
  }

  // 4. Check IN operator without parentheses
  if (/\bIN\s+["'\w]+/i.test(trimmed) && !/\bIN\s*\(/i.test(trimmed)) {
    result.isValid = false;
    result.errors.push("Invalid 'IN' clause: expected parentheses format 'IN (\"Val1\", \"Val2\")'.");
    result.fixSuggestions.push('Wrap values after IN in parentheses, e.g., status IN ("To Do", "In Progress").');
  }

  return result;
}
