# Design Reviews

This directory stores temporary review artifacts during design iteration.

## Purpose

- Review files created during design iteration (e.g., `FEATURE_NAME_REVIEW_2025-11-27.md`)
- **After implementation:** Delete review files (archived in git history)
- Key decisions are documented in the design doc itself

## Workflow

1. **During Design:** Create review notes here if needed
2. **After Approval:** Delete review files, summarize decisions in design doc
3. **After PR Merge:** Design doc itself is deleted (see `.claude/WORKFLOW.md` Phase 9)

## File Naming

```
[FEATURE_NAME]_REVIEW_[YYYY-MM-DD].md
```

## Related

- `.claude/WORKFLOW.md` - Development workflows
- `.claude/templates/DESIGN_CLEANUP_GUIDE.md` - Cleanup process
