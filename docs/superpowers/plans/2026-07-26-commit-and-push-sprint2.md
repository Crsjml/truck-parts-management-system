# Sprint 2 Updates: Commit & Push Strategy

> **For agentic workers:** Use superpowers:subagent-driven-development to execute commits in order, one per task. Steps use checkbox syntax.

**Goal:** Commit all sprint 2 infrastructure, documentation, and planning changes to `feat/sprint-2-updates` branch and push to remote.

**Scope:** 
- UI/UX design skills installation and configuration
- Documentation updates (CLAUDE.md, GEMINI.md, AGENTS.md)
- Infrastructure configuration updates (Makefile, run.bat, settings.json)
- Environment file cleanup (remove .env.example)
- Sprint 2 planning documents (MyOrders refactor, feature specs)

**Tech Stack:** Git, GitHub, conventional commits

## Global Constraints

- Commit format: `type(TTP-ID): description` — use TTP-QA for infrastructure/chores
- Atomic commits: one logical unit per commit, never bundle unrelated changes
- Branch: `feat/sprint-2-updates` (already checked out)
- Remote: `origin/master` is the target branch for PR
- No force push

---

## File Structure & Grouping

**Modified Core Docs (related: design system routing):**
- `CLAUDE.md` — comprehensive 3-tier design routing map
- `GEMINI.md` — mirror of CLAUDE.md for Gemini agent
- `.agents/AGENTS.md` — permanent active skills + 3-tier routing reference

**Infrastructure & Config:**
- `Makefile` — build/run targets (likely updated for new tooling)
- `run.bat` — Windows run script (likely updated for new tooling)
- `.claude/settings.json` — Claude Code settings (hooks, plugins, theme)
- `skills-lock.json` — vendored skills lockfile
- `frontend/package-lock.json` — npm dependencies (minor updates)
- `backend/scripts/delete_test_users.js` — new admin utility script

**Skills Installation (new directories):**
- `.agents/skills/` — 8 new UI/UX design skills (canvas-design, emil-design-eng, extract-design-system, frontend-design, impeccable, sleek-design-mobile-apps, ui-ux-pro-max, vercel-composition-patterns)
- `.agents/rules/` — new rules directory
- `.claude/skills/` — duplicate of above (synced to global user harness)

**Documentation & Plans (new directories):**
- `docs/superpowers/plans/` — 2026-07-26-myorders-card-refactor.md (implementation plan)
- `docs/plans/` — existing sprint plans (for reference)
- `docs/superpowers/` — specs and planning artifacts

**Cleanup:**
- `backend/.env.example` — DELETED
- `frontend/.env.example` — DELETED
- `docs/sprint-1-plan.md` — DELETED (completed, archived elsewhere)

---

## Commit Strategy (5 commits)

### Commit 1: Design System & Documentation

**Files:**
- `CLAUDE.md`
- `GEMINI.md`
- `.agents/AGENTS.md`

**Rationale:** Core documentation updates that define the skill routing for all future UI work. This is foundational; group together as one logical unit.

**Commit Message:**
```
docs(TTP-QA): add comprehensive 3-tier design routing map to CLAUDE.md, GEMINI.md, AGENTS.md
```

- [ ] Stage these 3 files
- [ ] Commit
- [ ] Verify message format

---

### Commit 2: UI/UX Design Skills Installation

**Files:**
- `.agents/skills/canvas-design/` — NEW directory
- `.agents/skills/emil-design-eng/` — NEW directory
- `.agents/skills/extract-design-system/` — NEW directory
- `.agents/skills/frontend-design/` — NEW directory
- `.agents/skills/impeccable/` — NEW directory
- `.agents/skills/sleek-design-mobile-apps/` — NEW directory
- `.agents/skills/ui-ux-pro-max/` — NEW directory
- `.agents/skills/vercel-composition-patterns/` — NEW directory
- `.agents/rules/` — NEW directory
- `skills-lock.json` — MODIFIED (lockfile for skill versions)

