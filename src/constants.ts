/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Hardcoded constants for the milestone-based lifecycle.
 * All paths, names, and templates are defined here to prevent AI agent drift.
 */

// Directory and file names
export const VIBE_MODEL_DIR = "vibe-model";
export const PRD_FILE = "prd.md";
export const MILESTONES_DIR = "milestones";
export const PRD_REVIEW_FILE = "prd-review.md";
export const DELIVERY_CACHE_DIR = "delivery-summaries";

// Milestone ID format
export function milestoneFileName(id: number, name: string): string {
  const padded = String(id).padStart(2, "0");
  const sanitized = sanitizeName(name);
  return `${padded}-${sanitized}.md`;
}

// PRD milestone table column order
export const MILESTONE_TABLE_HEADER =
  "| ID | Name | Description | Status | Mode |";
export const MILESTONE_TABLE_SEPARATOR =
  "|----|------|-------------|--------|------|";

// Section names in milestone files (used for filtering and updates)
export const MILESTONE_SECTIONS = [
  "Status",
  "Requirements",
  "Design",
  "Test Specifications",
  "Research Notes",
  "Implementation Notes",
  "Unit Test Results",
  "Integration Test Results",
  "Delivery",
  "Learnings",
] as const;

export type MilestoneSection = (typeof MILESTONE_SECTIONS)[number];

// Reviewer types for sub-agent reviews
export const REVIEWER_TYPES = [
  "architecture",
  "code",
  "testability",
  "ux",
] as const;

export type ReviewerType = (typeof REVIEWER_TYPES)[number];

// PRD reviewers: exclude "code" reviewer (no code to review in PRD phase)
export const PRD_REVIEWERS: readonly ReviewerType[] = [
  "architecture",
  "testability",
  "ux",
] as const;

// Reviewer-specific system prompts (short, focused)
export const REVIEWER_PROMPTS: Record<ReviewerType, string> = {
  architecture:
    "You are an architecture reviewer. Evaluate the design for: separation of concerns, appropriate abstractions, scalability, and adherence to project conventions. Be concise. Return PASS or FAIL with specific findings.",
  code:
    "You are a code reviewer. Evaluate for: correctness, error handling, security, performance, readability, and adherence to project style. Be concise. Return PASS or FAIL with specific findings.",
  testability:
    "You are a testability reviewer. Evaluate for: are the test specifications clear and verifiable? Can unit tests cover the logic? Can integration tests cover the interactions? Be concise. Return PASS or FAIL with specific findings.",
  ux:
    "You are a UX reviewer. Evaluate for: user-facing behavior, accessibility, error messages, edge cases, and overall user experience. Be concise. Return PASS or FAIL with specific findings.",
};

/**
 * Sanitize a name for use in file names.
 * Lowercase, replace non-alphanumeric with hyphens, collapse multiple hyphens.
 */
export function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}
