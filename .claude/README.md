# Claude Code Setup

Quick start for using Claude Code with this project.

---

## Key Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project rules (auto-loaded every response) |
| `.claude/WORKFLOW.md` | Feature/bug/refactor workflows |
| `.claude/commands/` | Slash commands |
| `.claude/templates/` | Design templates |

---

## Available Agents

| Agent | When | Invoke Via |
|-------|------|------------|
| **design-architect** | Before complex features | `/design [feature]` |
| **code-guardian** | After implementation | `/code-review` |

### Quick Decision

| Task | Action |
|------|--------|
| Complex feature (3+ files) | `/design` first |
| Simple feature (1-2 files) | Just implement |
| Before commit | `/code-review` |
| End session | `/handoff` |

---

## Architecture Quick Reference

**Layers (depend inward):**
```
Presentation → Application → Domain ← Infrastructure
```

**Rules:**
- **Domain:** Rich entities with behavior, zero dependencies
- **Application:** Use cases orchestrate only (no business logic)
- **Infrastructure:** Implements domain interfaces
- **Presentation:** Uses use cases, no business logic

---

## Commands

```bash
npm run compile    # After each layer
npm test           # Before review
F5                 # Manual testing
```

**Slash commands:**
- `/design [feature]` - Design with design-architect
- `/new-panel [name]` - Scaffold new panel
- `/code-review` - Review with code-guardian
- `/cleanup-code` - Fix logging/comment violations
- `/handoff` - Session summary
- `/clear` - Reset context

---

## Common Pitfalls

1. **Anemic domain** - Entities need behavior methods
2. **Logic in use cases** - Orchestrate only, logic in domain
3. **Logic in panels** - Panels call use cases only
4. **Wrong dependency** - Domain never imports outer layers

---

## Extended Thinking

| Trigger | When |
|---------|------|
| "think" | Standard reasoning |
| "think hard" | Thorough analysis |
| "think harder" | Deep architecture evaluation |

---

## References

- `CLAUDE.md` - Project rules
- `.claude/WORKFLOW.md` - Workflows
- `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md` - Patterns
- `docs/testing/TESTING_GUIDE.md` - Testing
