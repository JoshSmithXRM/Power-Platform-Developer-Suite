# Domain Service Patterns

**Master guide for domain service design and implementation in the Power Platform Developer Suite.**

Domain services are stateless, pure business logic containers for operations that don't naturally fit within a single entity. This guide shows when to use them, how to distinguish them from use cases, and common pitfalls to avoid.

---

## Quick Reference

### When to Use Domain Services

✅ **DO use domain services when:**
- Multi-entity logic: Operation involves multiple domain entities
- Complex algorithms: Complicated calculations or data transformations
- Stateless operations: Pure functions with no side effects
- Domain-specific logic: Business rules that don't fit in one entity

❌ **DON'T use domain services when:**
- Single entity logic → Use entity method
- Orchestration logic → Use case (application layer)
- Infrastructure concerns → Infrastructure service
- Stateful operations → Entity or aggregate

### Decision Tree: Service vs Entity vs Use Case

```
Is this business logic?
├─ No → Infrastructure service or utility
└─ Yes → Does it involve multiple entities?
   ├─ No → Single entity?
   │  └─ Yes → Entity method
   └─ Yes → Does it orchestrate repositories/external services?
      ├─ Yes → Use Case (application layer)
      └─ No → Domain Service (pure logic, no infrastructure)
```

### Core Principles

1. **Stateless** - No instance variables, pure functions
2. **Pure logic** - Business rules only, no infrastructure
3. **Zero dependencies** - No repositories, no external services, no logging
4. **Domain vocabulary** - Uses domain entities and value objects
5. **Testable** - Easy to test with simple inputs/outputs

### Anti-Patterns to Avoid

❌ **Infrastructure dependencies** (repositories, APIs, logging)
❌ **Orchestration logic** (should be in use cases)
❌ **Stateful services** (services with instance state)
❌ **Anemic services** (pass-through wrappers with no logic)
❌ **Business logic in use cases** (should be in domain services)

---

## Table of Contents

