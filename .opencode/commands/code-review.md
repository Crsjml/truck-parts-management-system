# Code Review

Comprehensive security and quality review of uncommitted changes. Also supports GitHub PR review mode.

## Mode Selection

If input contains a PR number, PR URL, or `--pr`:
- Jump to **PR Review Mode** below.

Otherwise:
- Use **Local Review Mode** below.

---

## Local Review Mode

### Phase 1 — GATHER

Run `git diff --name-only HEAD`. If no changed files, stop: "Nothing to review."

### Phase 2 — REVIEW

Read each changed file in full. Check for:

**Security Issues (CRITICAL):**
- Hardcoded credentials, API keys, tokens
- SQL injection vulnerabilities
- XSS vulnerabilities
- Missing input validation
- Insecure dependencies
- Path traversal risks

**Code Quality (HIGH):**
- Functions > 50 lines
- Files > 800 lines
- Nesting depth > 4 levels
- Missing error handling
- console.log statements
- TODO/FIXME comments
- Missing JSDoc for public APIs

**Best Practices (MEDIUM):**
- Mutation patterns (use immutable instead)
- Emoji usage in code/comments
- Missing tests for new code
- Accessibility issues (a11y)

### Phase 3 — REPORT

Generate report with severity, file location, issue description, and suggested fix.

### Phase 4 — DECIDE

- **CRITICAL or HIGH issues** → Block commit, require fixes
- **MEDIUM issues** → Recommend fixes before merge
- **LOW issues** → Optional improvements

---

## PR Review Mode

### Phase 1 — FETCH

Parse input to determine PR:
| Input | Action |
|---|---|
| Number (e.g. `42`) | Use as PR number |
| URL (`github.com/.../pull/42`) | Extract PR number |
| Branch name | Find PR via `gh pr list --head <branch>` |

```bash
gh pr view <NUMBER> --json number,title,body,author,baseRefName,headRefName,changedFiles,additions,deletions
gh pr diff <NUMBER>
```

### Phase 2 — CONTEXT

1. Read CLAUDE.md and contributing guidelines
2. Check `.claude/prds/`, `.claude/plans/` for context
3. Parse PR description for goals, linked issues
4. Categorize changed files (source, test, config, docs)

### Phase 3 — REVIEW

Read each changed file in full. Apply checklist across 7 categories:

| Category | What to Check |
|---|---|
| **Correctness** | Logic errors, off-by-ones, null handling, edge cases, race conditions |
| **Type Safety** | Type mismatches, unsafe casts, `any` usage, missing generics |
| **Pattern Compliance** | Matches project conventions (naming, file structure, error handling, imports) |
| **Security** | Injection, auth gaps, secret exposure, SSRF, path traversal, XSS |
| **Performance** | N+1 queries, missing indexes, unbounded loops, memory leaks, large payloads |
| **Completeness** | Missing tests, missing error handling, incomplete migrations, missing docs |
| **Maintainability** | Dead code, magic numbers, deep nesting, unclear naming, missing types |

Severity: CRITICAL (must fix), HIGH (should fix), MEDIUM (recommended), LOW (optional)

### Phase 4 — VALIDATE

Run available validation commands based on project type. Record pass/fail.

### Phase 5 — PUBLISH

Post review to GitHub via `gh pr review` or create local artifact at `.claude/reviews/pr-<NUMBER>-review.md`.
