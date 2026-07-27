# Prompt: UI/UX Change (TTP)

Lives as a slash command, not a copy-paste block:
[.claude/commands/ui-change.md](../../../.claude/commands/ui-change.md)

Usage:

```
/ui-change frontend/src/pages/MyOrders.jsx — order rows are a cramped table on mobile, unreadable. Want card layout that scans fast — no new deps, keep the expandable detail behavior
```

Everything after the command name is free text. Em-dash separates
target / problem / constraints, but any phrasing works — Step 0 asks
if the target is missing, Step 1 interrogates the rest.

Attach screenshots or `REFERENCE: <path>` in the same message.

Step 0a self-assesses scope — a one-part cosmetic change gets offered the
plain path instead of the full pipeline.

You stop and act at these points:
- during Step 1 — answer the problem-framing brainstorm
- after Step 2 — pick option 1/2/3 (one is marked RECOMMENDED)
- during Step 4 — the `grilling` interview, one question at a time
- after Step 6 — approve the commit
