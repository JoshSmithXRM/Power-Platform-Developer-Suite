# Active Work Tracking

This folder contains TODO documents for features currently in development.

## Purpose

- Track progress on active features across sessions
- Maintain checklists for implementation phases
- Document bugs found during manual testing
- Provide context for `/handoff` between sessions

## Lifecycle

1. **Create** - When starting a new feature, create `[FEATURE]_TODO.md`
2. **Update** - Check off items as work progresses, add bugs found during testing
3. **Delete** - Remove the file before final PR merge (git history preserves it)

## Naming Convention

```
[FEATURE_NAME]_TODO.md
```

Examples:
- `DATA_EXPLORER_TODO.md`
- `WEB_RESOURCE_EDITOR_TODO.md`
- `ALM_DOCUMENTATION_REVIEW_TODO.md`

## Template

See `.claude/templates/TASK_TRACKING_TEMPLATE.md` for the standard format.

## Note

These are **transient** documents. Once a feature is merged, the tracking doc should be deleted. If decisions or patterns are worth preserving, extract them to:
- `docs/architecture/` - For reusable patterns
- `docs/design/` - For architectural decisions (then delete after extracting)
