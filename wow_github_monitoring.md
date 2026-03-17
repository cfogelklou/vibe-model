# GitHub Actions Monitoring - Vibe-Model Reference Guide

**Purpose:** Procedural reference for monitoring GitHub PRs, fetching review comments, and managing CI/CD issues for the vibe-model project.

---

## Vibe-Model CI Overview

The `vibe-model` project uses GitHub Actions CI to validate:
1. **TypeScript compilation** - `bun run typecheck`
2. **Build verification** - `bun run build` creates `bin/index.js`
3. **Code quality** - ESLint via `bun run lint`
4. **End-to-end testing** - Runs vibe-model to build a test application (pig latinifier)

### CI Workflow Location
`.github/workflows/ci.yml`

### CI Trigger Branches
- `main`
- `develop`
- `firstcommit`

### Important: CI Only Runs for Repo Owner
The CI workflow has a guard that only runs for:
- Pushes by the repository owner
- PRs from the repository owner
- Manual workflow dispatch

This prevents CI from running on external contributions (for API cost control).

---

## Reference: Fetching ALL Review Comments (Critical)

**⚠️ CRITICAL**: The REST API endpoint `/repos/{owner}/{repo}/pulls/{number}/comments` does **NOT** return all review comments from Copilot. You **MUST** use the GraphQL API to fetch all review comments reliably.

### Why GraphQL is Required

- Copilot creates **multiple separate review batches** on the same PR (e.g., after each commit)
- Each review has a different `createdAt` timestamp
- REST API `/comments` endpoint only returns standalone review comments, not comments nested within PR reviews
- GraphQL returns the complete `repository.pullRequest.reviews[].comments[]` structure

### GraphQL Query for All Review Comments

```bash
# Get ALL review comments via GraphQL (required for Copilot comments)
# Replace {owner}, {repo}, and {PR_NUMBER} with actual values
gh api graphql -f query='
query {
  repository(owner: "{owner}", name: "{repo}") {
    pullRequest(number: {PR_NUMBER}) {
      reviews(first: 150) {
        nodes {
          id
          databaseId
          author { login }
          state
          createdAt
          body
          comments(first: 100) {
            nodes {
              id
              databaseId
              body
              path
              line
              originalLine
              originalStartLine
              createdAt
            }
          }
        }
      }
    }
  }
}'
```

### Key GraphQL Fields

- `reviews(first: 150)` - Fetch many reviews (Copilot often creates 3+ batches)
- `createdAt` - Filter for the most recent review batch
- `databaseId` - Numeric ID used for reply endpoints
- `author.login` - Copilot's login is typically `copilot-pull-request-reviewer`

### REST API (Limited - Do NOT rely on for Copilot)

```bash
# This ONLY returns standalone review comments, NOT Copilot's nested comments
# Replace {owner}, {repo}, and {PR_NUMBER} with actual values
gh api /repos/{owner}/{repo}/pulls/{PR_NUMBER}/comments --jq '.[] | {path: .path, line: .line, body: .body, user: .user.login, created: .created_at, in_reply_to: .in_reply_to_id, id: .id}'
```

### Important: Always Check BOTH

1. **GraphQL reviews query** - The authoritative source for ALL review comments including Copilot's
2. **PR reviews via REST** - Quick summary of review states (approved/changes_requested)

### Replying to Comments

When using GraphQL, the comment ID is the `databaseId` field (numeric), not the `id` field (GraphQL node ID string).

```bash
# Reply to comment ID {COMMENT_ID} on PR {PR_NUMBER}
# Replace {owner}, {repo}, {PR_NUMBER}, and {COMMENT_ID} with actual values
gh api -X POST "/repos/{owner}/{repo}/pulls/{PR_NUMBER}/comments/{COMMENT_ID}/replies" \
  -f body="Fixed — [explain what was changed and why]"
```

---

## Vibe-Model Specific CI Issues

### Gemini API Key Required
The CI workflow requires `GEMINI_API_KEY` to be set as a repository secret. Without this, the vibe-model journey will fail.

### Transient Failures
GitHub Actions occasionally has transient infrastructure failures (cache service, network). Re-run jobs before assuming code changes are needed.

### Common CI Failures

1. **Gemini CLI not found** - The installer URL may have changed
2. **CMake/Ninja issues** - Version mismatches between CI and generated code
3. **Timeout** - Vibe-model journeys can take 10-20 minutes; timeout is set to 30 minutes
4. **Artifact uploads** - Journey files and build outputs are uploaded for debugging

### Debugging CI Failures

1. Check the **Journey Summary** step in CI logs
2. Download **vibe-model-journey** artifacts to see journey files
3. Download **generated-app** artifacts to see generated code
4. Review the **Display Journey Summary** output for state information

---

## Pre-Commit Sanity Checks

Before marking vibe-model development work as complete, always run:

```bash
./scripts/sanity_checks.sh
```

This runs:
1. `bun run typecheck` - TypeScript type checking
2. `bun run build` - Build verification
3. `bun run lint` - ESLint checking

---

## Placeholders

Replace these placeholders with actual values when using commands in this document:
- `{owner}` - Repository owner (e.g., `your-username`)
- `{repo}` - Repository name (e.g., `vibe-model`)
- `{PR_NUMBER}` - Pull request number
- `{COMMENT_ID}` - Review comment ID (numeric `databaseId` from GraphQL)

---

## Related Documentation

- **[CLAUDE.md](CLAUDE.md)** - Quick reference for Claude Code agents
- **[USER_GUIDE.md](USER_GUIDE.md)** - Complete user manual
- **[vibe-model.md](vibe-model.md)** - V-Model protocol specification
