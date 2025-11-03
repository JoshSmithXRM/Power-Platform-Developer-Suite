# Data Panel Suite - Clean Architecture Design

> **Status:** In Progress - Next Feature
> **Started:** Not yet implemented
> **See:** This is a design document, not implementation guide

## 1. Architecture Overview

### 1.1 Layer Structure

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │  VS Code Panels, ViewModels
│  (depends on Application & Domain)      │
├─────────────────────────────────────────┤
│       Infrastructure Layer              │  API Clients, File System, VS Code APIs
│  (depends on Application & Domain)      │
├─────────────────────────────────────────┤
│        Application Layer                │  Use Cases (orchestration only)
│       (depends on Domain)               │
├─────────────────────────────────────────┤
│          Domain Layer                   │  Entities, Value Objects, Interfaces
│         (ZERO dependencies)             │  Rich models with behavior
└─────────────────────────────────────────┘
```

**Dependency Rule:** All dependencies point INWARD. Domain has zero external dependencies.

### 1.2 Core Principles Applied

- **Rich Domain Models**: Entities contain behavior (methods), not just data
- **Use Cases Orchestrate**: Application layer coordinates, NO business logic
- **Repository Pattern**: Domain defines interfaces, infrastructure implements
- **Dependency Inversion**: Domain defines contracts, outer layers implement
- **View Models**: Presentation uses DTOs mapped from domain entities

---

## 2. Domain Layer Design

### 2.1 Entities (Rich Models with Behavior)

#### Solution Entity

```typescript
class Solution {
  constructor(
    public readonly id: string,
    public readonly uniqueName: string,
    public readonly friendlyName: string,
    public readonly version: string,
    public readonly isManaged: boolean,
    public readonly publisherId: string,
    public readonly publisherName: string,
    public readonly installedOn: Date | null,
    public readonly description: string
  ) {
    // Validation: version must be in format X.X.X.X
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(version)) {
      throw new Error(`Invalid version format: ${version}`);
    }
  }

  // Business logic: Default solution identification
  isDefaultSolution(): boolean {
    return this.uniqueName === 'Default';
  }

  // Business logic: Sort ordering for default solution
  getSortPriority(): number {
    return this.isDefaultSolution() ? 0 : 1;
  }
}
```

**Why:** Solution contains business logic for identifying and sorting itself. Constructor validation ensures version format is valid. URL construction is delegated to IMakerUrlBuilder domain service (see section 2.4).

---

#### ImportJob Entity

```typescript
enum ImportJobStatus {
  Completed = 'Completed',
  Failed = 'Failed',
  InProgress = 'InProgress'
}

class ImportJob {
  constructor(
    public readonly id: string,
    public readonly solutionName: string,
    public readonly progress: number,
    public readonly startedOn: Date,
    public readonly completedOn: Date | null,
    public readonly importLogXml: string,
    public readonly createdBy: string
  ) {
    // Validation: progress must be between 0 and 100
    if (progress < 0 || progress > 100) {
      throw new Error(`Progress must be between 0 and 100, got: ${progress}`);
    }
  }

  // Business logic: Status determination from progress and completion
  getStatus(): ImportJobStatus {
    if (this.completedOn && this.progress === 100) {
      return ImportJobStatus.Completed;
    }
    if (this.completedOn && this.progress < 100) {
      return ImportJobStatus.Failed;
    }
    if (!this.completedOn && this.progress > 0) {
      return ImportJobStatus.InProgress;
    }
    return ImportJobStatus.Failed;
  }

  // Business logic: Duration formatting
  getDuration(): string | null {
    if (!this.completedOn) {
      return null;
    }
    const durationMs = this.completedOn.getTime() - this.startedOn.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  // Business logic: Error message extraction from XML
  parseErrorMessage(): string | null {
    if (this.getStatus() !== ImportJobStatus.Failed) {
      return null;
    }

    // Extract error from XML structure
    const errorMatch = this.importLogXml.match(/<result[^>]*errortext="([^"]*)"[^>]*>/);
    if (errorMatch) {
      return errorMatch[1];
    }

    const messageMatch = this.importLogXml.match(/<error[^>]*>([^<]*)<\/error>/);
    return messageMatch ? messageMatch[1] : 'Import failed with unknown error';
  }

  // Business logic: Progress display formatting
  getFormattedProgress(): string {
    return this.progress.toFixed(4) + '%';
  }
}
```

**Why:** ImportJob encapsulates complex business rules for status determination, duration calculation, and error parsing. These are domain concerns, not orchestration concerns.

---

#### EnvironmentVariable Entity

```typescript
enum EnvironmentVariableType {
  String = 100000000,
  Number = 100000001,
  Boolean = 100000002,
  JSON = 100000003,
  DataSource = 100000004
}

class EnvironmentVariable {
  constructor(
    public readonly id: string,
    public readonly schemaName: string,
    public readonly displayName: string,
    public readonly type: EnvironmentVariableType,
    public readonly currentValue: string | null,
    public readonly defaultValue: string | null,
    public readonly isManaged: boolean,
    public readonly modifiedOn: Date,
    public readonly modifiedBy: string
  ) {}

  // Business logic: Effective value resolution
  getEffectiveValue(): string {
    return this.currentValue ?? this.defaultValue ?? '';
  }

  // Business logic: Type display name conversion
  getTypeDisplayName(): string {
    switch (this.type) {
      case EnvironmentVariableType.String:
        return 'String';
      case EnvironmentVariableType.Number:
        return 'Number';
      case EnvironmentVariableType.Boolean:
        return 'Boolean';
      case EnvironmentVariableType.JSON:
        return 'JSON';
      case EnvironmentVariableType.DataSource:
        return 'Data Source';
      default:
        return 'Unknown';
    }
  }

  // Business logic: Solution membership check
  isInSolution(solutionComponentIds: Set<string>): boolean {
    return solutionComponentIds.has(this.id);
  }

  // Business logic: Deployment settings conversion
  toDeploymentSettingsEntry(): EnvironmentVariableEntry {
    return {
      SchemaName: this.schemaName,
      Value: this.getEffectiveValue()
    };
  }
}
```

**Why:** EnvironmentVariable knows how to resolve its effective value, display its type, and convert itself to deployment settings format. This keeps domain logic in the domain.

---

#### CloudFlow Entity

```typescript
class CloudFlow {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly clientData: string,
    public readonly isManaged: boolean,
    public readonly modifiedOn: Date,
    public readonly modifiedBy: string
  ) {}

  /**
   * Extracts connection reference logical names from clientData JSON.
   *
   * @throws {InvalidClientDataError} If clientData cannot be parsed
   * @returns Array of connection reference logical names (empty if none defined)
   */
  extractConnectionReferenceNames(): string[] {
    try {
      const parsed = JSON.parse(this.clientData);
      const connectionReferences = parsed?.properties?.connectionReferences;

      if (!connectionReferences) {
        return [];
      }

      // Extract connectionReferenceLogicalName from each connection reference
      const names: string[] = [];
      for (const key in connectionReferences) {
        const logicalName = connectionReferences[key]?.connection?.connectionReferenceLogicalName;
        if (logicalName) {
          names.push(logicalName);
        }
      }

      return names;
    } catch (error) {
      // Domain exception - let outer layers handle logging/display
      throw new InvalidClientDataError(
        this.id,
        this.name,
        error as Error
      );
    }
  }

  // Business logic: Solution membership check
  isInSolution(solutionComponentIds: Set<string>): boolean {
    return solutionComponentIds.has(this.id);
  }

  // Business logic: Check if flow has connection references
  hasConnectionReferences(): boolean {
    return this.extractConnectionReferenceNames().length > 0;
  }
}
```

**Why:** CloudFlow knows how to parse its own clientData JSON structure. This complex parsing logic belongs in the domain, not in use cases.

---

#### ConnectionReference Entity

```typescript
class ConnectionReference {
  constructor(
    public readonly id: string,
    public readonly logicalName: string,
    public readonly displayName: string,
    public readonly connectorId: string,
    public readonly connectionId: string | null,
    public readonly isManaged: boolean,
    public readonly modifiedOn: Date,
    public readonly modifiedBy: string
  ) {}

  // Business logic: Solution membership check
  isInSolution(solutionComponentIds: Set<string>): boolean {
    return solutionComponentIds.has(this.id);
  }

  // Business logic: Connector type extraction
  getConnectorType(): string {
    // Extract connector type from connectorId
    // e.g., "/providers/Microsoft.PowerApps/apis/shared_azuread" → "Azure AD"
    const match = this.connectorId.match(/\/apis\/shared_(.+)$/);
    if (match) {
      return match[1].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return 'Unknown';
  }

  // Business logic: Deployment settings conversion
  toDeploymentSettingsEntry(): ConnectionReferenceEntry {
    return {
      LogicalName: this.logicalName,
      ConnectionId: this.connectionId ?? '',
      ConnectorId: this.connectorId
    };
  }
}
```

**Why:** ConnectionReference is fully immutable. All properties are readonly and set in the constructor. Relationship tracking is handled by FlowConnectionRelationshipBuilder domain service.

---

### 2.2 Value Objects

#### FlowConnectionRelationship

```typescript
enum RelationshipType {
  FlowToConnectionReference = 'flow-to-cr',
  OrphanedFlow = 'orphaned-flow',
  OrphanedConnectionReference = 'orphaned-cr'
}

class FlowConnectionRelationship {
  constructor(
    public readonly flowId: string | null,
    public readonly flowName: string | null,
    public readonly connectionReferenceId: string | null,
    public readonly connectionReferenceLogicalName: string | null,
    public readonly connectorType: string | null,
    public readonly connectionId: string | null,
    public readonly relationshipType: RelationshipType,
    public readonly isManaged: boolean,
    public readonly modifiedOn: Date,
    public readonly modifiedBy: string
  ) {}

  // Business logic: Display string for relationship type
  getRelationshipTypeDisplay(): string {
    switch (this.relationshipType) {
      case RelationshipType.FlowToConnectionReference:
        return 'Flow → Connection Reference';
      case RelationshipType.OrphanedFlow:
        return 'Orphaned Flow';
      case RelationshipType.OrphanedConnectionReference:
        return 'Orphaned Connection Reference';
    }
  }

  // Business logic: Check if relationship is orphaned
  isOrphaned(): boolean {
    return this.relationshipType !== RelationshipType.FlowToConnectionReference;
  }

  // Factory methods for creating different relationship types
  static createFlowToConnectionReference(
    flow: CloudFlow,
    connectionRef: ConnectionReference
  ): FlowConnectionRelationship {
    return new FlowConnectionRelationship(
      flow.id,
      flow.name,
      connectionRef.id,
      connectionRef.logicalName,
      connectionRef.getConnectorType(),
      connectionRef.connectionId,
      RelationshipType.FlowToConnectionReference,
      flow.isManaged || connectionRef.isManaged,
      flow.modifiedOn > connectionRef.modifiedOn ? flow.modifiedOn : connectionRef.modifiedOn,
      flow.modifiedBy
    );
  }

  static createOrphanedFlow(flow: CloudFlow): FlowConnectionRelationship {
    return new FlowConnectionRelationship(
      flow.id,
      flow.name,
      null,
      null,
      null,
      null,
      RelationshipType.OrphanedFlow,
      flow.isManaged,
      flow.modifiedOn,
      flow.modifiedBy
    );
  }

  static createOrphanedConnectionReference(
    connectionRef: ConnectionReference
  ): FlowConnectionRelationship {
    return new FlowConnectionRelationship(
      null,
      null,
      connectionRef.id,
      connectionRef.logicalName,
      connectionRef.getConnectorType(),
      connectionRef.connectionId,
      RelationshipType.OrphanedConnectionReference,
      connectionRef.isManaged,
      connectionRef.modifiedOn,
      connectionRef.modifiedBy
    );
  }
}
```

**Why:** FlowConnectionRelationship encapsulates the business logic for creating different types of relationships. Factory methods keep creation logic in the domain.

---

#### DeploymentSettings

```typescript
interface EnvironmentVariableEntry {
  SchemaName: string;
  Value: string;
}

interface ConnectionReferenceEntry {
  LogicalName: string;
  ConnectionId: string;
  ConnectorId: string;
}

class DeploymentSettings {
  constructor(
    public readonly environmentVariables: EnvironmentVariableEntry[],
    public readonly connectionReferences: ConnectionReferenceEntry[]
  ) {}

  // Business logic: Sync environment variables (add/remove/preserve)
  syncEnvironmentVariables(
    newVariables: EnvironmentVariable[]
  ): { settings: DeploymentSettings; added: number; removed: number; preserved: number } {
    const existingMap = new Map(
      this.environmentVariables.map(ev => [ev.SchemaName, ev.Value])
    );
    const newMap = new Map(
      newVariables.map(ev => [ev.schemaName, ev.getEffectiveValue()])
    );

    let added = 0;
    let removed = 0;
    let preserved = 0;

    const synced: EnvironmentVariableEntry[] = [];

    // Add or preserve existing entries
    for (const variable of newVariables) {
      if (existingMap.has(variable.schemaName)) {
        // Preserve existing value (don't overwrite with environment value)
        synced.push({
          SchemaName: variable.schemaName,
          Value: existingMap.get(variable.schemaName)!
        });
        preserved++;
      } else {
        // Add new entry with environment value
        synced.push(variable.toDeploymentSettingsEntry());
        added++;
      }
    }

    // Calculate removed count
    removed = this.environmentVariables.length - preserved;

    // Sort alphabetically by SchemaName
    synced.sort((a, b) => a.SchemaName.localeCompare(b.SchemaName));

    return {
      settings: new DeploymentSettings(synced, this.connectionReferences),
      added,
      removed,
      preserved
    };
  }

  // Business logic: Sync connection references (add/remove/preserve)
  syncConnectionReferences(
    newReferences: ConnectionReference[]
  ): { settings: DeploymentSettings; added: number; removed: number; preserved: number } {
    const existingMap = new Map(
      this.connectionReferences.map(cr => [cr.LogicalName, cr])
    );
    const newMap = new Map(newReferences.map(cr => [cr.logicalName, cr]));

    let added = 0;
    let removed = 0;
    let preserved = 0;

    const synced: ConnectionReferenceEntry[] = [];

    // Add or preserve existing entries
    for (const reference of newReferences) {
      if (existingMap.has(reference.logicalName)) {
        // Preserve existing ConnectionId (don't overwrite with environment value)
        const existing = existingMap.get(reference.logicalName)!;
        synced.push({
          LogicalName: reference.logicalName,
          ConnectionId: existing.ConnectionId,
          ConnectorId: reference.connectorId
        });
        preserved++;
      } else {
        // Add new entry with environment value
        synced.push(reference.toDeploymentSettingsEntry());
        added++;
      }
    }

    // Calculate removed count
    removed = this.connectionReferences.length - preserved;

    // Sort alphabetically by LogicalName
    synced.sort((a, b) => a.LogicalName.localeCompare(b.LogicalName));

    return {
      settings: new DeploymentSettings(this.environmentVariables, synced),
      added,
      removed,
      preserved
    };
  }

  // Business logic: JSON serialization
  toJSON(): string {
    return JSON.stringify(
      {
        EnvironmentVariables: this.environmentVariables,
        ConnectionReferences: this.connectionReferences
      },
      null,
      4
    );
  }

