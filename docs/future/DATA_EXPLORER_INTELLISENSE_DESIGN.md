# Data Explorer IntelliSense - Technical Design (V2)

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| V1 | 2024-01-XX | Initial design using virtual documents |
| V2 | 2024-01-XX | Revised to fix read-only document issue, support loading files from disk |

## Changes from V1

### Critical Issues Identified in V1

1. **Virtual Documents Are Read-Only** - `TextDocumentContentProvider` creates read-only documents. Users cannot type in them. This was a fundamental flaw.

2. **Environment Context Coupled to URI** - Embedding environment ID in the URI (`dataverse-sql://{envId}/query.sql`) doesn't work for real files loaded from disk.

3. **No Support for Loading Files from Disk** - Future requirement to load existing `.sql` and `.xml` files wasn't supported.

4. **Completion Provider Too Narrow** - Registering for a custom URI scheme means completions don't work on real `.sql` files.

### Key Changes in V2

| Aspect | V1 Design | V2 Design |
|--------|-----------|-----------|
| **Document type** | Virtual (read-only!) | Untitled or real files |
| **Completion scope** | Custom URI scheme only | All SQL files (`language: 'sql'`) |
| **Environment context** | Embedded in URI | Separate `IntelliSenseContextService` |
| **Load from disk** | Not supported | Native file open dialog |
| **Multiple editors** | Problematic | Works naturally |

---

## Overview

This document describes the technical design for adding IntelliSense (autocomplete) capabilities to the Data Explorer SQL editor. The implementation uses VS Code's native editor API with a decoupled context management approach, providing a seamless developer experience with zero bundle size impact.

## Goals

1. **Entity completion** - Suggest Dataverse table names after `FROM`
2. **Attribute completion** - Suggest column names after `SELECT`, `WHERE`, `ORDER BY`, `ON`
3. **Keyword completion** - Suggest SQL keywords (SELECT, FROM, WHERE, etc.)
4. **Load from disk** - Support opening existing `.sql` files with full IntelliSense
5. **Validation** - Show red squiggles for invalid entity/attribute names (Slice 2)

## Non-Goals (Deferred)

- Hover information (attribute type, description)
- Picklist value suggestions in WHERE clauses
- JOIN table attribute completion (complex scope detection)
- FetchXML to SQL conversion (future enhancement)

---

## Architecture Decision

### Why VS Code Native Editor API?

| Approach | Bundle Size | Dev Experience | Effort |
|----------|-------------|----------------|--------|
| Monaco in Webview | 2-5 MB | Good (copy of VS Code) | High |
| **VS Code Native** | **0 KB** | **Excellent (native)** | **Medium** |
| CodeMirror 6 | ~124 KB | Good | Medium |
| Custom Textarea | ~20 KB | Basic | Very High |

**Decision: Use VS Code Native Editor API**

Rationale:
- Zero bundle size impact
- Native VS Code experience (themes, keybindings, settings)
- CompletionItemProvider API is well-documented
- Standard pattern for database extensions (SQLTools, PostgreSQL, etc.)
- Supports real files from disk naturally

### Core Principle: Decouple Environment from Document

Instead of embedding environment in the URI (V1 approach), treat them as separate concerns:

```
┌─────────────────────────────────────────────────────────┐
│  Data Explorer Panel                                    │
│  - Owns the "active environment" concept                │
│  - Shows results for executed queries                   │
│  - Can open new SQL editor or load from file           │
│  - Updates IntelliSenseContextService on env change    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  IntelliSenseContextService (Singleton)                 │
│  - Tracks: activeEnvironmentId                          │
│  - Updated by panel when environment changes           │
│  - Queried by completion provider                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  DataverseCompletionProvider                            │
│  - Registered for language: 'sql' (ALL SQL files)      │
│  - Gets environment from IntelliSenseContextService    │
│  - Works with any .sql file (new or from disk)        │
└─────────────────────────────────────────────────────────┘
```

### User Experience

```
┌─────────────────────────────────────────────────────────┐
│  query.sql                                        [x]  │
├─────────────────────────────────────────────────────────┤
│  SELECT na|                                             │
│         ┌──────────────────────┐                       │
│         │ name          String │  <- Attribute suggestions
│         │ numberofemployees    │     from active environment
│         │ new_customfield      │                       │
│         └──────────────────────┘                       │
│  FROM account                                           │
│  WHERE statecode = 0                                    │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  Data Explorer - Contoso Dev                      [x]  │
├─────────────────────────────────────────────────────────┤
│  Environment: [Contoso Dev ▼]  [New Query] [Open File] │
├─────────────────────────────────────────────────────────┤
│  [Execute Query]                [FetchXML Preview ▼]   │
├─────────────────────────────────────────────────────────┤
│  │ name          │ statecode │ revenue    │            │
│  │ Contoso Ltd   │ Active    │ 1,000,000  │            │
│  │ Fabrikam Inc  │ Active    │ 500,000    │            │
└─────────────────────────────────────────────────────────┘
```

---

## File Handling Strategy

| Scenario | How It Works |
|----------|--------------|
| **New query** | `vscode.workspace.openTextDocument({ language: 'sql' })` creates untitled doc |
| **Load SQL from disk** | Standard file open via `showOpenDialog`, completions work automatically |
| **Save query** | Standard "Save" / "Save As" to user's chosen location |
| **Load FetchXML** | Open `.xml` file, panel can execute directly or offer conversion |

### Load from Disk Flow

```
User clicks "Open File" in panel
         │
         ▼
vscode.window.showOpenDialog({
    filters: {
        'SQL Files': ['sql'],
        'FetchXML Files': ['xml'],
        'All Files': ['*']
    }
})
         │
         ▼
┌────────┴────────┐
│                 │
▼                 ▼
.sql file      .xml file
│                 │
▼                 ▼
Open in editor    Parse as FetchXML
Completions       Execute directly
work via          (no SQL conversion needed)
sql language
```

---

## Implementation Slices

