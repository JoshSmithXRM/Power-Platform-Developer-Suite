# Data Explorer IntelliSense - Technical Design

## Overview

This document describes the technical design for adding IntelliSense (autocomplete) capabilities to the Data Explorer SQL editor. The implementation uses VS Code's native editor API rather than embedding a separate editor, providing a seamless developer experience with zero bundle size impact.

## Goals

1. **Entity completion** - Suggest Dataverse table names after `FROM`
2. **Attribute completion** - Suggest column names after `SELECT`, `WHERE`, `ORDER BY`, `ON`
3. **Keyword completion** - Suggest SQL keywords (SELECT, FROM, WHERE, etc.)
4. **Validation** - Show red squiggles for invalid entity/attribute names (Slice 2)

## Non-Goals (Deferred)

- Hover information (attribute type, description)
- Picklist value suggestions in WHERE clauses
- JOIN table attribute completion (complex scope detection)

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

### User Experience

```
┌─────────────────────────────────────────────────────────┐
│  query.sql - Data Explorer                        [x]  │
├─────────────────────────────────────────────────────────┤
│  SELECT na|                                             │
│         ┌──────────────────────┐                       │
│         │ name                 │  <- Attribute suggestions
│         │ numberofemployees    │                       │
│         │ new_customfield      │                       │
│         └──────────────────────┘                       │
│  FROM account                                           │
│  WHERE statecode = 0                                    │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  Data Explorer - Contoso Dev                      [x]  │
├─────────────────────────────────────────────────────────┤
│  Environment: [Contoso Dev        ▼]  [Execute Query]  │
├─────────────────────────────────────────────────────────┤
│  FetchXML Preview (collapsed)                          │
├─────────────────────────────────────────────────────────┤
│  │ name          │ statecode │ revenue    │            │
│  │ Contoso Ltd   │ Active    │ 1,000,000  │            │
│  │ Fabrikam Inc  │ Active    │ 500,000    │            │
└─────────────────────────────────────────────────────────┘
```

## Implementation Slices

### Slice 1: Core IntelliSense
- Virtual document provider for SQL files
- Entity name completion (after FROM)
- Attribute name completion (after SELECT/WHERE/ORDER BY)
- SQL keyword completion
- Metadata caching infrastructure
- Editor ↔ Panel coordination

