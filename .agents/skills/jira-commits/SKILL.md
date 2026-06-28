---
name: jira-commits
description: Use when the user asks to commit code, save changes, or interact with GitHub/Jira. Ensures Jira ticket IDs are properly tagged.
---

# GitHub / Jira Commits Guide

You are working in a repository that uses the **GitHub for Jira** integration.
Every commit message MUST strictly adhere to the Jira formatting rules.

## The Golden Rule of Commits
Every commit message **MUST** contain a Jira Ticket ID (e.g., `TTP-12`) to automatically link code to Atlassian Jira.

### Format
`type(TICKET-ID): brief description`

### Valid Types:
- `feat`: A new feature
- `fix`: A bug fix
- `refactor`: Code changes that neither fix a bug nor add a feature
- `chore`: Build process or auxiliary tool changes

### Examples
- ✅ Correct: `feat(TTP-15): implemented phone authentication`
- ✅ Correct: `fix(TTP-8): resolved docker port conflict`
- ✅ Correct: `refactor(TTP-10): dropped legacy mongodb user collection`
- ❌ Incorrect: `feat(sprint-2): added purchasing` (Missing TTP ticket ID!)
- ❌ Incorrect: `Added phone authentication` (Missing type and ticket ID!)

## Workflow when committing:
1. **DO NOT AUTOMATICALLY STAGE OR COMMIT.** Unless the user explicitly says "stage everything" or "commit all", you must ask the user which specific files or features they want to group together.
2. Propose the commit message to the user for approval using the format `type(TTP-XX): your message`.
   - *Note: If the user did not provide a specific ticket number, use a placeholder like `TTP-00` or ask them what ticket number they are working on.*
3. Once approved, stage the agreed-upon files using `git add <files>` and execute the `git commit`.
4. **DO NOT PUSH.** Under the core project rules, you are explicitly forbidden from running `git push` automatically. You may only push if the user explicitly says "push this" or "push to remote".