### Slice 1: Core IntelliSense
- Context service for tracking active environment
- Entity name completion (after FROM)
- Attribute name completion (after SELECT/WHERE/ORDER BY)
- SQL keyword completion
- Metadata caching infrastructure
- Panel integration (environment changes update context)
- New Query / Open File buttons in panel

### Slice 2: Validation (Future)
- DiagnosticCollection for SQL validation
- Invalid entity name detection
- Invalid attribute name detection
- Real-time validation on document change

### Slice 3: FetchXML Support (Future)
- Load and execute FetchXML files directly
- Optional: FetchXML to SQL conversion
- FetchXML completions (separate completion provider)

---

## Clean Architecture Layers

### Domain Layer

```
src/features/dataExplorer/domain/
├── valueObjects/
│   ├── EntitySuggestion.ts        # Entity autocomplete item
│   └── AttributeSuggestion.ts     # Attribute autocomplete item
├── repositories/
│   └── IIntelliSenseMetadataRepository.ts  # Metadata fetching contract
└── services/
    └── SqlContextDetector.ts      # Determines completion context from SQL
```

### Application Layer

```
src/features/dataExplorer/application/
├── useCases/
│   ├── GetEntitySuggestionsUseCase.ts
│   └── GetAttributeSuggestionsUseCase.ts
└── services/
    ├── IntelliSenseContextService.ts  # Tracks active environment
    └── IntelliSenseMetadataCache.ts   # In-memory metadata cache
```

### Infrastructure Layer

```
src/features/dataExplorer/infrastructure/
└── repositories/
    └── DataverseIntelliSenseMetadataRepository.ts  # OData metadata fetching
```

### Presentation Layer

```
src/features/dataExplorer/presentation/
├── providers/
│   └── DataverseCompletionProvider.ts    # VS Code completion provider
├── services/
│   └── SqlEditorService.ts               # Opens/manages SQL editors
└── panels/
    └── DataExplorerPanelComposed.ts      # Updated with Open File support
```

---

## Detailed Component Design

### 1. Domain Layer

#### 1.1 EntitySuggestion (Value Object)

```typescript
// src/features/dataExplorer/domain/valueObjects/EntitySuggestion.ts

/**
 * Value Object representing an entity suggestion for autocomplete.
 * Immutable and contains only the data needed for IntelliSense.
 */
export class EntitySuggestion {
    private constructor(
        public readonly logicalName: string,
        public readonly displayName: string,
        public readonly isCustomEntity: boolean
    ) {}

    public static create(
        logicalName: string,
        displayName: string,
        isCustomEntity: boolean
    ): EntitySuggestion {
        return new EntitySuggestion(logicalName, displayName, isCustomEntity);
    }

    /**
     * Returns the label for autocomplete display.
     */
    public getDisplayLabel(): string {
        return this.logicalName;
    }

    /**
     * Returns detail text (shown to the right in autocomplete).
     */
    public getDetail(): string {
        return this.displayName;
    }

    /**
     * Returns the text to insert on selection.
     */
    public getInsertText(): string {
        return this.logicalName;
    }

    /**
     * Returns documentation for the autocomplete item.
     */
    public getDocumentation(): string {
        return this.isCustomEntity ? 'Custom Entity' : 'System Entity';
    }
}
```

#### 1.2 AttributeSuggestion (Value Object)

```typescript
// src/features/dataExplorer/domain/valueObjects/AttributeSuggestion.ts

/**
 * Dataverse attribute types relevant for IntelliSense display.
 */
export type AttributeTypeHint =
    | 'String'
    | 'Integer'
    | 'Decimal'
    | 'Money'
    | 'DateTime'
    | 'Boolean'
    | 'Lookup'
    | 'Picklist'
    | 'UniqueIdentifier'
    | 'Memo'
    | 'Other';

/**
 * Value Object representing an attribute suggestion for autocomplete.
 */
export class AttributeSuggestion {
    private constructor(
        public readonly logicalName: string,
        public readonly displayName: string,
        public readonly attributeType: AttributeTypeHint,
        public readonly isCustomAttribute: boolean
    ) {}

    public static create(
        logicalName: string,
        displayName: string,
        attributeType: AttributeTypeHint,
        isCustomAttribute: boolean
    ): AttributeSuggestion {
        return new AttributeSuggestion(
            logicalName,
            displayName,
            attributeType,
            isCustomAttribute
        );
    }

    /**
     * Returns the label for autocomplete display.
     */
    public getDisplayLabel(): string {
        return this.logicalName;
    }

    /**
     * Returns detail text showing type.
     */
    public getDetail(): string {
        return `${this.displayName} (${this.attributeType})`;
    }

    /**
     * Returns the text to insert on selection.
     */
    public getInsertText(): string {
        return this.logicalName;
    }
}
```

#### 1.3 IIntelliSenseMetadataRepository (Interface)

```typescript
// src/features/dataExplorer/domain/repositories/IIntelliSenseMetadataRepository.ts

import type { EntitySuggestion } from '../valueObjects/EntitySuggestion';
import type { AttributeSuggestion } from '../valueObjects/AttributeSuggestion';

/**
 * Repository interface for fetching metadata needed for IntelliSense.
 * Implementations should use minimal OData $select for performance.
 */
export interface IIntelliSenseMetadataRepository {
    /**
     * Fetches all entity names for autocomplete suggestions.
     * Should use: GET /EntityDefinitions?$select=LogicalName,DisplayName,IsCustomEntity
     *
     * @param environmentId - The environment to fetch from
     * @returns Array of entity suggestions
     */
    getEntitySuggestions(environmentId: string): Promise<EntitySuggestion[]>;

    /**
     * Fetches attribute names for a specific entity.
     * Should use: GET /EntityDefinitions(LogicalName='x')/Attributes?$select=...
     *
     * @param environmentId - The environment to fetch from
     * @param entityLogicalName - The entity to get attributes for
     * @returns Array of attribute suggestions
     */
    getAttributeSuggestions(
        environmentId: string,
        entityLogicalName: string
    ): Promise<AttributeSuggestion[]>;
}
```