### Slice 2: Validation (Future)
- DiagnosticCollection for SQL validation
- Invalid entity name detection
- Invalid attribute name detection
- Real-time validation on document change

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
│   ├── DataverseSqlDocumentProvider.ts   # Virtual document provider
│   └── DataverseCompletionProvider.ts    # VS Code completion provider
└── coordinators/
    └── SqlEditorCoordinator.ts           # Editor ↔ Panel sync
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
     * Format: "account - Account" or "new_customentity - Custom Entity"
     */
    public getDisplayLabel(): string {
        return `${this.logicalName} - ${this.displayName}`;
    }

    /**
     * Returns the text to insert on selection.
     */
    public getInsertText(): string {
        return this.logicalName;
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
     * Format: "name (String)" or "revenue (Money)"
     */
    public getDisplayLabel(): string {
        return `${this.logicalName} (${this.attributeType})`;
    }

    /**
     * Returns detail text showing display name.
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
     * Should use: GET /EntityDefinitions(LogicalName='x')/Attributes?$select=LogicalName,DisplayName,AttributeType,IsCustomAttribute
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
        const textBeforeCursor = sql.substring(0, cursorOffset).toUpperCase();

        // Check if we're after FROM or JOIN (entity context)
        if (this.isAfterEntityKeyword(textBeforeCursor)) {
            return { kind: 'entity' };
        }

        // Check if we're in an attribute context
        const entityName = this.extractEntityName(sql);
        if (entityName && this.isAfterAttributeKeyword(textBeforeCursor)) {
            return { kind: 'attribute', entityName: entityName.toLowerCase() };
        }

        // Check if we're at a keyword position
        if (this.isKeywordPosition(textBeforeCursor)) {
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
    private isAfterAttributeKeyword(textBeforeCursor: string): boolean {
        const trimmed = textBeforeCursor.trimEnd();

        // After SELECT (but not SELECT *)
        if (/\bSELECT\s+(?!.*\bFROM\b).*$/i.test(trimmed)) {
            return true;
        }

        // After WHERE, AND, OR
        if (/\b(WHERE|AND|OR)\s*$/i.test(trimmed)) {
            return true;
        }

        // After ORDER BY
        if (/\bORDER\s+BY\s*$/i.test(trimmed)) {
            return true;
        }

        // After ON (in JOIN)
        if (/\bON\s*$/i.test(trimmed)) {
            return true;
        }

        // After comma in SELECT list (before FROM)
        if (/\bSELECT\s+.*,\s*$/i.test(trimmed) && !/\bFROM\b/i.test(trimmed)) {
            return true;
        }

        return false;
    }

    /**
     * Checks if cursor is at a position where keywords should be suggested.
     */
    private isKeywordPosition(textBeforeCursor: string): boolean {
        const trimmed = textBeforeCursor.trimEnd();

        // Start of document or after semicolon
        if (trimmed === '' || trimmed.endsWith(';')) {
            return true;
        }

        // After a complete clause
        if (/\b(FROM\s+\w+|WHERE\s+.*?(?:=|<|>|LIKE|IN|IS).*?)\s+$/i.test(trimmed)) {
            return true;
        }

        return false;
    }

    /**
     * Extracts the entity name from a SQL query.
     * Looks for FROM clause to determine the main entity.
     */
    private extractEntityName(sql: string): string | null {
        const match = sql.match(/\bFROM\s+(\w+)/i);
        return match ? match[1] : null;
    }
}
```

---

### 2. Application Layer

#### 2.1 IntelliSenseMetadataCache (Application Service)

```typescript
// src/features/dataExplorer/application/services/IntelliSenseMetadataCache.ts

import type { EntitySuggestion } from '../../domain/valueObjects/EntitySuggestion';
import type { AttributeSuggestion } from '../../domain/valueObjects/AttributeSuggestion';
import type { IIntelliSenseMetadataRepository } from '../../domain/repositories/IIntelliSenseMetadataRepository';

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
 */
export class IntelliSenseMetadataCache {
    private static readonly ATTRIBUTE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    private readonly entityCache = new Map<string, CacheEntry<EntitySuggestion[]>>();
    private readonly attributeCache = new Map<string, CacheEntry<AttributeSuggestion[]>>();

    constructor(
        private readonly repository: IIntelliSenseMetadataRepository
    ) {}

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
     * Clears all caches. Call when environment changes.
     */
    public clearCache(): void {
        this.entityCache.clear();
        this.attributeCache.clear();
    }

    /**
     * Clears cache for a specific environment.
     */
    public clearEnvironmentCache(environmentId: string): void {
        this.entityCache.delete(environmentId);

        // Clear all attribute caches for this environment
        for (const key of this.attributeCache.keys()) {
            if (key.startsWith(`${environmentId}:`)) {
                this.attributeCache.delete(key);
            }
        }
    }

    private isExpired(timestamp: number): boolean {
        return Date.now() - timestamp > IntelliSenseMetadataCache.ATTRIBUTE_CACHE_TTL_MS;
    }
}
```

#### 2.2 GetEntitySuggestionsUseCase

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

        const allEntities = await this.metadataCache.getEntitySuggestions(environmentId);
        const lowerPrefix = prefix.toLowerCase();

        const filtered = allEntities.filter(entity =>
            entity.logicalName.toLowerCase().startsWith(lowerPrefix) ||
            entity.displayName.toLowerCase().startsWith(lowerPrefix)
        );

        // Sort: exact prefix matches first, then alphabetically
        filtered.sort((a, b) => {
            const aStartsWithPrefix = a.logicalName.toLowerCase().startsWith(lowerPrefix);
            const bStartsWithPrefix = b.logicalName.toLowerCase().startsWith(lowerPrefix);

            if (aStartsWithPrefix && !bStartsWithPrefix) return -1;
            if (!aStartsWithPrefix && bStartsWithPrefix) return 1;

            return a.logicalName.localeCompare(b.logicalName);
        });

        this.logger.debug('Entity suggestions filtered', {
            total: allEntities.length,
            filtered: filtered.length
        });

        return filtered;
    }
}
```

