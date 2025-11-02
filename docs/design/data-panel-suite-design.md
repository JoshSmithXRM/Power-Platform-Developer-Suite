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
  ) {}

  // Business logic: Default solution identification
  isDefaultSolution(): boolean {
    return this.uniqueName === 'Default';
  }

  /**
   * Constructs the Maker Portal URL for this solution.
   *
   * Business Decision: URL patterns are considered stable domain knowledge.
   * Microsoft has maintained these patterns for 5+ years across all regions.
   *
   * If Microsoft changes URL patterns or sovereign cloud support is needed,
   * introduce IMakerUrlBuilder domain service at that time.
   *
   * @param environmentId - Environment GUID
   * @returns Maker Portal URL for this solution
   */
  getMakerUrl(environmentId: string): string {
    return `https://make.powerapps.com/environments/${environmentId}/solutions/${this.id}`;
  }

  /**
   * Constructs the classic Dynamics 365 URL for this solution.
   *
   * Note: Uses environment ID as subdomain. For custom domains,
   * caller should use DataverseUrl value object for URL resolution.
   *
   * @param environmentId - Environment GUID
   * @returns Dynamics 365 URL for solution editor
   */
  getDynamicsUrl(environmentId: string): string {
    return `https://${environmentId}.dynamics.com/tools/solution/edit.aspx?id=${this.id}`;
  }

  // Business logic: Sort ordering for default solution
  getSortPriority(): number {
    return this.isDefaultSolution() ? 0 : 1;
  }
}
```

**Why:** Solution knows how to construct its own URLs and determine its sort priority. This keeps business logic in the domain, not scattered across use cases or panels.

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
  ) {}

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

  // Factory method: Parse from JSON
  static fromJSON(json: string): DeploymentSettings {
    const parsed = JSON.parse(json);
    return new DeploymentSettings(
      parsed.EnvironmentVariables ?? [],
      parsed.ConnectionReferences ?? []
    );
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

```typescript
export class InvalidClientDataError extends Error {
  constructor(
    public readonly flowId: string,
    public readonly flowName: string,
    public readonly cause: Error
  ) {
    super(`Failed to parse clientData for flow ${flowId} (${flowName})`);
    this.name = 'InvalidClientDataError';
  }
}
```

**Why:** Domain exceptions allow domain to signal errors without I/O side effects. Outer layers handle logging and display.

---

### 2.6 Repository Interfaces (Domain Contracts)

Domain defines contracts, infrastructure implements them.

```typescript
// Domain layer: src/features/dataPanelSuite/domain/interfaces/

interface ISolutionRepository {
  findAll(environmentId: string): Promise<Solution[]>;
}

interface IImportJobRepository {
  findAll(environmentId: string): Promise<ImportJob[]>;
}

interface IEnvironmentVariableRepository {
  findAllDefinitions(environmentId: string): Promise<EnvironmentVariableDefinition[]>;
  findAllValues(environmentId: string): Promise<EnvironmentVariableValue[]>;
}

interface IConnectionReferenceRepository {
  findAll(environmentId: string): Promise<ConnectionReference[]>;
}

interface ICloudFlowRepository {
  findAll(environmentId: string): Promise<CloudFlow[]>;
}

