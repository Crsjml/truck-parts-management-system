# Checkpoint Command

Create or verify a workflow checkpoint.

## Usage

`/checkpoint [create|verify|list] [name]`

## Create Checkpoint

1. Run `/verify quick` to ensure current state is clean
2. Create a git stash or commit with checkpoint name
3. Log checkpoint to `.claude/checkpoints.log`:

```bash
echo "$(date +%Y-%m-%d-%H:%M) | $CHECKPOINT_NAME | $(git rev-parse --short HEAD)" >> .claude/checkpoints.log
```

4. Report checkpoint created

## Verify Checkpoint

1. Read checkpoint from log
2. Compare current state to checkpoint:
   - Files added since checkpoint
   - Files modified since checkpoint
   - Test pass rate now vs then
3. Report summary with files changed, test results, and build status

## List Checkpoints

Show all checkpoints with name, timestamp, git SHA, and status.

## Workflow

```
/checkpoint create "feature-start"
  → [implement]
/checkpoint create "core-done"
  → [test]
/checkpoint verify "core-done"
  → [refactor]
/checkpoint create "refactor-done"
  → [PR]
```
