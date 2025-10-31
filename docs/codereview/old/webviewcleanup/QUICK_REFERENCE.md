# v2 Architecture - Quick Reference Card

## TL;DR

**Status:** APPROVED
**Score:** 9.5/10
**Start:** This week
**All critical violations:** FIXED

---

## What's Different in v2?

| What | v1 (WRONG) | v2 (CORRECT) |
|------|------------|--------------|
| Use Cases | Return Domain entities | Return ViewModels |
| Panels | Inject mappers | No mappers |
| Shared UI | `core/presentation/` | `infrastructure/ui/` |
| Views | Static classes | Pure functions |
| Escaping | `document.createElement()` (broken) | Regex-based (works) |
| Type Safety | Unsafe casting | Runtime type guards |

---

## Layer Responsibilities

```
Presentation → Orchestrate, render (NO logic, NO mapping)
Application  → Use Cases return ViewModels, Mappers
Domain       → Business logic, entities (ZERO dependencies)
Infrastructure → Shared UI utils, repositories
```

---

## Do's and Don'ts

### Panels (Presentation)

**DO:**
```typescript
const viewModel = await this.loadUseCase.execute({ id });
const html = renderView(viewModel);
```

**DON'T:**
```typescript
const entity = await this.loadUseCase.execute({ id });
const viewModel = this.mapper.toViewModel(entity);  // NO!
```

### Use Cases (Application)

**DO:**
```typescript
async execute(request): Promise<ViewModel> {
    const entity = await this.repository.get(id);
    return this.mapper.toViewModel(entity);
}
```

**DON'T:**
```typescript
async execute(request): Promise<DomainEntity> {
    return await this.repository.get(id);  // NO!
}
```

### Views (Presentation/Infrastructure)

**DO:**
```typescript
export function renderFormField(props: Props): string {
    return html`<input value="${props.value}">`;
}
```

**DON'T:**
```typescript
export class FormFieldView {
    static render(props: Props): string { }  // NO!
}
```

### ViewModels (Application)

**DO:**
```typescript
export interface ViewModel {
    name: string;
    statusLabel: string;  // Pre-computed
    isActive: boolean;    // Pre-computed
}
```

**DON'T:**
```typescript
export interface ViewModel {
    status: number;  // View has to compute label
}
```

---

## XSS Prevention

**Always use:**
```typescript
import { html } from '@infrastructure/ui/utils/HtmlUtils';

// Auto-escaped
return html`<div>${userInput}</div>`;
```

**Never:**
```typescript
return `<div>${userInput}</div>`;  // UNSAFE!
```

---

## Type Guards for Messages

**Always validate:**
```typescript
if (isSaveMessage(message)) {
    await this.handleSave(message.data);  // Type-safe!
}
```

**Never:**
```typescript
const data = message.data as SaveData;  // UNSAFE!
```

---

## Directory Structure

```
src/
├── infrastructure/
│   └── ui/                    # Shared UI (NEW)
│       ├── views/
│       └── utils/
│
├── features/
│   └── {feature}/
│       ├── domain/
│       ├── application/
│       │   ├── viewModels/    # ViewModels here
│       │   ├── mappers/
│       │   └── useCases/      # Return ViewModels
│       └── presentation/
│           ├── panels/        # NO mappers
│           └── views/
```

---

## Testing Checklist

- [ ] Views are pure functions (input → output)
- [ ] Views escape HTML (XSS tests)
- [ ] Use Cases return ViewModels
- [ ] ViewModels have pre-computed values
- [ ] No business logic in Panels/Views
- [ ] Type guards validate messages
- [ ] ESLint passes (no domain in presentation)

---

## Implementation Order

1. Week 1: `infrastructure/ui/` (HtmlUtils, TypeGuards)
2. Week 2: Shared components (formField, button, select)
3. Week 3: Refactor EnvironmentSetupPanel
4. Week 4+: Apply to other panels

---

## Common Mistakes to Avoid

1. Panels injecting mappers
2. Use Cases returning Domain entities
3. Views performing calculations
4. Shared UI in `core/presentation/`
5. Forgetting HTML escaping
6. Unsafe type casting
7. Static View classes (use functions)

---

## When in Doubt

**Q: Where does X belong?**
- Business logic → Domain
- Mapping → Application (Mapper)
- Orchestration → Application (Use Case)
- Rendering → Presentation/Infrastructure (View)
- Data access → Infrastructure (Repository)

**Q: Should I map in the Panel?**
- NO - Use Cases return ViewModels

**Q: Should ViewModels have logic?**
- NO - Pre-compute everything in Mapper

**Q: Can I skip HTML escaping?**
- NO - Always use `html``

---

## Key Files

- Full Review: `webview-architecture-v2-clean-guardian-final-review.md`
- v2 Proposal: `webview-architecture-hybrid-proposal-v2.md`
- Summary: `REVIEW_SUMMARY.md`
- Diagrams: `ARCHITECTURE_COMPLIANCE_DIAGRAM.md`

---

## Help

If you're unsure, ask:
1. Does this violate Clean Architecture?
2. Am I doing Application layer work in Presentation?
3. Do my Views have logic?
4. Are my dependencies pointing inward?

**When in doubt, refer to `CLAUDE.md` and `ARCHITECTURE_GUIDE.md`**