#### 1.4 SqlContextDetector (Domain Service)

```typescript
// src/features/dataExplorer/domain/services/SqlContextDetector.ts

/**
 * The type of SQL context at the cursor position.
 */
export type SqlCompletionContext =
    | { kind: 'keyword' }
    | { kind: 'entity' }
    | { kind: 'attribute'; entityName: string }
    | { kind: 'none' };

/**
 * Domain Service: SQL Context Detector
 *
 * Analyzes SQL text and cursor position to determine what type
 * of completions should be offered. This is pure domain logic
 * with no external dependencies.
 *
 * Business Rules:
 * - After FROM/JOIN: suggest entity names
 * - After SELECT/WHERE/ORDER BY/ON (when entity is known): suggest attributes
 * - At statement start or after semicolon: suggest keywords
 */
export class SqlContextDetector {
    private static readonly KEYWORDS = [
        'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER', 'BY',
        'TOP', 'LIMIT', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER',
        'ON', 'AS', 'ASC', 'DESC', 'IS', 'NULL', 'NOT', 'IN', 'LIKE'
    ];

    /**
     * Detects the completion context based on SQL text and cursor position.
     *
     * @param sql - The full SQL text
     * @param cursorOffset - Character offset of cursor in the text
     * @returns The detected completion context
     */
    public detectContext(sql: string, cursorOffset: number): SqlCompletionContext {
        const textBeforeCursor = sql.substring(0, cursorOffset);
        const upperText = textBeforeCursor.toUpperCase();

        // Check if we're after FROM or JOIN (entity context)
        if (this.isAfterEntityKeyword(upperText)) {
            return { kind: 'entity' };
        }

        // Check if we're in an attribute context
        const entityName = this.extractEntityName(sql);
        if (entityName && this.isAfterAttributeKeyword(upperText, sql)) {
            return { kind: 'attribute', entityName: entityName.toLowerCase() };
        }

        // Check if we're at a keyword position
        if (this.isKeywordPosition(upperText)) {
            return { kind: 'keyword' };
        }

        return { kind: 'none' };
    }

    /**
     * Returns SQL keywords for completion.
     */
    public getKeywords(): readonly string[] {
        return SqlContextDetector.KEYWORDS;
    }

    /**
     * Checks if cursor is positioned after FROM or JOIN keyword.
     */
    private isAfterEntityKeyword(textBeforeCursor: string): boolean {
        const trimmed = textBeforeCursor.trimEnd();
        return /\b(FROM|JOIN)\s*$/i.test(trimmed);
    }

    /**
     * Checks if cursor is positioned where attributes should be suggested.
     */
    private isAfterAttributeKeyword(textBeforeCursor: string, fullSql: string): boolean {
        const trimmed = textBeforeCursor.trimEnd();
        const upperTrimmed = trimmed.toUpperCase();

        // Must have FROM clause to know the entity
        if (!/\bFROM\s+\w+/i.test(fullSql)) {
            return false;
        }

        // After SELECT (before FROM)
        if (/\bSELECT\s+$/i.test(upperTrimmed)) {
            return true;
        }

        // After comma in SELECT list (before FROM)
        if (/\bSELECT\s+.+,\s*$/i.test(trimmed) &&
            !upperTrimmed.includes('FROM')) {
            return true;
        }

        // After WHERE, AND, OR (comparison context)
        if (/\b(WHERE|AND|OR)\s+$/i.test(upperTrimmed)) {
            return true;
        }

        // After ORDER BY
        if (/\bORDER\s+BY\s+$/i.test(upperTrimmed)) {
            return true;
        }

        // After comma in ORDER BY
        if (/\bORDER\s+BY\s+.+,\s*$/i.test(trimmed)) {
            return true;
        }

        return false;
    }

    /**
     * Checks if cursor is at a position where keywords should be suggested.
     */
    private isKeywordPosition(textBeforeCursor: string): boolean {
        const trimmed = textBeforeCursor.trimEnd();

        // Start of document
        if (trimmed === '') {
            return true;
        }

        // After semicolon (new statement)
        if (trimmed.endsWith(';')) {
            return true;
        }

        // After entity name in FROM clause
        if (/\bFROM\s+\w+\s+$/i.test(trimmed)) {
            return true;
        }

        // After complete WHERE condition
        if (/\bWHERE\s+\w+\s*(=|<|>|<=|>=|<>|!=)\s*('[^']*'|\d+)\s+$/i.test(trimmed)) {
            return true;
        }

        return false;
    }

    /**
     * Extracts the main entity name from a SQL query.
     * Looks for FROM clause to determine the main entity.
     */
    private extractEntityName(sql: string): string | null {
        // Match: FROM entityname or FROM entityname alias
        const match = sql.match(/\bFROM\s+(\w+)/i);
        return match ? match[1] : null;
    }
}
```

---

### 2. Application Layer

#### 2.1 IntelliSenseContextService (NEW in V2)

```typescript
// src/features/dataExplorer/application/services/IntelliSenseContextService.ts

/**
 * Application Service: IntelliSense Context
 *
 * Maintains the active environment context for SQL completions.
 * This is a singleton that bridges the Data Explorer panel and
 * the completion provider.
 *
 * Updated by: Data Explorer panel when environment changes
 * Queried by: DataverseCompletionProvider when providing completions
 */
export class IntelliSenseContextService {
    private activeEnvironmentId: string | null = null;
    private readonly environmentChangeListeners: Array<(envId: string | null) => void> = [];

    /**
     * Sets the active environment for IntelliSense.
     * Call this when the Data Explorer panel's environment selection changes.
     *
     * @param environmentId - The environment ID, or null if none selected
     */
    public setActiveEnvironment(environmentId: string | null): void {
        const changed = this.activeEnvironmentId !== environmentId;
        this.activeEnvironmentId = environmentId;

        if (changed) {
            for (const listener of this.environmentChangeListeners) {
                listener(environmentId);
            }
        }
    }

    /**
     * Gets the currently active environment.
     *
     * @returns The active environment ID, or null if none
     */
    public getActiveEnvironment(): string | null {
        return this.activeEnvironmentId;
    }

    /**
     * Checks if there is an active environment.
     */
    public hasActiveEnvironment(): boolean {
        return this.activeEnvironmentId !== null;
    }

    /**
     * Registers a listener for environment changes.
     * Useful for clearing caches when environment changes.
     *
     * @param listener - Callback when environment changes
     * @returns Unsubscribe function
     */
    public onEnvironmentChange(listener: (envId: string | null) => void): () => void {
        this.environmentChangeListeners.push(listener);
        return () => {
            const index = this.environmentChangeListeners.indexOf(listener);
            if (index >= 0) {
                this.environmentChangeListeners.splice(index, 1);
            }
        };
    }
}
```

