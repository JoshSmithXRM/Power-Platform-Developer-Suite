# Troubleshooting

Common problems and solutions.

---

## Agent Issues

### code-guardian keeps rejecting

**Causes:**
1. Anemic domain models (no behavior methods)
2. Business logic in use cases (should be in domain)
3. Missing explicit return types

**Fix:** Review CLAUDE.md rules, fix violations, re-submit.

### design-architect creates too-large designs

**Fix:** Break into slices. Design MVP only, implement, then design next slice.

### Agent slow or timing out

**Fix:** `/clear` to reset context. Be more specific in scope.

---

## Build Issues

### npm run compile fails

**Check:**
1. Domain has zero external imports
2. Paths are correct
3. No circular dependencies (`npm run call-graph`)

### Tests fail

**Debug:**
```bash
npm test -- FileName.test.ts  # Run specific test
```

**Common issues:**
- Missing `await` on async calls
- Tests not isolated (shared state)

---

## Context Issues

### Claude forgets project rules

**Fix:** `/clear` then re-state key rules, or say "Review CLAUDE.md before proceeding"

### Inconsistent output

**Fix:** Be specific. Instead of "Review this code" say "Review X for Clean Architecture violations"

---

## Pre-Review Checklist

Before `/code-review`:
- [ ] `npm run compile` passes
- [ ] `npm test` passes
- [ ] Manual testing (F5) complete
- [ ] No `any` or `console.log`
- [ ] Domain entities have behavior

---

## Getting Help

1. Check `CLAUDE.md` for rules
2. Use extended thinking: "think hard about why..."
3. Ask: "What specific rule am I violating?"