#### 2.3 GetAttributeSuggestionsUseCase

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

        const allAttributes = await this.metadataCache.getAttributeSuggestions(
            environmentId,
            entityLogicalName
        );

        const lowerPrefix = prefix.toLowerCase();

        const filtered = allAttributes.filter(attr =>
            attr.logicalName.toLowerCase().startsWith(lowerPrefix) ||
            attr.displayName.toLowerCase().startsWith(lowerPrefix)
        );

        // Sort: exact prefix matches first, then alphabetically
        filtered.sort((a, b) => {
            const aStartsWithPrefix = a.logicalName.toLowerCase().startsWith(lowerPrefix);
            const bStartsWithPrefix = b.logicalName.toLowerCase().startsWith(lowerPrefix);

            if (aStartsWithPrefix && !bStartsWithPrefix) return -1;
            if (!aStartsWithPrefix && bStartsWithPrefix) return 1;

            return a.logicalName.localeCompare(b.logicalName);
        });

        this.logger.debug('Attribute suggestions filtered', {
            entity: entityLogicalName,
            total: allAttributes.length,
            filtered: filtered.length
        });

        return filtered;
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
     * ~5-10 KB for 1,000 entities.
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
     * ~10-15 KB for typical entity (100 attributes).
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
                return dataverseType;
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

#### 4.1 DataverseSqlDocumentProvider

```typescript
// src/features/dataExplorer/presentation/providers/DataverseSqlDocumentProvider.ts

import * as vscode from 'vscode';

/**
 * Virtual document provider for Data Explorer SQL queries.
 *
 * Creates virtual SQL documents with URI scheme: dataverse-sql://{environmentId}/query.sql
 * Documents are stored in memory and synced with the Data Explorer panel.
 */
export class DataverseSqlDocumentProvider implements vscode.TextDocumentContentProvider {
    public static readonly scheme = 'dataverse-sql';

    private readonly documents = new Map<string, string>();
    private readonly onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();

    public readonly onDidChange = this.onDidChangeEmitter.event;

    /**
     * Gets the content for a virtual document.
     */
    public provideTextDocumentContent(uri: vscode.Uri): string {
        return this.documents.get(uri.toString()) ?? '';
    }

    /**
     * Updates the content of a virtual document.
     */
    public updateDocument(uri: vscode.Uri, content: string): void {
        this.documents.set(uri.toString(), content);
        this.onDidChangeEmitter.fire(uri);
    }

    /**
     * Creates a URI for a Data Explorer SQL document.
     */
    public static createUri(environmentId: string): vscode.Uri {
        return vscode.Uri.parse(`${DataverseSqlDocumentProvider.scheme}://${environmentId}/query.sql`);
    }

    /**
     * Extracts the environment ID from a document URI.
     */
    public static getEnvironmentId(uri: vscode.Uri): string | null {
        if (uri.scheme !== DataverseSqlDocumentProvider.scheme) {
            return null;
        }
        return uri.authority;
    }

    public dispose(): void {
        this.onDidChangeEmitter.dispose();
        this.documents.clear();
    }
}
```

#### 4.2 DataverseCompletionProvider

```typescript
// src/features/dataExplorer/presentation/providers/DataverseCompletionProvider.ts

import * as vscode from 'vscode';
import type { SqlContextDetector } from '../../domain/services/SqlContextDetector';
import type { GetEntitySuggestionsUseCase } from '../../application/useCases/GetEntitySuggestionsUseCase';
import type { GetAttributeSuggestionsUseCase } from '../../application/useCases/GetAttributeSuggestionsUseCase';
import { DataverseSqlDocumentProvider } from './DataverseSqlDocumentProvider';

