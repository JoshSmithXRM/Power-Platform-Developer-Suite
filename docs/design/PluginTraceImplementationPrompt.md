# 🚀 Plugin Trace Viewer Implementation - Phase 1: Domain Layer

## Context

I'm implementing the Plugin Trace Viewer feature following clean architecture principles. All design documents are located in docs\design\:

- PLUGIN_TRACES_REQUIREMENTS.md - Functional requirements
- PLUGIN_TRACES_ARCHITECTURE_MAPPING.md - Architecture mapping
- PLUGIN_TRACES_DESIGN_SUMMARY.md - Executive summary
- PLUGIN_TRACES_IMPLEMENTATION_PLAN.md - Detailed implementation plan

## Current Task

Implement Phase 1: Domain Layer according to the implementation plan.

## Instructions

Read the implementation plan in docs\design\PLUGIN_TRACES_IMPLEMENTATION_PLAN.md and implement Phase 1 in this exact order:

### Files to Create (in order):

1. src/domain/valueobjects/TraceLevel.ts
2. src/domain/valueobjects/TraceStatus.ts
3. src/domain/valueobjects/ExecutionMode.ts
4. src/domain/valueobjects/OperationType.ts
5. src/domain/valueobjects/Duration.ts
6. src/domain/valueobjects/CorrelationId.ts
7. src/domain/entities/PluginTrace.ts (Rich domain model with behavior)
8. src/domain/entities/TraceFilter.ts
9. src/domain/repositories/IPluginTraceRepository.ts
10. src/domain/repositories/IPluginTraceExporter.ts
11. src/domain/services/PluginTraceFilterService.ts

### Critical Requirements (CLAUDE.md Compliance):

**NEVER:**
1. ❌ Use any without explicit type
2. ❌ Create anemic domain models (entities must have behavior methods)
3. ❌ Put business logic in use cases or panels (belongs in domain)
4. ❌ Add infrastructure dependencies to domain layer (ZERO dependencies)
5. ❌ Use global Logger in domain (domain is pure, no logging)

**ALWAYS:**
1. ✅ Rich domain models with behavior methods (e.g., hasException(), isRelatedTo())
2. ✅ Explicit return types on all public methods
3. ✅ Value objects are immutable
4. ✅ Factory methods for entity creation (PluginTrace.create())
5. ✅ Business logic encapsulated in entities/value objects
6. ✅ Domain layer has ZERO external dependencies (pure TypeScript)

### Example: Rich Domain Model

The PluginTrace entity MUST have behavior methods like:
```typescript
class PluginTrace {
  hasException(): boolean { /* logic */ }
  isSuccessful(): boolean { /* logic */ }
  getStatus(): TraceStatus { /* logic */ }
  isRelatedTo(other: PluginTrace): boolean { /* logic */ }
  isSynchronous(): boolean { /* logic */ }
  isNested(): boolean { /* logic */ }

  static create(params: PluginTraceParams): PluginTrace { /* factory */ }
}
```

NOT this (anemic model):
```typescript
// ❌ DON'T DO THIS
interface PluginTrace {
  id: string;
  exceptionDetails: string;
  // ... just properties, no behavior
}
```

## Process

For each file:
1. Read the interface definition in the implementation plan
2. Implement following the plan's guidance
3. Add JSDoc comments to public methods
4. Ensure explicit return types
5. Show me the code for review
6. Move to next file after approval

## Testing

After completing all 11 files, we'll create unit tests for:
- All Value Objects (format methods, validation, equality)
- PluginTrace entity (all behavior methods)
- PluginTraceFilterService (OData filter building)

Tests should achieve 100% coverage (domain layer is pure functions, easy to test).

## Ready?

Start with File #1: src/domain/valueobjects/TraceLevel.ts

Read the implementation plan section for TraceLevel and create the file. Follow the interface definition exactly, ensuring:
- Enum-style value object pattern
- Static instances (Off, Exception, All)
- fromNumber() factory method
- getDisplayName() method
- equals() method
- Private constructor
- Immutable

Show me the code when ready.