  // Factory method: Parse from JSON with validation
  static fromJSON(json: string, filePath: string): DeploymentSettings {
    try {
      const parsed = JSON.parse(json);

      // Validate structure
      if (!Array.isArray(parsed.EnvironmentVariables)) {
        throw new DeploymentSettingsValidationError(
          filePath,
          'EnvironmentVariables must be an array'
        );
      }

      if (!Array.isArray(parsed.ConnectionReferences)) {
        throw new DeploymentSettingsValidationError(
          filePath,
          'ConnectionReferences must be an array'
        );
      }

      return new DeploymentSettings(
        parsed.EnvironmentVariables ?? [],
        parsed.ConnectionReferences ?? []
      );
    } catch (error) {
      if (error instanceof DomainError) {
        throw error; // Re-throw domain errors
      }
      throw new DeploymentSettingsParseError(filePath, error as Error);
    }
  }

  // Factory method: Create empty
  static createEmpty(): DeploymentSettings {
    return new DeploymentSettings([], []);
  }
}
```

**Why:** DeploymentSettings contains the complex business logic for syncing entries (add/remove/preserve). This ensures consistency and keeps the algorithm in one place.

---

### 2.3 Value Objects (Data Transfer)

#### EnvironmentVariableDefinition

```typescript
interface EnvironmentVariableDefinition {
  readonly id: string;
  readonly schemaName: string;
  readonly displayName: string;
  readonly type: EnvironmentVariableType;
  readonly defaultValue: string | null;
  readonly isManaged: boolean;
  readonly modifiedOn: Date;
  readonly modifiedBy: string;
  readonly description: string;
}
```

#### EnvironmentVariableValue

```typescript
interface EnvironmentVariableValue {
  readonly id: string;
  readonly definitionId: string;
  readonly value: string;
  readonly modifiedOn: Date;
  readonly modifiedBy: string;
}
```

**Why:** These value objects represent data structures for joining into EnvironmentVariable entities. Defined in domain to complete repository contracts.

---

### 2.4 Domain Services

Domain services encapsulate business logic that doesn't naturally belong to a single entity.

#### IMakerUrlBuilder

```typescript
/**
 * Domain service for constructing Power Platform URLs.
 *
 * Handles region-specific URLs (sovereign clouds), custom domains,
 * and URL pattern changes. Keeps infrastructure concerns out of entities.
 */
interface IMakerUrlBuilder {
  /**
   * Builds Maker Portal URL for a solution.
   * @param environmentId - Environment GUID
   * @param solutionId - Solution GUID
   * @returns Full URL to solution in Maker Portal
   */
  buildSolutionUrl(environmentId: string, solutionId: string): string;

  /**
   * Builds Dynamics 365 URL for solution editor.
   * @param environmentId - Environment GUID
   * @param solutionId - Solution GUID
   * @returns Full URL to solution in Dynamics 365
   */
  buildDynamicsUrl(environmentId: string, solutionId: string): string;

  /**
   * Builds Maker Portal URL for solutions list.
   * @param environmentId - Environment GUID
   * @returns Full URL to solutions list
   */
  buildSolutionsListUrl(environmentId: string): string;

  /**
   * Builds Maker Portal URL for import history.
   * @param environmentId - Environment GUID
   * @returns Full URL to import history
   */
  buildImportHistoryUrl(environmentId: string): string;

  /**
   * Builds Maker Portal URL for environment variables.
   * @param environmentId - Environment GUID
   * @returns Full URL to environment variables list
   */
  buildEnvironmentVariablesUrl(environmentId: string): string;

  /**
   * Builds Maker Portal URL for flows.
   * @param environmentId - Environment GUID
   * @returns Full URL to flows list
   */
  buildFlowsUrl(environmentId: string): string;
}
```

**Why:** URL construction involves infrastructure concerns (regions, custom domains) that don't belong in domain entities. This service keeps entities pure while centralizing URL logic.

**Infrastructure Implementation:**
```typescript
class MakerUrlBuilder implements IMakerUrlBuilder {
  constructor(
    private readonly baseUrl: string = 'https://make.powerapps.com'
  ) {}

  buildSolutionUrl(environmentId: string, solutionId: string): string {
    return `${this.baseUrl}/environments/${environmentId}/solutions/${solutionId}`;
  }

  buildDynamicsUrl(environmentId: string, solutionId: string): string {
    return `https://${environmentId}.dynamics.com/tools/solution/edit.aspx?id=${solutionId}`;
  }

  buildSolutionsListUrl(environmentId: string): string {
    return `${this.baseUrl}/environments/${environmentId}/solutions`;
  }

  buildImportHistoryUrl(environmentId: string): string {
    return `${this.baseUrl}/environments/${environmentId}/solutions/importhistory`;
  }

  buildEnvironmentVariablesUrl(environmentId: string): string {
    return `${this.baseUrl}/environments/${environmentId}/environmentvariables`;
  }

  buildFlowsUrl(environmentId: string): string {
    return `${this.baseUrl}/environments/${environmentId}/flows`;
  }
}
```

**Sovereign Cloud Example:**
```typescript
// China sovereign cloud
const chinaUrlBuilder = new MakerUrlBuilder('https://make.powerplatform.azure.cn');

// Germany sovereign cloud
const germanyUrlBuilder = new MakerUrlBuilder('https://make.powerplatform.de');
```

---

#### FlowConnectionRelationshipBuilder

```typescript
export class FlowConnectionRelationshipBuilder {
  /**
   * Builds a complete relationship graph between flows and connection references.
   *
   * Business Rules:
   * - Flows match connection references by logical name (case-insensitive)
   * - A flow is orphaned if it references connection references that don't exist
   * - A connection reference is orphaned if no flows reference it
   */
  buildRelationships(
    flows: CloudFlow[],
    connectionRefs: ConnectionReference[]
  ): FlowConnectionRelationship[] {
    const relationships: FlowConnectionRelationship[] = [];
    const connectionRefMap = new Map(
      connectionRefs.map(cr => [cr.logicalName.toLowerCase(), cr])
    );
    const usedConnectionRefIds = new Set<string>();

    // Build flow-to-connection-reference relationships
    for (const flow of flows) {
      try {
        const refNames = flow.extractConnectionReferenceNames();

        if (refNames.length === 0) {
          relationships.push(FlowConnectionRelationship.createOrphanedFlow(flow));
        } else {
          for (const refName of refNames) {
            const connectionRef = connectionRefMap.get(refName.toLowerCase());
            if (connectionRef) {
              usedConnectionRefIds.add(connectionRef.id);
              relationships.push(
                FlowConnectionRelationship.createFlowToConnectionReference(flow, connectionRef)
              );
            }
          }
        }
      } catch (error) {
        if (error instanceof InvalidClientDataError) {
          relationships.push(FlowConnectionRelationship.createOrphanedFlow(flow));
        } else {
          throw error;
        }
      }
    }

    // Find orphaned connection references
    for (const connectionRef of connectionRefs) {
      if (!usedConnectionRefIds.has(connectionRef.id)) {
        relationships.push(
          FlowConnectionRelationship.createOrphanedConnectionReference(connectionRef)
        );
      }
    }

    return relationships;
  }
}
```

**Why:** Complex relationship building is business logic that spans multiple entities. Domain service keeps this logic testable and separate from use case orchestration.

---

### 2.5 Domain Exceptions

Domain exceptions signal business rule violations without I/O side effects. Outer layers handle logging and display.

#### Exception Hierarchy

```typescript
/**
 * Base domain exception - all domain exceptions extend this.
 */
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Thrown when entity construction fails due to invalid data.
 */
export class ValidationError extends DomainError {
  constructor(
    public readonly entityName: string,
    public readonly field: string,
    public readonly value: any,
    public readonly constraint: string
  ) {
    super(`Validation failed for ${entityName}.${field}: ${constraint} (received: ${value})`);
  }
}

/**
 * Thrown when CloudFlow.clientData JSON cannot be parsed.
 */
export class InvalidClientDataError extends DomainError {
  constructor(
    public readonly flowId: string,
    public readonly flowName: string,
    public readonly cause: Error
  ) {
    super(`Failed to parse clientData for flow ${flowId} (${flowName}): ${cause.message}`);
  }
}

/**
 * Thrown when DeploymentSettings JSON is corrupted or invalid.
 */
export class DeploymentSettingsParseError extends DomainError {
  constructor(
    public readonly filePath: string,
    public readonly cause: Error
  ) {
    super(`Failed to parse deployment settings from ${filePath}: ${cause.message}`);
  }
}

/**
 * Thrown when DeploymentSettings has invalid structure (missing required fields).
 */
export class DeploymentSettingsValidationError extends DomainError {
  constructor(
    public readonly filePath: string,
    public readonly details: string
  ) {
    super(`Invalid deployment settings structure in ${filePath}: ${details}`);
  }
}
```

#### Usage Examples

```typescript
// In entity constructor
class Solution {
  constructor(version: string, ...) {
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(version)) {
      throw new ValidationError('Solution', 'version', version, 'must be in format X.X.X.X');
    }
  }
}

// In entity method
class CloudFlow {
  extractConnectionReferenceNames(): string[] {
    try {
      return JSON.parse(this.clientData).properties?.connectionReferences;
    } catch (error) {
      throw new InvalidClientDataError(this.id, this.name, error as Error);
    }
  }
}

// In value object factory
class DeploymentSettings {
  static fromJSON(json: string, filePath: string): DeploymentSettings {
    try {
      const parsed = JSON.parse(json);

      // Validate structure
      if (!Array.isArray(parsed.EnvironmentVariables)) {
        throw new DeploymentSettingsValidationError(
          filePath,
          'EnvironmentVariables must be an array'
        );
      }

      return new DeploymentSettings(
        parsed.EnvironmentVariables ?? [],
        parsed.ConnectionReferences ?? []
      );
    } catch (error) {
      if (error instanceof DomainError) {
        throw error; // Re-throw domain errors
      }
      throw new DeploymentSettingsParseError(filePath, error as Error);
    }
  }
}
```

**Why:** Explicit exception types make error handling testable and allow outer layers to handle different failure modes appropriately (e.g., corrupted file vs. validation error).

---

### 2.6 Repository Interfaces (Domain Contracts)

Domain defines contracts, infrastructure implements them.

```typescript
// Domain layer: src/features/dataPanelSuite/domain/interfaces/

interface ISolutionRepository {
  findAll(
    environmentId: string,
    options?: QueryOptions,
    cancellationToken?: ICancellationToken
  ): Promise<Solution[]>;
}

interface IImportJobRepository {
  findAll(
    environmentId: string,
    options?: QueryOptions,
    cancellationToken?: ICancellationToken
  ): Promise<ImportJob[]>;

  findByIdWithLog(
    environmentId: string,
    importJobId: string,
    options?: QueryOptions,
    cancellationToken?: ICancellationToken
  ): Promise<ImportJob>;
}

interface IEnvironmentVariableRepository {
  findAllDefinitions(
    environmentId: string,
    options?: QueryOptions,
    cancellationToken?: ICancellationToken
  ): Promise<EnvironmentVariableDefinition[]>;

  findAllValues(
    environmentId: string,
    options?: QueryOptions,
    cancellationToken?: ICancellationToken
  ): Promise<EnvironmentVariableValue[]>;
}

interface IConnectionReferenceRepository {
  findAll(
    environmentId: string,
    options?: QueryOptions,
    cancellationToken?: ICancellationToken
  ): Promise<ConnectionReference[]>;
}

interface ICloudFlowRepository {
  findAll(
    environmentId: string,
    options?: QueryOptions,
    cancellationToken?: ICancellationToken
  ): Promise<CloudFlow[]>;
}

interface ISolutionComponentRepository {
  getObjectTypeCode(
    environmentId: string,
    entityLogicalName: string,
    options?: QueryOptions,
    cancellationToken?: ICancellationToken
  ): Promise<number | null>;

  findComponentIdsBySolution(
    environmentId: string,
    solutionId: string,
    entityLogicalName: string,
    options?: QueryOptions,
    cancellationToken?: ICancellationToken
  ): Promise<string[]>;
}

interface IDeploymentSettingsRepository {
  read(filePath: string): Promise<DeploymentSettings>;
  write(filePath: string, settings: DeploymentSettings): Promise<void>;
  promptForFilePath(suggestedName?: string): Promise<string | undefined>;
}

interface IEditorService {
  openXmlInNewTab(content: string, title?: string): Promise<void>;
}

/**
 * Logger interface for use cases and infrastructure.
 * Reuses existing ILogger from shared infrastructure.
 *
 * Note: Domain entities NEVER use ILogger - they stay pure.
 * Only application and infrastructure layers inject and use ILogger.
 */
interface ILogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, error?: Error): void;
}
```

**Why:** Domain defines contracts, which allows infrastructure to be swapped without changing domain or application layers. Perfect for testing with mocks. QueryOptions enables flexible query customization with sensible repository defaults. Cancellation tokens allow users to cancel long-running operations. ILogger is injected into use cases for observability.

---

### 2.7 Validation Strategy

**Approach:** Validate eagerly - fail fast in entity constructors.

#### Validation Rules

| Entity | Field | Validation | Why |
|--------|-------|------------|-----|
| **Solution** | `version` | Must match `^\d+\.\d+\.\d+\.\d+$` | Microsoft format standard |
| **ImportJob** | `progress` | Must be 0-100 | Business invariant |
| **EnvironmentVariable** | `type` | Must be valid EnvironmentVariableType enum | Data integrity |
| **DeploymentSettings** | `EnvironmentVariables` | Must be array | Required structure |
| **DeploymentSettings** | `ConnectionReferences` | Must be array | Required structure |

#### Validation Pattern

```typescript
class Solution {
  constructor(
    public readonly id: string,
    public readonly uniqueName: string,
    public readonly friendlyName: string,
    public readonly version: string,
    public readonly isManaged: boolean,
    public readonly publisherId: string,
    public readonly publisherName: string,
    public readonly installedOn: Date | null,
    public readonly description: string
  ) {
    // Validate business invariants FIRST, before setting properties
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(version)) {
      throw new ValidationError('Solution', 'version', version, 'must be in format X.X.X.X');
    }
  }
}

class ImportJob {
  constructor(
    public readonly id: string,
    public readonly solutionName: string,
    public readonly progress: number,
    public readonly startedOn: Date,
    public readonly completedOn: Date | null,
    public readonly importLogXml: string,
    public readonly createdBy: string
  ) {
    // Validate progress range
    if (progress < 0 || progress > 100) {
      throw new ValidationError('ImportJob', 'progress', progress, 'must be between 0 and 100');
    }
  }
}

