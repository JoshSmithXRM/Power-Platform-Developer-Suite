# Deployment Settings Promotion - Technical Design

**Status:** Ready for Implementation
**Date:** 2025-12-08
**Version:** 2.0 (Finalized after design review)
**Complexity:** Complex

---

## Overview

**User Problem:** Power Platform developers promoting solutions between environments (Dev→QA→Prod) must manually edit deployment settings files because:
1. ConnectionIds are unique per environment (even for the same connector)
2. Custom connectors have different ConnectorIds per environment
3. Environment variable values differ per environment (URLs, keys, etc.)

The current manual process involves diffing files and find/replace operations - tedious, error-prone, and time-consuming.

**Solution:** A new panel that:
1. Loads deployment settings from a source file
2. Queries the target environment for available connections
3. Auto-matches standard connectors (identical ConnectorIds across environments)
4. Flags custom connectors for manual mapping (different ConnectorIds per environment)
5. Shows environment variable diff with target pre-population
6. Generates the promoted deployment settings file
7. Saves connector mappings to a reusable profile

**Value:** Eliminates manual find/replace of deployment settings during environment promotion. Reduces promotion time from 15-30 minutes to under 2 minutes.

---

## Data Sources

| Data | Source | API/Method |
|------|--------|------------|
| Source Connection References | Deployment settings file | File system (existing repository) |
| Source Environment Variables | Deployment settings file | File system (existing repository) |
| Target Connections | Power Platform Admin API | `GET api.powerapps.com/.../connections` |
| Target Environment Variables | Dataverse API | FetchXML on `environmentvariabledefinition` |
| Connector Mappings (saved) | Profile file | `.powerapps/promotion-profiles/*.json` |

### Power Platform Connections API

**Discovered via Fiddler trace of PowerShell module:**

```
GET https://api.powerapps.com/providers/Microsoft.PowerApps/scopes/admin/environments/{environmentId}/connections?api-version=2016-11-01

Headers:
  Authorization: Bearer {access_token}

Token Requirements:
  Resource/Audience: https://service.powerapps.com/
```

**Response Structure:**
```json
{
  "value": [
    {
      "name": "4e7c481d43ff440682130dfad5ba9497",
      "properties": {
        "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps",
        "displayName": "Dataverse Production",
        "statuses": [{"status": "Connected"}],
        "createdBy": {
          "displayName": "Flow Admin",
          "userPrincipalName": "flowadmin@contoso.com"
        }
      }
    }
  ]
}
```

**Key fields:**
- `name` → ConnectionId (what we put in deployment settings)
- `properties.apiId` → ConnectorId path (for matching)
- `properties.displayName` → Human-readable name (for UI)
- `properties.statuses[0].status` → "Connected" = active

---

## Connector Matching Algorithm

### Core Insight

**Standard connectors** (Microsoft-published) have **identical ConnectorIds** across all environments:
- `/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps` → Same everywhere
- `/providers/Microsoft.PowerApps/apis/shared_sharepointonline` → Same everywhere

**Custom connectors** have **unique ConnectorIds** per environment:
- Dev: `/providers/Microsoft.PowerApps/apis/shared_customapi_abc123`
- QA: `/providers/Microsoft.PowerApps/apis/shared_customapi_xyz789`

### Matching Strategy: Compare ConnectorId Sets

```
STEP 1: Extract unique ConnectorIds from source file

STEP 2: Extract unique ConnectorIds from target connections

STEP 3: Compare sets
  ├─ MATCHED: ConnectorId in BOTH → Standard connector, auto-resolve
  ├─ UNMATCHED SOURCE: ConnectorId only in source → Needs manual mapping
  └─ UNMATCHED TARGET: ConnectorId only in target → Candidates for mapping

STEP 4: Present unmatched for manual selection
  └─ User selects which target connector maps to which source connector

STEP 5: Apply mappings to generate output file
```

### Algorithm Implementation

