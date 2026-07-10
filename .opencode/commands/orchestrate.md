# Orchestrate Command

Orchestrate a multi-step workflow by running the right ECC commands in sequence. This command creates a plan but does NOT auto-dispatch sub-subagents — each step runs as a normal sequential command.

## How This Works

ECC commands are designed to be run sequentially by the current agent, not dispatched to separate subagents. This means:

1. **This command creates the execution plan** with the correct command sequence
2. **You run each command in order** — just type `/plan`, then `/tdd`, etc.
3. Each command auto-routes to its configured agent via opencode.json

This avoids the common anti-pattern of agents trying to spawn sub-agents that don't exist or produce shallow results.

## Standard Workflows

### Feature Development
```
/plan     → Create implementation plan
/tdd      → Implement with TDD (write tests first)
/code-review → Review the implementation
/verify   → Run all checks and tests
```

### Bug Fix
```
/plan "fix: [bug description]"     → Plan the fix
/tdd "fix: [bug description]"      → Write failing test, fix it
/code-review                        → Review the fix
/verify                             → Verify all tests pass
```

### Security Review
```
/security   → Run security audit
/code-review → Review findings
/verify      → Verify fixes
```

### Build Fixes
```
/build-fix   → Incrementally fix build errors
/code-review  → Review changes
/verify       → Confirm build passes
```

### Documentation / Refactor
```
/plan "refactor: [scope]"  → Plan refactoring
/update-docs               → Update docs
/refactor-clean            → Clean up dead code
/code-review               → Review changes
/verify                    → Verify nothing broke
```

### E2E Testing
```
/plan "e2e: [feature]"     → Plan test scenarios
/e2e                       → Run end-to-end tests
/verify                    → Verify results
```

## Execution Plan Format

When you call `/orchestrate`, it outputs an execution plan:

```
## Execution Plan: [Task Name]

### Step 1: Plan
- Command: `/plan [description]`
- What: Create detailed implementation plan
- Wait for: Plan approval

### Step 2: Implement
- Command: `/tdd [description]`
- What: Write tests, then implementation
- Wait for: Tests passing

### Step 3: Review
- Command: `/code-review`
- What: Review all changes for quality and security
- Wait for: Review approval

### Step 4: Verify
- Command: `/verify`
- What: Run full validation suite
- Wait for: All checks passing
```

## Notes

- **Simple tasks**: Use single commands directly (e.g., just `/build-fix` or just `/code-review`)
- **Complex tasks**: Use the workflow above with the full step sequence
- **Custom workflows**: You can skip steps or repeat steps as needed