/**
 * VS Code Completion Provider for Dataverse SQL queries.
 *
 * Provides context-aware completions:
 * - Entity names after FROM/JOIN
 * - Attribute names after SELECT/WHERE/ORDER BY
 * - SQL keywords at statement boundaries
 */
export class DataverseCompletionProvider implements vscode.CompletionItemProvider {
    constructor(
        private readonly contextDetector: SqlContextDetector,
        private readonly getEntitySuggestions: GetEntitySuggestionsUseCase,
        private readonly getAttributeSuggestions: GetAttributeSuggestionsUseCase
    ) {}

    public async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        _token: vscode.CancellationToken,
        _context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[] | null> {
        // Only provide completions for dataverse-sql documents
        const environmentId = DataverseSqlDocumentProvider.getEnvironmentId(document.uri);
        if (!environmentId) {
            return null;
        }

        const text = document.getText();
        const offset = document.offsetAt(position);
        const wordRange = document.getWordRangeAtPosition(position);
        const currentWord = wordRange ? document.getText(wordRange) : '';

        const context = this.contextDetector.detectContext(text, offset);

        switch (context.kind) {
            case 'entity':
                return this.getEntityCompletions(environmentId, currentWord);

            case 'attribute':
                return this.getAttributeCompletions(
                    environmentId,
                    context.entityName,
                    currentWord
                );

            case 'keyword':
                return this.getKeywordCompletions(currentWord);

            default:
                return null;
        }
    }

    private async getEntityCompletions(
        environmentId: string,
        prefix: string
    ): Promise<vscode.CompletionItem[]> {
        const suggestions = await this.getEntitySuggestions.execute(environmentId, prefix);

        return suggestions.map((entity, index) => {
            const item = new vscode.CompletionItem(
                entity.logicalName,
                vscode.CompletionItemKind.Class
            );
            item.detail = entity.displayName;
            item.documentation = entity.isCustomEntity ? 'Custom Entity' : 'System Entity';
            item.insertText = entity.getInsertText();
            item.sortText = index.toString().padStart(5, '0'); // Preserve server sort order
            return item;
        });
    }

