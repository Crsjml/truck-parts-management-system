---
name: karpathy-principles
description: >
  Four behavioral guidelines that reduce common LLM coding mistakes: think
  before coding (surface assumptions and tradeoffs instead of guessing),
  simplicity first (minimum code for the stated problem, nothing
  speculative), surgical changes (touch only what the request requires,
  don't drive-by refactor), and goal-driven execution (define verifiable
  success criteria and loop until confirmed, rather than blindly following
  imperative steps). Complements `ponytail` — ponytail governs HOW MUCH code
  to write, this governs HOW to approach the task before and while writing
  it. Use on every non-trivial coding task; bias toward caution over speed,
  use judgment on trivial ones.
license: MIT
---

# Karpathy Principles

Behavioral guidelines to reduce common LLM coding mistakes. These bias toward
caution over speed — for trivial tasks, use judgment. Pairs with
[ponytail](../ponytail/SKILL.md): ponytail decides how much code survives,
this decides how you get there without guessing, over-building, or drifting
from the request.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes,
simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan with steps and verification
checkpoints.

## Success Indicators

These guidelines are working if: fewer unnecessary changes show up in diffs,
fewer rewrites are needed due to overcomplication, and clarifying questions
precede implementation rather than following mistakes.

## Attribution

Adapted from the [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills)
project (MIT), which encodes four coding principles inspired by Andrej
Karpathy's public observations on LLM coding pitfalls.