#### 2.2 IntelliSenseMetadataCache

```typescript
// src/features/dataExplorer/application/services/IntelliSenseMetadataCache.ts

import type { EntitySuggestion } from '../../domain/valueObjects/EntitySuggestion';
import type { AttributeSuggestion } from '../../domain/valueObjects/AttributeSuggestion';
import type { IIntelliSenseMetadataRepository } from '../../domain/repositories/IIntelliSenseMetadataRepository';
import type { IntelliSenseContextService } from './IntelliSenseContextService';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

/**
 * Application Service: IntelliSense Metadata Cache
 *
 * Caches metadata to avoid repeated API calls during typing.
 * Entity list is cached indefinitely (metadata rarely changes).
 * Attribute lists are cached per-entity with 5-minute TTL.
 *
 * Automatically clears cache when environment changes.
 */
export class IntelliSenseMetadataCache {
    private static readonly ATTRIBUTE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    private readonly entityCache = new Map<string, CacheEntry<EntitySuggestion[]>>();
    private readonly attributeCache = new Map<string, CacheEntry<AttributeSuggestion[]>>();
    private readonly unsubscribe: () => void;

    constructor(
        private readonly repository: IIntelliSenseMetadataRepository,
        contextService: IntelliSenseContextService
    ) {
        // Clear cache when environment changes
        this.unsubscribe = contextService.onEnvironmentChange(() => {
            this.clearCache();
        });
    }

    /**
     * Gets entity suggestions, using cache if available.
     * Entity list is cached indefinitely per environment.
     */
    public async getEntitySuggestions(environmentId: string): Promise<EntitySuggestion[]> {
        const cacheKey = environmentId;
        const cached = this.entityCache.get(cacheKey);

        if (cached) {
            return cached.data;
        }

        const entities = await this.repository.getEntitySuggestions(environmentId);
        this.entityCache.set(cacheKey, {
            data: entities,
            timestamp: Date.now()
        });

        return entities;
    }

    /**
     * Gets attribute suggestions for an entity, using cache if available.
     * Attributes are cached per-entity with 5-minute TTL.
     */
    public async getAttributeSuggestions(
        environmentId: string,
        entityLogicalName: string
    ): Promise<AttributeSuggestion[]> {
        const cacheKey = `${environmentId}:${entityLogicalName}`;
        const cached = this.attributeCache.get(cacheKey);

        if (cached && !this.isExpired(cached.timestamp)) {
            return cached.data;
        }

        const attributes = await this.repository.getAttributeSuggestions(
            environmentId,
            entityLogicalName
        );

        this.attributeCache.set(cacheKey, {
            data: attributes,
            timestamp: Date.now()
        });

        return attributes;
    }

    /**
     * Clears all caches.
     */
    public clearCache(): void {
        this.entityCache.clear();
        this.attributeCache.clear();
    }

    /**
     * Disposes the cache and unsubscribes from context changes.
     */
    public dispose(): void {
        this.unsubscribe();
        this.clearCache();
    }

    private isExpired(timestamp: number): boolean {
        return Date.now() - timestamp > IntelliSenseMetadataCache.ATTRIBUTE_CACHE_TTL_MS;
    }
}
```

#### 2.3 GetEntitySuggestionsUseCase

```typescript
// src/features/dataExplorer/application/useCases/GetEntitySuggestionsUseCase.ts

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { EntitySuggestion } from '../../domain/valueObjects/EntitySuggestion';
import type { IntelliSenseMetadataCache } from '../services/IntelliSenseMetadataCache';

/**
 * Use Case: Get Entity Suggestions
 *
 * Retrieves entity suggestions for SQL autocomplete, filtered by prefix.
 * Uses cached metadata for performance during typing.
 */
export class GetEntitySuggestionsUseCase {
    constructor(
        private readonly metadataCache: IntelliSenseMetadataCache,
        private readonly logger: ILogger
    ) {}

    /**
     * Gets entity suggestions matching the given prefix.
     *
     * @param environmentId - The environment to get entities from
     * @param prefix - The typed prefix to filter by (case-insensitive)
     * @returns Filtered and sorted entity suggestions
     */
    public async execute(
        environmentId: string,
        prefix: string
    ): Promise<EntitySuggestion[]> {
        this.logger.debug('Getting entity suggestions', { environmentId, prefix });

        try {
            const allEntities = await this.metadataCache.getEntitySuggestions(environmentId);
            const lowerPrefix = prefix.toLowerCase();

            const filtered = allEntities.filter(entity =>
                entity.logicalName.toLowerCase().startsWith(lowerPrefix) ||
                entity.displayName.toLowerCase().startsWith(lowerPrefix)
            );

            // Sort: exact logical name matches first, then alphabetically
            filtered.sort((a, b) => {
                const aExact = a.logicalName.toLowerCase() === lowerPrefix;
                const bExact = b.logicalName.toLowerCase() === lowerPrefix;

                if (aExact && !bExact) return -1;
                if (!aExact && bExact) return 1;

                const aStarts = a.logicalName.toLowerCase().startsWith(lowerPrefix);
                const bStarts = b.logicalName.toLowerCase().startsWith(lowerPrefix);

                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;

                return a.logicalName.localeCompare(b.logicalName);
            });

            this.logger.debug('Entity suggestions filtered', {
                total: allEntities.length,
                filtered: filtered.length
            });

            return filtered;
        } catch (error) {
            this.logger.error('Failed to get entity suggestions', error);
            return [];
        }
    }
}
```

