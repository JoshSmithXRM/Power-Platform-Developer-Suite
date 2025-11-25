# Session Handoff

Generate a context summary for handoff between Claude Code sessions.

## Usage

`/handoff`

## Output

Creates a handoff summary with:

### 1. Current State
- Branch name and status (`git branch`, `git status`)
- Recent commits on this branch (`git log main..HEAD --oneline`)
- Uncommitted changes summary

### 2. Work Completed This Session
- Features/fixes implemented
- Files created or significantly modified
- Tests added or updated
- Design decisions made

### 3. Work In Progress
- Current task (if incomplete)
- Blockers or open questions
- Decisions deferred to user

### 4. Next Steps
- Immediate next actions
- Pending items from todo list
- Suggested priority order

### 5. Key Context
- Important architectural decisions made
- Patterns established or referenced
- Related documentation updated

## Format

Output as markdown that can be:
1. Copied to a new session's first message
2. Saved to `.claude/handoffs/[date]-[branch].md` (if requested)

## Example Output

```markdown
## Session Handoff - 2024-01-15

### Branch: feature/data-explorer

### Completed
- Designed DataExplorer panel (saved to .claude/designs/)
- Implemented domain layer (3 entities, 2 services)
- Added unit tests for domain (100% coverage)

### In Progress
- Application layer partially complete
- GetDataUseCase needs error handling

### Blockers
- Need clarification on pagination approach

### Next Steps
1. Complete GetDataUseCase error handling
2. Implement infrastructure layer
3. Run /code-review before merge

### Key Decisions
- Using cursor-based pagination (not offset)
- Reusing existing ApiService from shared/
```

## Notes

- Run before `/clear` or ending a session
- Captures context that would otherwise be lost
- Helps maintain continuity across sessions