class EnvironmentVariable {
  constructor(
    public readonly id: string,
    public readonly schemaName: string,
    public readonly displayName: string,
    public readonly type: EnvironmentVariableType,
    public readonly currentValue: string | null,
    public readonly defaultValue: string | null,
    public readonly isManaged: boolean,
    public readonly modifiedOn: Date,
    public readonly modifiedBy: string
  ) {
    // Validate enum value
    const validTypes = Object.values(EnvironmentVariableType);
    if (!validTypes.includes(type)) {
      throw new ValidationError(
        'EnvironmentVariable',
        'type',
        type,
        `must be one of: ${validTypes.join(', ')}`
      );
    }
  }
}
```

#### When NOT to Validate

**Don't validate:**
- Optional string fields (description, friendlyName) - empty/null is valid
- Date fields - assume repository provides valid dates
- GUIDs - assume repository provides valid IDs
- Display-only data (modifiedBy, createdBy) - not business critical

**Why:** Over-validation adds complexity without value. Validate **business invariants only**.

#### Validation vs. Parsing

| Concern | Validation | Parsing |
|---------|-----------|---------|
| **Version format** | ✅ Validation | Entity constructor |
| **Progress range** | ✅ Validation | Entity constructor |
| **JSON structure** | ❌ Parsing error | Try/catch, throw specific exception |
| **XML format** | ❌ Parsing error | Try/catch, throw specific exception |
| **Enum membership** | ✅ Validation | Entity constructor |

**Rule:** If it's a **business rule**, validate. If it's **data format**, parse and throw domain exception on failure.

**Important Distinction:**

- **Business validation (constructors):** Validate business invariants eagerly when creating entities. These are rules like "progress must be 0-100" or "version must match format X.X.X.X". Fail fast with `ValidationError`.

- **Parsing validation (methods):** Complex data parsing (JSON, XML) happens in entity methods, not constructors. These methods use try/catch and throw specific exceptions like `InvalidClientDataError` or `DeploymentSettingsParseError`.

**Why the split?**
- Constructors should be simple and fast - just validate invariants
- Parsing is expensive and failure-prone - belongs in dedicated methods
- Repositories call constructors with validated data, use cases call parsing methods
- Clear separation: constructors validate shape, methods validate content

**Examples:**
```typescript
// ✅ Constructor validation (business invariant)
class ImportJob {
  constructor(progress: number, ...) {
    if (progress < 0 || progress > 100) {
      throw new ValidationError('ImportJob', 'progress', progress, 'must be 0-100');
    }
  }
}

// ✅ Method parsing (complex data structure)
class CloudFlow {
  extractConnectionReferenceNames(): string[] {
    try {
      const parsed = JSON.parse(this.clientData);
      return parsed.properties?.connectionReferences ?? [];
    } catch (error) {
      throw new InvalidClientDataError(this.id, this.name, error as Error);
    }
  }
}

// ✅ Factory method parsing (static constructor alternative)
class DeploymentSettings {
  static fromJSON(json: string, filePath: string): DeploymentSettings {
    try {
      const parsed = JSON.parse(json);

      // Validate structure after parsing
      if (!Array.isArray(parsed.EnvironmentVariables)) {
        throw new DeploymentSettingsValidationError(filePath, '...');
      }

      return new DeploymentSettings(...);  // Constructor gets validated data
    } catch (error) {
      throw new DeploymentSettingsParseError(filePath, error as Error);
    }
  }
}
```

---

## 3. Application Layer Design (Use Cases)

Use cases orchestrate domain entities and repositories. They contain **ZERO business logic** - only coordination.

### 3.1 Solution Panel Use Cases

#### ListSolutionsUseCase

```typescript
class ListSolutionsUseCase {
  constructor(
    private readonly solutionRepository: ISolutionRepository,
    private readonly logger: ILogger
  ) {}

  async execute(
    environmentId: string,
    cancellationToken?: vscode.CancellationToken
  ): Promise<Solution[]> {
    this.logger.info('ListSolutionsUseCase started', { environmentId });

    try {
      // Check cancellation before expensive operation
      if (cancellationToken?.isCancellationRequested) {
        this.logger.info('ListSolutionsUseCase cancelled');
        throw new Error('Operation cancelled');
      }

      // Orchestration only: fetch and sort
      const solutions = await this.solutionRepository.findAll(environmentId, cancellationToken);

      // Sort using domain logic (entity knows its sort priority)
      const sorted = solutions.sort((a, b) => {
        const priorityDiff = a.getSortPriority() - b.getSortPriority();
        if (priorityDiff !== 0) {
          return priorityDiff;
        }
        return a.friendlyName.localeCompare(b.friendlyName);
      });

      this.logger.info('ListSolutionsUseCase completed', { count: sorted.length });
      return sorted;
    } catch (error) {
      this.logger.error('ListSolutionsUseCase failed', error as Error);
      throw error;
    }
  }
}
```

**Why:** Use case orchestrates (fetch, sort) but delegates business logic (sort priority) to entities. Logs at boundaries for observability. Supports cancellation for long-running operations.

---

### 3.2 Import Job Panel Use Cases

#### ListImportJobsUseCase

```typescript
class ListImportJobsUseCase {
  constructor(
    private readonly importJobRepository: IImportJobRepository,
    private readonly logger: ILogger
  ) {}

  async execute(
    environmentId: string,
    solutionId: string | null,
    cancellationToken?: vscode.CancellationToken
  ): Promise<ImportJob[]> {
    this.logger.info('ListImportJobsUseCase started', { environmentId, solutionId });

    try {
      if (cancellationToken?.isCancellationRequested) {
        this.logger.info('ListImportJobsUseCase cancelled');
        throw new Error('Operation cancelled');
      }

      // Orchestration: fetch all jobs
      let jobs = await this.importJobRepository.findAll(environmentId, cancellationToken);

      // Orchestration: filter by solution name if needed
      if (solutionId) {
        const solutionName = await this.getSolutionName(solutionId);
        jobs = jobs.filter(job => job.solutionName === solutionName);
      }

      // Orchestration: sort by started date (newest first)
      const sorted = jobs.sort((a, b) => b.startedOn.getTime() - a.startedOn.getTime());

      this.logger.info('ListImportJobsUseCase completed', { count: sorted.length });
      return sorted;
    } catch (error) {
      this.logger.error('ListImportJobsUseCase failed', error as Error);
      throw error;
    }
  }

  private async getSolutionName(solutionId: string): Promise<string> {
    // Would need ISolutionRepository injected
    // Simplified for example
    return '';
  }
}
```

**Why:** Use case orchestrates filtering and sorting, but delegates status/error parsing to ImportJob entity methods. Logs at boundaries for observability.

---

#### OpenImportLogInEditorUseCase

```typescript
class OpenImportLogInEditorUseCase {
  constructor(
    private readonly editorService: IEditorService,
    private readonly logger: ILogger
  ) {}

  async execute(importJob: ImportJob): Promise<void> {
    this.logger.info('OpenImportLogInEditorUseCase started', {
      importJobId: importJob.id,
      solutionName: importJob.solutionName
    });

    try {
      // Orchestration only: get XML and open in editor
      const xml = importJob.importLogXml;
      const title = `Import Log - ${importJob.solutionName}`;

      await this.editorService.openXmlInNewTab(xml, title);

      this.logger.info('OpenImportLogInEditorUseCase completed');
    } catch (error) {
      this.logger.error('OpenImportLogInEditorUseCase failed', error as Error);
      throw error;
    }
  }
}
```

**Why:** Pure orchestration. No business logic here. Logs at boundaries for observability. No cancellation token needed (fast synchronous operation).

---

### 3.3 Environment Variables Panel Use Cases

#### ListEnvironmentVariablesUseCase

```typescript
class ListEnvironmentVariablesUseCase {
  constructor(
    private readonly envVarRepository: IEnvironmentVariableRepository,
    private readonly solutionComponentRepository: ISolutionComponentRepository,
    private readonly logger: ILogger
  ) {}

  async execute(
    environmentId: string,
    solutionId: string | null,
    cancellationToken?: vscode.CancellationToken
  ): Promise<EnvironmentVariable[]> {
    this.logger.info('ListEnvironmentVariablesUseCase started', { environmentId, solutionId });

    try {
      if (cancellationToken?.isCancellationRequested) {
        this.logger.info('ListEnvironmentVariablesUseCase cancelled');
        throw new Error('Operation cancelled');
      }

      // Orchestration: fetch definitions and values in parallel
      const [definitions, values] = await Promise.all([
        this.envVarRepository.findAllDefinitions(environmentId, cancellationToken),
        this.envVarRepository.findAllValues(environmentId, cancellationToken)
      ]);

      // Orchestration: join definitions with values
      const variables = this.joinDefinitionsWithValues(definitions, values);

      // Orchestration: filter by solution if needed
      if (solutionId) {
        if (cancellationToken?.isCancellationRequested) {
          this.logger.info('ListEnvironmentVariablesUseCase cancelled');
          throw new Error('Operation cancelled');
        }

        const componentIds = await this.solutionComponentRepository.findComponentIdsBySolution(
          environmentId,
          solutionId,
          'environmentvariabledefinition',
          cancellationToken
        );
        const componentIdSet = new Set(componentIds);

        // Delegate filtering logic to entity
        const filtered = variables
          .filter(v => v.isInSolution(componentIdSet))
          .sort((a, b) => a.schemaName.localeCompare(b.schemaName));

        this.logger.info('ListEnvironmentVariablesUseCase completed', { count: filtered.length });
        return filtered;
      }

      // Orchestration: sort by schema name
      const sorted = variables.sort((a, b) => a.schemaName.localeCompare(b.schemaName));

      this.logger.info('ListEnvironmentVariablesUseCase completed', { count: sorted.length });
      return sorted;
    } catch (error) {
      this.logger.error('ListEnvironmentVariablesUseCase failed', error as Error);
      throw error;
    }
  }

  private joinDefinitionsWithValues(
    definitions: EnvironmentVariableDefinition[],
    values: EnvironmentVariableValue[]
  ): EnvironmentVariable[] {
    // Orchestration: join data structures
    const valueMap = new Map(values.map(v => [v.definitionId, v.value]));

    return definitions.map(def =>
      new EnvironmentVariable(
        def.id,
        def.schemaName,
        def.displayName,
        def.type,
        valueMap.get(def.id) ?? null,
        def.defaultValue,
        def.isManaged,
        def.modifiedOn,
        def.modifiedBy
      )
    );
  }
}
```

**Why:** Use case orchestrates parallel fetching, joining, and filtering. Business logic (isInSolution, getEffectiveValue) stays in entities. Logs at boundaries and checks cancellation at key points.

---

#### SyncEnvironmentVariablesToDeploymentSettingsUseCase

```typescript
interface SyncResult {
  added: number;
  removed: number;
  preserved: number;
  filePath: string;
}

class SyncEnvironmentVariablesToDeploymentSettingsUseCase {
  constructor(
    private readonly deploymentSettingsRepository: IDeploymentSettingsRepository
  ) {}

  async execute(
    variables: EnvironmentVariable[],
    solutionUniqueName: string
  ): Promise<SyncResult> {
    // Orchestration: prompt for file path
    const suggestedName = `${solutionUniqueName}.deploymentsettings.json`;
    const filePath = await this.deploymentSettingsRepository.promptForFilePath(suggestedName);

    if (!filePath) {
      throw new Error('No file path selected');
    }

    // Orchestration: read existing settings or create empty
    let existingSettings: DeploymentSettings;
    try {
      existingSettings = await this.deploymentSettingsRepository.read(filePath);
    } catch {
      existingSettings = DeploymentSettings.createEmpty();
    }

    // Delegate sync logic to domain entity
    const { settings, added, removed, preserved } =
      existingSettings.syncEnvironmentVariables(variables);

    // Orchestration: write updated settings
    await this.deploymentSettingsRepository.write(filePath, settings);

    return { added, removed, preserved, filePath };
  }
}
```

**Why:** Use case orchestrates file operations and delegates sync logic to DeploymentSettings entity. Complex algorithm stays in domain.

---

### 3.4 Connection References Panel Use Cases

#### ListConnectionReferencesUseCase

```typescript
class ListConnectionReferencesUseCase {
  constructor(
    private readonly flowRepository: ICloudFlowRepository,
    private readonly connectionRefRepository: IConnectionReferenceRepository,
    private readonly solutionComponentRepository: ISolutionComponentRepository,
    private readonly relationshipBuilder: FlowConnectionRelationshipBuilder
  ) {}

  async execute(
    environmentId: string,
    solutionId: string | null
  ): Promise<FlowConnectionRelationship[]> {
    // Orchestration: fetch flows and connection references in parallel
    let [flows, connectionRefs] = await Promise.all([
      this.flowRepository.findAll(environmentId),
      this.connectionRefRepository.findAll(environmentId)
    ]);

    // Orchestration: filter by solution if needed
    if (solutionId) {
      const [flowComponentIds, crComponentIds] = await Promise.all([
        this.solutionComponentRepository.findComponentIdsBySolution(
          environmentId,
          solutionId,
          'subscription'
        ),
        this.solutionComponentRepository.findComponentIdsBySolution(
          environmentId,
          solutionId,
          'connectionreference'
        )
      ]);

      const flowIdSet = new Set(flowComponentIds);
      const crIdSet = new Set(crComponentIds);

      flows = flows.filter(f => f.isInSolution(flowIdSet));
      connectionRefs = connectionRefs.filter(cr => cr.isInSolution(crIdSet));
    }

    // Delegate relationship building to domain service
    const relationships = this.relationshipBuilder.buildRelationships(flows, connectionRefs);

    // Orchestration: sort
    return relationships.sort((a, b) => {
      const flowNameComparison = (a.flowName ?? '').localeCompare(b.flowName ?? '');
      if (flowNameComparison !== 0) {
        return flowNameComparison;
      }
      return (a.connectionReferenceLogicalName ?? '').localeCompare(
        b.connectionReferenceLogicalName ?? ''
      );
    });
  }
}
```

**Why:** Use case orchestrates fetching and filtering. Complex relationship building delegated to FlowConnectionRelationshipBuilder domain service.

---

#### SyncConnectionReferencesToDeploymentSettingsUseCase

```typescript
class SyncConnectionReferencesToDeploymentSettingsUseCase {
  constructor(
    private readonly deploymentSettingsRepository: IDeploymentSettingsRepository,
    private readonly connectionRefRepository: IConnectionReferenceRepository
  ) {}

  async execute(
    relationships: FlowConnectionRelationship[],
    solutionUniqueName: string
  ): Promise<SyncResult> {
    // Orchestration: extract unique connection references from relationships
    const uniqueConnectionRefs = this.extractUniqueConnectionReferences(relationships);

    // Orchestration: prompt for file path
    const suggestedName = `${solutionUniqueName}.deploymentsettings.json`;
    const filePath = await this.deploymentSettingsRepository.promptForFilePath(suggestedName);

    if (!filePath) {
      throw new Error('No file path selected');
    }

    // Orchestration: read existing settings or create empty
    let existingSettings: DeploymentSettings;
    try {
      existingSettings = await this.deploymentSettingsRepository.read(filePath);
    } catch {
      existingSettings = DeploymentSettings.createEmpty();
    }

    // Delegate sync logic to domain entity
    const { settings, added, removed, preserved } =
      existingSettings.syncConnectionReferences(uniqueConnectionRefs);

    // Orchestration: write updated settings
    await this.deploymentSettingsRepository.write(filePath, settings);

    return { added, removed, preserved, filePath };
  }