#### 2.4 GetAttributeSuggestionsUseCase

```typescript
// src/features/dataExplorer/application/useCases/GetAttributeSuggestionsUseCase.ts

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { AttributeSuggestion } from '../../domain/valueObjects/AttributeSuggestion';
import type { IntelliSenseMetadataCache } from '../services/IntelliSenseMetadataCache';

/**
 * Use Case: Get Attribute Suggestions
 *
 * Retrieves attribute suggestions for a specific entity, filtered by prefix.
 * Uses cached metadata for performance during typing.
 */
export class GetAttributeSuggestionsUseCase {
    constructor(
        private readonly metadataCache: IntelliSenseMetadataCache,
        private readonly logger: ILogger
    ) {}

    /**
     * Gets attribute suggestions for an entity, matching the given prefix.
     *
     * @param environmentId - The environment to get attributes from
     * @param entityLogicalName - The entity to get attributes for
     * @param prefix - The typed prefix to filter by (case-insensitive)
     * @returns Filtered and sorted attribute suggestions
     */
    public async execute(
        environmentId: string,
        entityLogicalName: string,
        prefix: string
    ): Promise<AttributeSuggestion[]> {
        this.logger.debug('Getting attribute suggestions', {
            environmentId,
            entityLogicalName,
            prefix
        });

        try {
            const allAttributes = await this.metadataCache.getAttributeSuggestions(
                environmentId,
                entityLogicalName
            );

            const lowerPrefix = prefix.toLowerCase();

            const filtered = allAttributes.filter(attr =>
                attr.logicalName.toLowerCase().startsWith(lowerPrefix) ||
                attr.displayName.toLowerCase().startsWith(lowerPrefix)
            );

            // Sort: exact matches first, then by logical name
            filtered.sort((a, b) => {
                const aExact = a.logicalName.toLowerCase() === lowerPrefix;
                const bExact = b.logicalName.toLowerCase() === lowerPrefix;

                if (aExact && !bExact) return -1;
                if (!aExact && bExact) return 1;

                const aStarts = a.logicalName.toLowerCase().startsWith(lowerPrefix);
                const bStarts = b.logicalName.toLowerCase().startsWith(lowerPrefix);

                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;

                return a.logicalName.localeCompare(b.logicalName);
            });

            this.logger.debug('Attribute suggestions filtered', {
                entity: entityLogicalName,
                total: allAttributes.length,
                filtered: filtered.length
            });

            return filtered;
        } catch (error) {
            this.logger.error('Failed to get attribute suggestions', error);
            return [];
        }
    }
}
```

---

### 3. Infrastructure Layer

#### 3.1 DataverseIntelliSenseMetadataRepository

```typescript
// src/features/dataExplorer/infrastructure/repositories/DataverseIntelliSenseMetadataRepository.ts

import type { IDataverseApiService } from '../../../../shared/infrastructure/services/IDataverseApiService';
import type { IIntelliSenseMetadataRepository } from '../../domain/repositories/IIntelliSenseMetadataRepository';
import { EntitySuggestion } from '../../domain/valueObjects/EntitySuggestion';
import { AttributeSuggestion, type AttributeTypeHint } from '../../domain/valueObjects/AttributeSuggestion';

/**
 * DTO for entity metadata from OData API.
 */
interface EntityMetadataDto {
    LogicalName: string;
    DisplayName: {
        UserLocalizedLabel?: { Label: string } | null;
    };
    IsCustomEntity: boolean;
}

/**
 * DTO for attribute metadata from OData API.
 */
interface AttributeMetadataDto {
    LogicalName: string;
    DisplayName: {
        UserLocalizedLabel?: { Label: string } | null;
    };
    AttributeType: string;
    IsCustomAttribute: boolean;
}

interface EntityDefinitionsResponse {
    value: EntityMetadataDto[];
}

interface AttributesResponse {
    value: AttributeMetadataDto[];
}

/**
 * Repository implementation for fetching IntelliSense metadata from Dataverse.
 * Uses minimal OData $select queries for optimal performance.
 */
export class DataverseIntelliSenseMetadataRepository implements IIntelliSenseMetadataRepository {
    constructor(
        private readonly apiService: IDataverseApiService
    ) {}

    /**
     * Fetches all entity names with minimal payload.
     * Payload: ~5-10 KB for 1,000 entities.
     */
    public async getEntitySuggestions(environmentId: string): Promise<EntitySuggestion[]> {
        const endpoint = '/api/data/v9.2/EntityDefinitions?$select=LogicalName,DisplayName,IsCustomEntity';

        const response = await this.apiService.get<EntityDefinitionsResponse>(
            environmentId,
            endpoint
        );

        return response.value.map(dto => EntitySuggestion.create(
            dto.LogicalName,
            dto.DisplayName.UserLocalizedLabel?.Label ?? dto.LogicalName,
            dto.IsCustomEntity
        ));
    }

    /**
     * Fetches attribute names for a specific entity with minimal payload.
     * Payload: ~10-15 KB for typical entity (100 attributes).
     */
    public async getAttributeSuggestions(
        environmentId: string,
        entityLogicalName: string
    ): Promise<AttributeSuggestion[]> {
        const endpoint = `/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes?$select=LogicalName,DisplayName,AttributeType,IsCustomAttribute`;

        const response = await this.apiService.get<AttributesResponse>(
            environmentId,
            endpoint
        );

        return response.value.map(dto => AttributeSuggestion.create(
            dto.LogicalName,
            dto.DisplayName.UserLocalizedLabel?.Label ?? dto.LogicalName,
            this.mapAttributeType(dto.AttributeType),
            dto.IsCustomAttribute
        ));
    }

    /**
     * Maps Dataverse attribute type to simplified type hint.
     */
    private mapAttributeType(dataverseType: string): AttributeTypeHint {
        switch (dataverseType) {
            case 'String':
            case 'Memo':
                return dataverseType as AttributeTypeHint;
            case 'Integer':
            case 'BigInt':
                return 'Integer';
            case 'Decimal':
            case 'Double':
                return 'Decimal';
            case 'Money':
                return 'Money';
            case 'DateTime':
                return 'DateTime';
            case 'Boolean':
            case 'ManagedProperty':
                return 'Boolean';
            case 'Lookup':
            case 'Customer':
            case 'Owner':
                return 'Lookup';
            case 'Picklist':
            case 'State':
            case 'Status':
                return 'Picklist';
            case 'Uniqueidentifier':
                return 'UniqueIdentifier';
            default:
                return 'Other';
        }
    }
}
```

