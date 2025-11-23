# Notification Service Abstraction

**Category:** Low Priority
**Priority:** Low
**Effort:** 4-6 hours (95+ callsites)
**Last Reviewed:** 2025-11-23

---

## Summary

The codebase currently uses **direct VS Code notification APIs** (`vscode.window.showErrorMessage`, `showWarningMessage`, `showInformationMessage`) across 95+ locations. While patterns are **99% consistent**, there's no centralized service to enforce consistency or simplify testing.

**Decision: Defer until naturally refactoring notification code. Current pattern works well.**

---

## Current State

All notifications use direct `vscode.window` API calls throughout the application:

```typescript
// Current pattern (repeated 95+ times)
await vscode.window.showWarningMessage(
    'Delete all traces? This cannot be undone.',
    { modal: true },
    'Delete All',
    'Cancel'
);

await vscode.window.showInformationMessage('Environment saved successfully');

await vscode.window.showErrorMessage(`Failed to refresh: ${errorMessage}`);
```

**Affected files:**
- All panel files (`*PanelComposed.ts`) - ~40 files
- All behavior files (`*Behavior.ts`) - ~15 files
- `extension.ts` - ~20 callsites
- Authentication services - ~10 callsites
- Commands - ~10 callsites

**Scope:**
- 95+ notification callsites
- 40+ files affected
- No abstraction layer exists

**Current patterns (well-established):**
- ✅ Destructive actions → `{ modal: true }`
- ✅ Errors/Success → Non-blocking toasts
- ✅ Long operations → Progress indicators
- ✅ File operations → Native dialogs

---

## Why It Exists

**Context:**
- Initial approach: Direct VS Code API usage (standard for extensions)
- No abstraction needed at small scale
- Pattern consistency emerged organically through code reviews

**Timeline:**
- Created: 2024 (initial extension development)
- Pattern evolved: Established modal pattern for destructive actions
- Last reviewed: 2025-11-23 (notification consistency audit found only 1 inconsistency)

---

## Why Deferred

### Effort vs. Benefit Analysis

| Factor | Assessment |
|--------|------------|
| **Refactoring Scope** | 95+ callsites across 40+ files |
| **Effort** | 4-6 hours (create service + update all callsites) |
| **Inconsistencies Found** | 1 (trace level warning - already fixed) |
| **Pattern Consistency** | 99% (excellent without abstraction) |
| **Testing Impact** | Panels already mock `vscode.window` APIs |
| **Benefit** | Marginal (enforces existing patterns, slight test improvement) |

**Verdict:** Not urgent. Patterns are already well-established and followed consistently. Abstraction would formalize what's already working organically.

---

## Fix When

**Triggers:**
- When refactoring notification code anyway (naturally touching 10+ callsites)
- When adding notification features (e.g., progress tracking, notification history)
- When notification testing becomes painful (not currently the case)
- When adding complex notification logic (conditional modal flags, etc.)

**Do NOT fix if:**
- Just touching 1-2 notification callsites (not worth wholesale refactor)
- Current pattern continues working well (99%+ consistency maintained)

---

## Proposed Solution

### Step 1: Create INotificationService interface

```typescript
// src/shared/presentation/services/INotificationService.ts
export interface INotificationService {
    /**
     * Show error message (non-blocking toast)
     */
    showError(message: string): Promise<void>;

    /**
     * Show success message (non-blocking toast)
     */
    showSuccess(message: string): Promise<void>;

    /**
     * Show warning message (non-blocking toast)
     */
    showWarning(message: string): Promise<void>;

    /**
     * Confirm destructive action (blocking modal)
     * @returns true if confirmed, false if cancelled
     */
    confirmDestructive(message: string, actionLabel: string): Promise<boolean>;

    /**
     * Confirm important action (blocking modal)
     * @returns true if confirmed, false if cancelled
     */
    confirmImportant(message: string): Promise<boolean>;
}
```

### Step 2: Implement VsCodeNotificationService

```typescript
// src/infrastructure/vscode/VsCodeNotificationService.ts
export class VsCodeNotificationService implements INotificationService {
    async showError(message: string): Promise<void> {
        await vscode.window.showErrorMessage(message);
    }

    async showSuccess(message: string): Promise<void> {
        await vscode.window.showInformationMessage(message);
    }

    async showWarning(message: string): Promise<void> {
        await vscode.window.showWarningMessage(message);
    }

    async confirmDestructive(message: string, actionLabel: string): Promise<boolean> {
        const confirmed = await vscode.window.showWarningMessage(
            message,
            { modal: true },  // Always modal for destructive actions
            actionLabel,
            'Cancel'
        );
        return confirmed === actionLabel;
    }

    async confirmImportant(message: string): Promise<boolean> {
        const confirmed = await vscode.window.showWarningMessage(
            message,
            { modal: true },  // Always modal for important confirmations
            'Yes',
            'No'
        );
        return confirmed === 'Yes';
    }
}
```