  private extractUniqueConnectionReferences(
    relationships: FlowConnectionRelationship[]
  ): ConnectionReference[] {
    // Orchestration: deduplicate connection references
    const crMap = new Map<string, ConnectionReference>();

    for (const rel of relationships) {
      if (rel.connectionReferenceId && rel.connectionReferenceLogicalName) {
        if (!crMap.has(rel.connectionReferenceId)) {
          // Would need to reconstruct from relationship data
          // In real implementation, pass original ConnectionReference entities
        }
      }
    }

    return Array.from(crMap.values());
  }
}
```

**Why:** Use case orchestrates deduplication and file operations. Sync algorithm stays in DeploymentSettings domain entity.

---

## 4. Infrastructure Layer Design

### 4.1 Repository Implementations

All repositories live in: `src/features/dataPanelSuite/infrastructure/repositories/`

#### DataverseApiSolutionRepository

```typescript
class DataverseApiSolutionRepository implements ISolutionRepository {
  constructor(
    private readonly apiService: IDataverseApiService,
    private readonly logger: ILogger
  ) {}

  async findAll(
    environmentId: string,
    options?: QueryOptions,
    cancellationToken?: ICancellationToken
  ): Promise<Solution[]> {
    // Sensible defaults - can be overridden by caller
    const defaultOptions: QueryOptions = {
      expand: 'publisherid($select=friendlyname)',
      orderBy: 'friendlyname'
    };

    const mergedOptions: QueryOptions = {
      ...defaultOptions,
      ...options  // Caller can customize
    };

    const queryString = ODataQueryBuilder.build(mergedOptions);
    const endpoint = `/api/data/v9.2/solutions${queryString ? '?' + queryString : ''}`;

    this.logger.debug('Fetching solutions from Dataverse API', { environmentId });

    if (cancellationToken?.isCancellationRequested) {
      throw new OperationCancelledException();
    }

    const response = await this.apiService.get<DataverseSolutionsResponse>(
      environmentId,
      endpoint,
      cancellationToken
    );

    const solutions = response.value.map((dto) => this.mapToEntity(dto));

    this.logger.debug(`Fetched ${solutions.length} solution(s)`, { environmentId });

    return solutions;
  }

  private mapToEntity(dto: DataverseSolutionDto): Solution {
    return new Solution(
      dto.solutionid,
      dto.uniquename,
      dto.friendlyname,
      dto.version,
      dto.ismanaged,
      dto._publisherid_value,
      dto.publisherid?.friendlyname ?? 'Unknown',
      dto.installedon ? new Date(dto.installedon) : null,
      dto.description ?? '',
      new Date(dto.modifiedon),
      dto.isvisible,
      dto.isapimanaged,
      dto.solutiontype
    );
  }
}
```

**Why:** Infrastructure provides sensible defaults via QueryOptions but allows callers to customize queries. ODataQueryBuilder constructs query strings. Logger provides observability. Cancellation token allows user to cancel operations. DTO mapping is separated for clarity.

---

#### VsCodeDeploymentSettingsRepository

```typescript
class VsCodeDeploymentSettingsRepository implements IDeploymentSettingsRepository {
  async read(filePath: string): Promise<DeploymentSettings> {
    const fs = require('fs').promises;
    const content = await fs.readFile(filePath, 'utf8');
    return DeploymentSettings.fromJSON(content, filePath);
  }

  async write(filePath: string, settings: DeploymentSettings): Promise<void> {
    const fs = require('fs').promises;
    const content = settings.toJSON();
    await fs.writeFile(filePath, content, 'utf8');
  }

  async promptForFilePath(suggestedName?: string): Promise<string | undefined> {
    const result = await vscode.window.showSaveDialog({
      defaultUri: suggestedName
        ? vscode.Uri.file(suggestedName)
        : undefined,
      filters: {
        'Deployment Settings': ['json']
      }
    });

    return result?.fsPath;
  }
}
```

**Why:** Infrastructure knows how to interact with VS Code APIs and file system. Domain doesn't care about VS Code.

---

#### VsCodeEditorService

```typescript
class VsCodeEditorService implements IEditorService {
  async openXmlInNewTab(content: string, title?: string): Promise<void> {
    const document = await vscode.workspace.openTextDocument({
      content,
      language: 'xml'
    });

    await vscode.window.showTextDocument(document, {
      preview: false,
      viewColumn: vscode.ViewColumn.Active
    });
  }
}
```

**Why:** Infrastructure handles VS Code editor integration. Domain doesn't know about VS Code workspace APIs.

---

#### DataverseApiCloudFlowRepository

```typescript
class DataverseApiCloudFlowRepository implements ICloudFlowRepository {
  constructor(
    private readonly apiService: IDataverseApiService,
    private readonly logger: ILogger
  ) {}

  async findAll(
    environmentId: string,
    options?: QueryOptions,
    cancellationToken?: ICancellationToken
  ): Promise<CloudFlow[]> {
    // EXCLUDE clientdata by default - large JSON field
    const defaultOptions: QueryOptions = {
      select: ['workflowid', 'name', 'modifiedon', 'ismanaged', '_createdby_value'],
      expand: 'createdby($select=fullname)',
      filter: 'category eq 5',  // Cloud flows only
      orderBy: 'name'
    };

    const mergedOptions: QueryOptions = {
      ...defaultOptions,
      ...options  // Caller can add 'clientdata' to select if needed
    };

    const queryString = ODataQueryBuilder.build(mergedOptions);
    const endpoint = `/api/data/v9.2/workflows${queryString ? '?' + queryString : ''}`;

    this.logger.debug('Fetching cloud flows from Dataverse API', { environmentId });

    if (cancellationToken?.isCancellationRequested) {
      throw new OperationCancelledException();
    }

    const response = await this.apiService.get<DataverseWorkflowsResponse>(
      environmentId,
      endpoint,
      cancellationToken
    );

    const flows = response.value.map((dto) => this.mapToEntity(dto));

    this.logger.debug(`Fetched ${flows.length} cloud flow(s)`, { environmentId });

    return flows;
  }

  private mapToEntity(dto: DataverseWorkflowDto): CloudFlow {
    return new CloudFlow(
      dto.workflowid,
      dto.name,
      dto.clientdata ?? '{}',  // Default to empty JSON if not included
      dto.ismanaged,
      new Date(dto.modifiedon),
      dto.createdby?.fullname ?? 'Unknown'
    );
  }
}
```

**Why:** Excludes large `clientdata` field by default for performance. Use cases that need to parse connection references must explicitly request it via `select: ['clientdata', ...]` in QueryOptions.

---

#### DataverseApiEnvironmentVariableRepository

```typescript
class DataverseApiEnvironmentVariableRepository implements IEnvironmentVariableRepository {
  constructor(
    private readonly apiService: IDataverseApiService,
    private readonly logger: ILogger
  ) {}

  async findAllDefinitions(
    environmentId: string,
    options?: QueryOptions,
    cancellationToken?: ICancellationToken
  ): Promise<EnvironmentVariableDefinition[]> {
    const defaultOptions: QueryOptions = {
      expand: 'modifiedby($select=fullname)',
      orderBy: 'schemaname'
    };

    const mergedOptions: QueryOptions = {
      ...defaultOptions,
      ...options
    };

    const queryString = ODataQueryBuilder.build(mergedOptions);
    const endpoint = `/api/data/v9.2/environmentvariabledefinitions${queryString ? '?' + queryString : ''}`;

    this.logger.debug('Fetching environment variable definitions', { environmentId });

    if (cancellationToken?.isCancellationRequested) {
      throw new OperationCancelledException();
    }

    const response = await this.apiService.get<DataverseEnvVarDefinitionsResponse>(
      environmentId,
      endpoint,
      cancellationToken
    );

    const definitions = response.value.map((dto) => this.mapDefinitionToEntity(dto));

    this.logger.debug(`Fetched ${definitions.length} definition(s)`, { environmentId });

    return definitions;
  }

  async findAllValues(
    environmentId: string,
    options?: QueryOptions,
    cancellationToken?: ICancellationToken
  ): Promise<EnvironmentVariableValue[]> {
    const defaultOptions: QueryOptions = {
      expand: 'modifiedby($select=fullname)',
      orderBy: 'modifiedon desc'
    };

    const mergedOptions: QueryOptions = {
      ...defaultOptions,
      ...options
    };

    const queryString = ODataQueryBuilder.build(mergedOptions);
    const endpoint = `/api/data/v9.2/environmentvariablevalues${queryString ? '?' + queryString : ''}`;

    this.logger.debug('Fetching environment variable values', { environmentId });

    if (cancellationToken?.isCancellationRequested) {
      throw new OperationCancelledException();
    }

    const response = await this.apiService.get<DataverseEnvVarValuesResponse>(
      environmentId,
      endpoint,
      cancellationToken
    );

    const values = response.value.map((dto) => this.mapValueToEntity(dto));

    this.logger.debug(`Fetched ${values.length} value(s)`, { environmentId });

    return values;
  }

  private mapDefinitionToEntity(dto: DataverseEnvVarDefinitionDto): EnvironmentVariableDefinition {
    // ... mapping implementation
  }

  private mapValueToEntity(dto: DataverseEnvVarValueDto): EnvironmentVariableValue {
    // ... mapping implementation
  }
}
```

**Why:** Environment variables require two separate API calls (definitions + values). Use case joins them into EnvironmentVariable entities. No large fields, so no exclusion needed.

---

### 4.2 API Service Integration

Reuse existing `IPowerPlatformApiService` from environment setup feature:

```typescript
// Already exists in: src/features/environmentSetup/domain/interfaces/IPowerPlatformApiService.ts

interface IPowerPlatformApiService {
  get<T>(environmentId: string, endpoint: string): Promise<T>;
  post<T>(environmentId: string, endpoint: string, data: any): Promise<T>;
  // ... other methods
}
```

**Why:** Don't reinvent the wheel. Reuse existing authenticated API service.

---

## 5. Presentation Layer Design

### 5.1 Base Panel Classes

#### BaseDataPanel (Abstract)

```typescript
abstract class BaseDataPanel {
  protected environmentId: string | null = null;
  protected isLoading: boolean = false;
  protected error: string | null = null;

  constructor(
    protected readonly panel: vscode.WebviewPanel,
    protected readonly environmentService: IEnvironmentService
  ) {
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'selectEnvironment':
          await this.handleEnvironmentSelected(message.environmentId);
          break;
        case 'refresh':
          await this.handleRefresh();
          break;
        case 'openInMaker':
          await this.handleOpenInMaker();
          break;
      }
    });
  }

  private async handleEnvironmentSelected(environmentId: string): Promise<void> {
    this.environmentId = environmentId;
    await this.loadData();
  }

  private async handleRefresh(): Promise<void> {
    await this.loadData();
  }

  private async handleOpenInMaker(): Promise<void> {
    if (!this.environmentId) {
      vscode.window.showErrorMessage('Please select an environment first');
      return;
    }

    const url = this.getMakerUrl();
    await vscode.env.openExternal(vscode.Uri.parse(url));
  }

  protected async loadData(): Promise<void> {
    if (!this.environmentId) {
      return;
    }

    this.setLoading(true);
    this.setError(null);

    try {
      await this.fetchData();
    } catch (error) {
      this.setError(this.formatError(error));
    } finally {
      this.setLoading(false);
    }
  }

  protected setLoading(isLoading: boolean): void {
    this.isLoading = isLoading;
    this.panel.webview.postMessage({ command: 'setLoading', isLoading });
  }

  protected setError(error: string | null): void {
    this.error = error;
    this.panel.webview.postMessage({ command: 'setError', error });
  }

  protected formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'An unexpected error occurred';
  }

  /**
   * Fetches data from repositories and updates panel state.
   * Subclasses must implement this to define specific data loading behavior.
   * Called automatically when environment changes or user refreshes.
   */
  protected abstract fetchData(): Promise<void>;

  /**
   * Returns the Maker Portal URL for the current panel's context.
   * Used by "Open in Maker" button to navigate to the appropriate page.
   * @returns Full URL to Maker Portal page (e.g., solutions list, import history)
   */
  protected abstract getMakerUrl(): string;
}
```

**Why:** Base class provides common functionality (environment selection, loading states, error handling). Subclasses implement specific data loading.

---

#### BaseTablePanel extends BaseDataPanel (Abstract)

```typescript
abstract class BaseTablePanel<T> extends BaseDataPanel {
  protected data: T[] = [];
  protected filteredData: T[] = [];
  protected solutionId: string | null = null;

  protected setupEventHandlers(): void {
    super.setupEventHandlers();

    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'selectSolution':
          await this.handleSolutionSelected(message.solutionId);
          break;
        case 'search':
          this.handleSearch(message.query);
          break;
        case 'sort':
          this.handleSort(message.column, message.direction);
          break;
        case 'rowAction':
          await this.handleRowAction(message.action, message.rowData);
          break;
      }
    });
  }

  private async handleSolutionSelected(solutionId: string | null): Promise<void> {
    this.solutionId = solutionId;
    await this.loadData();
  }

  private handleSearch(query: string): void {
    if (!query) {
      this.filteredData = this.data;
    } else {
      // Client-side search across all columns
      this.filteredData = this.data.filter(row =>
        this.searchRow(row, query.toLowerCase())
      );
    }
    this.sendDataToWebview();
  }

  private handleSort(column: string, direction: 'asc' | 'desc'): void {
    // Client-side sorting
    this.filteredData = [...this.filteredData].sort((a, b) => {
      const aValue = this.getColumnValue(a, column);
      const bValue = this.getColumnValue(b, column);
      const comparison = this.compareValues(aValue, bValue);
      return direction === 'asc' ? comparison : -comparison;
    });
    this.sendDataToWebview();
  }

  protected sendDataToWebview(): void {
    // Convert domain entities to ViewModels
    const viewModels = this.filteredData.map(item => this.toViewModel(item));
    this.panel.webview.postMessage({ command: 'setData', data: viewModels });
  }

  /**
   * Converts a domain entity to a ViewModel for display in the webview.
   * ViewModels should be plain objects with string/number/boolean fields optimized for UI.
   * @param item Domain entity to convert
   * @returns ViewModel with UI-friendly format (dates as strings, booleans as "Yes"/"No", etc.)
   */
  protected abstract toViewModel(item: T): any;

  /**
   * Determines if a row matches the search query.
   * Called for each row during client-side search filtering.
   * @param row Domain entity to search
   * @param query Lowercase search string
   * @returns True if row matches query, false otherwise
   */
  protected abstract searchRow(row: T, query: string): boolean;

  /**
   * Extracts a column value from a domain entity for sorting.
   * Used by client-side sort to get comparable values.
   * @param row Domain entity
   * @param column Column name to extract (e.g., "friendlyName", "modifiedOn")
   * @returns Value to sort by (string, number, Date, or null)
   */
  protected abstract getColumnValue(row: T, column: string): any;

  /**
   * Handles user actions on table rows (e.g., "openInMaker", "viewDetails").
   * Called when user clicks context menu or row action button.
   * @param action Action identifier (e.g., "openInMaker")
   * @param rowData ViewModel data for the row
   */
  protected abstract handleRowAction(action: string, rowData: any): Promise<void>;

  private compareValues(a: any, b: any): number {
    if (a === b) return 0;
    if (a === null || a === undefined) return 1;
    if (b === null || b === undefined) return -1;
    return a < b ? -1 : 1;
  }
}
```

**Why:** BaseTablePanel provides common table functionality (search, sort, solution filtering). Subclasses implement specific row actions and view models.

---

### 5.2 Panel Implementations

#### SolutionExplorerPanel

```typescript
class SolutionExplorerPanel extends BaseTablePanel<Solution> {
  private cancellationTokenSource: vscode.CancellationTokenSource | null = null;