1. [When to Use Domain Services](#when-to-use-domain-services-1)
2. [Domain Service vs Entity vs Use Case](#domain-service-vs-entity-vs-use-case)
3. [Domain Service Characteristics](#domain-service-characteristics)
4. [Common Domain Service Patterns](#common-domain-service-patterns)
5. [Production Examples](#production-examples)
6. [Anti-Patterns](#anti-patterns)
7. [Testing Domain Services](#testing-domain-services)

---

## When to Use Domain Services

### Multi-Entity Operations

**❌ Bad - Logic in Use Case:**
```typescript
// Business logic scattered in use case - hard to test, hard to reuse
export class ListConnectionReferencesUseCase {
    public async execute(): Promise<FlowConnectionRelationship[]> {
        const flows = await this.flowRepository.getAll();
        const connectionRefs = await this.connectionRefRepository.getAll();

        // ❌ Complex business logic in use case (relationship building)
        const relationships: FlowConnectionRelationship[] = [];
        const crMap = new Map<string, ConnectionReference>();

        // Build case-insensitive map
        for (const cr of connectionRefs) {
            crMap.set(cr.connectionReferenceLogicalName.toLowerCase(), cr);
        }

        const usedCrs = new Set<string>();

        // Match flows to connection references
        for (const flow of flows) {
            const crNames = flow.extractConnectionReferenceNames();
            for (const crName of crNames) {
                const cr = crMap.get(crName.toLowerCase());
                if (cr) {
                    relationships.push(FlowConnectionRelationship.flowToCr(flow, cr));
                    usedCrs.add(cr.connectionReferenceLogicalName.toLowerCase());
                } else {
                    relationships.push(FlowConnectionRelationship.orphanedFlow(flow, crName));
                }
            }
        }

        // Find unused connection references
        for (const cr of connectionRefs) {
            if (!usedCrs.has(cr.connectionReferenceLogicalName.toLowerCase())) {
                relationships.push(FlowConnectionRelationship.orphanedCr(cr));
            }
        }

        return relationships;
    }
}
```

**✅ Good - Logic in Domain Service:**
```typescript
// Use case orchestrates only - business logic delegated to domain service
export class ListConnectionReferencesUseCase {
    constructor(
        private readonly flowRepository: ICloudFlowRepository,
        private readonly connectionRefRepository: IConnectionReferenceRepository,
        private readonly relationshipBuilder: FlowConnectionRelationshipBuilder, // Domain service
        private readonly logger: ILogger
    ) {}

    public async execute(): Promise<FlowConnectionRelationship[]> {
        this.logger.info('Loading connection references and relationships');

        const flows = await this.flowRepository.getAll();
        const connectionRefs = await this.connectionRefRepository.getAll();

        // ✅ Delegate complex logic to domain service
        const relationships = this.relationshipBuilder.buildRelationships(flows, connectionRefs);

        this.logger.info('Connection references loaded', {
            flowCount: flows.length,
            connectionRefCount: connectionRefs.length,
            relationshipCount: relationships.length
        });

        return relationships;
    }
}

// ✅ Domain service contains pure business logic - easy to test
export class FlowConnectionRelationshipBuilder {
    buildRelationships(
        flows: CloudFlow[],
        connectionRefs: ConnectionReference[]
    ): FlowConnectionRelationship[] {
        // Complex matching logic here - pure, testable
        // ... (implementation details)
    }
}
```

---

### Complex Algorithms

**❌ Bad - Algorithm in Use Case:**
```typescript
// Complex algorithm mixed with orchestration
export class GetPluginTracesUseCase {
    public async execute(filter: TraceFilter): Promise<TimelineNode[]> {
        const traces = await this.repository.getPluginTraces(filter);

        // ❌ Complex tree-building algorithm in use case
        const roots: TimelineNode[] = [];
        const depthStack: TimelineNode[] = [];

        for (const trace of traces) {
            const depth = trace.depth;
            const node = TimelineNode.create(trace, [], depth, 0, 0);

            if (depth === 0) {
                roots.push(node);
                depthStack[0] = node;
            } else {
                const parent = depthStack[depth - 1];
                if (parent) {
                    // Update parent, update stack, complex positioning logic...
                }
            }
        }

        // More positioning calculations...
        return roots;
    }
}
```

**✅ Good - Algorithm in Domain Service:**
```typescript
// Use case orchestrates, domain service contains algorithm
export class GetPluginTracesUseCase {
    constructor(
        private readonly repository: IPluginTraceRepository,
        private readonly hierarchyService: TimelineHierarchyService, // Domain service
        private readonly logger: ILogger
    ) {}

    public async execute(filter: TraceFilter): Promise<TimelineNode[]> {
        this.logger.info('Loading plugin traces', { filter });

        const traces = await this.repository.getPluginTraces(filter);

        // ✅ Delegate complex algorithm to domain service
        const timeline = this.hierarchyService.buildHierarchy(traces);

        this.logger.info('Plugin traces loaded', { count: traces.length });
        return timeline;
    }
}

// ✅ Domain service contains pure algorithm - easy to test
export class TimelineHierarchyService {
    buildHierarchy(traces: readonly PluginTrace[]): readonly TimelineNode[] {
        // Complex tree-building algorithm - pure, testable
        // ... (implementation details)
    }
}
```

---

## Domain Service vs Entity vs Use Case

### Decision Matrix

| Concern | Entity Method | Domain Service | Use Case |
|---------|--------------|----------------|----------|
| **Single entity logic** | ✅ Preferred | ❌ No | ❌ No |
| **Multi-entity logic** | ❌ No | ✅ Preferred | ❌ No |
| **Complex algorithm** | ⚠️ Maybe | ✅ Preferred | ❌ No |
| **Orchestration** | ❌ No | ❌ No | ✅ Preferred |
| **Repository calls** | ❌ No | ❌ No | ✅ Yes |
| **Logging** | ❌ No | ❌ No | ✅ Yes |
| **Pure logic** | ✅ Yes | ✅ Yes | ❌ No |
| **Stateless** | ⚠️ No | ✅ Yes | ⚠️ No |

---

### Example 1: Validation Logic

**Entity Method (Preferred for single entity):**
```typescript
export class Environment {
    // ✅ Entity method - validates own invariants
    public validateConfiguration(): ValidationResult {
        const errors: string[] = [];

        if (!this.name.getValue()) {
            errors.push('Environment name is required');
        }

        if (!this.dataverseUrl.getValue()) {
            errors.push('Dataverse URL is required');
        }

        // More validation...
        return new ValidationResult(errors.length === 0, errors, []);
    }
}
```

**Domain Service (Preferred for external context):**
```typescript
export class EnvironmentValidationService {
    // ✅ Domain service - validates with external context
    public validateForSave(
        environment: Environment,
        isNameUnique: boolean,        // External context
        hasExistingClientSecret: boolean,
        hasExistingPassword: boolean
    ): ValidationResult {
        const errors: string[] = [];

        // Delegate self-validation to entity
        const configResult = environment.validateConfiguration();
        if (!configResult.isValid) {
            errors.push(...configResult.errors);
        }

        // Validate with external context (can't be in entity)
        if (!isNameUnique) {
            errors.push('Environment name must be unique');
        }

        // More external validation...
        return new ValidationResult(errors.length === 0, errors, []);
    }
}
```

**Use Case (Orchestrates):**
```typescript
export class SaveEnvironmentUseCase {
    // ✅ Use case - orchestrates validation with external data
    public async execute(environment: Environment): Promise<void> {
        // Get external context
        const isNameUnique = await this.isNameUnique(environment);
        const hasExistingSecret = await this.hasStoredSecret(environment);

        // Delegate validation to domain service
        const validation = this.validationService.validateForSave(
            environment,
            isNameUnique,
            hasExistingSecret,
            false
        );

        if (!validation.isValid) {
            throw new ApplicationError(validation.errors[0] || 'Validation failed');
        }

        // Save...
    }
}
```

---

### Example 2: Collection Sorting

**Entity Method (Wrong):**
```typescript
// ❌ Static method on entity - should be domain service
export class Solution {
    public static sortSolutions(solutions: Solution[]): Solution[] {
        // Sorting logic here...
    }
}

// Usage in use case:
const sorted = Solution.sortSolutions(solutions); // ❌ Static utility on entity
```

**Domain Service (Correct):**
```typescript
// ✅ Domain service - stateless sorting logic
export class SolutionCollectionService {
    public sort(solutions: readonly Solution[]): readonly Solution[] {
        // Sorting logic here - pure, testable
        const sorted = [...solutions].sort((a, b) => {
            // Default solution first
            if (a.isDefault && !b.isDefault) return -1;
            if (!a.isDefault && b.isDefault) return 1;

            // Then alphabetically
            return a.friendlyName.localeCompare(b.friendlyName);
        });
        return sorted; // Defensive copy
    }
}
```

**Use Case (Orchestrates):**
```typescript
// ✅ Use case - orchestrates repository + sorting
export class ListSolutionsUseCase {
    public async execute(): Promise<Solution[]> {
        const solutions = await this.repository.getAll();

        // Delegate sorting to domain service
        const sorted = this.collectionService.sort(solutions);

        return sorted;
    }
}
```

---

## Domain Service Characteristics

### 1. Stateless

**✅ Correct - No instance state:**
```typescript
export class FlowConnectionRelationshipBuilder {
    // ✅ No instance variables - pure stateless service

    buildRelationships(
        flows: CloudFlow[],
        connectionRefs: ConnectionReference[]
    ): FlowConnectionRelationship[] {
        // All state passed as parameters
        const crMap = this.createCaseInsensitiveMap(connectionRefs);
        const usedCrs = new Set<string>();

        // Pure logic - no side effects
        return this.buildRelationshipsInternal(flows, crMap, usedCrs);
    }
}
```

**❌ Wrong - Stateful service:**
```typescript
// ❌ Stateful service - violates domain service principles
export class FlowConnectionRelationshipBuilder {
    private crMap: Map<string, ConnectionReference> = new Map(); // ❌ Instance state
    private usedCrs: Set<string> = new Set(); // ❌ Instance state

    buildRelationships(
        flows: CloudFlow[],
        connectionRefs: ConnectionReference[]
    ): FlowConnectionRelationship[] {
        // ❌ Mutates instance state - not thread-safe
        this.crMap = this.createCaseInsensitiveMap(connectionRefs);
        this.usedCrs.clear();

        // ❌ Side effects on instance variables
        return this.buildRelationshipsInternal(flows);
    }
}
```

---

### 2. Zero Infrastructure Dependencies

**✅ Correct - Pure domain logic:**
```typescript
export class ODataQueryBuilder {
    // ✅ No dependencies - pure function

    buildFromConditions(
        conditions: readonly FilterCondition[]
    ): string | undefined {
        // Pure logic - builds OData query from domain objects
        const enabled = conditions.filter(c => c.enabled);

        if (enabled.length === 0) {
            return undefined;
        }

        // Complex query building logic...
        return query;
    }
}
```

**❌ Wrong - Infrastructure dependencies:**
```typescript
// ❌ Infrastructure dependencies in domain service
export class ODataQueryBuilder {
    constructor(
        private readonly logger: ILogger, // ❌ Infrastructure
        private readonly repository: IPluginTraceRepository // ❌ Infrastructure
    ) {}

    buildFromConditions(
        conditions: readonly FilterCondition[]
    ): string | undefined {
        this.logger.debug('Building OData query'); // ❌ Logging in domain

        // ❌ Repository call in domain service
        const existingTraces = await this.repository.getAll();

        // Query building logic...
    }
}
```

---

### 3. Domain Vocabulary Only

**✅ Correct - Domain entities and value objects:**
```typescript
export class EnvironmentValidationService {
    // ✅ Uses domain entities (Environment) and value objects (ValidationResult)

    public validateForSave(
        environment: Environment,           // Domain entity
        isNameUnique: boolean,
        hasExistingClientSecret: boolean,
        hasExistingPassword: boolean,
        clientSecret?: string,
        password?: string
    ): ValidationResult {                   // Domain value object
        // Validation logic using domain concepts
        return new ValidationResult(isValid, errors, warnings);
    }
}
```

**❌ Wrong - DTOs or infrastructure types:**
```typescript
// ❌ DTOs in domain service
export class EnvironmentValidationService {
    public validateForSave(
        environmentDto: EnvironmentDto,     // ❌ DTO, not domain entity
        secretStorage: vscode.SecretStorage // ❌ Infrastructure type
    ): { isValid: boolean; errors: string[] } { // ❌ Plain object, not value object
        // Validation logic...
    }
}
```

---

## Common Domain Service Patterns

### Pattern 1: Collection Services (Sorting)

**Purpose:** Sort collections with business-specific rules

```typescript
export class SolutionCollectionService {
    /**
     * Sorts solutions with Default solution first, then alphabetically.
     *
     * Business Rule: Default solution must always appear first in UI.
     */
    public sort(solutions: readonly Solution[]): readonly Solution[] {
        const sorted = [...solutions].sort((a, b) => {
            // Default solution first
            if (a.isDefault && !b.isDefault) return -1;
            if (!a.isDefault && b.isDefault) return 1;

            // Then alphabetically by friendly name
            return a.friendlyName.localeCompare(b.friendlyName);
        });

        return sorted; // Return defensive copy
    }
}
```

#### Acceptable Structural Similarity in Collection Services

**Important:** Multiple collection services with similar structure is NOT problematic duplication.

**Why this pattern appears "duplicated" but is actually correct:**

1. **Each service encapsulates feature-specific business logic**
   - `SolutionCollectionService` sorts by Default priority, then name
   - `ImportJobCollectionService` sorts by in-progress priority, then date
   - `EnvironmentVariableCollectionService` sorts alphabetically by schema name
   - `FlowConnectionRelationshipCollectionService` sorts by flow name, then connection ref name
   - `ConnectionReferenceCollectionService` sorts by logical name
   - `CloudFlowCollectionService` sorts by name

2. **Defensive copy is an intentional pattern, not duplication**
   ```typescript
   // This appears in all collection services - it's a pattern, not duplication
   return [...items].sort((a, b) => /* comparison logic */);
   ```

3. **Comparison logic is NOT identical - each implements different business rules**
   - 3 services use simple single-field comparison
   - 3 services use complex multi-criteria comparison with priority logic

4. **Total actual code duplication: ~10 lines across 6 files (trivial)**
   - Structural similarity ≠ problematic duplication
   - Each service: 15-25 lines total
   - Abstraction would ADD complexity, not reduce it

**Why NOT to create a generic `CollectionService<T>`:**

❌ **Bad - Premature abstraction:**
```typescript
// ❌ Generic service forces complex callback interfaces
export class GenericCollectionService<T> {
    sort(items: T[], compareFn: (a: T, b: T) => number): T[] {
        return [...items].sort(compareFn);
    }
}

// Usage becomes more complex, not simpler
const service = new GenericCollectionService<Solution>();
const sorted = service.sort(solutions, (a, b) => {
    const priorityDiff = a.getSortPriority() - b.getSortPriority();
    if (priorityDiff !== 0) return priorityDiff;
    return a.friendlyName.localeCompare(b.friendlyName);
});
```

✅ **Good - Feature-specific service:**
```typescript
// ✅ Domain service encapsulates business logic clearly
export class SolutionCollectionService {
    sort(solutions: Solution[]): Solution[] {
        return [...solutions].sort((a, b) => {
            // Business rule explicit and type-safe
            const priorityDiff = a.getSortPriority() - b.getSortPriority();
            if (priorityDiff !== 0) return priorityDiff;
            return a.friendlyName.localeCompare(b.friendlyName);
        });
    }
}

// Usage is clear and simple
const sorted = collectionService.sort(solutions);
```

**When this pattern is acceptable:**
- ✅ Each service encapsulates feature-specific business rules
- ✅ Services are 15-25 lines (trivial size)
- ✅ Comparison logic differs between services
- ✅ Total code saved by abstraction: <20 lines across entire codebase
- ✅ Services follow Single Responsibility Principle

**When you should abstract:**
- ❌ Identical comparison logic repeated 3+ times
- ❌ Services exceed 50 lines with complex shared logic
- ❌ Abstraction saves >100 lines of duplicated code
- ❌ Generic solution doesn't compromise type safety or readability

**See also:**
- CLAUDE.md - Three Strikes Rule exceptions
- This is an exception to "refactor on 2nd duplication" - structural similarity is not problematic duplication

---

### Pattern 2: Relationship Builders

**Purpose:** Build complex relationships between entities

```typescript
export class FlowConnectionRelationshipBuilder {
    /**
     * Builds relationships between flows and connection references.
     *
     * Business Logic:
     * - Match flows to CRs by logical name (case-insensitive)
     * - Create flow-to-cr relationships for valid matches
     * - Create orphaned-flow relationships for missing CRs
     * - Create orphaned-cr relationships for unused CRs
     */
    buildRelationships(
        flows: CloudFlow[],
        connectionRefs: ConnectionReference[]
    ): FlowConnectionRelationship[] {
        const crByLogicalName = this.createCaseInsensitiveConnectionReferenceMap(connectionRefs);
        const usedCrLogicalNames = new Set<string>();

        const flowRelationships = this.buildFlowRelationships(
            flows,
            crByLogicalName,
            usedCrLogicalNames
        );

        const orphanedCrRelationships = this.buildOrphanedConnectionReferenceRelationships(
            connectionRefs,
            usedCrLogicalNames
        );

        return [...flowRelationships, ...orphanedCrRelationships];
    }

    private createCaseInsensitiveConnectionReferenceMap(
        connectionRefs: ConnectionReference[]
    ): Map<string, ConnectionReference> {
        return new Map(
            connectionRefs.map((cr) => [cr.connectionReferenceLogicalName.toLowerCase(), cr])
        );
    }

    // More private helper methods...
}
```

---

### Pattern 3: Validation Services

**Purpose:** Validate with external context that entities can't access

```typescript
export class EnvironmentValidationService {
    /**
     * Validates environment for save operation.
     *
     * This validation requires external context (name uniqueness, existing secrets)
     * that the Environment entity cannot access (Clean Architecture rules).
     */
    public validateForSave(
        environment: Environment,
        isNameUnique: boolean,              // External context
        hasExistingClientSecret: boolean,   // External context
        hasExistingPassword: boolean,       // External context
        clientSecret?: string,
        password?: string
    ): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Delegate entity self-validation
        const configResult = environment.validateConfiguration();
        if (!configResult.isValid) {
            errors.push(...configResult.errors);
        }

        // Validate with external context
        if (!isNameUnique) {
            errors.push('Environment name must be unique');
        }

        const authMethod = environment.getAuthenticationMethod();
        if (authMethod.requiresClientCredentials()) {
            if (!clientSecret && !hasExistingClientSecret) {
                errors.push('Client secret is required for Service Principal authentication');
            }
        }

        if (authMethod.requiresUsernamePassword()) {
            if (!password && !hasExistingPassword) {
                errors.push('Password is required for Username/Password authentication');
            }
        }

        return new ValidationResult(errors.length === 0, errors, warnings);
    }
}
```

---

### Pattern 4: Query Builders

**Purpose:** Build complex queries with domain-specific rules

```typescript
export class ODataQueryBuilder {
    /**
     * Builds OData filter from query builder conditions.
     *
     * Business Rules:
     * - Query builder conditions combined with AND or OR
     * - Empty/undefined values are ignored
     * - Single quotes in values are escaped as ''
     */
    public buildFromConditions(
        conditions: readonly FilterCondition[]
    ): string | undefined {
        const enabledConditions = conditions.filter(c => c.enabled);

        if (enabledConditions.length === 0) {
            return undefined;
        }

        const firstCondition = enabledConditions[0];
        if (!firstCondition) {
            return undefined;
        }

        const firstExpression = firstCondition.buildExpression();
        if (!firstExpression) {
            return undefined;
        }

        if (enabledConditions.length === 1) {
            return `(${firstExpression})`;
        }

        // Build query by chaining conditions with logical operators
        let query = `(${firstExpression})`;

        for (let i = 1; i < enabledConditions.length; i++) {
            const condition = enabledConditions[i];
            if (!condition) {
                continue;
            }

            const expression = condition.buildExpression();

            if (expression) {
                const operator = condition.logicalOperator === 'or' ? ' or ' : ' and ';
                query += `${operator}(${expression})`;
            }
        }

        return query;
    }
}
```

---

### Pattern 5: Hierarchy Builders

**Purpose:** Build tree structures from flat data

```typescript
export class TimelineHierarchyService {
    /**
     * Builds a hierarchical timeline from flat trace list.
     *
     * Algorithm:
     * 1. Sort traces chronologically
     * 2. Build parent-child relationships based on depth
     * 3. Calculate timeline positioning based on execution times
     */
    buildHierarchy(traces: readonly PluginTrace[]): readonly TimelineNode[] {
        if (traces.length === 0) {
            return [];
        }

        // Sort chronologically
        const sortedTraces = [...traces].sort((a, b) =>
            a.createdOn.getTime() - b.createdOn.getTime()
        );

        // Build parent-child relationships
        const roots = this.buildDepthBasedHierarchy(sortedTraces);

        // Calculate positioning
        const timelineStart = this.getTimelineStart(sortedTraces);
        const timelineEnd = this.getTimelineEnd(sortedTraces);
        const totalDuration = timelineEnd - timelineStart;

        if (totalDuration <= 0) {
            return roots.map(root => this.assignEqualPositioning(root));
        }

        return roots.map(root =>
            this.calculatePositioning(root, timelineStart, totalDuration)
        );
    }

    /**
     * Builds parent-child relationships based on execution depth.
     * Traces with depth N are children of the most recent trace with depth N-1.
     */
    private buildDepthBasedHierarchy(sortedTraces: readonly PluginTrace[]): TimelineNode[] {
        const roots: TimelineNode[] = [];
        const depthStack: TimelineNode[] = []; // Stack tracking current parent at each depth

        for (const trace of sortedTraces) {
            const depth = trace.depth;
            const node = TimelineNode.create(trace, [], depth, 0, 0);

            if (depth === 0) {
                // Root level trace
                roots.push(node);
                depthStack[0] = node;
            } else {
                // Child trace - find parent at depth-1
                const parent = depthStack[depth - 1];

                if (parent) {
                    // Add as child to parent
                    const updatedChildren = [...parent.children, node];
                    const updatedParent = parent.withChildren(updatedChildren);

                    depthStack[depth - 1] = updatedParent;
                    this.updateNodeInHierarchy(roots, parent, updatedParent);
                } else {
                    // Orphaned trace - treat as root
                    roots.push(node);
                }

                depthStack[depth] = node;
            }

            // Clear deeper levels
            depthStack.splice(depth + 1);
        }

        return roots;
    }
}
```

---

### Pattern 6: Transpiler Services

**Purpose:** Transform between domain-specific languages (DSLs) while keeping the domain layer pure

Transpiler services convert one query format to another (e.g., SQL ↔ FetchXML). Key design decisions:

1. **String-based XML parsing** - Use regex/string manipulation instead of XML libraries to avoid infrastructure dependencies
2. **Warning system** - Return warnings for features that can't be transpiled (unsupported but non-fatal)
3. **Bidirectional support** - Separate services for each direction with consistent interfaces

```typescript
/**
 * Transpiles FetchXML queries to SQL syntax.
 *
 * Design decisions:
 * - Uses string-based XML parsing (regex) to stay pure in domain layer
 * - Returns warnings for unsupported features (aggregates, distinct, paging)
 * - Does NOT execute queries - only transforms syntax
 */
export class FetchXmlToSqlTranspiler {
    /**
     * Transpiles FetchXML to SQL with optional warnings.
     *
     * @param fetchXml - Valid FetchXML query string
     * @returns SQL string + array of warnings for unsupported features
     */
    transpile(fetchXml: string): FetchXmlToSqlResult {
        const warnings: string[] = [];

        // Extract entity name using regex (no XML library)
        const entityMatch = fetchXml.match(/<entity\s+name=["']([^"']+)["']/i);
        if (!entityMatch) {
            return { sql: '', warnings: ['Could not find entity name'] };
        }
        const entityName = entityMatch[1];

        // Detect unsupported features and add warnings
        if (this.hasAggregate(fetchXml)) {
            warnings.push('Aggregate functions not supported in SQL preview');
        }
        if (this.hasDistinct(fetchXml)) {
            warnings.push('DISTINCT not supported in SQL preview');
        }

        // Build SQL from FetchXML structure
        const attributes = this.extractAttributes(fetchXml);
        const conditions = this.extractConditions(fetchXml);
        const orders = this.extractOrders(fetchXml);

        const sql = this.buildSql(entityName, attributes, conditions, orders);

        return { sql, warnings };
    }

    /**
     * String-based attribute extraction (keeps domain pure).
     */
    private extractAttributes(fetchXml: string): string[] {
        const attributes: string[] = [];
        // Regex-based extraction - no XML library needed
        const attrRegex = /<attribute\s+name=["']([^"']+)["']/gi;
        let match: RegExpExecArray | null;

        while ((match = attrRegex.exec(fetchXml)) !== null) {
            attributes.push(match[1]);
        }

        return attributes;
    }

    // ... additional private methods for conditions, orders, etc.
}

// Result type with warnings support
export interface FetchXmlToSqlResult {
    readonly sql: string;
    readonly warnings: readonly string[];
}
```

**Why String-Based Parsing?**

Domain services must have zero infrastructure dependencies. XML parsing libraries (DOMParser, xml2js) are infrastructure concerns:

```typescript
// ❌ Bad - Infrastructure dependency in domain
import { DOMParser } from 'xmldom';

export class FetchXmlToSqlTranspiler {
    transpile(fetchXml: string): string {
        const doc = new DOMParser().parseFromString(fetchXml, 'text/xml');
        // Uses external library - not pure domain
    }
}

// ✅ Good - String-based parsing keeps domain pure
export class FetchXmlToSqlTranspiler {
    transpile(fetchXml: string): FetchXmlToSqlResult {
        // Regex/string manipulation - no external dependencies
        const entityMatch = fetchXml.match(/<entity\s+name=["']([^"']+)["']/i);
        // Pure transformation logic
    }
}
```

**Companion Validator Service:**

Transpilers often pair with validators that check input validity before transformation:

```typescript
export class FetchXmlValidator {
    /**
     * Validates FetchXML structure without executing.
     * Uses string-based validation to stay in domain layer.
     */
    validate(fetchXml: string): FetchXmlValidationResult {
        const errors: string[] = [];

        // Check for required root element
        if (!fetchXml.includes('<fetch')) {
            errors.push('Missing <fetch> root element');
        }

        // Check for entity element
        if (!fetchXml.includes('<entity')) {
            errors.push('Missing <entity> element');
        }

        // Check for balanced tags (simplified)
        const openTags = (fetchXml.match(/<[^/][^>]*[^/]>/g) || []).length;
        const closeTags = (fetchXml.match(/<\/[^>]+>/g) || []).length;
        const selfClosing = (fetchXml.match(/<[^>]+\/>/g) || []).length;

        if (openTags !== closeTags + selfClosing) {
            errors.push('Unbalanced XML tags');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
```

**Testing Transpiler Services:**

```typescript
describe('FetchXmlToSqlTranspiler', () => {
    let transpiler: FetchXmlToSqlTranspiler;

    beforeEach(() => {
        transpiler = new FetchXmlToSqlTranspiler();
    });

    it('should transpile simple query', () => {
        const fetchXml = `
            <fetch>
                <entity name="account">
                    <attribute name="name" />
                    <attribute name="accountid" />
                </entity>
            </fetch>
        `;

        const result = transpiler.transpile(fetchXml);

        expect(result.sql).toBe('SELECT name, accountid FROM account');
        expect(result.warnings).toHaveLength(0);
    });

    it('should return warning for unsupported aggregate', () => {
        const fetchXml = `
            <fetch aggregate="true">
                <entity name="account">
                    <attribute name="name" aggregate="count" alias="count" />
                </entity>
            </fetch>
        `;

        const result = transpiler.transpile(fetchXml);

        expect(result.warnings).toContain('Aggregate functions not supported in SQL preview');
    });
});
```

---

## Production Examples

### Example 1: EnvironmentValidationService (Multi-Entity Validation)

**File**: `src/features/environmentSetup/domain/services/EnvironmentValidationService.ts`

```typescript
import { Environment } from '../entities/Environment';
import { ValidationResult } from '../valueObjects/ValidationResult';

/**
 * Domain service for complex environment validation logic.
 *
 * Validation logic that requires external data (name uniqueness, existing secrets)
 * doesn't belong in the Entity. This service coordinates validation while keeping
 * the Entity pure.
 */
export class EnvironmentValidationService {
    public validateForSave(
        environment: Environment,
        isNameUnique: boolean,
        hasExistingClientSecret: boolean,
        hasExistingPassword: boolean,
        clientSecret?: string,
        password?: string
    ): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Delegate entity self-validation
        const configResult = environment.validateConfiguration();
        if (!configResult.isValid) {
            errors.push(...configResult.errors);
        }

        // Validate with external context
        if (!isNameUnique) {
            errors.push('Environment name must be unique');
        }

        const authMethod = environment.getAuthenticationMethod();
        if (authMethod.requiresClientCredentials()) {
            if (!clientSecret && !hasExistingClientSecret) {
                errors.push('Client secret is required for Service Principal authentication');
            }
        }

        if (authMethod.requiresUsernamePassword()) {
            if (!password && !hasExistingPassword) {
                errors.push('Password is required for Username/Password authentication');
            }
        }

        return new ValidationResult(errors.length === 0, errors, warnings);
    }
}
```

---

### Example 2: FlowConnectionRelationshipBuilder (Relationship Building)

**File**: `src/features/connectionReferences/domain/services/FlowConnectionRelationshipBuilder.ts`

```typescript
import { CloudFlow } from '../entities/CloudFlow';
import { ConnectionReference } from '../entities/ConnectionReference';
import { FlowConnectionRelationship } from '../valueObjects/FlowConnectionRelationship';

/**
 * Domain service for building relationships between cloud flows and connection references.
 *
 * Determines three relationship types:
 * 1. flow-to-cr: Flow uses a connection reference that exists
 * 2. orphaned-flow: Flow references a CR that doesn't exist
 * 3. orphaned-cr: Connection reference exists but no flow uses it
 */
export class FlowConnectionRelationshipBuilder {
    buildRelationships(
        flows: CloudFlow[],
        connectionRefs: ConnectionReference[]
    ): FlowConnectionRelationship[] {
        const crByLogicalName = this.createCaseInsensitiveConnectionReferenceMap(connectionRefs);
        const usedCrLogicalNames = new Set<string>();

        const flowRelationships = this.buildFlowRelationships(
            flows,
            crByLogicalName,
            usedCrLogicalNames
        );

        const orphanedCrRelationships = this.buildOrphanedConnectionReferenceRelationships(
            connectionRefs,
            usedCrLogicalNames
        );

        return [...flowRelationships, ...orphanedCrRelationships];
    }

    /**
     * Power Platform treats connection reference logical names as case-insensitive.
     */
    private createCaseInsensitiveConnectionReferenceMap(
        connectionRefs: ConnectionReference[]
    ): Map<string, ConnectionReference> {
        return new Map(
            connectionRefs.map((cr) => [cr.connectionReferenceLogicalName.toLowerCase(), cr])
        );
    }

    private buildFlowRelationships(
        flows: CloudFlow[],
        crByLogicalName: Map<string, ConnectionReference>,
        usedCrLogicalNames: Set<string>
    ): FlowConnectionRelationship[] {
        const relationships: FlowConnectionRelationship[] = [];

        for (const flow of flows) {
            const crNames = flow.extractConnectionReferenceNames();

            if (crNames.length === 0) {
                continue;
            }

            const flowRelationships = this.buildRelationshipsForFlow(
                flow,
                crNames,
                crByLogicalName,
                usedCrLogicalNames
            );

            relationships.push(...flowRelationships);
        }

        return relationships;
    }

    // More private methods...
}
```

---

### Example 3: ODataQueryBuilder (Complex Query Construction)

**File**: `src/features/pluginTraceViewer/domain/services/ODataQueryBuilder.ts`

```typescript
import type { FilterCondition } from '../entities/FilterCondition';

/**
 * Domain Service: OData Query Builder
 *
 * Handles construction of OData v4 filter queries for plugin traces.
 * Encapsulates OData syntax knowledge, keeping domain entities focused on business logic.
 */
export class ODataQueryBuilder {
    /**
     * Builds OData filter from query builder conditions.
     * Each condition has its own logical operator (AND/OR) for chaining.
     */
    public buildFromConditions(
        conditions: readonly FilterCondition[]
    ): string | undefined {
        const enabledConditions = conditions.filter(c => c.enabled);

        if (enabledConditions.length === 0) {
            return undefined;
        }

        const firstCondition = enabledConditions[0];
        if (!firstCondition) {
            return undefined;
        }

        const firstExpression = firstCondition.buildExpression();
        if (!firstExpression) {
            return undefined;
        }

        if (enabledConditions.length === 1) {
            return `(${firstExpression})`;
        }

        // Build query by chaining conditions with their logical operators
        let query = `(${firstExpression})`;

        for (let i = 1; i < enabledConditions.length; i++) {
            const condition = enabledConditions[i];
            if (!condition) {
                continue;
            }

            const expression = condition.buildExpression();

            if (expression) {
                const operator = condition.logicalOperator === 'or' ? ' or ' : ' and ';
                query += `${operator}(${expression})`;
            }
        }

        return query;
    }

    /**
     * Escapes single quotes in OData string values.
     * OData requires single quotes to be escaped as ''
     */
    private escapeODataString(value: string): string {
        return value.replace(/'/g, "''");
    }
}
```

---

### Example 4: TimelineHierarchyService (Tree Building Algorithm)

**File**: `src/features/pluginTraceViewer/domain/services/TimelineHierarchyService.ts`

```typescript
import type { PluginTrace } from '../entities/PluginTrace';
import { TimelineNode } from '../valueObjects/TimelineNode';

/**
 * Domain service for building hierarchical timeline structures from plugin traces.
 * Handles parent-child relationships based on execution depth and timing.
 */
export class TimelineHierarchyService {
    /**
     * Builds a hierarchical timeline from flat trace list.
     * Groups traces by correlation ID and creates parent-child relationships based on depth.
     */
    buildHierarchy(traces: readonly PluginTrace[]): readonly TimelineNode[] {
        if (traces.length === 0) {
            return [];
        }

        // Sort traces chronologically by creation time
        const sortedTraces = [...traces].sort((a, b) =>
            a.createdOn.getTime() - b.createdOn.getTime()
        );

        // Build parent-child relationships based on depth
        const roots = this.buildDepthBasedHierarchy(sortedTraces);

        // Calculate timeline positioning for all nodes
        const timelineStart = this.getTimelineStart(sortedTraces);
        const timelineEnd = this.getTimelineEnd(sortedTraces);
        const totalDuration = timelineEnd - timelineStart;

        if (totalDuration <= 0) {
            return roots.map(root => this.assignEqualPositioning(root));
        }

        return roots.map(root =>
            this.calculatePositioning(root, timelineStart, totalDuration)
        );
    }

    /**
     * Builds parent-child relationships based on execution depth.
     * Traces with depth N are children of the most recent trace with depth N-1.
     */
    private buildDepthBasedHierarchy(sortedTraces: readonly PluginTrace[]): TimelineNode[] {
        const roots: TimelineNode[] = [];
        const depthStack: TimelineNode[] = []; // Stack tracking current parent at each depth

        for (const trace of sortedTraces) {
            const depth = trace.depth;
            const node = TimelineNode.create(trace, [], depth, 0, 0);

            if (depth === 0) {
                roots.push(node);
                depthStack[0] = node;
            } else {
                const parent = depthStack[depth - 1];

                if (parent) {
                    const updatedChildren = [...parent.children, node];
                    const updatedParent = parent.withChildren(updatedChildren);

                    depthStack[depth - 1] = updatedParent;
                    this.updateNodeInHierarchy(roots, parent, updatedParent);
                } else {
                    roots.push(node);
                }

                depthStack[depth] = node;
            }

            depthStack.splice(depth + 1);
        }

        return roots;
    }

    // More private methods...
}
```

---

## Acceptable Structural Similarity in Collection Services

### When Similar-Looking Services Are NOT Duplication

**Key principle:** Structural similarity ≠ code duplication. Collection services may look similar but encapsulate different business logic.

#### Characteristics of Acceptable Collection Service Pattern

✅ **Each service has distinct business rules:**
- Different sorting criteria (priority vs alphabetical vs chronological)
- Different comparison logic
- Different secondary sort keys
- Feature-specific domain knowledge

✅ **Small, focused services (15-25 lines):**
- Single responsibility (sorting only)
- No complex dependencies
- Pure, testable functions

✅ **Defensive copy pattern `[...items].sort()`:**
- Intentional pattern to prevent mutation
- Repeated across services by design
- Protects domain entities from side effects

#### Production Examples

**Example 1: SolutionCollectionService**
```typescript
// Business rule: Default solution first (by priority), then alphabetically by friendly name
export class SolutionCollectionService {
    sort(solutions: Solution[]): Solution[] {
        return [...solutions].sort((a, b) => {
            const priorityDiff = a.getSortPriority() - b.getSortPriority();
            if (priorityDiff !== 0) {
                return priorityDiff;
            }
            return a.friendlyName.localeCompare(b.friendlyName);
        });
    }
}
```

**Example 2: EnvironmentVariableCollectionService**
```typescript
// Business rule: Alphabetically by schema name (simple alphabetical)
export class EnvironmentVariableCollectionService {
    sort(variables: EnvironmentVariable[]): EnvironmentVariable[] {
        return [...variables].sort((a, b) => a.schemaName.localeCompare(b.schemaName));
    }
}
```

**Example 3: ImportJobCollectionService**
```typescript
// Business rule: In-progress jobs first (by priority), then by most recent creation date
export class ImportJobCollectionService {
    sort(jobs: ImportJob[]): ImportJob[] {
        return [...jobs].sort((a, b) => {
            const priorityDiff = a.getSortPriority() - b.getSortPriority();
            if (priorityDiff !== 0) {
                return priorityDiff;
            }
            // Most recent first (reverse chronological)
            return b.createdOn.getTime() - a.createdOn.getTime();
        });
    }
}
```

#### Why a Generic CollectionService<T> Would Be Worse

❌ **Generic approach sacrifices clarity and type safety:**

```typescript
// ❌ Generic approach - obscures business rules
export class GenericCollectionService<T> {
    sort(
        items: T[],
        compareFn: (a: T, b: T) => number
    ): T[] {
        return [...items].sort(compareFn);
    }
}

// Usage becomes verbose and unclear:
const solutionService = new GenericCollectionService<Solution>();
const sorted = solutionService.sort(solutions, (a, b) => {
    // Business logic scattered at call site - harder to test, harder to find
    const priorityDiff = a.getSortPriority() - b.getSortPriority();
    if (priorityDiff !== 0) return priorityDiff;
    return a.friendlyName.localeCompare(b.friendlyName);
});
```

**Problems with generic approach:**
1. Business logic scattered at call sites (not centralized)
2. Harder to test (logic spread across multiple locations)
3. Harder to discover (no dedicated service to search for)
4. No type-specific documentation (generic signature doesn't convey intent)
5. Minimal code savings (~3 lines per service)

✅ **Dedicated services are superior:**
- Business logic centralized and discoverable
- Easy to test (one service = one test file)
- Self-documenting (service name + method name conveys intent)
- Type-safe (no need for generic constraints)
- Feature-specific (can add feature-specific methods later)

#### When to Create Separate Collection Services

**Create separate service when:**
- Different entity types (Solution vs EnvironmentVariable vs ImportJob)
- Different sorting rules (even if structurally similar)
- Different business logic (priority, alphabetical, chronological, etc.)
- Different feature domains (each feature owns its sorting rules)

**Don't create generic abstraction when:**
- Services are <25 lines each
- Business logic is feature-specific
- Type safety would be compromised
- Abstraction adds complexity without real benefit

#### Testing Collection Services

Each collection service should have dedicated tests:

```typescript
describe('SolutionCollectionService', () => {
    it('should sort default solution first, then alphabetically', () => {
        const service = new SolutionCollectionService();
        const solutions = [
            createSolution('C', false),
            createSolution('A', false),
            createSolution('B', true)  // Default
        ];

        const sorted = service.sort(solutions);

        expect(sorted[0].friendlyName).toBe('B'); // Default first
        expect(sorted[1].friendlyName).toBe('A'); // Then alphabetical
        expect(sorted[2].friendlyName).toBe('C');
    });
});
```

**Benefits:**
- Business rules clearly documented in tests
- Easy to find and understand sorting logic
- Changes to business rules caught by tests
- Each service independently testable

---

## Anti-Patterns

### ❌ Anti-Pattern 1: Infrastructure Dependencies in Domain Service

**Bad:**
```typescript
// ❌ Infrastructure dependencies violate domain layer purity
export class FlowConnectionRelationshipBuilder {
    constructor(
        private readonly logger: ILogger,               // ❌ Infrastructure
        private readonly flowRepository: ICloudFlowRepository, // ❌ Infrastructure
        private readonly crRepository: IConnectionReferenceRepository // ❌ Infrastructure
    ) {}

    async buildRelationships(): Promise<FlowConnectionRelationship[]> {
        this.logger.info('Building relationships'); // ❌ Logging in domain

        // ❌ Repository calls in domain service
        const flows = await this.flowRepository.getAll();
        const crs = await this.crRepository.getAll();

        // Relationship logic...
    }
}
```

**Good:**
```typescript
// ✅ Pure domain service - no infrastructure dependencies
export class FlowConnectionRelationshipBuilder {
    // ✅ No dependencies - pure function

    buildRelationships(
        flows: CloudFlow[],             // Passed as parameters
        connectionRefs: ConnectionReference[]
    ): FlowConnectionRelationship[] {
        // ✅ Pure logic - no infrastructure calls
        const crMap = this.createCaseInsensitiveMap(connectionRefs);
        const usedCrs = new Set<string>();

        // Relationship logic...
        return relationships;
    }
}

// ✅ Use case handles infrastructure (repositories, logging)
export class ListConnectionReferencesUseCase {
    constructor(
        private readonly flowRepository: ICloudFlowRepository,
        private readonly crRepository: IConnectionReferenceRepository,
        private readonly relationshipBuilder: FlowConnectionRelationshipBuilder,
        private readonly logger: ILogger
    ) {}

    async execute(): Promise<FlowConnectionRelationship[]> {
        this.logger.info('Loading connection references');

        const flows = await this.flowRepository.getAll();
        const crs = await this.crRepository.getAll();

        // Delegate to domain service
        return this.relationshipBuilder.buildRelationships(flows, crs);
    }
}
```

---

### ❌ Anti-Pattern 2: Business Logic in Use Case (Should be Domain Service)

**Bad:**
```typescript
// ❌ Complex business logic in use case - hard to test, can't reuse
export class GetPluginTracesUseCase {
    async execute(filter: TraceFilter): Promise<TimelineNode[]> {
        const traces = await this.repository.getPluginTraces(filter);

        // ❌ Complex tree-building algorithm in use case
        const roots: TimelineNode[] = [];
        const depthStack: TimelineNode[] = [];

        for (const trace of traces) {
            const depth = trace.depth;
            const node = TimelineNode.create(trace, [], depth, 0, 0);

            if (depth === 0) {
                roots.push(node);
                depthStack[0] = node;
            } else {
                const parent = depthStack[depth - 1];
                if (parent) {
                    const updatedChildren = [...parent.children, node];
                    const updatedParent = parent.withChildren(updatedChildren);
                    depthStack[depth - 1] = updatedParent;
                    this.updateNodeInHierarchy(roots, parent, updatedParent);
                } else {
                    roots.push(node);
                }
                depthStack[depth] = node;
            }
            depthStack.splice(depth + 1);
        }

        // ❌ More complex positioning calculations in use case...
        return roots;
    }
}
```

**Good:**
```typescript
// ✅ Use case orchestrates, domain service contains business logic
export class GetPluginTracesUseCase {
    constructor(
        private readonly repository: IPluginTraceRepository,
        private readonly hierarchyService: TimelineHierarchyService, // Domain service
        private readonly logger: ILogger
    ) {}

    async execute(filter: TraceFilter): Promise<TimelineNode[]> {
        this.logger.info('Loading plugin traces');

        const traces = await this.repository.getPluginTraces(filter);

        // ✅ Delegate complex logic to domain service
        const timeline = this.hierarchyService.buildHierarchy(traces);

        this.logger.info('Plugin traces loaded', { count: traces.length });
        return timeline;
    }
}

// ✅ Domain service contains pure, testable business logic
export class TimelineHierarchyService {
    buildHierarchy(traces: readonly PluginTrace[]): readonly TimelineNode[] {
        // Complex tree-building algorithm - pure, testable, reusable
        // ... (implementation)
    }
}
```

---

### ❌ Anti-Pattern 3: Stateful Domain Service

**Bad:**
```typescript
// ❌ Stateful service - not thread-safe, violates domain service principles
export class ODataQueryBuilder {
    private conditions: FilterCondition[] = []; // ❌ Instance state
    private query: string = ''; // ❌ Instance state

    public addCondition(condition: FilterCondition): void {
        this.conditions.push(condition); // ❌ Mutates state
    }

    public build(): string {
        this.query = ''; // ❌ Mutates state

        for (const condition of this.conditions) {
            this.query += condition.buildExpression(); // ❌ Side effects
        }

        return this.query;
    }
}
```

**Good:**
```typescript
// ✅ Stateless service - pure functions
export class ODataQueryBuilder {
    // ✅ No instance variables

    public buildFromConditions(
        conditions: readonly FilterCondition[]
    ): string | undefined {
        // ✅ All state passed as parameters
        const enabledConditions = conditions.filter(c => c.enabled);

        if (enabledConditions.length === 0) {
            return undefined;
        }

        // ✅ Pure logic - no side effects
        let query = this.buildFirstExpression(enabledConditions[0]);

        for (let i = 1; i < enabledConditions.length; i++) {
            query += this.chainCondition(enabledConditions[i]);
        }

        return query;
    }
}
```

---

## Testing Domain Services

### Test Coverage Checklist

For each domain service, test:

✅ **Happy path** - Service works with valid inputs
✅ **Edge cases** - Empty inputs, single item, large collections
✅ **Business rules** - All business logic paths covered
✅ **Pure functions** - No side effects, same input = same output
✅ **Defensive copies** - Original inputs not modified

### Example Test: FlowConnectionRelationshipBuilder

```typescript
import { FlowConnectionRelationshipBuilder } from './FlowConnectionRelationshipBuilder';
import { CloudFlow } from '../entities/CloudFlow';
import { ConnectionReference } from '../entities/ConnectionReference';

describe('FlowConnectionRelationshipBuilder', () => {
    let builder: FlowConnectionRelationshipBuilder;

    beforeEach(() => {
        builder = new FlowConnectionRelationshipBuilder();
    });

    describe('buildRelationships', () => {
        it('should build flow-to-cr relationships for matching references', () => {
            const flow = createMockCloudFlow({ crNames: ['cr_sharepoint'] });
            const cr = createMockConnectionReference({ logicalName: 'cr_sharepoint' });

            const relationships = builder.buildRelationships([flow], [cr]);

            expect(relationships).toHaveLength(1);
            expect(relationships[0]?.type).toBe('flow-to-cr');
            expect(relationships[0]?.flow).toBe(flow);
            expect(relationships[0]?.connectionReference).toBe(cr);
        });

        it('should create orphaned-flow relationship for missing CR', () => {
            const flow = createMockCloudFlow({ crNames: ['cr_missing'] });
            const cr = createMockConnectionReference({ logicalName: 'cr_other' });

            const relationships = builder.buildRelationships([flow], [cr]);

            const orphanedFlow = relationships.find(r => r.type === 'orphaned-flow');
            expect(orphanedFlow).toBeDefined();
            expect(orphanedFlow?.flow).toBe(flow);
            expect(orphanedFlow?.missingCrName).toBe('cr_missing');
        });

        it('should create orphaned-cr relationship for unused CR', () => {
            const flow = createMockCloudFlow({ crNames: ['cr_sharepoint'] });
            const usedCr = createMockConnectionReference({ logicalName: 'cr_sharepoint' });
            const unusedCr = createMockConnectionReference({ logicalName: 'cr_unused' });

            const relationships = builder.buildRelationships([flow], [usedCr, unusedCr]);

            const orphanedCr = relationships.find(r => r.type === 'orphaned-cr');
            expect(orphanedCr).toBeDefined();
            expect(orphanedCr?.connectionReference).toBe(unusedCr);
        });

        it('should match CRs case-insensitively', () => {
            const flow = createMockCloudFlow({ crNames: ['CR_SHAREPOINT'] }); // Uppercase
            const cr = createMockConnectionReference({ logicalName: 'cr_sharepoint' }); // Lowercase

            const relationships = builder.buildRelationships([flow], [cr]);

            expect(relationships).toHaveLength(1);
            expect(relationships[0]?.type).toBe('flow-to-cr');
        });

        it('should handle empty flows and CRs', () => {
            const relationships = builder.buildRelationships([], []);

            expect(relationships).toHaveLength(0);
        });

        it('should not modify original arrays (defensive copy)', () => {
            const flows = [createMockCloudFlow({ crNames: ['cr1'] })];
            const crs = [createMockConnectionReference({ logicalName: 'cr1' })];

            const originalFlowsLength = flows.length;
            const originalCrsLength = crs.length;

            builder.buildRelationships(flows, crs);

            expect(flows).toHaveLength(originalFlowsLength);
            expect(crs).toHaveLength(originalCrsLength);
        });
    });
});
```

---

## Summary

### Domain Service Checklist

When creating a domain service, ensure:

✅ **Stateless**: No instance variables, pure functions
✅ **Pure logic**: Business rules only, no infrastructure
✅ **Zero dependencies**: No repositories, logging, or external services
✅ **Domain vocabulary**: Uses entities and value objects
✅ **Testable**: Easy to test with simple inputs/outputs
✅ **Well-named**: Name describes what it does (not "Manager" or "Helper")

### Decision Tree

```
Is this business logic?
├─ No → Infrastructure service or utility
└─ Yes → Does it involve multiple entities?
   ├─ No → Single entity?
   │  └─ Yes → Entity method
   └─ Yes → Does it orchestrate repositories/external services?
      ├─ Yes → Use Case (application layer)
      └─ No → Domain Service (pure logic, no infrastructure)
```

### Common Mistakes

❌ **Don't:**
- Add infrastructure dependencies (repositories, logging)
- Put orchestration logic in domain services
- Create stateful services with instance variables
- Put business logic in use cases

✅ **Do:**
- Keep services stateless and pure
- Delegate complex logic from use cases to domain services
- Use domain services for multi-entity operations
- Test domain services with simple unit tests

---

**See Also:**
- [VALUE_OBJECT_PATTERNS.md](VALUE_OBJECT_PATTERNS.md) - When logic doesn't fit in entities
- [CLEAN_ARCHITECTURE_GUIDE.md](CLEAN_ARCHITECTURE_GUIDE.md) - Domain services in Clean Architecture
- [ODATA_DOMAIN_PATTERN.md](ODATA_DOMAIN_PATTERN.md) - OData query building in domain
- [MAPPER_PATTERNS.md](MAPPER_PATTERNS.md) - When to delegate to domain services for sorting