interface ISolutionComponentRepository {
  getObjectTypeCode(environmentId: string, entityLogicalName: string): Promise<number | null>;
  findComponentIdsBySolution(
    environmentId: string,
    solutionId: string,
    entityLogicalName: string
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
```

**Why:** Domain defines contracts, which allows infrastructure to be swapped without changing domain or application layers. Perfect for testing with mocks.

---

## 3. Application Layer Design (Use Cases)

Use cases orchestrate domain entities and repositories. They contain **ZERO business logic** - only coordination.

### 3.1 Solution Panel Use Cases

#### ListSolutionsUseCase

```typescript
class ListSolutionsUseCase {
  constructor(private readonly solutionRepository: ISolutionRepository) {}

  async execute(environmentId: string): Promise<Solution[]> {
    // Orchestration only: fetch and sort
    const solutions = await this.solutionRepository.findAll(environmentId);

    // Sort using domain logic (entity knows its sort priority)
    return solutions.sort((a, b) => {
      const priorityDiff = a.getSortPriority() - b.getSortPriority();
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      return a.friendlyName.localeCompare(b.friendlyName);
    });
  }
}
```

**Why:** Use case orchestrates (fetch, sort) but delegates business logic (sort priority) to entities.

---

### 3.2 Import Job Panel Use Cases

#### ListImportJobsUseCase

```typescript
class ListImportJobsUseCase {
  constructor(private readonly importJobRepository: IImportJobRepository) {}

  async execute(
    environmentId: string,
    solutionId: string | null
  ): Promise<ImportJob[]> {
    // Orchestration: fetch all jobs
    let jobs = await this.importJobRepository.findAll(environmentId);

    // Orchestration: filter by solution name if needed
    if (solutionId) {
      const solutionName = await this.getSolutionName(solutionId);
      jobs = jobs.filter(job => job.solutionName === solutionName);
    }

    // Orchestration: sort by started date (newest first)
    return jobs.sort((a, b) => b.startedOn.getTime() - a.startedOn.getTime());
  }

  private async getSolutionName(solutionId: string): Promise<string> {
    // Would need ISolutionRepository injected
    // Simplified for example
    return '';
  }
}
```

**Why:** Use case orchestrates filtering and sorting, but delegates status/error parsing to ImportJob entity methods.

---

#### OpenImportLogInEditorUseCase

```typescript
class OpenImportLogInEditorUseCase {
  constructor(private readonly editorService: IEditorService) {}

  async execute(importJob: ImportJob): Promise<void> {
    // Orchestration only: get XML and open in editor
    const xml = importJob.importLogXml;
    const title = `Import Log - ${importJob.solutionName}`;

    await this.editorService.openXmlInNewTab(xml, title);
  }
}
```

**Why:** Pure orchestration. No business logic here.

---

### 3.3 Environment Variables Panel Use Cases

#### ListEnvironmentVariablesUseCase

```typescript
class ListEnvironmentVariablesUseCase {
  constructor(
    private readonly envVarRepository: IEnvironmentVariableRepository,
    private readonly solutionComponentRepository: ISolutionComponentRepository
  ) {}

  async execute(
    environmentId: string,
    solutionId: string | null
  ): Promise<EnvironmentVariable[]> {
    // Orchestration: fetch definitions and values in parallel
    const [definitions, values] = await Promise.all([
      this.envVarRepository.findAllDefinitions(environmentId),
      this.envVarRepository.findAllValues(environmentId)
    ]);

    // Orchestration: join definitions with values
    const variables = this.joinDefinitionsWithValues(definitions, values);

    // Orchestration: filter by solution if needed
    if (solutionId) {
      const componentIds = await this.solutionComponentRepository.findComponentIdsBySolution(
        environmentId,
        solutionId,
        'environmentvariabledefinition'
      );
      const componentIdSet = new Set(componentIds);

      // Delegate filtering logic to entity
      return variables
        .filter(v => v.isInSolution(componentIdSet))
        .sort((a, b) => a.schemaName.localeCompare(b.schemaName));
    }

    // Orchestration: sort by schema name
    return variables.sort((a, b) => a.schemaName.localeCompare(b.schemaName));
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

**Why:** Use case orchestrates parallel fetching, joining, and filtering. Business logic (isInSolution, getEffectiveValue) stays in entities.

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
    private readonly apiService: IPowerPlatformApiService,
    private readonly authService: IAuthenticationService
  ) {}

  async findAll(environmentId: string): Promise<Solution[]> {
    const endpoint = `/api/data/v9.2/solutions?$select=solutionid,uniquename,friendlyname,version,ismanaged,_publisherid_value,installedon,description&$expand=publisherid($select=friendlyname)&$orderby=friendlyname`;

    const response = await this.apiService.get(environmentId, endpoint);

    return response.value.map((item: any) =>
      new Solution(
        item.solutionid,
        item.uniquename,
        item.friendlyname,
        item.version,
        item.ismanaged,
        item._publisherid_value,
        item.publisherid?.friendlyname ?? 'Unknown',
        item.installedon ? new Date(item.installedon) : null,
        item.description ?? ''
      )
    );
  }
}
```

**Why:** Infrastructure knows how to talk to Dataverse API and map responses to domain entities. Domain stays pure.

---

#### VsCodeDeploymentSettingsRepository

```typescript
class VsCodeDeploymentSettingsRepository implements IDeploymentSettingsRepository {
  async read(filePath: string): Promise<DeploymentSettings> {
    const fs = require('fs').promises;
    const content = await fs.readFile(filePath, 'utf8');
    return DeploymentSettings.fromJSON(content);
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

  // Abstract methods that subclasses must implement
  protected abstract fetchData(): Promise<void>;
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

  // Abstract methods that subclasses must implement
  protected abstract toViewModel(item: T): any;
  protected abstract searchRow(row: T, query: string): boolean;
  protected abstract getColumnValue(row: T, column: string): any;
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
  constructor(
    panel: vscode.WebviewPanel,
    environmentService: IEnvironmentService,
    private readonly listSolutionsUseCase: ListSolutionsUseCase
  ) {
    super(panel, environmentService);
  }

  protected async fetchData(): Promise<void> {
    // Delegate to use case
    this.data = await this.listSolutionsUseCase.execute(this.environmentId!);
    this.filteredData = this.data;
    this.sendDataToWebview();
  }

  protected getMakerUrl(): string {
    return `https://make.powerapps.com/environments/${this.environmentId}/solutions`;
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
        // Delegate URL construction to entity
        const makerUrl = solution.getMakerUrl(this.environmentId!);
        await vscode.env.openExternal(vscode.Uri.parse(makerUrl));
        break;
      case 'openInDynamics':
        // Delegate URL construction to entity
        const dynamicsUrl = solution.getDynamicsUrl(this.environmentId!);
        await vscode.env.openExternal(vscode.Uri.parse(dynamicsUrl));
        break;
    }
  }
}
```

**Why:** Panel delegates to use case, maps domain entities to view models, handles UI events. Minimal business logic here.

---

#### ImportJobViewerPanel

```typescript
class ImportJobViewerPanel extends BaseTablePanel<ImportJob> {
  constructor(
    panel: vscode.WebviewPanel,
    environmentService: IEnvironmentService,
    private readonly listImportJobsUseCase: ListImportJobsUseCase,
    private readonly openImportLogUseCase: OpenImportLogInEditorUseCase
  ) {
    super(panel, environmentService);
  }

  protected async fetchData(): Promise<void> {
    // Delegate to use case
    this.data = await this.listImportJobsUseCase.execute(
      this.environmentId!,
      this.solutionId
    );
    this.filteredData = this.data;
    this.sendDataToWebview();
  }

  protected getMakerUrl(): string {
    return `https://make.powerapps.com/environments/${this.environmentId}/solutions/importhistory`;
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
    return `https://make.powerapps.com/environments/${this.environmentId}/environmentvariables`;
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
    return `https://make.powerapps.com/environments/${this.environmentId}/flows`;
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
| URL construction (Solution) | Domain Entity | Entity knows how to represent itself |
| Effective value resolution (EnvironmentVariable) | Domain Entity | Core business rule |
| ClientData parsing (CloudFlow) | Domain Entity | Entity knows its JSON structure |
| Relationship building (FlowConnectionRelationship) | Domain Value Object | Complex relationship logic |
| Deployment settings sync algorithm | Domain Entity (DeploymentSettings) | Complex business rule, needs consistency |
| Solution filtering | Application Use Case | Orchestration: fetch IDs, delegate to entities |
| Data fetching | Infrastructure Repository | External concern, not business logic |
| Search/sort | Presentation Panel | UI concern, client-side filtering |

**Key Principle:** If it's a business rule that could change based on domain requirements, it belongs in domain entities. If it's coordination between entities/repositories, it belongs in use cases.

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

// Infrastructure: Catch and wrap
class DataverseApiCloudFlowRepository {
  async findAll(environmentId: string): Promise<CloudFlow[]> {
    try {
      return await this.apiService.get(...);
    } catch (error) {
      console.error(`API call failed:`, error);
      throw new ApiConnectionError(`Cannot connect to ${environmentId}`, error);
    }
  }
}

// Application: Let propagate (no try/catch)
class ListConnectionReferencesUseCase {
  async execute(...): Promise<FlowConnectionRelationship[]> {
    const flows = await this.flowRepository.findAll(environmentId);
    return this.relationshipBuilder.buildRelationships(flows, connectionRefs);
  }
}

// Presentation: Catch all and display
class ConnectionReferencesPanel {
  protected async fetchData(): Promise<void> {
    try {
      this.data = await this.listConnectionReferencesUseCase.execute(...);
    } catch (error) {
      console.error(`Panel error:`, error);
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
  private readonly solutionRepository: ISolutionRepository;
  private readonly flowRepository: ICloudFlowRepository;
  private readonly connectionRefRepository: IConnectionReferenceRepository;
  private readonly solutionComponentRepository: ISolutionComponentRepository;
  private readonly relationshipBuilder: FlowConnectionRelationshipBuilder;

  constructor(
    apiService: IPowerPlatformApiService,
    authService: IAuthenticationService
  ) {
    // Singletons
    this.solutionRepository = new DataverseApiSolutionRepository(apiService, authService);
    this.flowRepository = new DataverseApiCloudFlowRepository(apiService, authService);
    this.connectionRefRepository = new DataverseApiConnectionReferenceRepository(apiService, authService);
    this.solutionComponentRepository = new DataverseApiSolutionComponentRepository(apiService, authService);
    this.relationshipBuilder = new FlowConnectionRelationshipBuilder();
  }

  createListConnectionReferencesUseCase(): ListConnectionReferencesUseCase {
    return new ListConnectionReferencesUseCase(
      this.flowRepository,
      this.connectionRefRepository,
      this.solutionComponentRepository,
      this.relationshipBuilder
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
      this.createSyncConnectionReferencesToDeploymentSettingsUseCase()
    );
  }
}
```

### 12.2 Extension Integration

```typescript
// extension.ts
export function activate(context: vscode.ExtensionContext) {
  const authService = new MsalAuthenticationService(...);
  const apiService = new PowerPlatformApiService(authService);
  const container = new DataPanelSuiteDependencyContainer(apiService, authService);

  context.subscriptions.push(
    vscode.commands.registerCommand('powerplatform.showConnectionReferences', () => {
      const panel = vscode.window.createWebviewPanel(...);
      container.createConnectionReferencesPanel(panel, environmentService);
    })
  );
}
```

### 12.3 Lifecycle

- **Repositories**: Singleton (expensive, stateless)
- **Domain Services**: Singleton (stateless)
- **Use Cases**: Transient (short-lived)
- **Panels**: Transient (one per webview)

---

## Summary

This design follows **strict clean architecture principles**:

1. **Domain has ZERO dependencies** - pure TypeScript entities with rich behavior
2. **Business logic lives in domain entities** - status determination, error parsing, URL construction, sync algorithms
3. **Use cases orchestrate only** - coordinate entities and repositories, NO business logic
4. **Repository interfaces in domain** - infrastructure implements, domain defines contracts
5. **All dependencies point inward** - presentation → application → domain ← infrastructure
6. **Rich domain models** - entities have behavior methods, not anemic data bags
7. **View Models decouple presentation** - panels map entities to DTOs optimized for UI

**Key Architectural Wins:**
- Domain logic is testable in isolation (no VS Code, no API, no file system)
- Infrastructure is swappable (mock repositories for testing)
- Use cases are thin and clear (orchestration only)
- Panels are thin (delegate to use cases, minimal logic)
- Complexity is managed through layering (each layer has clear responsibility)

This design is **actionable and implementable** by following the phase order, with clear boundaries and responsibilities.