  constructor(
    panel: vscode.WebviewPanel,
    environmentService: IEnvironmentService,
    private readonly listSolutionsUseCase: ListSolutionsUseCase,
    private readonly urlBuilder: IMakerUrlBuilder,
    private readonly logger: ILogger
  ) {
    super(panel, environmentService);
  }

  protected async fetchData(): Promise<void> {
    // Cancel previous operation if still running
    this.cancellationTokenSource?.cancel();
    this.cancellationTokenSource = new vscode.CancellationTokenSource();

    try {
      // Delegate to use case with cancellation support
      this.data = await this.listSolutionsUseCase.execute(
        this.environmentId!,
        this.cancellationTokenSource.token
      );
      this.filteredData = this.data;
      this.sendDataToWebview();
    } catch (error) {
      if (error.message !== 'Operation cancelled') {
        throw error;
      }
      // Silently ignore cancellation errors
    }
  }

  protected getMakerUrl(): string {
    return this.urlBuilder.buildSolutionsListUrl(this.environmentId!);
  }

  protected toViewModel(solution: Solution): SolutionViewModel {
    return {
      id: solution.id,
      uniqueName: solution.uniqueName,
      friendlyName: solution.friendlyName,
      version: solution.version,
      isManaged: solution.isManaged ? 'Managed' : 'Unmanaged',
      publisherName: solution.publisherName,
      installedOn: solution.installedOn?.toLocaleDateString() ?? '',
      description: solution.description
    };
  }

  protected searchRow(solution: Solution, query: string): boolean {
    return (
      solution.friendlyName.toLowerCase().includes(query) ||
      solution.uniqueName.toLowerCase().includes(query) ||
      solution.publisherName.toLowerCase().includes(query) ||
      solution.description.toLowerCase().includes(query)
    );
  }

  protected getColumnValue(solution: Solution, column: string): any {
    switch (column) {
      case 'friendlyName': return solution.friendlyName;
      case 'uniqueName': return solution.uniqueName;
      case 'version': return solution.version;
      case 'publisherName': return solution.publisherName;
      case 'installedOn': return solution.installedOn;
      default: return null;
    }
  }

  protected async handleRowAction(action: string, rowData: any): Promise<void> {
    const solution = this.data.find(s => s.id === rowData.id);
    if (!solution) return;

    switch (action) {
      case 'openInMaker':
        // Delegate URL construction to domain service
        const makerUrl = this.urlBuilder.buildSolutionUrl(this.environmentId!, solution.id);
        await vscode.env.openExternal(vscode.Uri.parse(makerUrl));
        this.logger.info('Opened solution in Maker Portal', { solutionId: solution.id });
        break;
      case 'openInDynamics':
        // Delegate URL construction to domain service
        const dynamicsUrl = this.urlBuilder.buildDynamicsUrl(this.environmentId!, solution.id);
        await vscode.env.openExternal(vscode.Uri.parse(dynamicsUrl));
        this.logger.info('Opened solution in Dynamics 365', { solutionId: solution.id });
        break;
    }
  }

  dispose(): void {
    this.cancellationTokenSource?.dispose();
  }
}
```

**Why:** Panel delegates to use case, maps domain entities to view models, handles UI events. Uses IMakerUrlBuilder domain service for URL construction. Supports cancellation tokens to stop long-running operations. Logs user actions for observability.

---

#### ImportJobViewerPanel

```typescript
class ImportJobViewerPanel extends BaseTablePanel<ImportJob> {
  private cancellationTokenSource: vscode.CancellationTokenSource | null = null;

  constructor(
    panel: vscode.WebviewPanel,
    environmentService: IEnvironmentService,
    private readonly listImportJobsUseCase: ListImportJobsUseCase,
    private readonly openImportLogUseCase: OpenImportLogInEditorUseCase,
    private readonly urlBuilder: IMakerUrlBuilder,
    private readonly logger: ILogger
  ) {
    super(panel, environmentService);
  }

  protected async fetchData(): Promise<void> {
    // Cancel previous operation if still running
    this.cancellationTokenSource?.cancel();
    this.cancellationTokenSource = new vscode.CancellationTokenSource();

    try {
      // Delegate to use case with cancellation support
      this.data = await this.listImportJobsUseCase.execute(
        this.environmentId!,
        this.solutionId,
        this.cancellationTokenSource.token
      );
      this.filteredData = this.data;
      this.sendDataToWebview();
    } catch (error) {
      if (error.message !== 'Operation cancelled') {
        throw error;
      }
      // Silently ignore cancellation errors
    }
  }

  protected getMakerUrl(): string {
    return this.urlBuilder.buildImportHistoryUrl(this.environmentId!);
  }

  dispose(): void {
    this.cancellationTokenSource?.dispose();
  }

  protected toViewModel(importJob: ImportJob): ImportJobViewModel {
    return {
      id: importJob.id,
      solutionName: importJob.solutionName,
      progress: importJob.getFormattedProgress(), // Delegate to entity
      status: importJob.getStatus(), // Delegate to entity
      startedOn: importJob.startedOn.toLocaleString(),
      completedOn: importJob.completedOn?.toLocaleString() ?? '',
      duration: importJob.getDuration() ?? '', // Delegate to entity
      errorMessage: importJob.parseErrorMessage() ?? '', // Delegate to entity
      createdBy: importJob.createdBy
    };
  }

  protected searchRow(importJob: ImportJob, query: string): boolean {
    return (
      importJob.solutionName.toLowerCase().includes(query) ||
      importJob.getStatus().toLowerCase().includes(query) ||
      importJob.createdBy.toLowerCase().includes(query)
    );
  }

  protected getColumnValue(importJob: ImportJob, column: string): any {
    switch (column) {
      case 'solutionName': return importJob.solutionName;
      case 'progress': return importJob.progress;
      case 'status': return importJob.getStatus();
      case 'startedOn': return importJob.startedOn;
      default: return null;
    }
  }

  protected async handleRowAction(action: string, rowData: any): Promise<void> {
    const importJob = this.data.find(job => job.id === rowData.id);
    if (!importJob) return;

    switch (action) {
      case 'viewImportLog':
        // Delegate to use case
        await this.openImportLogUseCase.execute(importJob);
        break;
    }
  }
}
```

**Why:** Panel delegates all business logic to entities (status, duration, error parsing) and use cases (opening editor).

---

#### EnvironmentVariablesPanel

```typescript
class EnvironmentVariablesPanel extends BaseTablePanel<EnvironmentVariable> {
  constructor(
    panel: vscode.WebviewPanel,
    environmentService: IEnvironmentService,
    private readonly listEnvironmentVariablesUseCase: ListEnvironmentVariablesUseCase,
    private readonly syncToDeploymentSettingsUseCase: SyncEnvironmentVariablesToDeploymentSettingsUseCase
  ) {
    super(panel, environmentService);
    this.setupExportButton();
  }

  private setupExportButton(): void {
    this.panel.webview.onDidReceiveMessage(async (message) => {
      if (message.command === 'syncDeploymentSettings') {
        await this.handleSyncDeploymentSettings(message.solutionUniqueName);
      }
    });
  }

  protected async fetchData(): Promise<void> {
    // Delegate to use case
    this.data = await this.listEnvironmentVariablesUseCase.execute(
      this.environmentId!,
      this.solutionId
    );
    this.filteredData = this.data;
    this.sendDataToWebview();
  }

  protected getMakerUrl(): string {
    return this.urlBuilder.buildEnvironmentVariablesUrl(this.environmentId!);
  }

  protected toViewModel(envVar: EnvironmentVariable): EnvironmentVariableViewModel {
    return {
      id: envVar.id,
      schemaName: envVar.schemaName,
      displayName: envVar.displayName,
      type: envVar.getTypeDisplayName(), // Delegate to entity
      currentValue: envVar.currentValue ?? '',
      defaultValue: envVar.defaultValue ?? '',
      effectiveValue: envVar.getEffectiveValue(), // Delegate to entity
      isManaged: envVar.isManaged ? 'Managed' : 'Unmanaged',
      modifiedOn: envVar.modifiedOn.toLocaleString(),
      modifiedBy: envVar.modifiedBy
    };
  }

  protected searchRow(envVar: EnvironmentVariable, query: string): boolean {
    return (
      envVar.schemaName.toLowerCase().includes(query) ||
      envVar.displayName.toLowerCase().includes(query) ||
      envVar.getTypeDisplayName().toLowerCase().includes(query) ||
      envVar.getEffectiveValue().toLowerCase().includes(query)
    );
  }

  protected getColumnValue(envVar: EnvironmentVariable, column: string): any {
    switch (column) {
      case 'schemaName': return envVar.schemaName;
      case 'displayName': return envVar.displayName;
      case 'type': return envVar.getTypeDisplayName();
      case 'effectiveValue': return envVar.getEffectiveValue();
      default: return null;
    }
  }

  protected async handleRowAction(action: string, rowData: any): Promise<void> {
    const envVar = this.data.find(v => v.id === rowData.id);
    if (!envVar) return;

    switch (action) {
      case 'copyValue':
        const value = envVar.getEffectiveValue();
        await vscode.env.clipboard.writeText(value);
        vscode.window.showInformationMessage('Value copied to clipboard');
        break;
    }
  }

  private async handleSyncDeploymentSettings(solutionUniqueName: string): Promise<void> {
    try {
      // Delegate to use case
      const result = await this.syncToDeploymentSettingsUseCase.execute(
        this.filteredData,
        solutionUniqueName
      );

      vscode.window.showInformationMessage(
        `Synced deployment settings: ${result.added} added, ${result.removed} removed, ${result.preserved} preserved`
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to sync deployment settings: ${error}`);
    }
  }
}
```

**Why:** Panel delegates all logic to use cases and entities. Export functionality is pure orchestration.

---

#### ConnectionReferencesPanel

```typescript
class ConnectionReferencesPanel extends BaseTablePanel<FlowConnectionRelationship> {
  constructor(
    panel: vscode.WebviewPanel,
    environmentService: IEnvironmentService,
    private readonly listConnectionReferencesUseCase: ListConnectionReferencesUseCase,
    private readonly syncToDeploymentSettingsUseCase: SyncConnectionReferencesToDeploymentSettingsUseCase
  ) {
    super(panel, environmentService);
    this.setupExportButton();
  }

  private setupExportButton(): void {
    this.panel.webview.onDidReceiveMessage(async (message) => {
      if (message.command === 'syncDeploymentSettings') {
        await this.handleSyncDeploymentSettings(message.solutionUniqueName);
      }
    });
  }

  protected async fetchData(): Promise<void> {
    // Delegate to use case
    this.data = await this.listConnectionReferencesUseCase.execute(
      this.environmentId!,
      this.solutionId
    );
    this.filteredData = this.data;
    this.sendDataToWebview();
  }

  protected getMakerUrl(): string {
    return this.urlBuilder.buildFlowsUrl(this.environmentId!);
  }

  protected toViewModel(relationship: FlowConnectionRelationship): ConnectionReferenceViewModel {
    return {
      flowId: relationship.flowId ?? '',
      flowName: relationship.flowName ?? '',
      connectionReferenceId: relationship.connectionReferenceId ?? '',
      connectionReferenceLogicalName: relationship.connectionReferenceLogicalName ?? '',
      connectorType: relationship.connectorType ?? '',
      connectionId: relationship.connectionId ?? '',
      relationshipType: relationship.getRelationshipTypeDisplay(), // Delegate to entity
      isManaged: relationship.isManaged ? 'Managed' : 'Unmanaged',
      modifiedOn: relationship.modifiedOn.toLocaleString(),
      modifiedBy: relationship.modifiedBy
    };
  }

  protected searchRow(relationship: FlowConnectionRelationship, query: string): boolean {
    return (
      (relationship.flowName?.toLowerCase().includes(query) ?? false) ||
      (relationship.connectionReferenceLogicalName?.toLowerCase().includes(query) ?? false) ||
      (relationship.connectorType?.toLowerCase().includes(query) ?? false)
    );
  }

  protected getColumnValue(relationship: FlowConnectionRelationship, column: string): any {
    switch (column) {
      case 'flowName': return relationship.flowName;
      case 'connectionReferenceLogicalName': return relationship.connectionReferenceLogicalName;
      case 'connectorType': return relationship.connectorType;
      default: return null;
    }
  }

  protected async handleRowAction(action: string, rowData: any): Promise<void> {
    // Row actions TBD
  }

  private async handleSyncDeploymentSettings(solutionUniqueName: string): Promise<void> {
    try {
      // Delegate to use case
      const result = await this.syncToDeploymentSettingsUseCase.execute(
        this.filteredData,
        solutionUniqueName
      );

      vscode.window.showInformationMessage(
        `Synced deployment settings: ${result.added} added, ${result.removed} removed, ${result.preserved} preserved`
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to sync deployment settings: ${error}`);
    }
  }
}
```

**Why:** Panel is thin. Complex relationship building is in use case, display logic in value object.

---

### 5.3 ViewModels (Presentation DTOs)

```typescript
// Presentation layer: src/features/dataPanelSuite/presentation/viewModels/

interface SolutionViewModel {
  id: string;
  uniqueName: string;
  friendlyName: string;
  version: string;
  isManaged: string;
  publisherName: string;
  installedOn: string;
  description: string;
}

interface ImportJobViewModel {
  id: string;
  solutionName: string;
  progress: string;
  status: string;
  startedOn: string;
  completedOn: string;
  duration: string;
  errorMessage: string;
  createdBy: string;
}

interface EnvironmentVariableViewModel {
  id: string;
  schemaName: string;
  displayName: string;
  type: string;
  currentValue: string;
  defaultValue: string;
  effectiveValue: string;
  isManaged: string;
  modifiedOn: string;
  modifiedBy: string;
}

