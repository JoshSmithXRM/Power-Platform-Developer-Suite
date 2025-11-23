# Value Object Patterns

**Master guide for value object design and implementation in the Power Platform Developer Suite.**

Value objects are immutable, validated, domain primitives that encapsulate business rules and prevent primitive obsession. This guide shows when to use them, how to implement them correctly, and common pitfalls to avoid.

---

## Quick Reference

### When to Use Value Objects

✅ **DO use value objects when:**
- Primitive obsession: Passing raw strings/numbers that need validation
- Domain vocabulary: `EnvironmentId` is more expressive than `string`
- Validation rules: Business rules for what constitutes a valid value
- Value equality: Two objects are equal if their values match (not reference equality)
- Immutability: Value never changes after construction

❌ **DON'T use value objects when:**
- Simple pass-through values with no validation
- Mutable data that changes after construction
- Objects with behavior methods (that's an entity)
- Complex objects with multiple concerns (that's an entity)

### Core Principles

1. **Immutable** - All properties readonly, no setters
2. **Validated** - Constructor validates, throws DomainError if invalid
3. **Value equality** - `equals()` method compares values, not references
4. **Self-contained** - All validation logic encapsulated
5. **Static factories** - Prefer static factory methods over multiple constructors

### Anti-Patterns to Avoid

❌ **Anemic value objects** (no validation)
❌ **Mutable value objects** (properties can change)
❌ **Value objects with behavior methods** (should be entities)
❌ **Multiple constructors** (use static factories instead)
❌ **External validation** (validation should be in the value object)

---

## Table of Contents

1. [When to Use Value Objects](#when-to-use-value-objects)
2. [Core Principles](#core-principles-1)
3. [Validation Patterns](#validation-patterns)
4. [Static Factory Patterns](#static-factory-patterns)
5. [Immutability Enforcement](#immutability-enforcement)
6. [Value Equality](#value-equality)
7. [Production Examples](#production-examples)
8. [Anti-Patterns](#anti-patterns)
9. [Testing Value Objects](#testing-value-objects)

---

## When to Use Value Objects

### Primitive Obsession Problem

**❌ Bad - Primitive Obsession:**
```typescript
// Use case with raw strings - no validation, no domain meaning
export class CreateEnvironmentUseCase {
    public async execute(name: string, id: string, url: string): Promise<void> {
        // What if name is empty? What if id is invalid? What if url is malformed?
        // Validation scattered across use cases, or worse - not done at all
        if (!name || name.trim() === '') {
            throw new ApplicationError('Name cannot be empty');
        }
        // ... more validation ...
    }
}
```

**✅ Good - Value Objects:**
```typescript
// Value objects encapsulate validation and domain meaning
export class CreateEnvironmentUseCase {
    public async execute(
        name: EnvironmentName,      // Validated, max 100 chars, trimmed
        id: EnvironmentId,           // Validated, non-empty
        url: DataverseUrl            // Validated, HTTPS only, URL format
    ): Promise<void> {
        // If we got here, all values are valid - no defensive checks needed
        // Domain vocabulary makes code self-documenting
    }
}
```

### Decision Tree: Value Object vs Primitive

```
Is this a domain concept?
├─ No → Use primitive (e.g., loop counter, temp variables)
└─ Yes → Does it have validation rules?
   ├─ No → Consider using primitive with type alias
   └─ Yes → USE VALUE OBJECT
      └─ Multiple validation rules? → Definitely value object
```

### Common Value Object Candidates

**Identifiers:**
- EnvironmentId, PluginTraceId, CorrelationId
- GUIDs that need format validation

**Names:**
- EnvironmentName, EntityName, AttributeName
- User-visible strings with length/format constraints

**URLs:**
- DataverseUrl, MakerUrl, PowerPlatformUrl
- URLs with protocol requirements (HTTPS only)

**Domain Enums:**
- FilterField, FilterOperator, PipelineStage
- Fixed set of valid values with display names

**Validation Constraints:**
- ProtectedKeyPattern (regex pattern matching)
- DateTimeFilter (date range validation)
- Duration (non-negative milliseconds)

---

## Core Principles

### 1. Immutability

**All value object properties must be readonly:**

```typescript
export class EnvironmentName {
    private readonly value: string; // ✅ Readonly - cannot change after construction

    constructor(value: string) {
        if (!value || value.trim() === '') {
            throw new DomainError('Environment name cannot be empty');
        }
        this.value = value.trim(); // Set once, never changes
    }

    // ✅ Getter only, no setter
    public getValue(): string {
        return this.value;
    }

    // ❌ NO SETTERS - would violate immutability
    // public setValue(value: string): void { ... } // NEVER DO THIS
}
```

**Why immutability?**
- **Thread-safe**: Can be shared across async operations without race conditions
- **Predictable**: Value never changes, easy to reason about
- **Cacheable**: Can safely cache references
- **DDD principle**: Values are defined by their attributes, not identity

---

### 2. Constructor Validation

**Validate all business rules in the constructor:**

```typescript
export class EnvironmentName {
    /**
     * Maximum allowed length for environment names.
     * Prevents excessively long names that could cause UI/storage issues.
     */
    private static readonly MAX_LENGTH = 100;

    private readonly value: string;

    constructor(value: string) {
        // ✅ Validate: Non-empty
        if (!value || value.trim() === '') {
            throw new DomainError('Environment name cannot be empty');
        }

        // ✅ Validate: Max length
        if (value.length > EnvironmentName.MAX_LENGTH) {
            throw new DomainError(
                `Environment name cannot exceed ${EnvironmentName.MAX_LENGTH} characters`
            );
        }

        // ✅ Normalize: Trim whitespace
        this.value = value.trim();
    }

    public getValue(): string {
        return this.value;
    }
}
```

**Key points:**
- **Fail fast**: Constructor throws immediately if invalid
- **DomainError**: Use domain exceptions (not ApplicationError)
- **Clear messages**: Explain *what* is wrong and *why* it's invalid
- **Named constants**: Magic numbers become self-documenting

---

### 3. Value Equality

**Implement `equals()` method for value comparison:**

```typescript
export class EnvironmentId {
    private readonly value: string;

    constructor(value: string) {
        if (!value || value.trim() === '') {
            throw new DomainError('Environment ID cannot be empty');
        }
        this.value = value;
    }

    public getValue(): string {
        return this.value;
    }

    // ✅ Value equality: Compare the values, not references
    public equals(other: EnvironmentId): boolean {
        return this.value === other.value;
    }
}

// Usage:
const id1 = new EnvironmentId('env-123');
const id2 = new EnvironmentId('env-123');
const id3 = new EnvironmentId('env-456');

id1 === id2;        // ❌ false (different references)
id1.equals(id2);    // ✅ true (same value)
id1.equals(id3);    // ✅ false (different value)
```

**Flexible equality:**
```typescript
export class EnvironmentName {
    private readonly value: string;

    constructor(value: string) {
        // ... validation ...
        this.value = value.trim();
    }

    public getValue(): string {
        return this.value;
    }

    // ✅ Accept both value objects and raw strings
    public equals(other: string | EnvironmentName): boolean {
        const otherValue = typeof other === 'string' ? other : other.getValue();
        return this.value === otherValue; // Case-sensitive comparison
    }
}
```

---

## Validation Patterns

### Pattern 1: Simple Validation (Non-Empty String)

```typescript
export class EnvironmentId {
    private readonly value: string;

    constructor(value: string) {
        if (!value || value.trim() === '') {
            throw new DomainError('Environment ID cannot be empty');
        }
        this.value = value;
    }

    public getValue(): string {
        return this.value;
    }

    public equals(other: EnvironmentId): boolean {
        return this.value === other.value;
    }
}
```

---

### Pattern 2: Length Constraints

```typescript
export class EnvironmentName {
    private static readonly MAX_LENGTH = 100;

    private readonly value: string;

    constructor(value: string) {
        if (!value || value.trim() === '') {
            throw new DomainError('Environment name cannot be empty');
        }
        if (value.length > EnvironmentName.MAX_LENGTH) {
            throw new DomainError(
                `Environment name cannot exceed ${EnvironmentName.MAX_LENGTH} characters`
            );
        }
        this.value = value.trim(); // Normalize: trim whitespace
    }

    public getValue(): string {
        return this.value;
    }

    // ✅ Helper method for programmatic validation
    public isValid(): boolean {
        return this.value.length > 0 && this.value.length <= EnvironmentName.MAX_LENGTH;
    }

    public equals(other: string | EnvironmentName): boolean {
        const otherValue = typeof other === 'string' ? other : other.getValue();
        return this.value === otherValue;
    }
}
```

---

### Pattern 3: Format Validation (GUID, URL, etc.)

```typescript
export class DataverseUrl {
    private static readonly HTTPS_PROTOCOL = 'https://';
    private static readonly DATAVERSE_DOMAIN_PATTERN = /\.crm\d*\.dynamics\.com$/i;

    private readonly value: string;

    constructor(value: string) {
        if (!value || value.trim() === '') {
            throw new DomainError('Dataverse URL cannot be empty');
        }

        // ✅ Validate: Must be HTTPS
        if (!value.startsWith(DataverseUrl.HTTPS_PROTOCOL)) {
            throw new DomainError('Dataverse URL must use HTTPS protocol');
        }

        // ✅ Validate: Must be valid URL
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(value);
        } catch {
            throw new DomainError('Invalid Dataverse URL format');
        }

        // ✅ Validate: Must be Dataverse domain
        if (!DataverseUrl.DATAVERSE_DOMAIN_PATTERN.test(parsedUrl.hostname)) {
            throw new DomainError('URL must be a valid Dataverse domain (*.crm*.dynamics.com)');
        }

        this.value = value.trim();
    }

    public getValue(): string {
        return this.value;
    }

    public equals(other: DataverseUrl): boolean {
        return this.value === other.value;
    }
}
```

---

### Pattern 4: Enum-Like Value Objects

```typescript
/**
 * Value Object: Filter Field
 * Represents a filterable field in plugin traces.
 * Maps display names to OData field names.
 *
 * Enum-like pattern: Fixed set of allowed values with metadata.
 */
export class FilterField {
    private constructor(
        public readonly displayName: string,
        public readonly odataName: string,
        public readonly fieldType: 'text' | 'enum' | 'date' | 'number' | 'boolean' | 'guid'
    ) {}

    // ✅ Static instances: All valid fields pre-defined
    static readonly Id = new FilterField('Trace ID', 'plugintracelogid', 'guid');
    static readonly CreatedOn = new FilterField('Created On', 'createdon', 'date');
    static readonly PluginName = new FilterField('Plugin Name', 'typename', 'text');
    static readonly MessageName = new FilterField('Message Name', 'messagename', 'text');
    static readonly Duration = new FilterField('Duration (ms)', 'performanceexecutionduration', 'number');

    /**
     * All available filter fields.
     */
    static readonly All = [
        FilterField.Id,
        FilterField.CreatedOn,
        FilterField.PluginName,
        FilterField.MessageName,
        FilterField.Duration,
        // ... more fields
    ];

    /**
     * Gets field by OData name.
     */
    static fromODataName(odataName: string): FilterField | undefined {
        return FilterField.All.find(f => f.odataName === odataName);
    }

    /**
     * Gets field by display name.
     */
    static fromDisplayName(displayName: string): FilterField | undefined {
        return FilterField.All.find(f => f.displayName === displayName);
    }

    equals(other: FilterField | null): boolean {
        return other !== null && this.odataName === other.odataName;
    }
}
```

**Why not a simple enum?**
- **Rich metadata**: Each value has display name, OData name, type
- **Lookup methods**: `fromODataName()`, `fromDisplayName()`
- **Type safety**: Field type constrains allowed operators
- **Extensible**: Easy to add new fields without breaking existing code

---

### Pattern 5: Regex Pattern Matching

```typescript
/**
 * Value object representing a pattern for matching protected storage keys.
 *
 * Supports wildcard patterns for flexible key protection:
 * - Exact match: `power-platform-dev-suite-environments`
 * - Wildcard: `power-platform-dev-suite-*` (matches all extension keys)
 */
export class ProtectedKeyPattern {
    private constructor(private readonly _pattern: string) {}

    public static create(pattern: string): ProtectedKeyPattern {
        return new ProtectedKeyPattern(pattern);
    }

    /**
     * Checks if a key matches this pattern (supports wildcards).
     *
     * Implementation:
     * - Converts wildcard `*` to regex `.*`
     * - Escapes other regex metacharacters for literal matching
     * - Anchors pattern with `^` and `$` for exact matching
     */
    public matches(key: string): boolean {
        if (this._pattern.includes('*')) {
            // Escape regex metacharacters, then replace \* with .*
            const escaped = this._pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp('^' + escaped.replace(/\\\*/g, '.*') + '$');
            return regex.test(key);
        }

        return key === this._pattern;
    }
}

// Usage:
const pattern = ProtectedKeyPattern.create('power-platform-dev-suite-*');
pattern.matches('power-platform-dev-suite-environments');  // true
pattern.matches('power-platform-dev-suite-secret-abc');    // true
pattern.matches('other-extension-key');                    // false
```

---

## Static Factory Patterns

### Pattern 1: Generation (IDs, GUIDs)

```typescript
export class EnvironmentId {
    private constructor(private readonly value: string) {
        if (!value || value.trim() === '') {
            throw new DomainError('Environment ID cannot be empty');
        }
    }

    /**
     * Radix (base) for generating alphanumeric random strings.
     * Base 36 includes digits 0-9 and letters a-z.
     */
    private static readonly RANDOM_STRING_RADIX = 36;

    /**
     * Start index for extracting random substring (skip "0." prefix from Math.random).
     */
    private static readonly RANDOM_SUBSTRING_START = 2;

    /**
     * End index for extracting random substring (9 characters for uniqueness).
     */
    private static readonly RANDOM_SUBSTRING_END = 11;

    /**
     * Generates a new unique environment ID.
     *
     * Format: `env-{timestamp}-{random}`
     *
     * Provides collision-resistant IDs without external dependencies.
     * Timestamp ensures chronological ordering; random suffix prevents collisions.
     *
     * @returns {EnvironmentId} New unique environment ID
     */
    public static generate(): EnvironmentId {
        const timestamp = Date.now();
        const random = Math.random()
            .toString(EnvironmentId.RANDOM_STRING_RADIX)
            .substring(
                EnvironmentId.RANDOM_SUBSTRING_START,
                EnvironmentId.RANDOM_SUBSTRING_END
            );
        return new EnvironmentId(`env-${timestamp}-${random}`);
    }

    // ✅ Still allow constructing from existing ID
    public static from(value: string): EnvironmentId {
        return new EnvironmentId(value);
    }

    public getValue(): string {
        return this.value;
    }

    public equals(other: EnvironmentId): boolean {
        return this.value === other.value;
    }
}

// Usage:
const newId = EnvironmentId.generate();           // env-1699564800000-abc123def
const existingId = EnvironmentId.from('env-123'); // Validate existing ID
```

---

### Pattern 2: Try-Parse (Safe Construction)

```typescript
export class DataverseUrl {
    private constructor(private readonly value: string) {
        // ... validation ...
    }

    /**
     * Creates a DataverseUrl, throwing on invalid input.
     */
    public static from(value: string): DataverseUrl {
        return new DataverseUrl(value);
    }

    /**
     * Attempts to create a DataverseUrl, returning null if invalid.
     * Useful when validation failure is expected and should be handled gracefully.
     */
    public static tryParse(value: string): DataverseUrl | null {
        try {
            return new DataverseUrl(value);
        } catch {
            return null;
        }
    }

    public getValue(): string {
        return this.value;
    }
}

// Usage:
try {
    const url = DataverseUrl.from('https://org.crm.dynamics.com'); // Throws if invalid
} catch (error) {
    // Handle validation error
}

// Or:
const url = DataverseUrl.tryParse(userInput); // Returns null if invalid
if (url === null) {
    // Handle validation error
}
```

---

## Immutability Enforcement

### Readonly Properties

```typescript
export class EnvironmentName {
    // ✅ Private + readonly = Cannot be changed from outside or inside
    private readonly value: string;

    constructor(value: string) {
        // ... validation ...
        this.value = value.trim();
    }

    // ✅ Getter only - no setter
    public getValue(): string {
        return this.value;
    }
}
```

### Defensive Copies (Arrays, Objects)

```typescript
export class ProtectedKeyPatterns {
    // ✅ Readonly array - but array contents can still be modified!
    private readonly patterns: ProtectedKeyPattern[];

    constructor(patterns: ProtectedKeyPattern[]) {
        // ✅ Defensive copy: Create new array, don't store reference
        this.patterns = [...patterns];
    }

    // ✅ Defensive copy on return: Don't expose internal array
    public getPatterns(): ReadonlyArray<ProtectedKeyPattern> {
        return [...this.patterns];
    }
}
```

**Why defensive copies?**
```typescript
// ❌ Without defensive copy:
const patterns = [pattern1, pattern2];
const vo = new ProtectedKeyPatterns(patterns);
patterns.push(pattern3); // Modifies VO's internal state!

// ✅ With defensive copy:
const patterns = [pattern1, pattern2];
const vo = new ProtectedKeyPatterns(patterns);
patterns.push(pattern3); // Doesn't affect VO - it has its own copy
```

---

## Value Equality

### Simple Value Equality

```typescript
export class EnvironmentId {
    private readonly value: string;

    constructor(value: string) {
        // ... validation ...
    }

    public getValue(): string {
        return this.value;
    }

    // ✅ Compare values, not references
    public equals(other: EnvironmentId): boolean {
        return this.value === other.value;
    }
}
```

### Flexible Equality (String or Value Object)

```typescript
export class EnvironmentName {
    private readonly value: string;

    constructor(value: string) {
        // ... validation ...
        this.value = value.trim();
    }

    public getValue(): string {
        return this.value;
    }

    // ✅ Accept both value objects and raw strings for convenience
    public equals(other: string | EnvironmentName): boolean {
        const otherValue = typeof other === 'string' ? other : other.getValue();
        return this.value === otherValue; // Case-sensitive
    }
}

// Usage:
const name = new EnvironmentName('Production');
name.equals('Production');              // true
name.equals(new EnvironmentName('Production')); // true
```

### Complex Value Equality (Multiple Fields)

```typescript
export class FilterField {
    private constructor(
        public readonly displayName: string,
        public readonly odataName: string,
        public readonly fieldType: string
    ) {}

    // ✅ Two fields are equal if their OData names match
    // (Display name and type are metadata, not identity)
    equals(other: FilterField | null): boolean {
        return other !== null && this.odataName === other.odataName;
    }
}
```

---

## Production Examples

### Example 1: EnvironmentId (Simple Validation + Generation)

**File**: `src/features/environmentSetup/domain/valueObjects/EnvironmentId.ts`

```typescript
import { DomainError } from '../errors/DomainError';

/**
 * Value object representing an immutable environment identifier.
 *
 * Provides type-safe identifier for environments instead of raw strings.
 * Ensures non-empty values and provides factory method for generation.
 */
export class EnvironmentId {
    private readonly value: string;

    constructor(value: string) {
        if (!value || value.trim() === '') {
            throw new DomainError('Environment ID cannot be empty');
        }
        this.value = value;
    }

    private static readonly RANDOM_STRING_RADIX = 36;
    private static readonly RANDOM_SUBSTRING_START = 2;
    private static readonly RANDOM_SUBSTRING_END = 11;

    /**
     * Generates a new unique environment ID.
     * Format: `env-{timestamp}-{random}`
     */
    public static generate(): EnvironmentId {
        const timestamp = Date.now();
        const random = Math.random()
            .toString(EnvironmentId.RANDOM_STRING_RADIX)
            .substring(
                EnvironmentId.RANDOM_SUBSTRING_START,
                EnvironmentId.RANDOM_SUBSTRING_END
            );
        return new EnvironmentId(`env-${timestamp}-${random}`);
    }

    public getValue(): string {
        return this.value;
    }

    public equals(other: EnvironmentId): boolean {
        return this.value === other.value;
    }
}
```

---

### Example 2: EnvironmentName (Length Constraints + Normalization)

**File**: `src/features/environmentSetup/domain/valueObjects/EnvironmentName.ts`

```typescript
import { DomainError } from '../errors/DomainError';

/**
 * Value object representing an environment name.
 *
 * Business Rules:
 * - Must be non-empty (trimmed)
 * - Maximum 100 characters
 * - Uniqueness is case-sensitive
 * - Leading/trailing whitespace is trimmed
 */
export class EnvironmentName {
    private static readonly MAX_LENGTH = 100;

    private readonly value: string;

    constructor(value: string) {
        if (!value || value.trim() === '') {
            throw new DomainError('Environment name cannot be empty');
        }
        if (value.length > EnvironmentName.MAX_LENGTH) {
            throw new DomainError(
                `Environment name cannot exceed ${EnvironmentName.MAX_LENGTH} characters`
            );
        }
        this.value = value.trim();
    }

    public getValue(): string {
        return this.value;
    }

    public isValid(): boolean {
        return this.value.length > 0 && this.value.length <= EnvironmentName.MAX_LENGTH;
    }

    public equals(other: string | EnvironmentName): boolean {
        const otherValue = typeof other === 'string' ? other : other.getValue();
        return this.value === otherValue; // Case-sensitive
    }
}
```

---

### Example 3: FilterField (Enum-Like with Metadata)

**File**: `src/features/pluginTraceViewer/domain/valueObjects/FilterField.ts`

```typescript
/**
 * Value Object: Filter Field
 * Represents a filterable field in plugin traces.
 * Maps display names to OData field names.
 */
export class FilterField {
    private constructor(
        public readonly displayName: string,
        public readonly odataName: string,
        public readonly fieldType: 'text' | 'enum' | 'date' | 'number' | 'boolean' | 'guid'
    ) {}

    // Core fields
    static readonly Id = new FilterField('Trace ID', 'plugintracelogid', 'guid');
    static readonly CreatedOn = new FilterField('Created On', 'createdon', 'date');
    static readonly PluginName = new FilterField('Plugin Name', 'typename', 'text');
    static readonly MessageName = new FilterField('Message Name', 'messagename', 'text');
    static readonly Duration = new FilterField('Duration (ms)', 'performanceexecutionduration', 'number');

    /**
     * All available filter fields.
     */
    static readonly All = [
        FilterField.Id,
        FilterField.CreatedOn,
        FilterField.PluginName,
        FilterField.MessageName,
        FilterField.Duration,
        // ... more fields
    ];

    static fromODataName(odataName: string): FilterField | undefined {
        return FilterField.All.find(f => f.odataName === odataName);
    }

    static fromDisplayName(displayName: string): FilterField | undefined {
        return FilterField.All.find(f => f.displayName === displayName);
    }

    equals(other: FilterField | null): boolean {
        return other !== null && this.odataName === other.odataName;
    }
}
```

---

### Example 4: ProtectedKeyPattern (Regex Pattern Matching)

**File**: `src/features/persistenceInspector/domain/valueObjects/ProtectedKeyPattern.ts`

```typescript
/**
 * Value object representing a pattern for matching protected storage keys.
 *
 * Supports wildcard patterns for flexible key protection:
 * - Exact match: `power-platform-dev-suite-environments`
 * - Wildcard: `power-platform-dev-suite-*` (matches all extension keys)
 *
 * Implementation:
 * - Converts wildcard `*` to regex `.*`
 * - Escapes other regex metacharacters for literal matching
 * - Anchors pattern with `^` and `$` for exact matching
 */
export class ProtectedKeyPattern {
    private constructor(private readonly _pattern: string) {}

    public static create(pattern: string): ProtectedKeyPattern {
        return new ProtectedKeyPattern(pattern);
    }

    /**
     * Checks if a key matches this pattern (supports wildcards)
     */
    public matches(key: string): boolean {
        if (this._pattern.includes('*')) {
            // Escape regex metacharacters, then replace \* with .*
            const escaped = this._pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp('^' + escaped.replace(/\\\*/g, '.*') + '$');
            return regex.test(key);
        }

        return key === this._pattern;
    }
}
```

---

## Anti-Patterns

### ❌ Anti-Pattern 1: Anemic Value Objects (No Validation)

**Bad:**
```typescript
// ❌ Anemic - Accepts any string, no validation
export class EnvironmentName {
    private readonly value: string;

    constructor(value: string) {
        this.value = value; // No validation!
    }

    public getValue(): string {
        return this.value;
    }
}

// Can create invalid value objects:
const empty = new EnvironmentName('');        // Should throw!
const veryLong = new EnvironmentName('x'.repeat(1000)); // Should throw!
```

**Good:**
```typescript
// ✅ Rich - Validates all business rules
export class EnvironmentName {
    private static readonly MAX_LENGTH = 100;
    private readonly value: string;

    constructor(value: string) {
        if (!value || value.trim() === '') {
            throw new DomainError('Environment name cannot be empty');
        }
        if (value.length > EnvironmentName.MAX_LENGTH) {
            throw new DomainError(
                `Environment name cannot exceed ${EnvironmentName.MAX_LENGTH} characters`
            );
        }
        this.value = value.trim();
    }

    public getValue(): string {
        return this.value;
    }
}
```

---

### ❌ Anti-Pattern 2: Mutable Value Objects

**Bad:**
```typescript
// ❌ Mutable - Can change after construction
export class EnvironmentName {
    private value: string; // Not readonly!

    constructor(value: string) {
        this.value = value;
    }

    public getValue(): string {
        return this.value;
    }

    // ❌ Setter violates immutability
    public setValue(value: string): void {
        this.value = value;
    }
}

// Can mutate value object:
const name = new EnvironmentName('Dev');
name.setValue('Production'); // Violates immutability!
```

**Good:**
```typescript
// ✅ Immutable - Cannot change after construction
export class EnvironmentName {
    private readonly value: string; // Readonly!

    constructor(value: string) {
        // ... validation ...
        this.value = value.trim();
    }

    public getValue(): string {
        return this.value;
    }

    // ✅ No setters - immutable
}

// To "change" a value, create a new instance:
const dev = new EnvironmentName('Dev');
const prod = new EnvironmentName('Production'); // New instance, not mutation
```

---

### ❌ Anti-Pattern 3: Value Objects with Behavior Methods

**Bad:**
```typescript
// ❌ Behavior methods - this should be an Entity
export class EnvironmentName {
    private readonly value: string;

    constructor(value: string) {
        // ... validation ...
    }

    // ❌ Behavior method - value objects shouldn't DO things
    public updateUsageTimestamp(): void {
        // ...
    }

    // ❌ Behavior method - value objects shouldn't have side effects
    public notifyObservers(): void {
        // ...
    }
}
```

**Good:**
```typescript
// ✅ Pure value object - no behavior, just validation and equality
export class EnvironmentName {
    private readonly value: string;

    constructor(value: string) {
        // ... validation ...
    }

    public getValue(): string {
        return this.value;
    }

    public equals(other: EnvironmentName): boolean {
        return this.value === other.value;
    }
}

// ✅ Behavior belongs in entities or domain services
export class Environment {
    constructor(
        private readonly id: EnvironmentId,
        private readonly name: EnvironmentName, // Value object
        private lastUsed: Date
    ) {}

    // ✅ Behavior method on entity (not value object)
    public updateLastUsed(): void {
        this.lastUsed = new Date();
    }
}
```

---

### ❌ Anti-Pattern 4: External Validation

**Bad:**
```typescript
// ❌ Validation outside the value object
export class EnvironmentName {
    private readonly value: string;

    constructor(value: string) {
        this.value = value; // No validation!
    }
}

// ❌ Validation scattered in use cases
export class CreateEnvironmentUseCase {
    public execute(name: string): void {
        if (!name || name.trim() === '') {
            throw new ApplicationError('Name cannot be empty');
        }
        if (name.length > 100) {
            throw new ApplicationError('Name too long');
        }
        const environmentName = new EnvironmentName(name);
        // ...
    }
}
```

**Good:**
```typescript
// ✅ Validation encapsulated in value object
export class EnvironmentName {
    private static readonly MAX_LENGTH = 100;
    private readonly value: string;

    constructor(value: string) {
        if (!value || value.trim() === '') {
            throw new DomainError('Environment name cannot be empty');
        }
        if (value.length > EnvironmentName.MAX_LENGTH) {
            throw new DomainError(
                `Environment name cannot exceed ${EnvironmentName.MAX_LENGTH} characters`
            );
        }
        this.value = value.trim();
    }
}

// ✅ Use case just constructs - validation happens automatically
export class CreateEnvironmentUseCase {
    public execute(name: string): void {
        const environmentName = new EnvironmentName(name); // Throws if invalid
        // ...
    }
}
```

---

## Testing Value Objects

### Test Coverage Checklist

For each value object, test:

✅ **Valid construction** - Constructor accepts valid values
✅ **Validation rules** - Constructor throws for invalid values
✅ **Edge cases** - Boundary conditions, empty, null, undefined
✅ **Equality** - `equals()` method compares values correctly
✅ **Immutability** - Properties cannot be changed after construction (TypeScript enforces, but test anyway)
✅ **Static factories** - `generate()`, `from()`, `tryParse()` work correctly

### Example Test: EnvironmentName

```typescript
import { EnvironmentName } from './EnvironmentName';
import { DomainError } from '../errors/DomainError';

describe('EnvironmentName', () => {
    describe('constructor', () => {
        it('should create valid environment name', () => {
            const name = new EnvironmentName('Production');
            expect(name.getValue()).toBe('Production');
        });

        it('should trim whitespace', () => {
            const name = new EnvironmentName('  Dev  ');
            expect(name.getValue()).toBe('Dev');
        });

        it('should throw for empty name', () => {
            expect(() => new EnvironmentName('')).toThrow(DomainError);
            expect(() => new EnvironmentName('   ')).toThrow(DomainError);
        });

        it('should throw for name exceeding max length', () => {
            const tooLong = 'x'.repeat(101);
            expect(() => new EnvironmentName(tooLong)).toThrow(DomainError);
            expect(() => new EnvironmentName(tooLong)).toThrow('cannot exceed 100 characters');
        });

        it('should accept name at max length boundary', () => {
            const maxLength = 'x'.repeat(100);
            const name = new EnvironmentName(maxLength);
            expect(name.getValue()).toBe(maxLength);
        });
    });

    describe('equals', () => {
        it('should return true for equal values', () => {
            const name1 = new EnvironmentName('Production');
            const name2 = new EnvironmentName('Production');
            expect(name1.equals(name2)).toBe(true);
        });

        it('should return false for different values', () => {
            const name1 = new EnvironmentName('Production');
            const name2 = new EnvironmentName('Development');
            expect(name1.equals(name2)).toBe(false);
        });

        it('should support string comparison', () => {
            const name = new EnvironmentName('Production');
            expect(name.equals('Production')).toBe(true);
            expect(name.equals('Development')).toBe(false);
        });

        it('should be case-sensitive', () => {
            const name = new EnvironmentName('Production');
            expect(name.equals('production')).toBe(false);
        });
    });

    describe('isValid', () => {
        it('should return true for valid name', () => {
            const name = new EnvironmentName('Production');
            expect(name.isValid()).toBe(true);
        });

        it('should return true for name at max length', () => {
            const name = new EnvironmentName('x'.repeat(100));
            expect(name.isValid()).toBe(true);
        });
    });
});
```

### Example Test: EnvironmentId (with Static Factory)

```typescript
import { EnvironmentId } from './EnvironmentId';
import { DomainError } from '../errors/DomainError';

describe('EnvironmentId', () => {
    describe('constructor', () => {
        it('should create valid environment ID', () => {
            const id = new EnvironmentId('env-123');
            expect(id.getValue()).toBe('env-123');
        });

        it('should throw for empty ID', () => {
            expect(() => new EnvironmentId('')).toThrow(DomainError);
            expect(() => new EnvironmentId('   ')).toThrow(DomainError);
        });
    });

    describe('generate', () => {
        it('should generate unique IDs', () => {
            const id1 = EnvironmentId.generate();
            const id2 = EnvironmentId.generate();

            expect(id1.getValue()).toMatch(/^env-\d+-[a-z0-9]+$/);
            expect(id2.getValue()).toMatch(/^env-\d+-[a-z0-9]+$/);
            expect(id1.equals(id2)).toBe(false); // Different IDs
        });

        it('should generate IDs with timestamp', () => {
            const before = Date.now();
            const id = EnvironmentId.generate();
            const after = Date.now();

            const parts = id.getValue().split('-');
            const timestamp = parseInt(parts[1]);

            expect(timestamp).toBeGreaterThanOrEqual(before);
            expect(timestamp).toBeLessThanOrEqual(after);
        });
    });

    describe('equals', () => {
        it('should return true for equal IDs', () => {
            const id1 = new EnvironmentId('env-123');
            const id2 = new EnvironmentId('env-123');
            expect(id1.equals(id2)).toBe(true);
        });

        it('should return false for different IDs', () => {
            const id1 = new EnvironmentId('env-123');
            const id2 = new EnvironmentId('env-456');
            expect(id1.equals(id2)).toBe(false);
        });
    });
});
```

---

## Summary

### Value Objects Checklist

When creating a new value object, ensure:

✅ **Immutable**: All properties `readonly`, no setters
✅ **Validated**: Constructor validates all business rules
✅ **Named constants**: No magic numbers (MAX_LENGTH, MIN_VALUE, etc.)
✅ **Clear errors**: DomainError with helpful messages
✅ **Value equality**: `equals()` method compares values
✅ **Static factories**: Use for generation, parsing, try-parse patterns
✅ **Defensive copies**: For arrays/objects (if applicable)
✅ **Comprehensive tests**: Valid, invalid, edge cases, equality

### When to Use

✅ **DO use value objects when:**
- Primitive obsession (raw strings/numbers passed around)
- Domain vocabulary (EnvironmentId is clearer than string)
- Validation rules (business constraints on valid values)
- Value equality (two objects equal if values match)
- Immutability (value never changes after construction)

❌ **DON'T use value objects when:**
- Simple pass-through values with no validation
- Mutable data that changes after construction
- Objects with behavior methods (use entities instead)
- Complex objects with multiple concerns (use entities instead)

---

**See Also:**
- [CLEAN_ARCHITECTURE_GUIDE.md](CLEAN_ARCHITECTURE_GUIDE.md) - Value objects in Clean Architecture
- [DOMAIN_SERVICE_PATTERNS.md](DOMAIN_SERVICE_PATTERNS.md) - When logic doesn't fit in value objects
- [STATIC_FACTORY_PATTERN.md](STATIC_FACTORY_PATTERN.md) - Static factory methods in depth
- [TESTING_GUIDE.md](../testing/TESTING_GUIDE.md) - Testing value objects