---

### 4. Presentation Layer

#### 4.1 DataverseCompletionProvider (REVISED in V2)

```typescript
// src/features/dataExplorer/presentation/providers/DataverseCompletionProvider.ts

import * as vscode from 'vscode';
import type { SqlContextDetector } from '../../domain/services/SqlContextDetector';
import type { GetEntitySuggestionsUseCase } from '../../application/useCases/GetEntitySuggestionsUseCase';
import type { GetAttributeSuggestionsUseCase } from '../../application/useCases/GetAttributeSuggestionsUseCase';
import type { IntelliSenseContextService } from '../../application/services/IntelliSenseContextService';

/**
 * VS Code Completion Provider for Dataverse SQL queries.
 *
 * Provides context-aware completions for ANY SQL file when an
 * environment is active in the Data Explorer panel.
 *
 * V2 Change: No longer tied to a custom URI scheme. Works with
 * all SQL files and gets environment from IntelliSenseContextService.
 */
export class DataverseCompletionProvider implements vscode.CompletionItemProvider {
    constructor(
        private readonly contextService: IntelliSenseContextService,
        private readonly contextDetector: SqlContextDetector,
        private readonly getEntitySuggestions: GetEntitySuggestionsUseCase,
        private readonly getAttributeSuggestions: GetAttributeSuggestionsUseCase
    ) {}

    public async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        _context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[] | null> {
        // Only provide completions if we have an active environment
        const environmentId = this.contextService.getActiveEnvironment();
        if (!environmentId) {
            // No environment selected - don't provide Dataverse completions
            // This allows other SQL completion providers to work
            return null;
        }

        // Check for cancellation
        if (token.isCancellationRequested) {
            return null;
        }

        const text = document.getText();
        const offset = document.offsetAt(position);
        const wordRange = document.getWordRangeAtPosition(position);
        const currentWord = wordRange ? document.getText(wordRange) : '';

        const context = this.contextDetector.detectContext(text, offset);

        switch (context.kind) {
            case 'entity':
                return this.getEntityCompletions(environmentId, currentWord, token);

            case 'attribute':
                return this.getAttributeCompletions(
                    environmentId,
                    context.entityName,
                    currentWord,
                    token
                );

            case 'keyword':
                return this.getKeywordCompletions(currentWord);

            default:
                return null;
        }
    }

    private async getEntityCompletions(
        environmentId: string,
        prefix: string,
        token: vscode.CancellationToken
    ): Promise<vscode.CompletionItem[]> {
        const suggestions = await this.getEntitySuggestions.execute(environmentId, prefix);

        if (token.isCancellationRequested) {
            return [];
        }

        return suggestions.map((entity, index) => {
            const item = new vscode.CompletionItem(
                entity.getDisplayLabel(),
                vscode.CompletionItemKind.Class
            );
            item.detail = entity.getDetail();
            item.documentation = new vscode.MarkdownString(entity.getDocumentation());
            item.insertText = entity.getInsertText();
            item.sortText = index.toString().padStart(5, '0');
            return item;
        });
    }

    private async getAttributeCompletions(
        environmentId: string,
        entityName: string,
        prefix: string,
        token: vscode.CancellationToken
    ): Promise<vscode.CompletionItem[]> {
        const suggestions = await this.getAttributeSuggestions.execute(
            environmentId,
            entityName,
            prefix
        );

        if (token.isCancellationRequested) {
            return [];
        }

        return suggestions.map((attr, index) => {
            const item = new vscode.CompletionItem(
                attr.getDisplayLabel(),
                this.getCompletionKindForType(attr.attributeType)
            );
            item.detail = attr.getDetail();
            item.insertText = attr.getInsertText();
            item.sortText = index.toString().padStart(5, '0');
            return item;
        });
    }

    private getKeywordCompletions(prefix: string): vscode.CompletionItem[] {
        const keywords = this.contextDetector.getKeywords();
        const lowerPrefix = prefix.toLowerCase();

        return keywords
            .filter(kw => kw.toLowerCase().startsWith(lowerPrefix))
            .map((keyword, index) => {
                const item = new vscode.CompletionItem(
                    keyword,
                    vscode.CompletionItemKind.Keyword
                );
                item.sortText = index.toString().padStart(5, '0');
                return item;
            });
    }

    private getCompletionKindForType(attributeType: string): vscode.CompletionItemKind {
        switch (attributeType) {
            case 'Lookup':
                return vscode.CompletionItemKind.Reference;
            case 'Picklist':
                return vscode.CompletionItemKind.Enum;
            case 'Boolean':
                return vscode.CompletionItemKind.Value;
            default:
                return vscode.CompletionItemKind.Field;
        }
    }
}
```

#### 4.2 SqlEditorService (REVISED in V2)