```typescript
interface ConnectorMatchResult {
  // Auto-matched: ConnectorId identical in both source and target
  autoMatched: Map<string, TargetConnection[]>;  // ConnectorId → connections

  // Needs mapping: ConnectorId exists in source but not target
  unmatchedSource: Set<string>;  // ConnectorIds needing user mapping

  // Mapping candidates: ConnectorId exists in target but not source
  unmatchedTarget: Map<string, TargetConnection[]>;  // Available for mapping
}

function matchConnectors(
  sourceConnectorIds: Set<string>,
  targetConnections: TargetConnection[]
): ConnectorMatchResult {
  // Build target connector map
  const targetByConnectorId = groupBy(targetConnections, c => c.connectorId);
  const targetConnectorIds = new Set(targetByConnectorId.keys());

  // Find matches and mismatches
  const autoMatched = new Map<string, TargetConnection[]>();
  const unmatchedSource = new Set<string>();

  for (const sourceConnectorId of sourceConnectorIds) {
    if (targetConnectorIds.has(sourceConnectorId)) {
      autoMatched.set(sourceConnectorId, targetByConnectorId.get(sourceConnectorId)!);
    } else {
      unmatchedSource.add(sourceConnectorId);
    }
  }

  // Find unmatched target connectors (candidates for manual mapping)
  const unmatchedTarget = new Map<string, TargetConnection[]>();
  for (const [connectorId, connections] of targetByConnectorId) {
    if (!sourceConnectorIds.has(connectorId)) {
      unmatchedTarget.set(connectorId, connections);
    }
  }

  return { autoMatched, unmatchedSource, unmatchedTarget };
}
```

---

## Promotion Profile Data Model

### Two-Tier Mapping Model

**Tier 1: Connector Mappings** - For custom connectors with different IDs per environment
**Tier 2: Connection Overrides** - For specific CRs needing non-default connections (throttling)

```typescript
/**
 * Promotion profile persisted to .powerapps/promotion-profiles/{name}.json
 */
interface PromotionProfile {
  /** Profile name (e.g., "Dev-to-QA") */
  name: string;

  /** Source environment ID (for reference, not required for promotion) */
  sourceEnvironmentId?: string;

  /** Target environment ID */
  targetEnvironmentId: string;

  /** Tier 1: Custom connector mappings (source ConnectorId → target ConnectorId) */
  connectorMappings: ConnectorMapping[];

  /** Tier 2: Connection overrides for specific CRs (for throttling/noisy flows) */
  connectionOverrides: ConnectionOverride[];

  /** Default connection per connector (auto-selected or user-specified) */
  defaultConnections: DefaultConnection[];

  /** Metadata */
  createdAt: string;
  updatedAt: string;
}

interface ConnectorMapping {
  /** Source ConnectorId (from deployment settings file) */
  sourceConnectorId: string;
  /** Target ConnectorId (from target environment) */
  targetConnectorId: string;
  /** Human-readable name for UI */
  displayName: string;
}

interface ConnectionOverride {
  /** Specific connection reference logical name */
  logicalName: string;
  /** Override connection ID (instead of default) */
  targetConnectionId: string;
  /** Reason for override (e.g., "Throttling - noisy flow") */
  reason?: string;
}

interface DefaultConnection {
  /** Target ConnectorId */
  targetConnectorId: string;
  /** Default ConnectionId to use for this connector */
  targetConnectionId: string;
  /** Connection display name for UI */
  displayName: string;
}
```

### Profile Storage Location

**Default:** `.powerapps/promotion-profiles/{profile-name}.json`
**Configurable:** Via VS Code settings (future enhancement)

**Benefits:**
- In git → shareable with team
- Versioned → track mapping changes
- Per-workspace → different profiles per project

---

## Environment Variables Handling

### Workflow

1. Parse source file → list all environment variables with SchemaName + Value
2. Query target environment for current environment variable values
3. **If SchemaName exists in target:** Pre-populate with target's current value
4. **If new:** Leave blank, highlight as "NEW - needs value"
5. Show side-by-side diff: Source Value | Target Value (editable)
6. User reviews/edits, then applies

### Rationale