### Step 3: Inject into panels and behaviors

```typescript
// Panel constructor
constructor(
    private readonly notificationService: INotificationService,
    // ... other dependencies
) {}

// Usage
await this.notificationService.confirmDestructive(
    'Delete all traces? This cannot be undone.',
    'Delete All'
);

await this.notificationService.showSuccess('Environment saved successfully');
```

### Step 4: Update all 95+ callsites

```bash
# Find all direct vscode.window notification calls
grep -r "vscode.window.show" src/ --include="*.ts"

# Update each callsite to use injected service
# Effort: ~4-6 hours for 95+ callsites
```

**Effort:** 4-6 hours (interface + implementation + 95 callsite updates + tests)

---

## Why Current Pattern is Safe

### 1. Pattern Consistency Enforced by Code Reviews

- All panels follow established patterns
- Code Guardian reviews catch deviations
- Only 1 inconsistency found in 95+ notifications (99% success rate)

### 2. Existing Mock Infrastructure

- All panel tests already mock `vscode.window` APIs
- No additional test complexity with current pattern

### 3. Clear Documentation

- Notification audit completed (2025-11-23)
- Patterns documented in architecture reviews
- Examples in existing code serve as reference

---

## Accepted Trade-offs

| Aspect | Current Pattern | With Abstraction |
|--------|----------------|------------------|
| **Type Safety** | Runtime (VS Code API) | Runtime + Compile (enforces modal flags) |
| **Pattern Enforcement** | Code reviews | Type system |
| **Developer Velocity** | Fast (direct API usage) | Slightly slower (DI setup) |
| **Testing** | Mock `vscode.window` | Mock service interface |
| **Refactoring Cost** | Low (no changes needed) | High (95+ callsites) |
| **Inconsistencies Found** | 1 (already fixed) | 0 (prevented by interface) |

**Decision:** Current pattern works well. Defer abstraction until refactoring trigger occurs.

---

## When to Revisit

Consider fixing only if:

1. **Multiple inconsistencies appear** - If pattern adherence drops below 95%
2. **Complex notification logic needed** - If we add features like notification queuing, history, or conditional modals
3. **Notification testing becomes painful** - If mocking `vscode.window` in tests becomes cumbersome
4. **Major notification refactoring planned** - If we're touching 10+ notification callsites anyway

Otherwise, **keep current pattern** (direct VS Code API usage).

---

## Risks of Not Addressing

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Inconsistent modal usage** | Low (1 instance found) | Low (99% consistent) | Code Guardian reviews catch deviations |
| **Testing complexity** | Low (mocks already working) | Low (stable pattern) | Existing mock infrastructure sufficient |
| **Pattern drift over time** | Medium (new devs may deviate) | Low (clear examples in codebase) | Documentation + code reviews |

**Current risk level:** Low (pattern is well-established and working)

---

## Alternative Solutions Considered

### Alternative 1: Keep Current Pattern (Chosen)
- ✅ Already 99% consistent
- ✅ No refactoring needed
- ✅ Existing tests work fine
- ❌ No compile-time enforcement
- **Verdict:** Best for current state (low effort, low risk)

### Alternative 2: Create Abstraction Now
- ✅ Enforces consistency at compile time
- ✅ Slightly easier testing (single mock)
- ❌ High refactoring cost (95+ callsites)
- ❌ Low benefit (only 1 inconsistency found)
- **Verdict:** Not justified (overkill for 99% consistency)

### Alternative 3: Partial Abstraction (Only New Code)
- ✅ Lower refactoring cost (only new code)
- ❌ Inconsistent pattern (some use service, some don't)
- ❌ Confusing for developers
- **Verdict:** Rejected (consistency is key)

---

## Related Items

- None (standalone improvement)

---

## References

**Audit Report:**
- Notification consistency audit (2025-11-23): 95+ notifications reviewed, 99% consistent

**Code Locations:**
- All `*PanelComposed.ts` files - Direct `vscode.window` API usage
- All `*Behavior.ts` files - Direct `vscode.window` API usage
- `extension.ts` - Direct `vscode.window` API usage

**Pattern Documentation:**
- Notification patterns established via code reviews
- Modal pattern: Destructive actions always use `{ modal: true }`
- Toast pattern: Success/Error messages always non-blocking

**Tests:**
- All panel integration tests - Mock `vscode.window` APIs successfully
- No test pain points identified

**Discussions:**
- Notification audit (2025-11-23): User requested abstraction review, decision to defer to low-priority technical debt

---