```typescript
// src/features/dataExplorer/presentation/services/SqlEditorService.ts

import * as vscode from 'vscode';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Service for managing SQL editor documents.
 *
 * V2 Change: Simplified from SqlEditorCoordinator. No longer manages
 * virtual documents. Works with untitled documents and real files.
 */
export class SqlEditorService implements vscode.Disposable {
    private readonly disposables: vscode.Disposable[] = [];

    constructor(
        private readonly logger: ILogger
    ) {}

    /**
     * Opens a new untitled SQL document for query editing.
     *
     * @param initialContent - Optional initial SQL content
     * @returns The opened text editor
     */
    public async openNewQuery(initialContent: string = ''): Promise<vscode.TextEditor> {
        const document = await vscode.workspace.openTextDocument({
            language: 'sql',
            content: initialContent
        });

        const editor = await vscode.window.showTextDocument(document, {
            viewColumn: vscode.ViewColumn.One,
            preserveFocus: false,
            preview: false
        });

        this.logger.debug('Opened new SQL query editor');
        return editor;
    }

    /**
     * Opens a file picker to load an existing SQL or FetchXML file.
     *
     * @returns The opened text editor, or undefined if cancelled
     */
    public async openFileFromDisk(): Promise<vscode.TextEditor | undefined> {
        const uris = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
                'SQL Files': ['sql'],
                'FetchXML Files': ['xml'],
                'All Files': ['*']
            },
            title: 'Open Query File'
        });

        if (!uris || uris.length === 0) {
            return undefined;
        }

        const document = await vscode.workspace.openTextDocument(uris[0]);
        const editor = await vscode.window.showTextDocument(document, {
            viewColumn: vscode.ViewColumn.One,
            preserveFocus: false,
            preview: false
        });

        this.logger.debug('Opened query file from disk', { path: uris[0].fsPath });
        return editor;
    }

    /**
     * Gets the SQL content from the active editor if it's a SQL file.
     *
     * @returns The SQL content, or null if no SQL editor is active
     */
    public getActiveSqlContent(): string | null {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return null;
        }

        // Accept SQL files or untitled documents with SQL language
        const doc = editor.document;
        if (doc.languageId === 'sql') {
            return doc.getText();
        }

        return null;
    }

    /**
     * Gets SQL content from any visible SQL editor.
     * Useful when the panel is focused but user has SQL editor open.
     *
     * @returns The SQL content from the first visible SQL editor, or null
     */
    public getVisibleSqlContent(): string | null {
        for (const editor of vscode.window.visibleTextEditors) {
            if (editor.document.languageId === 'sql') {
                return editor.document.getText();
            }
        }
        return null;
    }

    public dispose(): void {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables.length = 0;
    }
}
```

---

## Registration and Initialization

### Extension Activation

```typescript
// In extension.ts or a dedicated initialization file

import * as vscode from 'vscode';
import { IntelliSenseContextService } from './application/services/IntelliSenseContextService';
import { IntelliSenseMetadataCache } from './application/services/IntelliSenseMetadataCache';
import { DataverseIntelliSenseMetadataRepository } from './infrastructure/repositories/DataverseIntelliSenseMetadataRepository';
import { SqlContextDetector } from './domain/services/SqlContextDetector';
import { GetEntitySuggestionsUseCase } from './application/useCases/GetEntitySuggestionsUseCase';
import { GetAttributeSuggestionsUseCase } from './application/useCases/GetAttributeSuggestionsUseCase';
import { DataverseCompletionProvider } from './presentation/providers/DataverseCompletionProvider';
import { SqlEditorService } from './presentation/services/SqlEditorService';

export function registerDataExplorerIntelliSense(
    context: vscode.ExtensionContext,
    apiService: IDataverseApiService,
    logger: ILogger
): {
    contextService: IntelliSenseContextService;
    editorService: SqlEditorService;
} {
    // 1. Create application services
    const contextService = new IntelliSenseContextService();
    const repository = new DataverseIntelliSenseMetadataRepository(apiService);
    const metadataCache = new IntelliSenseMetadataCache(repository, contextService);

    // 2. Create domain services and use cases
    const contextDetector = new SqlContextDetector();
    const getEntitySuggestions = new GetEntitySuggestionsUseCase(metadataCache, logger);
    const getAttributeSuggestions = new GetAttributeSuggestionsUseCase(metadataCache, logger);

    // 3. Create completion provider
    const completionProvider = new DataverseCompletionProvider(
        contextService,
        contextDetector,
        getEntitySuggestions,
        getAttributeSuggestions
    );

    // 4. Register completion provider for ALL SQL files
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { language: 'sql' },
            completionProvider,
            ' ', ','  // Trigger characters
        )
    );

    // 5. Create editor service
    const editorService = new SqlEditorService(logger);
    context.subscriptions.push(editorService);
    context.subscriptions.push({ dispose: () => metadataCache.dispose() });

    logger.info('Data Explorer IntelliSense registered');

    // Return services for panel integration
    return { contextService, editorService };
}
```

### Panel Integration

```typescript
// In DataExplorerPanelComposed.ts

export class DataExplorerPanelComposed {
    constructor(
        // ... existing parameters
        private readonly intelliSenseContext: IntelliSenseContextService,
        private readonly editorService: SqlEditorService
    ) {
        // Update IntelliSense context when environment changes
        this.intelliSenseContext.setActiveEnvironment(this.currentEnvironmentId);
    }

    private async handleEnvironmentChange(environmentId: string): Promise<void> {
        this.currentEnvironmentId = environmentId;

        // Update IntelliSense context so completions use new environment
        this.intelliSenseContext.setActiveEnvironment(environmentId);

        // ... rest of existing implementation
    }

    private async handleNewQuery(): Promise<void> {
        await this.editorService.openNewQuery();
    }

    private async handleOpenFile(): Promise<void> {
        const editor = await this.editorService.openFileFromDisk();
        if (editor) {
            // If it's an XML file, could parse as FetchXML
            if (editor.document.languageId === 'xml') {
                // Future: offer to execute as FetchXML or convert to SQL
            }
        }
    }

    private async handleExecuteQuery(): Promise<void> {
        // Get SQL from active/visible editor
        const sql = this.editorService.getActiveSqlContent()
            ?? this.editorService.getVisibleSqlContent()
            ?? this.currentSqlQuery;  // Fallback to panel's stored SQL

        if (sql) {
            await this.executeQuery(sql);
        }
    }
}
```

