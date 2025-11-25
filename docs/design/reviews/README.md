# Design Reviews

This directory contains architecture and type safety reviews for design documents during iteration.

## Purpose

- Architect reviews (from clean-architecture-guardian) are stored here during design iteration
- Type safety reviews (from typescript-pro) are stored here during design phase
- **After final approval:** Review files are deleted (archived in git history)
- Only summary of key decisions remains in the final design document

## Workflow

1. **During Design:** Agents create review files here (e.g., `FEATURE_NAME_ARCH_REVIEW_2025-11-04.md`)
2. **Iteration:** Human reads reviews, updates design, re-invokes agents if needed
3. **After Approval:** Delete review files, add summary to design doc under "Key Architectural Decisions"

## Why Delete After Approval?

- Avoids clutter in repository
- Git history preserves all reviews if needed later
- Final design doc contains only essential information
- Reduces maintenance burden

## File Naming Convention

```
[FEATURE_NAME]_ARCH_REVIEW_[YYYY-MM-DD].md  (architecture review)
[FEATURE_NAME]_TYPE_REVIEW_[YYYY-MM-DD].md  (type safety review)
```

## Related Workflows

- See `.claude/workflows/DESIGN_WORKFLOW.md` for complete design process