interface ConnectionReferenceViewModel {
  flowId: string;
  flowName: string;
  connectionReferenceId: string;
  connectionReferenceLogicalName: string;
  connectorType: string;
  connectionId: string;
  relationshipType: string;
  isManaged: string;
  modifiedOn: string;
  modifiedBy: string;
}
```

**Why:** ViewModels decouple presentation from domain. Domain entities can evolve independently. ViewModels are optimized for UI display (strings, formatted dates).

---

## 6. Key Architectural Decisions

### 6.1 Where Business Logic Lives

| Concern | Layer | Rationale |
|---------|-------|-----------|
| Status determination (ImportJob) | Domain Entity | Complex rules, core business logic |
| Error parsing (ImportJob) | Domain Entity | Domain knows its data structure |
| URL construction (Power Platform) | Domain Service (IMakerUrlBuilder) | Infrastructure concern (regions, custom domains) |
| Effective value resolution (EnvironmentVariable) | Domain Entity | Core business rule |
| ClientData parsing (CloudFlow) | Domain Entity | Entity knows its JSON structure |
| Relationship building (FlowConnectionRelationship) | Domain Service | Complex relationship logic spanning entities |
| Deployment settings sync algorithm | Domain Entity (DeploymentSettings) | Complex business rule, needs consistency |
| Solution filtering | Application Use Case | Orchestration: fetch IDs, delegate to entities |
| Data fetching | Infrastructure Repository | External concern, not business logic |
| Search/sort | Presentation Panel | UI concern, client-side filtering |
| Logging | Application/Infrastructure | Observability concern, never in domain |
| Cancellation | Application/Presentation | Coordination concern, token passed through layers |

**Key Principle:** If it's a business rule that could change based on domain requirements, it belongs in domain entities. If it's coordination between entities/repositories, it belongs in use cases. Infrastructure concerns (URLs, logging, cancellation) belong in appropriate outer layers.

---

### 6.2 Solution Filtering Approach

**Decision:** Fetch ALL data, then filter client-side using solution component IDs.

**Why:**
1. Dataverse doesn't support filtering by solution directly
2. Client-side filtering is fast for typical data volumes (<1000 items)
3. Enables instant switching between solutions without refetching
4. Consistent with requirements (fetch all, filter client-side)

**Implementation:**
1. Use case fetches solution component IDs from `solutioncomponents` entity
2. Use case creates `Set<string>` for O(1) lookups
3. Use case delegates to entity method `isInSolution(componentIds: Set<string>)`
4. Entity performs set membership check

---

### 6.3 Relationship Modeling (Flows & Connection References)

**Decision:** Create `FlowConnectionRelationship` value object to represent display rows, not just use ConnectionReference entity.

**Why:**
1. Display needs flow + connection reference data combined
2. Need to handle orphaned items (flow with no CR, CR with no flows)
3. Value object clearly represents the relationship concept
4. Easier to sort and search on combined data
5. Decouples display from entity structure

**Alternative Considered:** Pass separate flows and connection references to panel. Rejected because panel would need complex joining logic (business concern, not presentation).

---

### 6.4 Deployment Settings Sync Algorithm

**Decision:** Sync algorithm lives in `DeploymentSettings` domain entity, not in use case.

**Why:**
1. Complex business rule: add new, remove missing, preserve existing values
2. Needs to be consistent and testable
3. Domain concern: how deployment settings should behave
4. Use case would become bloated with complex algorithm
5. Algorithm may need to evolve based on business requirements

**Implementation:**
- Use case orchestrates: prompt for file, read existing, call sync method, write result
- Entity method implements algorithm: build maps, calculate diffs, sort, return new entity
- Entity is immutable: returns new DeploymentSettings instance

---

### 6.5 Error Parsing Strategy

**Decision:** ImportJob entity parses its own XML to extract error messages.

**Why:**
1. Domain concern: entity knows its data structure
2. Parsing logic may evolve (different error formats)
3. Keeps use case clean (no XML parsing)
4. Testable in isolation (unit test entity method)
5. Encapsulation: XML structure is internal to ImportJob

**Alternative Considered:** Create separate XmlParser service. Rejected because parsing is specific to ImportJob XML structure, not general-purpose.

---

### 6.6 Repository Granularity

**Decision:** Separate repositories for each entity type, plus specialized repositories for solution components and deployment settings.

**Why:**
1. Single Responsibility Principle: each repository does one thing
2. Testable: mock only what you need
3. Reusable: solution component filtering used by multiple panels
4. Clear contracts: interface shows exactly what operations are supported

**Repositories:**
- `ISolutionRepository` - solutions only
- `IImportJobRepository` - import jobs only
- `IEnvironmentVariableRepository` - env var definitions and values
- `ICloudFlowRepository` - cloud flows only
- `IConnectionReferenceRepository` - connection references only
- `ISolutionComponentRepository` - solution component filtering (shared)
- `IDeploymentSettingsRepository` - file operations (shared)
- `IEditorService` - VS Code editor integration (shared)

---

### 6.7 Base Panel Inheritance

**Decision:** Create abstract base classes `BaseDataPanel` and `BaseTablePanel` for common functionality.

**Why:**
1. DRY: environment selection, loading states, error handling shared
2. Consistency: all panels behave the same for common operations
3. Abstract methods enforce implementation of required methods
4. Easier to add new panels (inherit and implement abstracts)

**Hierarchy:**
```
BaseDataPanel (environment, loading, errors)
    ↓
BaseTablePanel (solution filter, search, sort, table)
    ↓
[SolutionExplorerPanel, ImportJobViewerPanel, EnvironmentVariablesPanel, ConnectionReferencesPanel]
```

---

### 6.8 Concurrency & Race Conditions

**Strategy:** Cancel previous requests, always show latest state.

#### Problem Scenarios

| Scenario | Race Condition | Impact |
|----------|----------------|--------|
| **Environment switch** | User switches from Env A → Env B while Env A data is loading | Env B selected, but Env A data displayed |
| **Rapid refresh** | User clicks refresh repeatedly | Multiple API calls in flight, wasting resources |
| **Solution filter change** | User switches solutions while data is loading | Wrong solution's data displayed |

#### Solution: Cancellation Tokens

**Pattern:** Each panel maintains a `CancellationTokenSource`, cancels previous operation before starting new one.

```typescript
abstract class BaseTablePanel<T> extends BaseDataPanel {
  protected data: T[] = [];
  protected filteredData: T[] = [];
  protected solutionId: string | null = null;

  // ✅ Cancellation token source for current operation
  private cancellationTokenSource: vscode.CancellationTokenSource | null = null;

  protected async loadData(): Promise<void> {
    if (!this.environmentId) {
      return;
    }

    // ✅ Cancel previous operation if still running
    this.cancellationTokenSource?.cancel();
    this.cancellationTokenSource = new vscode.CancellationTokenSource();

    this.setLoading(true);
    this.setError(null);

    try {
      // ✅ Pass cancellation token to use case
      await this.fetchData(this.cancellationTokenSource.token);
    } catch (error) {
      // ✅ Don't show errors for cancelled operations
      if (error.message !== 'Operation cancelled') {
        this.setError(this.formatError(error));
      }
    } finally {
      this.setLoading(false);
    }
  }

  // Subclasses implement with cancellation token support
  protected abstract fetchData(cancellationToken: vscode.CancellationToken): Promise<void>;

  dispose(): void {
    // ✅ Clean up cancellation token on disposal
    this.cancellationTokenSource?.dispose();
  }
}
```

#### Panel Implementation Example

```typescript
class SolutionExplorerPanel extends BaseTablePanel<Solution> {
  protected async fetchData(cancellationToken: vscode.CancellationToken): Promise<void> {
    // ✅ Delegate to use case with cancellation token
    this.data = await this.listSolutionsUseCase.execute(
      this.environmentId!,
      cancellationToken
    );

    // ✅ Check cancellation before updating UI
    if (cancellationToken.isCancellationRequested) {
      return;
    }

    this.filteredData = this.data;
    this.sendDataToWebview();
  }
}
```

#### Use Case Cancellation Checks

```typescript
class ListEnvironmentVariablesUseCase {
  async execute(
    environmentId: string,
    solutionId: string | null,
    cancellationToken?: vscode.CancellationToken
  ): Promise<EnvironmentVariable[]> {
    this.logger.info('ListEnvironmentVariablesUseCase started', { environmentId, solutionId });

    try {
      // ✅ Check cancellation before expensive operation
      if (cancellationToken?.isCancellationRequested) {
        this.logger.info('ListEnvironmentVariablesUseCase cancelled before fetch');
        throw new Error('Operation cancelled');
      }

      // Fetch data (repositories also check cancellation internally)
      const [definitions, values] = await Promise.all([
        this.envVarRepository.findAllDefinitions(environmentId, cancellationToken),
        this.envVarRepository.findAllValues(environmentId, cancellationToken)
      ]);

      // ✅ Check cancellation after I/O, before CPU-intensive work
      if (cancellationToken?.isCancellationRequested) {
        this.logger.info('ListEnvironmentVariablesUseCase cancelled after fetch');
        throw new Error('Operation cancelled');
      }

      // Process data (join, filter, sort)
      const variables = this.joinDefinitionsWithValues(definitions, values);

      this.logger.info('ListEnvironmentVariablesUseCase completed', { count: variables.length });
      return variables;
    } catch (error) {
      this.logger.error('ListEnvironmentVariablesUseCase failed', error as Error);
      throw error;
    }
  }
}
```

#### Repository Cancellation Support

```typescript
class DataverseApiSolutionRepository implements ISolutionRepository {
  async findAll(
    environmentId: string,
    cancellationToken?: vscode.CancellationToken
  ): Promise<Solution[]> {
    this.logger.debug('Fetching solutions from Dataverse API', { environmentId });

    // ✅ Check cancellation before API call
    if (cancellationToken?.isCancellationRequested) {
      this.logger.debug('Repository operation cancelled before API call');
      throw new Error('Operation cancelled');
    }

    try {
      const response = await this.apiService.get(environmentId, endpoint);

      // ✅ Check cancellation before expensive mapping
      if (cancellationToken?.isCancellationRequested) {
        this.logger.debug('Repository operation cancelled after API call');
        throw new Error('Operation cancelled');
      }

      return response.value.map(item => new Solution(/* ... */));
    } catch (error) {
      this.logger.error('Failed to fetch solutions from Dataverse API', error as Error);
      throw error;
    }
  }
}
```

#### Benefits

1. **No stale data** - Previous requests cancelled, only latest displayed
2. **Resource efficiency** - Abandoned API calls don't waste bandwidth
3. **Better UX** - Fast environment switching without waiting for old requests
4. **Graceful cancellation** - Operations check cancellation at key points

#### What We DON'T Need

❌ **Request deduplication** - User actions are infrequent, cancellation is sufficient
❌ **Request queuing** - Always show latest state, don't wait for previous requests
❌ **Shared cache** - Each panel independently fetches data (simple, no coordination needed)

**Rationale:** YAGNI - cancellation tokens solve the race condition problem without added complexity.

---

## 7. File Structure

```
src/features/dataPanelSuite/
├── domain/
│   ├── entities/
│   │   ├── Solution.ts
│   │   ├── ImportJob.ts
│   │   ├── EnvironmentVariable.ts
│   │   ├── CloudFlow.ts
│   │   ├── ConnectionReference.ts
│   │   └── DeploymentSettings.ts
│   ├── valueObjects/
│   │   ├── FlowConnectionRelationship.ts
│   │   ├── ImportJobStatus.ts
│   │   ├── EnvironmentVariableType.ts
│   │   ├── EnvironmentVariableDefinition.ts
│   │   └── EnvironmentVariableValue.ts
│   ├── services/
│   │   └── FlowConnectionRelationshipBuilder.ts
│   ├── exceptions/
│   │   └── InvalidClientDataError.ts
│   └── interfaces/
│       ├── ISolutionRepository.ts
│       ├── IImportJobRepository.ts
│       ├── IEnvironmentVariableRepository.ts
│       ├── ICloudFlowRepository.ts
│       ├── IConnectionReferenceRepository.ts
│       ├── ISolutionComponentRepository.ts
│       ├── IDeploymentSettingsRepository.ts
│       └── IEditorService.ts
├── application/
│   └── useCases/
│       ├── ListSolutionsUseCase.ts
│       ├── ListImportJobsUseCase.ts
│       ├── OpenImportLogInEditorUseCase.ts
│       ├── ListEnvironmentVariablesUseCase.ts
│       ├── SyncEnvironmentVariablesToDeploymentSettingsUseCase.ts
│       ├── ListConnectionReferencesUseCase.ts
│       └── SyncConnectionReferencesToDeploymentSettingsUseCase.ts
├── infrastructure/
│   ├── repositories/
│   │   ├── DataverseApiSolutionRepository.ts
│   │   ├── DataverseApiImportJobRepository.ts
│   │   ├── DataverseApiEnvironmentVariableRepository.ts
│   │   ├── DataverseApiCloudFlowRepository.ts
│   │   ├── DataverseApiConnectionReferenceRepository.ts
│   │   ├── DataverseApiSolutionComponentRepository.ts
│   │   ├── VsCodeDeploymentSettingsRepository.ts
│   │   └── VsCodeEditorService.ts
│   └── adapters/
│       └── (reuse PowerPlatformApiService from environmentSetup)
└── presentation/
    ├── panels/
    │   ├── BaseDataPanel.ts
    │   ├── BaseTablePanel.ts
    │   ├── SolutionExplorerPanel.ts
    │   ├── ImportJobViewerPanel.ts
    │   ├── EnvironmentVariablesPanel.ts
    │   └── ConnectionReferencesPanel.ts
    ├── viewModels/
    │   ├── SolutionViewModel.ts
    │   ├── ImportJobViewModel.ts
    │   ├── EnvironmentVariableViewModel.ts
    │   └── ConnectionReferenceViewModel.ts
    └── webview/
        ├── components/
        │   ├── EnvironmentSelector.tsx
        │   ├── SolutionSelector.tsx
        │   ├── DataTable.tsx
        │   ├── SearchBox.tsx
        │   └── ContextMenu.tsx
        └── pages/
            ├── SolutionExplorer.tsx
            ├── ImportJobViewer.tsx
            ├── EnvironmentVariables.tsx
            └── ConnectionReferences.tsx
