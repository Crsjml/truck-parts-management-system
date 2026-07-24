# Agent Config Audit — CLAUDE.md / AGENTS.md / GEMINI.md / .opencode

Generated as Deliverable A of the "Curate agent config" plan, before any wiring
edits. Read-only findings; resolutions are executed in Tasks 2–8.

## A1. Skill drift

`.agents/AGENTS.md` § "Permanent Active Skills" names 14 skills. `.agents/skills/`
on disk held 24 directories. Cross-referencing the two gives three buckets:

**Active + present on disk (3)** — real and correctly wired:
- `ponytail`
- `high-end-visual-design`
- `minimalist-ui`

**Active but phantom — named in AGENTS.md, no folder on disk (11)**:
- `premium-ui-ux-design`
- `motion-ui`
- `design-system`
- `lint-and-validate`
- `systematic-debugging`
- `backend-patterns`
- `frontend-patterns`
- `coding-standards`
- `postgres-patterns`
- `api-patterns`
- `security-review`

**Present on disk but orphaned — not named anywhere in AGENTS.md (20)**:
- `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help`, `ponytail-review`
  (real ponytail suite; kept per decision even though AGENTS.md only names the
  parent `ponytail` skill)
- `brandkit`, `design-taste-frontend`, `design-taste-frontend-v1`,
  `full-output-enforcement`, `gpt-taste`, `image-to-code`,
  `imagegen-frontend-mobile`, `imagegen-frontend-web`,
  `industrial-brutalist-ui`, `jira-commits`, `redesign-existing-projects`,
  `stitch-design-taste`, `testing-qa`, `ttp-workflow`, `webapp-testing`
  (irrelevant to this stack — design/imagegen tooling for a different kind of
  project, or superseded workflow skills)

**Resolution:**
- Delete the 15 irrelevant orphans (Task 2).
- Keep the 5 ponytail-suite orphans (they're real, just under-referenced —
  AGENTS.md will name all 6 explicitly after Task 6).
- Fill all 11 phantoms with real skills copied from the global ECC install at
  `~/.claude/skills/ecc/` (Task 4), except `api-patterns` → `api-design` and
  `lint-and-validate` → `verification-loop` (closest real equivalents; no
  ECC skill uses those exact names).
- `security-review` and `design-system` phantoms are filled by literally the
  same ECC skill names — confirmed present at `~/.claude/skills/ecc/security-review`
  and `~/.claude/skills/ecc/design-system`.
- `premium-ui-ux-design` and `motion-ui` have no ECC equivalent copied in this
  pass; §4/§9 prose is rewritten to stop naming them rather than inventing a
  stand-in skill.

Pre-existing internal reference check (grep before delete): `webapp-testing`
is referenced only from inside `testing-qa/SKILL.md` (both being deleted
together, so no dangling ref); `image-to-code` is referenced only from inside
`imagegen-frontend-mobile/SKILL.md` (also deleted together);
`design-taste-frontend` is referenced from `design-taste-frontend-v1/SKILL.md`
(deleted together) and from CLAUDE.md/GEMINI.md §4 (updated in Tasks 7–8).
No other cross-references found among the 15 deleted orphans.

## A2. ECC relationship

`~/.claude/` hosts the global ECC harness (agents, skills, rules) shared across
all of this user's projects — this repo doesn't vendor it, it borrows from it.
`~/.claude/skills/ecc/` has 279+ skills; `~/.claude/rules/ecc/` has per-language
rule directories (`common`, `typescript`, `web`, `golang`, …) each following the
common+language-specific layering documented in
`~/.claude/rules/ecc/README.md`.

This project copies a **small, stack-matched slice** rather than symlinking or
fully vendoring the harness:
- 13 skill folders (Task 4) — copied whole so they work standalone even if the
  global ECC install changes later, and so teammates without the global
  harness installed still get them via git.
- 3 rule directories: `common`, `typescript`, `web` (Task 5) — copied whole
  (never flattened) to preserve the `../common/` relative references that
  language-specific rule files use.

Global ECC agents (`code-reviewer`, `security-reviewer`, `tdd-guide`, etc.,
listed in the Agent tool's available-types roster) are NOT copied — those run
from the global install regardless of project, so there is nothing to vendor.

## A3. Tool matrix

| Tool | Nature | Action here |
|---|---|---|
| `karpathy-principles` | Repo content — 4 coding principles, small enough to vendor in full | Vendor into `.agents/skills/karpathy-principles/SKILL.md` (Task 3) |
| `caveman` (prose compression) | Global install, invoked with `/caveman` | Document as **opt-in** only — do NOT add to AGENTS.md's always-on list. It rewrites prose output, which would silently mangle the markdown links this project's own communication protocol (§7) requires. |
| `rtk` (shell-output compression) | System binary (`brew install rtk` / curl installer) + `rtk init -g` | Document as **recommended, always-on** — it only affects raw shell-output tokens, not authored prose/markdown, so it doesn't collide with §7's link requirement the way caveman would. |

Neither caveman nor rtk's source gets vendored into this repo — both are
per-machine developer tooling, not project content. `.agents/skills/` will
contain no `caveman` folder and the repo will contain no `tools/rtk` binary.

## A4. Doc duplication

`CLAUDE.md` and `GEMINI.md` are maintained as byte-identical mirrors by
convention (confirmed: prior to this pass they already carried matching §1–§8
structure). Every edit in Task 7 is mirrored 1:1 in Task 8, verified with
`diff CLAUDE.md GEMINI.md`.

## Additional finding (out of scope for this pass)

`.opencode/opencode.json`'s top-level `instructions` array hardcodes absolute
paths into a **separate** skill location, `~/.gemini/config/skills/*`, plus
one path into this repo's `.agents/skills/minimalist-ui/SKILL.md` and one into
`.agents/AGENTS.md`. That `~/.gemini/config/skills/` tree is distinct from
both `.agents/skills/` (this repo) and `~/.claude/skills/ecc/` (the ECC
harness this plan borrows from), and lists the exact same phantom names
(`premium-ui-ux-design`, `motion-ui`, `design-system`, `lint-and-validate`,
`systematic-debugging`, `backend-patterns`, `frontend-patterns`,
`coding-standards`, `postgres-patterns`, `api-patterns`, `security-review`) —
i.e. this drift exists in a second config surface, for a different agent
(opencode), pointing at a third skill root entirely. This file is not in this
plan's file list and is left untouched; flagging it here so a follow-up pass
can decide whether opencode should point at `.agents/skills/` (this repo,
post-cleanup) instead of the `~/.gemini/config/skills/` phantom paths.

**Known consequence of this pass:** Task 2 deletes
`.agents/skills/minimalist-ui/` and `.agents/skills/high-end-visual-design/`.
`.opencode/opencode.json`'s `instructions` array has one entry pointing at
`.agents/skills/minimalist-ui/SKILL.md` (a real, in-repo path, not a
`~/.gemini/config` one) — that entry becomes a dangling file reference for
opencode/Antigravity once this pass lands. Left as-is because `.opencode.json`
is outside this plan's file list; the follow-up pass above should fix it
alongside the `~/.gemini/config` paths.

## Validation

```
ls .agents/skills/            # 24 dirs before cleanup
grep -A20 'Permanent Active Skills' .agents/AGENTS.md   # 14 named skills, cross-checked above
```