    private async getAttributeCompletions(
        environmentId: string,
        entityName: string,
        prefix: string
    ): Promise<vscode.CompletionItem[]> {
        const suggestions = await this.getAttributeSuggestions.execute(
            environmentId,
            entityName,
            prefix
        );

        return suggestions.map((attr, index) => {
            const item = new vscode.CompletionItem(
                attr.logicalName,
                this.getCompletionKindForType(attr.attributeType)
            );
            item.detail = `${attr.displayName} (${attr.attributeType})`;
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

#### 4.3 SqlEditorCoordinator

```typescript
// src/features/dataExplorer/presentation/coordinators/SqlEditorCoordinator.ts

import * as vscode from 'vscode';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import { DataverseSqlDocumentProvider } from '../providers/DataverseSqlDocumentProvider';

/**
 * Coordinates between the SQL editor (native VS Code) and the Data Explorer panel.
 *
 * Responsibilities:
 * - Opens SQL editor when Data Explorer panel opens
 * - Syncs SQL content between editor and panel
 * - Handles Ctrl+Enter to execute queries
 * - Manages document lifecycle
 */
export class SqlEditorCoordinator implements vscode.Disposable {
    private readonly disposables: vscode.Disposable[] = [];
    private activeEditor: vscode.TextEditor | null = null;
    private currentEnvironmentId: string | null = null;

    constructor(
        private readonly documentProvider: DataverseSqlDocumentProvider,
        private readonly onExecuteQuery: (sql: string) => void,
        private readonly logger: ILogger
    ) {
        this.registerEventHandlers();
    }

    /**
     * Opens or focuses the SQL editor for an environment.
     */
    public async openEditor(environmentId: string, initialSql: string = ''): Promise<void> {
        this.currentEnvironmentId = environmentId;
        const uri = DataverseSqlDocumentProvider.createUri(environmentId);

        // Update document content
        this.documentProvider.updateDocument(uri, initialSql);

        // Open the document
        const document = await vscode.workspace.openTextDocument(uri);

        // Show in editor (above the panel)
        this.activeEditor = await vscode.window.showTextDocument(document, {
            viewColumn: vscode.ViewColumn.One,
            preserveFocus: false,
            preview: false
        });

        // Set language to SQL
        await vscode.languages.setTextDocumentLanguage(document, 'sql');

        this.logger.debug('SQL editor opened', { environmentId });
    }

    /**
     * Gets the current SQL content from the editor.
     */
    public getSqlContent(): string {
        if (!this.activeEditor || !this.currentEnvironmentId) {
            return '';
        }

        return this.activeEditor.document.getText();
    }

    /**
     * Updates the SQL content in the editor.
     */
    public setSqlContent(sql: string): void {
        if (!this.currentEnvironmentId) {
            return;
        }

        const uri = DataverseSqlDocumentProvider.createUri(this.currentEnvironmentId);
        this.documentProvider.updateDocument(uri, sql);
    }

    /**
     * Changes the environment for the SQL editor.
     */
    public async switchEnvironment(newEnvironmentId: string): Promise<void> {
        const currentSql = this.getSqlContent();
        await this.openEditor(newEnvironmentId, currentSql);
    }

    private registerEventHandlers(): void {
        // Handle Ctrl+Enter to execute query
        this.disposables.push(
            vscode.commands.registerTextEditorCommand(
                'powerPlatformDevSuite.dataExplorer.executeFromEditor',
                (editor) => {
                    const envId = DataverseSqlDocumentProvider.getEnvironmentId(editor.document.uri);
                    if (envId && envId === this.currentEnvironmentId) {
                        const sql = editor.document.getText();
                        this.onExecuteQuery(sql);
                    }
                }
            )
        );

        // Track active editor changes
        this.disposables.push(
            vscode.window.onDidChangeActiveTextEditor((editor) => {
                if (editor) {
                    const envId = DataverseSqlDocumentProvider.getEnvironmentId(editor.document.uri);
                    if (envId) {
                        this.activeEditor = editor;
                    }
                }
            })
        );

        // Sync content changes to panel (debounced in behavior)
        this.disposables.push(
            vscode.workspace.onDidChangeTextDocument((event) => {
                const envId = DataverseSqlDocumentProvider.getEnvironmentId(event.document.uri);
                if (envId && envId === this.currentEnvironmentId) {
                    // Content changed - panel can poll getSqlContent() or we can emit event
                }
            })
        );
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
// In extension.ts or initializeDataExplorer.ts

import * as vscode from 'vscode';
import { DataverseSqlDocumentProvider } from './presentation/providers/DataverseSqlDocumentProvider';
import { DataverseCompletionProvider } from './presentation/providers/DataverseCompletionProvider';
import { SqlContextDetector } from './domain/services/SqlContextDetector';
// ... other imports

export function registerDataExplorerIntelliSense(
    context: vscode.ExtensionContext,
    apiService: IDataverseApiService,
    logger: ILogger
): void {
    // 1. Register virtual document provider
    const documentProvider = new DataverseSqlDocumentProvider();
    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider(
            DataverseSqlDocumentProvider.scheme,
            documentProvider
        )
    );

    // 2. Create domain and application services
    const repository = new DataverseIntelliSenseMetadataRepository(apiService);
    const metadataCache = new IntelliSenseMetadataCache(repository);
    const contextDetector = new SqlContextDetector();
    const getEntitySuggestions = new GetEntitySuggestionsUseCase(metadataCache, logger);
    const getAttributeSuggestions = new GetAttributeSuggestionsUseCase(metadataCache, logger);

    // 3. Register completion provider for dataverse-sql scheme
    const completionProvider = new DataverseCompletionProvider(
        contextDetector,
        getEntitySuggestions,
        getAttributeSuggestions
    );

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { scheme: DataverseSqlDocumentProvider.scheme, language: 'sql' },
            completionProvider,
            ' ', '.', ','  // Trigger characters
        )
    );

    // 4. Register keybinding for execute query
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'powerPlatformDevSuite.dataExplorer.executeFromEditor',
            () => {
                // Implementation in SqlEditorCoordinator
            }
        )
    );

    logger.info('Data Explorer IntelliSense registered');
}
```

### Keybinding (package.json)

```json
{
    "contributes": {
        "keybindings": [
            {
                "command": "powerPlatformDevSuite.dataExplorer.executeFromEditor",
                "key": "ctrl+enter",
                "mac": "cmd+enter",
                "when": "editorTextFocus && resourceScheme == dataverse-sql"
            }
        ]
    }
}
```

---

## Metadata API Queries

### Entity List (Stage 1 - Panel Open)

```http
GET /api/data/v9.2/EntityDefinitions?$select=LogicalName,DisplayName,IsCustomEntity
```

**Payload:** ~5-10 KB for 1,000 entities

### Attribute List (Stage 2 - On Demand)

```http
GET /api/data/v9.2/EntityDefinitions(LogicalName='account')/Attributes?$select=LogicalName,DisplayName,AttributeType,IsCustomAttribute
```

**Payload:** ~10-15 KB per entity (100 attributes typical)

---

## Testing Strategy

### Domain Layer Tests

```typescript
describe('SqlContextDetector', () => {
    it('should detect entity context after FROM', () => {
        const detector = new SqlContextDetector();
        const context = detector.detectContext('SELECT * FROM ', 14);
        expect(context.kind).toBe('entity');
    });

    it('should detect attribute context after SELECT with known entity', () => {
        const detector = new SqlContextDetector();
        const context = detector.detectContext('SELECT  FROM account', 7);
        expect(context.kind).toBe('attribute');
        expect(context.entityName).toBe('account');
    });

    it('should detect keyword context at start', () => {
        const detector = new SqlContextDetector();
        const context = detector.detectContext('', 0);
        expect(context.kind).toBe('keyword');
    });
});
```

### Application Layer Tests

```typescript
describe('GetEntitySuggestionsUseCase', () => {
    it('should filter entities by prefix', async () => {
        const mockCache = createMockCache([
            EntitySuggestion.create('account', 'Account', false),
            EntitySuggestion.create('contact', 'Contact', false),
            EntitySuggestion.create('activity', 'Activity', false)
        ]);

        const useCase = new GetEntitySuggestionsUseCase(mockCache, nullLogger);
        const results = await useCase.execute('env-1', 'acc');

        expect(results).toHaveLength(1);
        expect(results[0].logicalName).toBe('account');
    });
});
```

---

## Future Enhancements (Slice 2+)

### Validation (Slice 2)

```typescript
// Register DiagnosticCollection for SQL validation
const diagnostics = vscode.languages.createDiagnosticCollection('dataverse-sql');

// On document change, validate entity/attribute names
vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.document.uri.scheme === 'dataverse-sql') {
        validateSqlDocument(event.document, diagnostics);
    }
});
```

### Hover Provider (Future)

```typescript
vscode.languages.registerHoverProvider(
    { scheme: 'dataverse-sql', language: 'sql' },
    {
        provideHover(document, position) {
            // Show attribute type, description, picklist values
        }
    }
);
```

---

## Summary

This design provides:

1. **Zero bundle impact** - Uses VS Code's native editor
2. **Native experience** - Themes, keybindings, settings work automatically
3. **Clean Architecture** - Domain logic separated from infrastructure
4. **Efficient metadata loading** - Minimal OData queries with caching
5. **Extensible foundation** - Easy to add validation, hover, etc.

The implementation follows the existing patterns in the codebase and integrates seamlessly with the current Data Explorer panel architecture.
