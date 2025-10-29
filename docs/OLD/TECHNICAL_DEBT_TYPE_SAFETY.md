# Technical Debt: Type Safety Violations

**Status:** 🚨 Critical - 739 linting errors
**Created:** 2025-10-29
**Priority:** High - Architectural correctness

## The Problem

Services are returning raw API responses (`any`) instead of transforming to typed business models, violating SOLID Single Responsibility Principle and breaking type safety.

**Visible symptom:** @odata fields leak into JSON viewers in PluginRegistrationPanel but not other panels.

**Root cause:** No enforcement of type safety at API boundaries.

## Lint Config Change Required

**File:** `eslint.config.mjs` (lines 89-95)

**Currently Commented Out (to avoid breaking build):**
```javascript
// 6. Type Safety - Prevent implicit 'any' violations
// TODO: Enable these rules and fix 739 violations (see docs/TECHNICAL_DEBT_TYPE_SAFETY.md)
// '@typescript-eslint/no-unsafe-return': 'error',
// '@typescript-eslint/no-unsafe-assignment': 'error',
// '@typescript-eslint/no-unsafe-member-access': 'error',
// '@typescript-eslint/no-unsafe-call': 'error',
// '@typescript-eslint/no-unsafe-argument': 'error'
```

**To Enable:** Uncomment the rules and fix violations.

**Why these rules:** The existing `recommended` config only catches explicit `any`. These rules catch implicit `any` from untyped API responses (`response.json()` returns `any`).

## Violations Found

**Total:** 739 errors across 20+ files

**Breakdown:**
- 335 errors: `no-unsafe-assignment` (assigning any to typed variables)
- 271 errors: `no-unsafe-member-access` (accessing properties on any)
- 90 errors: `no-unsafe-argument` (passing any to typed functions)
- 23 errors: `no-unsafe-call` (calling methods on any)
- 20 errors: `no-unsafe-return` (returning any from typed functions)

## Two Distinct Issues

### Issue 1: Services Not Transforming (20 errors)

**Problem:**
```typescript
// ❌ WRONG - Service returns raw API response
async getPluginAssemblies(): Promise<PluginAssembly[]> {
    const data = await response.json(); // any
    return data.value; // Unsafe return - includes @odata fields
}
```

**SOLID Violation:** Service's job is to transform API response → Business Model. Currently skipping this responsibility.

**Correct Pattern (see PluginTraceService.ts:210-228):**
```typescript
// ✅ CORRECT - Service maps to interface
async getPluginAssemblies(): Promise<PluginAssembly[]> {
    const data = await response.json();

    // Explicitly map to business model (strips @odata automatically)
    return data.value.map((raw: any) => ({
        pluginassemblyid: raw.pluginassemblyid,
        name: raw.name,
        version: raw.version,
        culture: raw.culture,
        publickeytoken: raw.publickeytoken,
        isolationmode: raw.isolationmode,
        sourcetype: raw.sourcetype,
        ismanaged: raw.ismanaged
        // @odata fields excluded - only interface properties included
    }));
}
```

**Files to Fix:**
- PluginRegistrationService.ts (4 methods)
- MetadataService.ts (multiple methods)
- SolutionService.ts
- ConnectionReferencesService.ts
- EnvironmentVariablesService.ts
- DataverseQueryService.ts
- ImportJobService.ts

### Issue 2: Panel Message Handling (719 errors)

**Problem:**
```typescript
// WebviewMessage interface (src/types/index.ts:21-25)
export interface WebviewMessage {
    action: string;
    [key: string]: any; // ← Index signature makes ALL properties 'any'
}

// Usage in panels
const environmentId = message.environmentId; // any
const componentId = message.data.componentId; // any
```

**Why it exists:** Webview messages are dynamic - different panels send different properties.

**Mitigation options:**
1. Type guards in panels for common patterns
2. Narrow types per message action
3. Accept the tradeoff (documented architectural decision)

## Mitigation Strategy

### Phase 1: Fix Services (High Priority)
Services must transform API → Business Model. This:
- Fixes SOLID violation
- Eliminates @odata leaks
- Provides compile-time safety for API changes
- Reduces errors from ~739 to ~719

**Approach:**
1. Identify all methods with `no-unsafe-return` violations
2. Add explicit `.map()` transformation to interface
3. Only include properties defined in interface (automatic @odata filtering)

### Phase 2: Panel Message Typing (Lower Priority)
Address remaining 719 errors with type narrowing.

**Options:**
- Add type guards for common message patterns
- Create typed message subtypes per action
- Document as acceptable architectural tradeoff

## Current Workaround

To allow gradual migration, temporarily downgrade rules to warnings:
```javascript
// Change 'error' to 'warn' to allow compilation
'@typescript-eslint/no-unsafe-return': 'warn',
'@typescript-eslint/no-unsafe-assignment': 'warn',
// ... etc
```

**NOT RECOMMENDED** - This hides the architectural problem. Fix services instead.

## Success Criteria

- All services transform API responses to typed interfaces
- No @odata fields in JSON viewers (unless explicitly needed)
- Service layer has 0 `no-unsafe-return` violations
- Panel violations reduced to only message handling