```

**Key Points:**
- Domain has ZERO dependencies (pure TypeScript, no imports from outer layers)
- Application depends only on domain interfaces
- Infrastructure implements domain interfaces
- Presentation depends on application and domain (but only uses domain entities as DTOs)
- Webview code is separate (React/Svelte components)

---

## 8. Testing Strategy

### 8.1 Domain Layer Tests

**Focus:** Rich entity behavior, business logic

```typescript
// Example: ImportJob.test.ts
describe('ImportJob', () => {
  describe('getStatus', () => {
    it('should return Completed when completedOn exists and progress is 100', () => {
      const job = new ImportJob(
        'id',
        'Solution Name',
        100,
        new Date(),
        new Date(),
        '<xml></xml>',
        'User'
      );
      expect(job.getStatus()).toBe(ImportJobStatus.Completed);
    });

    it('should return Failed when completedOn exists and progress is less than 100', () => {
      const job = new ImportJob(
        'id',
        'Solution Name',
        50,
        new Date(),
        new Date(),
        '<xml></xml>',
        'User'
      );
      expect(job.getStatus()).toBe(ImportJobStatus.Failed);
    });
  });

  describe('parseErrorMessage', () => {
    it('should extract error message from XML data', () => {
      const xml = '<result errortext="Connection timeout" />';
      const job = new ImportJob(
        'id',
        'Solution Name',
        50,
        new Date(),
        new Date(),
        xml,
        'User'
      );
      expect(job.parseErrorMessage()).toBe('Connection timeout');
    });
  });
});
```

**Coverage:**
- All entity behavior methods
- Value object creation and behavior
- DeploymentSettings sync algorithm
- Edge cases (null values, parsing failures)

---

### 8.2 Application Layer Tests

**Focus:** Use case orchestration with mocked repositories

```typescript
// Example: ListEnvironmentVariablesUseCase.test.ts
describe('ListEnvironmentVariablesUseCase', () => {
  it('should fetch and join definitions with values', async () => {
    const mockEnvVarRepo = {
      findAllDefinitions: jest.fn().mockResolvedValue([
        // mock definitions
      ]),
      findAllValues: jest.fn().mockResolvedValue([
        // mock values
      ])
    };

    const mockSolutionComponentRepo = {
      findComponentIdsBySolution: jest.fn().mockResolvedValue([])
    };

    const useCase = new ListEnvironmentVariablesUseCase(
      mockEnvVarRepo,
      mockSolutionComponentRepo
    );

    const result = await useCase.execute('env-id', null);

    expect(mockEnvVarRepo.findAllDefinitions).toHaveBeenCalledWith('env-id');
    expect(mockEnvVarRepo.findAllValues).toHaveBeenCalledWith('env-id');
    expect(result).toHaveLength(/* expected count */);
  });

  it('should filter by solution when solutionId is provided', async () => {
    // Test solution filtering orchestration
  });
});
```

**Coverage:**
- Use case orchestration logic
- Repository method calls
- Filtering and sorting coordination
- Error propagation

---

### 8.3 Infrastructure Layer Tests

**Focus:** API integration and file operations

```typescript
// Example: DataverseApiSolutionRepository.test.ts
describe('DataverseApiSolutionRepository', () => {
  it('should map API response to Solution entities', async () => {
    const mockApiService = {
      get: jest.fn().mockResolvedValue({
        value: [
          {
            solutionid: 'id',
            uniquename: 'unique',
            friendlyname: 'Friendly',
            // ... other fields
          }
        ]
      })
    };

    const repo = new DataverseApiSolutionRepository(mockApiService, mockAuthService);
    const result = await repo.findAll('env-id');

    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(Solution);
    expect(result[0].friendlyName).toBe('Friendly');
  });
});
```

**Coverage:**
- API call construction
- Response mapping to entities
- Error handling (network, auth, parsing)
- File system operations (read/write deployment settings)

---

### 8.4 Presentation Layer Tests

**Focus:** Panel behavior and ViewModel mapping

```typescript
// Example: SolutionExplorerPanel.test.ts
describe('SolutionExplorerPanel', () => {
  it('should convert Solution entity to ViewModel', () => {
    const solution = new Solution(
      'id',
      'unique',
      'Friendly',
      '1.0.0.0',
      true,
      'pub-id',
      'Publisher',
      new Date(),
      'Description'
    );

    const panel = new SolutionExplorerPanel(/* mocks */);
    const viewModel = panel['toViewModel'](solution);

    expect(viewModel.friendlyName).toBe('Friendly');
    expect(viewModel.isManaged).toBe('Managed');
  });
});
```

**Coverage:**
- ViewModel mapping
- Search filtering logic
- Sort logic
- Row action handling

---

### 8.5 Logging Strategy

**Logging Principle from CLAUDE.md:** Log at use case boundaries, inject ILogger, never log in domain entities.

#### Layer Responsibilities

| Layer | Logs? | What to Log | How |
|-------|-------|-------------|-----|
| **Domain** | ❌ NEVER | Nothing - domain stays pure | N/A |
| **Application (Use Cases)** | ✅ YES | Start/completion/failure at boundaries | Injected ILogger |
| **Infrastructure** | ✅ YES | API calls, auth, storage (debug level) | Injected ILogger |
| **Presentation (Panels)** | ✅ YES | User actions, command invocations, lifecycle | Injected ILogger |

#### Use Case Logging Pattern

```typescript
class ListSolutionsUseCase {
  constructor(
    private readonly solutionRepository: ISolutionRepository,
    private readonly logger: ILogger  // ← Inject logger
  ) {}

  async execute(
    environmentId: string,
    cancellationToken?: vscode.CancellationToken
  ): Promise<Solution[]> {
    // Log start with context
    this.logger.info('ListSolutionsUseCase started', { environmentId });

    try {
      const solutions = await this.solutionRepository.findAll(environmentId, cancellationToken);
      const sorted = solutions.sort(/* ... */);

      // Log completion with metrics
      this.logger.info('ListSolutionsUseCase completed', { count: sorted.length });
      return sorted;
    } catch (error) {
      // Log failure with error
      this.logger.error('ListSolutionsUseCase failed', error as Error);
      throw error;
    }
  }
}
```

#### Infrastructure Logging Pattern

```typescript
class DataverseApiSolutionRepository implements ISolutionRepository {
  constructor(
    private readonly apiService: IPowerPlatformApiService,
    private readonly authService: IAuthenticationService,
    private readonly logger: ILogger  // ← Inject logger
  ) {}

  async findAll(
    environmentId: string,
    cancellationToken?: vscode.CancellationToken
  ): Promise<Solution[]> {
    const endpoint = `/api/data/v9.2/solutions?$select=...`;

    // Log infrastructure operation at debug level
    this.logger.debug('Fetching solutions from Dataverse API', {
      environmentId,
      endpoint
    });

    try {
      const response = await this.apiService.get(environmentId, endpoint);

      this.logger.debug('Solutions fetched successfully', {
        count: response.value.length
      });

      return response.value.map(/* ... */);
    } catch (error) {
      // Log infrastructure failures with context
      this.logger.error('Failed to fetch solutions from Dataverse API', {
        environmentId,
        endpoint,
        error
      });
      throw error;
    }
  }
}
```

#### Panel Logging Pattern

```typescript
class SolutionExplorerPanel extends BaseTablePanel<Solution> {
  constructor(
    panel: vscode.WebviewPanel,
    environmentService: IEnvironmentService,
    private readonly listSolutionsUseCase: ListSolutionsUseCase,
    private readonly urlBuilder: IMakerUrlBuilder,
    private readonly logger: ILogger  // ← Inject logger
  ) {
    super(panel, environmentService);
    this.logger.info('SolutionExplorerPanel created');
  }

  protected async handleRowAction(action: string, rowData: any): Promise<void> {
    const solution = this.data.find(s => s.id === rowData.id);
    if (!solution) return;

    switch (action) {
      case 'openInMaker':
        const makerUrl = this.urlBuilder.buildSolutionUrl(this.environmentId!, solution.id);
        await vscode.env.openExternal(vscode.Uri.parse(makerUrl));

        // Log user actions for observability
        this.logger.info('Opened solution in Maker Portal', {
          solutionId: solution.id,
          solutionName: solution.friendlyName
        });
        break;
    }
  }

  dispose(): void {
    this.logger.info('SolutionExplorerPanel disposed');
    this.cancellationTokenSource?.dispose();
  }
}
```

#### Testing with NullLogger

```typescript
describe('ListSolutionsUseCase', () => {
  it('should fetch and sort solutions', async () => {
    const mockRepo = {
      findAll: jest.fn().mockResolvedValue([/* ... */])
    };

    // Use NullLogger for silent tests
    const nullLogger = new NullLogger();

    const useCase = new ListSolutionsUseCase(mockRepo, nullLogger);
    const result = await useCase.execute('env-id');

    expect(result).toHaveLength(/* ... */);
  });
});
```

#### What NOT to Log

❌ **Never log in domain entities** - Domain stays pure, zero infrastructure dependencies
❌ **Never use console.log** - Use injected ILogger for testability
❌ **Never log secrets/tokens** - Sanitize sensitive data before logging
❌ **Never use global Logger.getInstance()** - Always inject via constructor

---

### 8.6 Data Sanitization Patterns

**Principle:** Never log sensitive data in plaintext. Always sanitize tokens, credentials, PII.

#### What to Sanitize

| Data Type | Example | Sanitization Strategy |
|-----------|---------|----------------------|
| **Bearer tokens** | `Bearer eyJ0eXAiOiJKV1Q...` | Truncate to first/last 3 chars: `Bearer eyJ...1Q1` |
| **Access tokens** | `access_token=abc123...` | Truncate: `access_token=abc...xyz` |
| **API keys** | `api_key=sk_live_abc123...` | Truncate: `api_key=sk_live_abc...xyz` |
| **Passwords** | `password=mySecret123` | Redact completely: `password=***REDACTED***` |
| **Email addresses** | `user@example.com` | Hash or truncate domain: `u***@example.com` |
| **Environment IDs** | GUIDs are OK | No sanitization needed (not secret) |
| **Solution names** | Strings are OK | No sanitization needed (not secret) |

#### Sanitization Utility

```typescript
/**
 * Sanitizes sensitive data for logging.
 * Prevents accidental exposure of tokens, credentials, PII.
 */
export class LogSanitizer {
  /**
   * Truncates bearer tokens to first 3 and last 3 characters.
   * Example: "Bearer eyJ0eXAiOi...xyz123" → "Bearer eyJ...123"
   */
  static sanitizeBearerToken(token: string): string {
    const match = token.match(/^(Bearer\s+)(\w{3})\w+(\w{3})$/);
    if (match) {
      return `${match[1]}${match[2]}...${match[3]}`;
    }
    return token; // Not a bearer token, return as-is
  }