**Rationale:** All skills-related changes grouped together. This represents the infrastructure for design work.

**Commit Message:**
```
chore(TTP-QA): install 8 UI/UX design skills and add skills directory
```

- [ ] Stage all `.agents/skills/` and `.agents/rules/` directories
- [ ] Stage `skills-lock.json`
- [ ] Commit
- [ ] Verify all skill directories are included

---

### Commit 3: Infrastructure Configuration Updates

**Files:**
- `.claude/settings.json` — MODIFIED (Claude Code harness settings)
- `Makefile` — MODIFIED (build targets)
- `run.bat` — MODIFIED (Windows run script)
- `.agents/skills/web-design-guidelines/SKILL.md` — MODIFIED (skill metadata)

**Rationale:** Configuration and scripting changes. Group by purpose: making the dev environment work with new skills.

**Commit Message:**
```
chore(TTP-QA): update infrastructure config for new skills and tooling
```

- [ ] Stage these 4 files
- [ ] Commit
- [ ] Verify scripts/config are syntactically valid

---

### Commit 4: Global Skills Sync (User Harness)

**Files:**
- `.claude/skills/canvas-design/` — NEW directory
- `.claude/skills/emil-design-eng/` — NEW directory
- `.claude/skills/extract-design-system/` — NEW directory
- `.claude/skills/frontend-design/` — NEW directory
- `.claude/skills/grill-me/` — NEW directory
- `.claude/skills/impeccable/` — NEW directory
- `.claude/skills/sleek-design-mobile-apps/` — NEW directory
- `.claude/skills/ui-ux-pro-max/` — NEW directory
- `.claude/skills/vercel-composition-patterns/` — NEW directory
- `.claude/skills/web-design-guidelines/` — NEW directory

**Rationale:** These are vendored into the user's global harness (`~/.claude/skills/`) for cross-project reuse. Separate from the project-local `.agents/skills/` because they persist across projects.

**Commit Message:**
```
chore(TTP-QA): vendor UI/UX skills to global user harness for cross-project reuse
```

- [ ] Stage all `.claude/skills/` directories
- [ ] Commit
- [ ] Verify directory structure matches `.agents/skills/` equivalents

---

### Commit 5: Planning, Cleanup & Dependencies

**Files:**
- `frontend/package-lock.json` — MODIFIED (npm dependencies)
- `backend/.env.example` — DELETED (cleanup)
- `frontend/.env.example` — DELETED (cleanup)
- `docs/sprint-1-plan.md` — DELETED (archived)
- `docs/plans/` — NEW directory (sprint planning)
- `docs/superpowers/plans/2026-07-26-myorders-card-refactor.md` — NEW (implementation plan)
- `backend/scripts/delete_test_users.js` — NEW (utility script)

**Rationale:** Miscellaneous: cleanup of old environment templates, new planning artifacts, utility scripts, and dependency updates. These don't fit cleanly into other buckets.

**Commit Message:**
```
chore(TTP-QA): remove env examples, add sprint 2 planning docs and utility scripts
```

- [ ] Stage files and deletions
- [ ] Commit
- [ ] Verify `.env.example` files are removed (no secrets exposed)

---

## Push Strategy

After all 5 commits succeed locally, push to remote:

```bash
git push -u origin feat/sprint-2-updates
```

- [ ] Verify all commits appear on remote
- [ ] Check GitHub: `feat/sprint-2-updates` branch has all 5 commits
- [ ] Create PR from `feat/sprint-2-updates` → `master` if not already created
- [ ] Link PR to TTP-QA or relevant JIRA tickets

---

## Verification Checklist

After commits:
- [ ] `git log -5` shows all 5 new commits with correct format
- [ ] No staged/unstaged changes remain (`git status` clean)
- [ ] All `.agents/skills/` directories tracked (not in `.gitignore`)
- [ ] `.env.example` files successfully deleted (not in git)

After push:
- [ ] Remote branch `origin/feat/sprint-2-updates` has all commits
- [ ] No push conflicts
- [ ] GitHub UI shows branch ahead of master

