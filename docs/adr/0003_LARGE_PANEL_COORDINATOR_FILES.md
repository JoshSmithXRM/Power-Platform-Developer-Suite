# ADR-0003: Large Panel Coordinator Files (600-800 lines)

**Status:** Accepted
**Date:** 2025-11-22
**Applies to:** VS Code panel implementations

## Context

Four panel files exceed 600 lines, with the largest at 797 lines. This could indicate God Object anti-pattern or excessive complexity.

| File | Lines | Behaviors |
|------|-------|-----------|
| `MetadataBrowserPanel.ts` | 797 | 7 behaviors |
| `PluginTraceViewerPanelComposed.ts` | 745 | 5 behaviors + 3 sections |
| `EnvironmentSetupPanelComposed.ts` | 615 | 8 use cases |
| `ConnectionReferencesPanelComposed.ts` | 550 | Multiple services |

## Decision

Accept large panel files when they follow the Coordinator Pattern with proper delegation to behaviors, use cases, and services.

## Consequences

### Positive

- **High cohesion** - All coordination logic in one place
- **Clear responsibility** - Panels coordinate, behaviors implement
- **Each behavior is testable** independently
- **No God Object** - Panels delegate, don't implement business logic

### Negative

- Files exceed typical 500-line guideline
- New contributors may be intimidated by file size
- Requires understanding coordinator pattern

### When to Refactor

1. Panel exceeds 1,000 lines
2. Panel contains business logic (should be in use cases)
3. Panel responsibilities grow beyond coordination

### Verification Checklist

- [ ] Panel delegates to behaviors/sections
- [ ] Business logic in use cases, not panels
- [ ] Panel contains: message routing, UI coordination, state sync
- [ ] Each behavior is separately testable

## References

- [PANEL_DEVELOPMENT_GUIDE.md](../../.claude/templates/PANEL_DEVELOPMENT_GUIDE.md) - Coordinator pattern
- [PANEL_INITIALIZATION_PATTERN.md](../../.claude/templates/PANEL_INITIALIZATION_PATTERN.md) - Panel lifecycle