  /**
   * Sanitizes HTTP headers containing authorization.
   */
  static sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers };

    if (sanitized['Authorization']) {
      sanitized['Authorization'] = this.sanitizeBearerToken(sanitized['Authorization']);
    }

    if (sanitized['authorization']) {
      sanitized['authorization'] = this.sanitizeBearerToken(sanitized['authorization']);
    }

    return sanitized;
  }

  /**
   * Sanitizes URL query parameters containing sensitive data.
   */
  static sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);

      // Sanitize known sensitive query parameters
      const sensitiveParams = ['access_token', 'api_key', 'token', 'password'];

      for (const param of sensitiveParams) {
        if (parsed.searchParams.has(param)) {
          const value = parsed.searchParams.get(param)!;
          if (value.length > 6) {
            parsed.searchParams.set(param, `${value.substring(0, 3)}...${value.substring(value.length - 3)}`);
          } else {
            parsed.searchParams.set(param, '***');
          }
        }
      }

      return parsed.toString();
    } catch {
      // Not a valid URL, return as-is
      return url;
    }
  }

  /**
   * Redacts password fields completely.
   */
  static redactPassword(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = { ...data };

    // Redact known password fields
    const passwordFields = ['password', 'Password', 'pwd', 'secret', 'Secret'];

    for (const field of passwordFields) {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}
```

#### Usage in Infrastructure

```typescript
class DataverseApiSolutionRepository implements ISolutionRepository {
  constructor(
    private readonly apiService: IPowerPlatformApiService,
    private readonly authService: IAuthenticationService,
    private readonly logger: ILogger
  ) {}

  async findAll(
    environmentId: string,
    cancellationToken?: vscode.CancellationToken
  ): Promise<Solution[]> {
    const endpoint = `/api/data/v9.2/solutions?$select=...`;

    // ✅ Sanitize URL before logging
    const sanitizedEndpoint = LogSanitizer.sanitizeUrl(endpoint);

    this.logger.debug('Fetching solutions from Dataverse API', {
      environmentId,
      endpoint: sanitizedEndpoint  // ← Sanitized
    });

    try {
      const response = await this.apiService.get(environmentId, endpoint);

      this.logger.debug('Solutions fetched successfully', {
        count: response.value.length,
        environmentId
        // ❌ DON'T log response body - may contain sensitive data
      });

      return response.value.map(/* ... */);
    } catch (error) {
      // ✅ Log error without exposing sensitive details
      this.logger.error('Failed to fetch solutions from Dataverse API', {
        environmentId,
        endpoint: sanitizedEndpoint,
        errorMessage: (error as Error).message  // ← Message only, not full stack with tokens
      });
      throw error;
    }
  }
}
```

#### Usage in Authentication

```typescript
class MsalAuthenticationService implements IAuthenticationService {
  constructor(private readonly logger: ILogger) {}

  async getAccessToken(): Promise<string> {
    this.logger.debug('Requesting access token from MSAL');

    try {
      const result = await this.msalClient.acquireTokenSilent({
        scopes: ['https://api.dataverse.microsoft.com/.default']
      });

      // ✅ NEVER log the actual token
      this.logger.debug('Access token acquired successfully', {
        expiresOn: result.expiresOn,
        account: result.account?.username,  // Username is OK
        // ❌ token: result.accessToken  ← NEVER DO THIS
      });

      return result.accessToken;
    } catch (error) {
      this.logger.error('Failed to acquire access token', error as Error);
      throw error;
    }
  }
}
```

#### What NOT to Sanitize

**Safe to log in plaintext:**
- Environment IDs (GUIDs) - not sensitive, needed for debugging
- Solution names - metadata, not secrets
- Entity logical names - metadata
- Error messages from business logic - usually safe
- Counts, durations, timestamps - metrics

**Example of good logging:**
```typescript
this.logger.info('ListSolutionsUseCase completed', {
  environmentId: 'abc123-def456-...',  // ✅ OK - GUID not sensitive
  solutionCount: 25,                    // ✅ OK - count not sensitive
  durationMs: 1234,                     // ✅ OK - metric not sensitive
  defaultSolutionFound: true            // ✅ OK - boolean not sensitive
});
```

#### Testing Sanitization

```typescript
describe('LogSanitizer', () => {
  it('should sanitize bearer tokens', () => {
    const token = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6Imk2bEdrM0...' + 'xyz123';
    const sanitized = LogSanitizer.sanitizeBearerToken(token);

    expect(sanitized).toBe('Bearer eyJ...123');
    expect(sanitized).not.toContain('JWT');
    expect(sanitized.length).toBeLessThan(20);
  });

  it('should sanitize authorization headers', () => {
    const headers = {
      'Authorization': 'Bearer abc123def456ghi789',
      'Content-Type': 'application/json'
    };

    const sanitized = LogSanitizer.sanitizeHeaders(headers);

    expect(sanitized['Authorization']).toBe('Bearer abc...789');
    expect(sanitized['Content-Type']).toBe('application/json');
  });

  it('should redact password fields', () => {
    const data = {
      username: 'john.doe',
      password: 'mySecret123',
      email: 'john@example.com'
    };

    const sanitized = LogSanitizer.redactPassword(data);

    expect(sanitized.username).toBe('john.doe');
    expect(sanitized.password).toBe('***REDACTED***');
    expect(sanitized.email).toBe('john@example.com');
  });
});
```

#### Key Rules

1. ✅ **Always sanitize** before passing to logger
2. ✅ **Truncate tokens** to first/last 3 chars for debugging
3. ✅ **Redact passwords** completely
4. ✅ **Test sanitization** to ensure it works
5. ❌ **Never log full tokens** even in debug mode
6. ❌ **Never log response bodies** that may contain secrets
7. ❌ **Never assume data is safe** - sanitize by default

---

## 9. Dependencies and Reuse

### 9.1 Reuse from Environment Setup Feature

**Reuse these existing interfaces/implementations:**

1. **IPowerPlatformApiService** - authenticated API calls
   - Location: `src/features/environmentSetup/domain/interfaces/IPowerPlatformApiService.ts`
   - Used by: all Dataverse API repositories

2. **IAuthenticationService** - MSAL authentication
   - Location: `src/features/environmentSetup/domain/interfaces/IAuthenticationService.ts`
   - Used by: API service initialization

3. **DataverseUrl** - URL validation and parsing
   - Location: `src/features/environmentSetup/domain/valueObjects/DataverseUrl.ts`
   - Used by: environment ID to URL conversions

**Why:** Don't reinvent the wheel. Existing authentication and API infrastructure is battle-tested.

---

### 9.2 External Dependencies

```json
{
  "dependencies": {
    "@vscode/extension-toolkit": "^1.0.0", // Webview UI Toolkit
    "react": "^18.0.0", // For webview components
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/vscode": "^1.80.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0",
    "typescript": "^5.0.0"
  }
}
```

**No heavy dependencies in domain layer.** Domain is pure TypeScript.

---

## 10. Implementation Order

**Recommended sequence for implementation:**

### Phase 1: Domain Foundation
1. Create domain interfaces (repositories, services)
2. Create value objects (enums, simple value objects)
3. Create Solution entity with behavior
4. Test Solution entity thoroughly

### Phase 2: Solution Explorer (Simplest Panel)
1. Create SolutionRepository interface and implementation
2. Create ListSolutionsUseCase
3. Create BaseDataPanel abstract class
4. Create SolutionExplorerPanel
5. Create webview UI for Solution Explorer
6. Test end-to-end

### Phase 3: Import Job Viewer (Complex Entity Logic)
1. Create ImportJob entity with status/error parsing
2. Create ImportJobRepository and implementation
3. Create ListImportJobsUseCase and OpenImportLogInEditorUseCase
4. Create IEditorService and implementation
5. Create ImportJobViewerPanel
6. Create webview UI
7. Test end-to-end, especially XML parsing

### Phase 4: Environment Variables (Filtering + Export)
1. Create EnvironmentVariable entity
2. Create repositories (EnvironmentVariable, SolutionComponent)
3. Create DeploymentSettings entity with sync logic
4. Create use cases (List, Sync)
5. Create BaseTablePanel abstract class
6. Create EnvironmentVariablesPanel
7. Create webview UI with export button
8. Test end-to-end, especially sync algorithm

### Phase 5: Connection References (Most Complex)
1. Create CloudFlow and ConnectionReference entities
2. Create FlowConnectionRelationship value object with factories
3. Create repositories (CloudFlow, ConnectionReference)
4. Create ListConnectionReferencesUseCase (complex matching logic)
5. Create SyncConnectionReferencesToDeploymentSettingsUseCase
6. Create ConnectionReferencesPanel
7. Create webview UI
8. Test end-to-end, especially relationship building

---

## 11. Error Handling Strategy

### 11.1 Layer Responsibilities

| Layer | Throw | Catch | Log |
|-------|-------|-------|-----|
| Domain | ✅ Domain exceptions | ❌ | ❌ |
| Application | ❌ Let propagate | ❌ | ❌ |
| Infrastructure | ✅ Wrap external errors | ✅ Network errors | ✅ Infrastructure failures |
| Presentation | ❌ | ✅ All errors | ✅ All errors |

### 11.2 Error Flow

```typescript
// Domain: Throw specific exceptions
class CloudFlow {
  extractConnectionReferenceNames(): string[] {
    try {
      // parsing...
    } catch (error) {
      throw new InvalidClientDataError(this.id, this.name, error);
    }
  }
}

// Infrastructure: Catch and wrap, log with injected logger
class DataverseApiCloudFlowRepository {
  constructor(
    private readonly apiService: IPowerPlatformApiService,
    private readonly authService: IAuthenticationService,
    private readonly logger: ILogger
  ) {}

  async findAll(
    environmentId: string,
    cancellationToken?: vscode.CancellationToken
  ): Promise<CloudFlow[]> {
    try {
      return await this.apiService.get(...);
    } catch (error) {
      // ✅ CORRECT: Use injected logger, not console.error
      this.logger.error('Failed to fetch cloud flows from Dataverse API', error as Error);
      throw new ApiConnectionError(`Cannot connect to ${environmentId}`, error);
    }
  }
}

// Application: Let propagate (no try/catch), but log at boundaries
class ListConnectionReferencesUseCase {
  constructor(
    private readonly flowRepository: ICloudFlowRepository,
    private readonly connectionRefRepository: IConnectionReferenceRepository,
    private readonly solutionComponentRepository: ISolutionComponentRepository,
    private readonly relationshipBuilder: FlowConnectionRelationshipBuilder,
    private readonly logger: ILogger
  ) {}

  async execute(
    environmentId: string,
    solutionId: string | null,
    cancellationToken?: vscode.CancellationToken
  ): Promise<FlowConnectionRelationship[]> {
    this.logger.info('ListConnectionReferencesUseCase started', { environmentId, solutionId });

    try {
      const flows = await this.flowRepository.findAll(environmentId, cancellationToken);
      const connectionRefs = await this.connectionRefRepository.findAll(environmentId, cancellationToken);
      const result = this.relationshipBuilder.buildRelationships(flows, connectionRefs);

      this.logger.info('ListConnectionReferencesUseCase completed', { count: result.length });
      return result;
    } catch (error) {
      // ✅ Log failure at use case boundary
      this.logger.error('ListConnectionReferencesUseCase failed', error as Error);
      throw error;
    }
  }
}

// Presentation: Catch all and display
class ConnectionReferencesPanel {
  constructor(
    panel: vscode.WebviewPanel,
    environmentService: IEnvironmentService,
    private readonly listConnectionReferencesUseCase: ListConnectionReferencesUseCase,
    private readonly syncToDeploymentSettingsUseCase: SyncConnectionReferencesToDeploymentSettingsUseCase,
    private readonly urlBuilder: IMakerUrlBuilder,
    private readonly logger: ILogger
  ) {
    super(panel, environmentService);
  }

  protected async fetchData(): Promise<void> {
    try {
      this.data = await this.listConnectionReferencesUseCase.execute(...);
    } catch (error) {
      // ✅ CORRECT: Use injected logger, not console.error
      this.logger.error('Failed to fetch data in ConnectionReferencesPanel', error as Error);
      this.setError(this.formatError(error));
    }
  }
}
```

---

## 12. Dependency Injection

### 12.1 DI Container

```typescript
export class DataPanelSuiteDependencyContainer {
  // Singleton repositories
  private readonly solutionRepository: ISolutionRepository;
  private readonly importJobRepository: IImportJobRepository;
  private readonly envVarRepository: IEnvironmentVariableRepository;
  private readonly flowRepository: ICloudFlowRepository;
  private readonly connectionRefRepository: IConnectionReferenceRepository;
  private readonly solutionComponentRepository: ISolutionComponentRepository;
  private readonly deploymentSettingsRepository: IDeploymentSettingsRepository;
  private readonly editorService: IEditorService;

  // Singleton domain services
  private readonly relationshipBuilder: FlowConnectionRelationshipBuilder;
  private readonly urlBuilder: IMakerUrlBuilder;

  // Logger
  private readonly logger: ILogger;

  constructor(
    apiService: IPowerPlatformApiService,
    authService: IAuthenticationService,
    logger: ILogger
  ) {
    this.logger = logger;

    // Initialize domain services (stateless singletons)
    this.relationshipBuilder = new FlowConnectionRelationshipBuilder();
    this.urlBuilder = new MakerUrlBuilder();

    // Initialize repositories (stateless singletons with shared logger)
    this.solutionRepository = new DataverseApiSolutionRepository(apiService, authService, logger);
    this.importJobRepository = new DataverseApiImportJobRepository(apiService, authService, logger);
    this.envVarRepository = new DataverseApiEnvironmentVariableRepository(apiService, authService, logger);
    this.flowRepository = new DataverseApiCloudFlowRepository(apiService, authService, logger);
    this.connectionRefRepository = new DataverseApiConnectionReferenceRepository(apiService, authService, logger);
    this.solutionComponentRepository = new DataverseApiSolutionComponentRepository(apiService, authService, logger);
    this.deploymentSettingsRepository = new VsCodeDeploymentSettingsRepository(logger);
    this.editorService = new VsCodeEditorService(logger);
  }

  // Use case factories (transient - create new instance each time)
  createListSolutionsUseCase(): ListSolutionsUseCase {
    return new ListSolutionsUseCase(this.solutionRepository, this.logger);
  }

  createListImportJobsUseCase(): ListImportJobsUseCase {
    return new ListImportJobsUseCase(this.importJobRepository, this.logger);
  }

  createOpenImportLogInEditorUseCase(): OpenImportLogInEditorUseCase {
    return new OpenImportLogInEditorUseCase(this.editorService, this.logger);
  }

  createListEnvironmentVariablesUseCase(): ListEnvironmentVariablesUseCase {
    return new ListEnvironmentVariablesUseCase(
      this.envVarRepository,
      this.solutionComponentRepository,
      this.logger
    );
  }

  createSyncEnvironmentVariablesToDeploymentSettingsUseCase(): SyncEnvironmentVariablesToDeploymentSettingsUseCase {
    return new SyncEnvironmentVariablesToDeploymentSettingsUseCase(
      this.deploymentSettingsRepository,
      this.logger
    );
  }

  createListConnectionReferencesUseCase(): ListConnectionReferencesUseCase {
    return new ListConnectionReferencesUseCase(
      this.flowRepository,
      this.connectionRefRepository,
      this.solutionComponentRepository,
      this.relationshipBuilder,
      this.logger
    );
  }

  createSyncConnectionReferencesToDeploymentSettingsUseCase(): SyncConnectionReferencesToDeploymentSettingsUseCase {
    return new SyncConnectionReferencesToDeploymentSettingsUseCase(
      this.deploymentSettingsRepository,
      this.connectionRefRepository,
      this.logger
    );
  }

  // Panel factories (transient - create new instance per webview)
  createSolutionExplorerPanel(
    panel: vscode.WebviewPanel,
    environmentService: IEnvironmentService
  ): SolutionExplorerPanel {
    return new SolutionExplorerPanel(
      panel,
      environmentService,
      this.createListSolutionsUseCase(),
      this.urlBuilder,
      this.logger
    );
  }

  createImportJobViewerPanel(
    panel: vscode.WebviewPanel,
    environmentService: IEnvironmentService
  ): ImportJobViewerPanel {
    return new ImportJobViewerPanel(
      panel,
      environmentService,
      this.createListImportJobsUseCase(),
      this.createOpenImportLogInEditorUseCase(),
      this.urlBuilder,
      this.logger
    );
  }

  createEnvironmentVariablesPanel(
    panel: vscode.WebviewPanel,
    environmentService: IEnvironmentService
  ): EnvironmentVariablesPanel {
    return new EnvironmentVariablesPanel(
      panel,
      environmentService,
      this.createListEnvironmentVariablesUseCase(),
      this.createSyncEnvironmentVariablesToDeploymentSettingsUseCase(),
      this.urlBuilder,
      this.logger
    );
  }

  createConnectionReferencesPanel(
    panel: vscode.WebviewPanel,
    environmentService: IEnvironmentService
  ): ConnectionReferencesPanel {
    return new ConnectionReferencesPanel(
      panel,
      environmentService,
      this.createListConnectionReferencesUseCase(),
      this.createSyncConnectionReferencesToDeploymentSettingsUseCase(),
      this.urlBuilder,
      this.logger
    );
  }
}
```

### 12.2 Extension Integration

```typescript
// extension.ts
export function activate(context: vscode.ExtensionContext) {
  // Create shared infrastructure services
  const authService = new MsalAuthenticationService(...);
  const apiService = new PowerPlatformApiService(authService);
  const logger = new OutputChannelLogger('Power Platform Developer Suite');

  // Create DI container with logger
  const container = new DataPanelSuiteDependencyContainer(apiService, authService, logger);

  // Register panel commands
  context.subscriptions.push(
    vscode.commands.registerCommand('powerplatform.showSolutionExplorer', () => {
      const panel = vscode.window.createWebviewPanel(...);
      container.createSolutionExplorerPanel(panel, environmentService);
    }),

    vscode.commands.registerCommand('powerplatform.showImportJobViewer', () => {
      const panel = vscode.window.createWebviewPanel(...);
      container.createImportJobViewerPanel(panel, environmentService);
    }),

    vscode.commands.registerCommand('powerplatform.showEnvironmentVariables', () => {
      const panel = vscode.window.createWebviewPanel(...);
      container.createEnvironmentVariablesPanel(panel, environmentService);
    }),

    vscode.commands.registerCommand('powerplatform.showConnectionReferences', () => {
      const panel = vscode.window.createWebviewPanel(...);
      container.createConnectionReferencesPanel(panel, environmentService);
    })
  );
}
```

### 12.3 Lifecycle

- **Logger**: Singleton (shared across all layers except domain)
- **Repositories**: Singleton (expensive, stateless, shared logger)
- **Domain Services**: Singleton (stateless, no dependencies)
- **URL Builder**: Singleton (stateless, no dependencies)
- **Use Cases**: Transient (short-lived, own logger reference)
- **Panels**: Transient (one per webview, own logger reference)

---

## 13. Performance Monitoring

### 13.1 Approach

**Strategy:** Monitor actual performance during implementation rather than setting arbitrary limits upfront.

### 13.2 Client-side Filtering Performance

**Current Design:** Fetch all data, filter client-side using solution component IDs.

**Monitoring Points:**
- Track dataset sizes in production (log counts after fetching)
- Measure filter/sort execution time in panels
- Add performance warnings if operations exceed thresholds (e.g., >500ms)

**Example Monitoring:**
```typescript
protected handleSearch(query: string): void {
  const startTime = performance.now();

  if (!query) {
    this.filteredData = this.data;
  } else {
    this.filteredData = this.data.filter(row =>
      this.searchRow(row, query.toLowerCase())
    );
  }

  const duration = performance.now() - startTime;

  if (duration > 500) {
    this.logger.warn('Search operation took longer than expected', {
      duration,
      totalItems: this.data.length,
      filteredItems: this.filteredData.length
    });
  }

  this.sendDataToWebview();
}
```

**Mitigation Strategies** (implement only if needed):
1. Virtual scrolling for large tables (>1000 rows)
2. Pagination for extremely large datasets (>5000 rows)
3. Server-side filtering for specific scenarios
4. Background processing with progress indicators

**Decision Point:** Implement mitigation only when monitoring shows actual performance issues.

---

## Summary

This design follows **strict clean architecture principles**:

1. **Domain has ZERO dependencies** - pure TypeScript entities with rich behavior
2. **Business logic lives in domain entities** - status determination, error parsing, sync algorithms (NOT URL construction)
3. **Use cases orchestrate only** - coordinate entities and repositories, NO business logic
4. **Repository interfaces in domain** - infrastructure implements, domain defines contracts
5. **All dependencies point inward** - presentation → application → domain ← infrastructure
6. **Logging at boundaries** - use cases and infrastructure log, domain stays pure
7. **Cancellation support** - all async operations support cancellation tokens
6. **Rich domain models** - entities have behavior methods, not anemic data bags
7. **View Models decouple presentation** - panels map entities to DTOs optimized for UI

**Key Architectural Wins:**
- Domain logic is testable in isolation (no VS Code, no API, no file system)
- Infrastructure is swappable (mock repositories for testing)
- Use cases are thin and clear (orchestration only)
- Panels are thin (delegate to use cases, minimal logic)
- Complexity is managed through layering (each layer has clear responsibility)

This design is **actionable and implementable** by following the phase order, with clear boundaries and responsibilities.