---

## Metadata API Queries

### Entity List (Stage 1 - On First Completion)

```http
GET /api/data/v9.2/EntityDefinitions?$select=LogicalName,DisplayName,IsCustomEntity
```

**Payload:** ~5-10 KB for 1,000 entities
**Cached:** Indefinitely (until environment change)

### Attribute List (Stage 2 - On Demand Per Entity)

```http
GET /api/data/v9.2/EntityDefinitions(LogicalName='account')/Attributes?$select=LogicalName,DisplayName,AttributeType,IsCustomAttribute
```

**Payload:** ~10-15 KB per entity (100 attributes typical)
**Cached:** 5 minutes TTL

---

## Testing Strategy

### Domain Layer Tests

```typescript
describe('SqlContextDetector', () => {
    let detector: SqlContextDetector;

    beforeEach(() => {
        detector = new SqlContextDetector();
    });

    describe('entity context detection', () => {
        it('should detect entity context after FROM', () => {
            const context = detector.detectContext('SELECT * FROM ', 14);
            expect(context.kind).toBe('entity');
        });

        it('should detect entity context after JOIN', () => {
            const context = detector.detectContext('SELECT * FROM account JOIN ', 27);
            expect(context.kind).toBe('entity');
        });
    });

    describe('attribute context detection', () => {
        it('should detect attribute context after SELECT with known entity', () => {
            const context = detector.detectContext('SELECT  FROM account', 7);
            expect(context.kind).toBe('attribute');
            expect((context as any).entityName).toBe('account');
        });

        it('should detect attribute context after WHERE', () => {
            const context = detector.detectContext('SELECT * FROM account WHERE ', 28);
            expect(context.kind).toBe('attribute');
        });

        it('should not detect attribute context without FROM clause', () => {
            const context = detector.detectContext('SELECT ', 7);
            expect(context.kind).not.toBe('attribute');
        });
    });

    describe('keyword context detection', () => {
        it('should detect keyword context at start', () => {
            const context = detector.detectContext('', 0);
            expect(context.kind).toBe('keyword');
        });

        it('should detect keyword context after entity name', () => {
            const context = detector.detectContext('SELECT * FROM account ', 22);
            expect(context.kind).toBe('keyword');
        });
    });
});
```

### Application Layer Tests

```typescript
describe('GetEntitySuggestionsUseCase', () => {
    it('should filter entities by prefix', async () => {
        const mockCache = {
            getEntitySuggestions: jest.fn().mockResolvedValue([
                EntitySuggestion.create('account', 'Account', false),
                EntitySuggestion.create('contact', 'Contact', false),
                EntitySuggestion.create('activity', 'Activity', false)
            ])
        };

        const useCase = new GetEntitySuggestionsUseCase(mockCache as any, nullLogger);
        const results = await useCase.execute('env-1', 'acc');

        expect(results).toHaveLength(1);
        expect(results[0].logicalName).toBe('account');
    });

    it('should sort exact matches first', async () => {
        const mockCache = {
            getEntitySuggestions: jest.fn().mockResolvedValue([
                EntitySuggestion.create('accounthistory', 'Account History', false),
                EntitySuggestion.create('account', 'Account', false),
            ])
        };

        const useCase = new GetEntitySuggestionsUseCase(mockCache as any, nullLogger);
        const results = await useCase.execute('env-1', 'account');

        expect(results[0].logicalName).toBe('account');
        expect(results[1].logicalName).toBe('accounthistory');
    });
});

describe('IntelliSenseContextService', () => {
    it('should track active environment', () => {
        const service = new IntelliSenseContextService();

        expect(service.hasActiveEnvironment()).toBe(false);

        service.setActiveEnvironment('env-123');

        expect(service.hasActiveEnvironment()).toBe(true);
        expect(service.getActiveEnvironment()).toBe('env-123');
    });

    it('should notify listeners on environment change', () => {
        const service = new IntelliSenseContextService();
        const listener = jest.fn();

        service.onEnvironmentChange(listener);
        service.setActiveEnvironment('env-123');

        expect(listener).toHaveBeenCalledWith('env-123');
    });
});
```

---

## Future Enhancements

### Slice 2: Validation

```typescript
// DiagnosticCollection for SQL validation
const diagnostics = vscode.languages.createDiagnosticCollection('dataverse-sql');

// Validate on document change (debounced)
vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.document.languageId === 'sql' && contextService.hasActiveEnvironment()) {
        validateSqlDocument(event.document, diagnostics);
    }
});
```

### Slice 3: FetchXML Support

```typescript
// Completion provider for FetchXML
vscode.languages.registerCompletionItemProvider(
    { language: 'xml', pattern: '**/*.xml' },
    fetchXmlCompletionProvider,
    '<', ' '
);

// Execute FetchXML directly
async function executeFetchXml(fetchXml: string): Promise<QueryResult> {
    // Bypass SQL parser, send FetchXML directly to Dataverse
}
```

### Future: Hover Provider

```typescript
vscode.languages.registerHoverProvider(
    { language: 'sql' },
    {
        async provideHover(document, position) {
            // Show attribute type, description, picklist values on hover
        }
    }
);
```

---

## Summary

V2 design improvements over V1:

1. **Editable documents** - Uses untitled documents or real files instead of read-only virtual documents
2. **Works with any SQL file** - Completion provider registered for `sql` language, not custom URI scheme
3. **Decoupled environment context** - `IntelliSenseContextService` bridges panel and completion provider
4. **Supports loading from disk** - Native file open dialog, works with existing `.sql` files
5. **Simpler editor management** - `SqlEditorService` is stateless, works with VS Code's natural editor lifecycle
6. **Future-proof** - Architecture supports FetchXML files, validation, hover, etc.

The core domain and application layers remain largely unchanged from V1. The key changes are in the presentation layer's approach to document management and context tracking.