- Most env vars already exist in target with correct values
- New env vars need user input (can't auto-guess URLs/keys)
- Inline editing is faster than separate mapping config
- Matches user mental model ("diff and replace with what it used to have")

---

## Requirements

### Functional Requirements
- [x] Load deployment settings from file (source)
- [x] Select target environment
- [x] Query target environment for connections via Power Platform API
- [x] Auto-match standard connectors by ConnectorId
- [x] Flag custom connectors for manual mapping
- [x] Display environment variable diff with target pre-population
- [x] Generate promoted deployment settings file
- [x] Save/load promotion profiles
- [ ] Connection overrides for throttling (v2)

### Non-Functional Requirements
- [ ] Performance: Target queries complete in <5 seconds
- [ ] Security: Use existing authentication, secure credential handling
- [ ] Compatibility: Works with existing deployment settings file format

### Success Criteria
- [ ] User can promote deployment settings in under 2 minutes
- [ ] Standard connectors auto-matched (no manual work)
- [ ] Custom connectors mapped once, saved to profile, reused
- [ ] Clear visibility into what will change before applying

---

## Implementation Slices

### Slice 1: Domain Foundation
**Goal:** Establish domain entities and matching logic

**Domain:**
- `Connection` entity (id, displayName, connectorId, status)
- `ConnectorMatchResult` value object
- `ConnectorMatchingService` domain service

**Tests:**
- Unit tests for connector matching algorithm
- Test auto-match, unmatched source, unmatched target scenarios

**Result:** Core business logic implemented and tested

---

### Slice 2: Infrastructure - Power Platform API
**Goal:** Query target environment for connections

**Infrastructure:**
- `IPowerPlatformConnectionRepository` interface (in domain)
- `PowerPlatformApiConnectionRepository` implementation
- Authentication integration (reuse existing auth service)

**Tests:**
- Integration test with mock HTTP responses
- Test response parsing, error handling

**Result:** Can fetch connections from any environment

---

### Slice 3: Panel Skeleton + File Loading
**Goal:** Basic panel that loads source file

**Presentation:**
- `DeploymentSettingsPromotionPanel` (singleton, NOT environment-scoped)
- Load source file button
- Display parsed CRs and EVs count

**Application:**
- `LoadSourceDeploymentSettingsUseCase` (reuse existing repository)

**Result:** User can open panel and load a deployment settings file

---

### Slice 4: Target Environment Selection + Query
**Goal:** Select target and fetch connections

**Presentation:**
- Target environment dropdown
- Loading state while querying
- Display connection count

**Application:**
- `QueryTargetConnectionsUseCase`

**Result:** User sees target environment connections loaded

---

### Slice 5: Auto-Match + Manual Mapping UI
**Goal:** Show matching results, allow manual mapping for customs

**Presentation:**
- Mapping table: ConnectorId | Status | Connections Available
- Auto-matched rows (green checkmark)
- Unmatched rows (red X) with dropdown to select target connector

**Application:**
- `ResolveConnectorMappingsUseCase`
- `ConnectionReferenceMappingViewModel`

**Result:** User can see matches and manually map custom connectors

---

### Slice 6: Environment Variables Diff
**Goal:** Show env var diff with editable target values

**Presentation:**
- Side-by-side table: SchemaName | Source Value | Target Value (editable)
- Highlight new vars, changed vars, unchanged vars

**Application:**
- `QueryTargetEnvironmentVariablesUseCase`
- `EnvironmentVariableDiffViewModel`

**Result:** User can review and edit environment variable mappings

---

### Slice 7: Generate Output File
**Goal:** Apply mappings and write target file

**Presentation:**
- "Generate File" button
- File save dialog
- Success/warning messages

**Application:**
- `PromoteDeploymentSettingsUseCase`
- Apply connector mappings to CRs
- Apply env var edits

**Result:** User can generate promoted deployment settings file

---

### Slice 8: Profile Save/Load
**Goal:** Persist mappings for reuse

**Presentation:**
- "Save Profile" button
- "Load Profile" dropdown
- Profile name input

**Infrastructure:**
- `IPromotionProfileRepository` interface
- `FileSystemPromotionProfileRepository` implementation

**Result:** User can save mappings and reuse them next time

---

### MVP Scope

**MVP = Slices 1-7** (profiles deferred to v2 if needed)

**v2 Enhancements:**
- Slice 8: Profile save/load
- Connection overrides for throttling
- Batch file processing
- Configurable profile location

---

## Architecture Design

### Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation Layer                                          │
│ - DeploymentSettingsPromotionPanel (singleton)              │
│ - Split layout: Source (left) | Target (right)              │
│ - Custom sections for mapping table, env var diff           │
│ - NO business logic (calls use cases only)                  │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────┐
│ Application Layer                                           │
│ - LoadSourceDeploymentSettingsUseCase                       │
│ - QueryTargetConnectionsUseCase                             │
│ - QueryTargetEnvironmentVariablesUseCase                    │
│ - ResolveConnectorMappingsUseCase                           │
│ - PromoteDeploymentSettingsUseCase                          │
│ - ViewModels (DTOs for presentation)                        │
│ - Mappers (domain → ViewModel)                              │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────┐
│ Domain Layer                                                │
│ - Connection (entity)                                       │
│ - ConnectorMatchResult (value object)                       │
│ - ConnectorMappingService (domain service)                  │
│ - DeploymentSettingsPromotion (domain service)              │
│ - IPowerPlatformConnectionRepository (interface)            │
│ - ZERO external dependencies                                │
└─────────────────────────────────────────────────────────────┘
                          ↑ implements ↑
┌─────────────────────────────────────────────────────────────┐
│ Infrastructure Layer                                        │
│ - PowerPlatformApiConnectionRepository                      │
│ - FileSystemDeploymentSettingsRepository (existing)         │
│ - FileSystemPromotionProfileRepository (Slice 8)            │
└─────────────────────────────────────────────────────────────┘
```

---

## Type Contracts

### Domain Layer

#### Entities

```typescript
/**
 * Connection entity representing a Power Platform connection instance.
 * Retrieved from Power Platform Admin API.
 */
export class Connection {
  private constructor(
    private readonly id: string,
    private readonly displayName: string,
    private readonly connectorId: string,
    private readonly status: ConnectionStatus,
    private readonly createdBy: string
  ) {}

  public static create(
    id: string,
    displayName: string,
    connectorId: string,
    status: ConnectionStatus,
    createdBy: string
  ): Connection {
    return new Connection(id, displayName, connectorId, status, createdBy);
  }

  /** Determines if this connection is active and usable */
  public isActive(): boolean {
    return this.status === 'Connected';
  }

  /** Determines if this connection belongs to the specified connector */
  public belongsToConnector(connectorId: string): boolean {
    return this.connectorId === connectorId;
  }

  // Getters
  public getId(): string { return this.id; }
  public getDisplayName(): string { return this.displayName; }
  public getConnectorId(): string { return this.connectorId; }
  public getStatus(): ConnectionStatus { return this.status; }
  public getCreatedBy(): string { return this.createdBy; }
}

export type ConnectionStatus = 'Connected' | 'Error' | 'Unknown';
```

#### Value Objects

```typescript
/**
 * Result of connector matching algorithm.
 * Immutable value object created by ConnectorMappingService.
 */
export class ConnectorMatchResult {
  private constructor(
    /** ConnectorIds that exist in both source and target */
    private readonly autoMatched: ReadonlyMap<string, readonly Connection[]>,
    /** ConnectorIds in source that don't exist in target (need manual mapping) */
    private readonly unmatchedSource: ReadonlySet<string>,
    /** ConnectorIds in target that don't exist in source (candidates for mapping) */
    private readonly unmatchedTarget: ReadonlyMap<string, readonly Connection[]>
  ) {}

  public static create(
    autoMatched: Map<string, Connection[]>,
    unmatchedSource: Set<string>,
    unmatchedTarget: Map<string, Connection[]>
  ): ConnectorMatchResult {
    return new ConnectorMatchResult(autoMatched, unmatchedSource, unmatchedTarget);
  }

  /** Check if a connector is auto-matched */
  public isAutoMatched(connectorId: string): boolean {
    return this.autoMatched.has(connectorId);
  }

  /** Get connections for an auto-matched connector */
  public getConnectionsForConnector(connectorId: string): readonly Connection[] {
    return this.autoMatched.get(connectorId) ?? [];
  }

  /** Check if there are connectors needing manual mapping */
  public hasUnmatchedConnectors(): boolean {
    return this.unmatchedSource.size > 0;
  }

  /** Get connectors needing manual mapping */
  public getUnmatchedSourceConnectors(): ReadonlySet<string> {
    return this.unmatchedSource;
  }

  /** Get target connectors available for manual mapping */
  public getUnmatchedTargetConnectors(): ReadonlyMap<string, readonly Connection[]> {
    return this.unmatchedTarget;
  }

  /** Get count of auto-matched connectors */
  public getAutoMatchedCount(): number {
    return this.autoMatched.size;
  }

  /** Get count of connectors needing manual mapping */
  public getUnmatchedCount(): number {
    return this.unmatchedSource.size;
  }
}

/**
 * User-provided mapping for a custom connector.
 */
export class ConnectorMapping {
  private constructor(
    private readonly sourceConnectorId: string,
    private readonly targetConnectorId: string,
    private readonly targetConnectionId: string
  ) {}

  public static create(
    sourceConnectorId: string,
    targetConnectorId: string,
    targetConnectionId: string
  ): ConnectorMapping {
    return new ConnectorMapping(sourceConnectorId, targetConnectorId, targetConnectionId);
  }

  public getSourceConnectorId(): string { return this.sourceConnectorId; }
  public getTargetConnectorId(): string { return this.targetConnectorId; }
  public getTargetConnectionId(): string { return this.targetConnectionId; }
}
```

#### Domain Services

```typescript
/**
 * Domain service for matching connectors between source and target.
 * Implements the "compare ConnectorId sets" algorithm.
 */
export class ConnectorMappingService {
  /**
   * Matches connectors from source file against target environment connections.
   *
   * Business Rules:
   * - Standard connectors have identical ConnectorIds across environments → auto-match
   * - Custom connectors have different ConnectorIds → flagged for manual mapping
   * - Unmatched target connectors become candidates for manual mapping
   */
  public matchConnectors(
    sourceConnectorIds: ReadonlySet<string>,
    targetConnections: readonly Connection[]
  ): ConnectorMatchResult {
    // Group target connections by ConnectorId
    const targetByConnectorId = this.groupByConnectorId(targetConnections);
    const targetConnectorIds = new Set(targetByConnectorId.keys());

    // Find auto-matched and unmatched
    const autoMatched = new Map<string, Connection[]>();
    const unmatchedSource = new Set<string>();

    for (const sourceConnectorId of sourceConnectorIds) {
      const targetConns = targetByConnectorId.get(sourceConnectorId);
      if (targetConns !== undefined) {
        autoMatched.set(sourceConnectorId, targetConns);
      } else {
        unmatchedSource.add(sourceConnectorId);
      }
    }

    // Find unmatched target (candidates for manual mapping)
    const unmatchedTarget = new Map<string, Connection[]>();
    for (const [connectorId, connections] of targetByConnectorId) {
      if (!sourceConnectorIds.has(connectorId)) {
        unmatchedTarget.set(connectorId, connections);
      }
    }

    return ConnectorMatchResult.create(autoMatched, unmatchedSource, unmatchedTarget);
  }

  /**
   * Selects the default connection for a connector.
   * Business Rule: Prefer first active connection.
   */
  public selectDefaultConnection(connections: readonly Connection[]): Connection | null {
    const activeConnections = connections.filter(c => c.isActive());
    return activeConnections.length > 0 ? activeConnections[0] : null;
  }

  private groupByConnectorId(connections: readonly Connection[]): Map<string, Connection[]> {
    const grouped = new Map<string, Connection[]>();
    for (const conn of connections) {
      const existing = grouped.get(conn.getConnectorId()) ?? [];
      existing.push(conn);
      grouped.set(conn.getConnectorId(), existing);
    }
    return grouped;
  }
}

/**
 * Domain service for applying promotion to deployment settings.
 */
export class DeploymentSettingsPromotionService {
  /**
   * Applies connector/connection mappings to deployment settings.
   *
   * Business Rules:
   * - For auto-matched connectors: Use target ConnectionId, preserve ConnectorId
   * - For manually-mapped connectors: Use target ConnectionId AND ConnectorId
   * - For unmatched (no mapping): Preserve original values (user fixes manually)
   * - Environment variables: Apply user-edited values
   */
  public applyPromotion(
    sourceSettings: DeploymentSettings,
    matchResult: ConnectorMatchResult,
    manualMappings: readonly ConnectorMapping[],
    environmentVariableEdits: ReadonlyMap<string, string>
  ): DeploymentSettings {
    // Build lookup for manual mappings
    const manualMappingLookup = new Map(
      manualMappings.map(m => [m.getSourceConnectorId(), m])
    );

    // Transform connection references
    const promotedConnectionRefs = sourceSettings.connectionReferences.map(cr => {
      // Check for manual mapping first (custom connectors)
      const manualMapping = manualMappingLookup.get(cr.ConnectorId);
      if (manualMapping) {
        return {
          LogicalName: cr.LogicalName,
          ConnectionId: manualMapping.getTargetConnectionId(),
          ConnectorId: manualMapping.getTargetConnectorId()
        };
      }

      // Check for auto-match (standard connectors)
      if (matchResult.isAutoMatched(cr.ConnectorId)) {
        const connections = matchResult.getConnectionsForConnector(cr.ConnectorId);
        const defaultConn = connections.find(c => c.isActive());
        if (defaultConn) {
          return {
            LogicalName: cr.LogicalName,
            ConnectionId: defaultConn.getId(),
            ConnectorId: cr.ConnectorId  // Same for standard connectors
          };
        }
      }

      // No match - preserve original (user handles manually)
      return cr;
    });

    // Transform environment variables
    const promotedEnvVars = sourceSettings.environmentVariables.map(ev => {
      const editedValue = environmentVariableEdits.get(ev.SchemaName);
      return {
        SchemaName: ev.SchemaName,
        Value: editedValue ?? ev.Value
      };
    });

    // Sort alphabetically
    promotedConnectionRefs.sort((a, b) => a.LogicalName.localeCompare(b.LogicalName));
    promotedEnvVars.sort((a, b) => a.SchemaName.localeCompare(b.SchemaName));

    return new DeploymentSettings(promotedEnvVars, promotedConnectionRefs);
  }
}
```

#### Repository Interfaces

```typescript
/**
 * Repository for fetching connections from Power Platform Admin API.
 * Domain defines contract, infrastructure implements.
 */
export interface IPowerPlatformConnectionRepository {
  /**
   * Retrieves all connections from specified environment.
   * Uses Power Platform Admin API, NOT Dataverse.
   */
  findAll(environmentId: string): Promise<readonly Connection[]>;
}

/**
 * Repository for saving/loading promotion profiles.
 */
export interface IPromotionProfileRepository {
  /** Save profile to file */
  save(profile: PromotionProfile): Promise<void>;

  /** Load profile by name */
  load(profileName: string): Promise<PromotionProfile | null>;

  /** List all available profiles */
  listAll(): Promise<readonly string[]>;

  /** Delete profile */
  delete(profileName: string): Promise<void>;
}
```

### Infrastructure Layer

```typescript
/**
 * Power Platform API implementation of connection repository.
 * Uses the admin API endpoint discovered via Fiddler.
 */
export class PowerPlatformApiConnectionRepository implements IPowerPlatformConnectionRepository {
  constructor(
    private readonly authService: IAuthenticationService,
    private readonly httpClient: IHttpClient,
    private readonly logger: ILogger
  ) {}

  public async findAll(environmentId: string): Promise<readonly Connection[]> {
    this.logger.debug('Fetching connections from Power Platform API', { environmentId });

    const token = await this.authService.getTokenForResource('https://service.powerapps.com/');

    const url = `https://api.powerapps.com/providers/Microsoft.PowerApps/scopes/admin/environments/${environmentId}/connections?api-version=2016-11-01`;

    const response = await this.httpClient.get<PowerPlatformConnectionsResponse>(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    const connections = response.value.map(dto => this.mapToEntity(dto));

    this.logger.debug('Fetched connections', {
      environmentId,
      count: connections.length
    });

    return connections;
  }

  private mapToEntity(dto: PowerPlatformConnectionDto): Connection {
    const status = this.mapStatus(dto.properties.statuses);
    const createdBy = dto.properties.createdBy?.displayName ?? 'Unknown';

    return Connection.create(
      dto.name,
      dto.properties.displayName,
      dto.properties.apiId,
      status,
      createdBy
    );
  }

  private mapStatus(statuses: Array<{ status: string }> | undefined): ConnectionStatus {
    if (!statuses || statuses.length === 0) return 'Unknown';
    const status = statuses[0].status;
    if (status === 'Connected') return 'Connected';
    if (status === 'Error') return 'Error';
    return 'Unknown';
  }
}

// DTOs for Power Platform API response
interface PowerPlatformConnectionsResponse {
  value: PowerPlatformConnectionDto[];
}

interface PowerPlatformConnectionDto {
  name: string;  // ConnectionId
  properties: {
    apiId: string;  // ConnectorId
    displayName: string;
    statuses?: Array<{ status: string }>;
    createdBy?: {
      displayName: string;
      userPrincipalName: string;
    };
  };
}
```

---

## File Structure

```
src/features/deploymentSettingsPromotion/
├── domain/
│   ├── entities/
│   │   └── Connection.ts
│   ├── valueObjects/
│   │   ├── ConnectorMatchResult.ts
│   │   └── ConnectorMapping.ts
│   ├── services/
│   │   ├── ConnectorMappingService.ts
│   │   └── DeploymentSettingsPromotionService.ts
│   └── interfaces/
│       ├── IPowerPlatformConnectionRepository.ts
│       └── IPromotionProfileRepository.ts
│
├── application/
│   ├── useCases/
│   │   ├── LoadSourceDeploymentSettingsUseCase.ts
│   │   ├── QueryTargetConnectionsUseCase.ts
│   │   ├── QueryTargetEnvironmentVariablesUseCase.ts
│   │   ├── ResolveConnectorMappingsUseCase.ts
│   │   └── PromoteDeploymentSettingsUseCase.ts
│   ├── viewModels/
│   │   ├── ConnectionViewModel.ts
│   │   ├── ConnectorMappingViewModel.ts
│   │   ├── EnvironmentVariableDiffViewModel.ts
│   │   └── PromotionSummaryViewModel.ts
│   └── mappers/
│       ├── ConnectionViewModelMapper.ts
│       ├── ConnectorMappingViewModelMapper.ts
│       └── EnvironmentVariableDiffViewModelMapper.ts
│
├── infrastructure/
│   └── repositories/
│       ├── PowerPlatformApiConnectionRepository.ts
│       └── FileSystemPromotionProfileRepository.ts (Slice 8)
│
└── presentation/
    ├── panels/
    │   └── DeploymentSettingsPromotionPanel.ts
    ├── sections/
    │   ├── SourceSettingsSection.ts
    │   ├── ConnectorMappingSection.ts
    │   └── EnvironmentVariableDiffSection.ts
    └── initialization/
        └── initializeDeploymentSettingsPromotion.ts
```

**Estimated file count:** ~25 files

---

## Testing Strategy

### Domain Tests (100% coverage target)

```typescript
describe('ConnectorMappingService', () => {
  describe('matchConnectors', () => {
    it('should auto-match connectors with identical IDs', () => {
      const service = new ConnectorMappingService();
      const sourceConnectorIds = new Set(['/apis/shared_dataverse', '/apis/shared_sharepoint']);
      const targetConnections = [
        Connection.create('conn-1', 'Dataverse', '/apis/shared_dataverse', 'Connected', 'Admin'),
        Connection.create('conn-2', 'SharePoint', '/apis/shared_sharepoint', 'Connected', 'Admin')
      ];

      const result = service.matchConnectors(sourceConnectorIds, targetConnections);

      expect(result.getAutoMatchedCount()).toBe(2);
      expect(result.hasUnmatchedConnectors()).toBe(false);
    });

    it('should flag source connectors not in target as unmatched', () => {
      const service = new ConnectorMappingService();
      const sourceConnectorIds = new Set(['/apis/shared_custom_abc123']);
      const targetConnections = [
        Connection.create('conn-1', 'Custom', '/apis/shared_custom_xyz789', 'Connected', 'Admin')
      ];

      const result = service.matchConnectors(sourceConnectorIds, targetConnections);

      expect(result.getAutoMatchedCount()).toBe(0);
      expect(result.hasUnmatchedConnectors()).toBe(true);
      expect(result.getUnmatchedSourceConnectors().has('/apis/shared_custom_abc123')).toBe(true);
    });

    it('should provide unmatched target connectors as mapping candidates', () => {
      const service = new ConnectorMappingService();
      const sourceConnectorIds = new Set(['/apis/shared_custom_abc123']);
      const targetConnections = [
        Connection.create('conn-1', 'Custom', '/apis/shared_custom_xyz789', 'Connected', 'Admin')
      ];

      const result = service.matchConnectors(sourceConnectorIds, targetConnections);

      const candidates = result.getUnmatchedTargetConnectors();
      expect(candidates.has('/apis/shared_custom_xyz789')).toBe(true);
    });
  });
});
```

### Manual Testing Scenarios

1. **Happy path:** Load file → Select target → See auto-matched → Generate file
2. **Custom connector:** Load file with custom → See unmatched → Map manually → Generate
3. **Environment variables:** Load file → See diff → Edit values → Generate
4. **No connections:** Select target with no connections → See appropriate warning
5. **Mixed scenario:** Some auto-matched, some need mapping → Complete workflow

---

## Extension Integration

### Commands (package.json)

```json
{
  "contributes": {
    "commands": [
      {
        "command": "power-platform-dev-suite.deploymentSettingsPromotion",
        "title": "Power Platform: Promote Deployment Settings"
      }
    ]
  }
}
```

### Activation Events

```json
{
  "activationEvents": [
    "onCommand:power-platform-dev-suite.deploymentSettingsPromotion"
  ]
}
```

---

## Key Architectural Decisions

### Decision 1: Custom Panel (NOT EnvironmentScopedPanel)
**Rationale:** This panel operates across TWO environments (source file + target environment). EnvironmentScopedPanel assumes single environment. Custom singleton is more appropriate.

### Decision 2: Compare ConnectorId Sets Algorithm
**Rationale:** Deterministic, uses data we already have. Standard connectors have identical IDs (auto-match). Custom connectors have different IDs (flag for manual). No fragile name parsing needed.

### Decision 3: Power Platform Admin API for Connections
**Rationale:** Connections are not in Dataverse. The PowerShell module uses `api.powerapps.com` endpoint. We use the same API with existing auth.

### Decision 4: Promotion Profiles in Git
**Rationale:** Saved to `.powerapps/promotion-profiles/` so mappings are version controlled, shareable with team, and persist across machines.

---

## Review & Approval

### Design Phase
- [x] design-architect invoked
- [x] Design review with user
- [x] All questions resolved
- [ ] Human approval of final design

### Implementation Phase
- [ ] Slice 1: Domain foundation
- [ ] Slice 2: Power Platform API
- [ ] Slice 3: Panel + file loading
- [ ] Slice 4: Target environment query
- [ ] Slice 5: Auto-match + manual mapping UI
- [ ] Slice 6: Environment variables diff
- [ ] Slice 7: Generate output file
- [ ] Slice 8: Profile save/load (v2)

### Final Approval
- [ ] All MVP slices implemented
- [ ] Tests passing (`npm test`)
- [ ] Manual testing completed (F5)
- [ ] `/code-review` - code-guardian APPROVED

---

## References

- Power Platform Admin API (discovered via Fiddler)
- Existing panels: Connection References, Environment Variables
- Clean Architecture: `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md`
- Panel patterns: `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md`
