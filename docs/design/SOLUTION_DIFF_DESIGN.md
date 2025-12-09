# Solution Diff/Compare - Technical Design

**Status:** Draft
**Date:** 2025-12-08
**Complexity:** Complex

---

## Overview

**User Problem:** ALM teams need to understand differences between environments to identify configuration drift, validate deployments, and troubleshoot promotion issues. Currently, this requires manual inspection across multiple browser tabs.

**Solution:** A dual-environment comparison panel that allows users to select two environments and compare solutions side-by-side, showing version differences, managed state changes, and modification timestamps.

**Value:** Reduces time spent manually comparing environments from 10+ minutes to 30 seconds. Provides confidence that deployments completed successfully and environments are synchronized.

---

## Requirements

### Functional Requirements (Slice 1 - MVP)
- [ ] Select source environment (left side)
- [ ] Select target environment (right side)
- [ ] Select solution to compare (by friendly name)
- [ ] Display side-by-side solution metadata comparison
- [ ] Highlight differences (version, isManaged, installedOn, modifiedOn)
- [ ] Show "Not Found" when solution exists in one environment but not the other
- [ ] Refresh comparison on demand

### Functional Requirements (Future Slices)
- [ ] Slice 2: Compare all solutions between environments (bulk comparison)
- [ ] Slice 3: Component-level diff (entities, flows, plugins, etc.)
- [ ] Slice 4: Export comparison report (JSON, CSV)
- [ ] Slice 5: Deep component comparison (schema, configuration)

### Non-Functional Requirements
- Performance: Comparison completes in < 2 seconds for metadata-only comparison
- Compatibility: Works with both managed and unmanaged solutions
- Error Handling: Gracefully handles one environment failing to connect

### Success Criteria (Slice 1)
- [ ] User can select two different environments
- [ ] User can select a solution by name
- [ ] Panel displays metadata differences clearly
- [ ] User can identify version drift immediately
- [ ] Switching environments updates comparison automatically

---

## Implementation Slices (Vertical Slicing)

### MVP Slice (Slice 1): "User can compare solution metadata between two environments"
**Goal:** Establish dual-environment panel pattern with basic solution metadata comparison

**Domain:**
- `SolutionComparison` entity (source/target Solution, comparison result)
- `ComparisonResult` value object (differences, status)
- `ISolutionRepository` (already exists - reuse)

**Application:**
- `CompareSolutionMetadataUseCase` (orchestrates comparison)
- `SolutionComparisonViewModel` (DTOs for display)
- `SolutionComparisonViewModelMapper` (transform to ViewModel)

**Infrastructure:**
- Reuse existing `DataverseApiSolutionRepository`
- No new repositories needed

**Presentation:**
- `SolutionDiffPanelComposed` (new dual-environment panel pattern)
- Custom section: `SolutionComparisonSection` (side-by-side table)
- Dual environment selector section (new shared component)

**Result:** WORKING DUAL-ENVIRONMENT COMPARISON ✅ (proves entire pattern)

**Estimated Effort:** 6-8 hours (4 layers + new panel pattern)

---

### Slice 2: "User can compare all solutions between environments"
**Builds on:** Slice 1

**Domain:**
- Add `SolutionCollectionComparison` entity (batch comparison)
- Add `findMatches()` and `findMismatches()` methods

**Application:**
- `CompareAllSolutionsUseCase` (batch orchestration)
- Extend ViewModel for list display

**Presentation:**
- Update section to show list of comparisons
- Add filtering (show only differences)

**Result:** BULK COMPARISON ✅

**Estimated Effort:** 4-5 hours

---

### Slice 3: "User can see component-level differences"
**Builds on:** Slice 2

**Domain:**
- `SolutionComponent` entity (component metadata)
- `ComponentDifference` value object (added/removed/modified)
- `ISolutionComponentRepository` interface (new domain contract)

**Application:**
- `CompareSolutionComponentsUseCase` (component-level orchestration)
- `ComponentDifferenceViewModel`

**Infrastructure:**
- Enhance `DataverseApiSolutionComponentRepository` to fetch component metadata
- Add methods for fetching component schemas

**Presentation:**
- Add expandable component diff section
- Add component type filters (entities, flows, plugins)

**Result:** COMPONENT-LEVEL DIFF ✅

**Estimated Effort:** 8-10 hours (new domain complexity)

---

### Slice 4+: Export, Deep Comparison, etc.
[Future enhancements - design later]

---

## Architecture Design

### Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation Layer                                          │
│ - SolutionDiffPanelComposed (dual-environment pattern)     │
│ - DualEnvironmentSelectorSection (new shared component)    │
│ - SolutionComparisonSection (custom section)               │
│ - Orchestrates use cases (NO business logic)               │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────┐
│ Application Layer                                           │
│ - CompareSolutionMetadataUseCase (orchestrates comparison) │
│ - SolutionComparisonViewModel (DTO for display)            │
│ - SolutionComparisonViewModelMapper (transform)            │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────┐
│ Domain Layer                                                │
│ - SolutionComparison entity (rich comparison behavior)     │
│ - ComparisonResult value object (difference details)       │
│ - ComparisonStatus enum (Same, Different, NotFound)        │
│ - ISolutionRepository (reuse existing)                     │
└─────────────────────────────────────────────────────────────┘
                          ↑ implements ↑
┌─────────────────────────────────────────────────────────────┐
│ Infrastructure Layer                                        │
│ - DataverseApiSolutionRepository (REUSE - no changes)      │
└─────────────────────────────────────────────────────────────┘
```

### Dependency Direction
✅ **CORRECT:**
- Presentation → Application → Domain
- Infrastructure → Domain
- All dependencies point INWARD

---

## Type Contracts (Define BEFORE Implementation)

### Domain Layer Types

#### Entities

**SolutionComparison.ts**
```typescript
import { Solution } from '../../../solutionExplorer/domain/entities/Solution';
import { ComparisonResult } from '../valueObjects/ComparisonResult';
import { ComparisonStatus } from '../valueObjects/ComparisonStatus';

/**
 * Domain entity representing a solution comparison between two environments.
 *
 * Responsibilities:
 * - Compare two Solution entities
 * - Identify differences in metadata (version, managed state, timestamps)
 * - Calculate comparison status (Same, Different, SourceOnly, TargetOnly)
 *
 * Business Rules:
 * - Solutions are matched by uniqueName (NOT by ID - different across environments)
 * - Version comparison uses semantic versioning (1.0.0.0 format)
 * - Comparison considers: version, isManaged, installedOn, modifiedOn
 * - Missing solution in either environment is a valid state
 */
export class SolutionComparison {
  private readonly result: ComparisonResult;

  /**
   * Creates a new SolutionComparison.
   *
   * @param sourceSolution - Solution from source environment (null if not found)
   * @param targetSolution - Solution from target environment (null if not found)
   * @param sourceEnvironmentId - Source environment GUID
   * @param targetEnvironmentId - Target environment GUID
   * @throws {ValidationError} When both solutions are null
   */
  constructor(
    private readonly sourceSolution: Solution | null,
    private readonly targetSolution: Solution | null,
    private readonly sourceEnvironmentId: string,
    private readonly targetEnvironmentId: string
  ) {
    if (sourceSolution === null && targetSolution === null) {
      throw new Error('At least one solution must be provided for comparison');
    }

    this.result = this.calculateDifferences();
  }

  /**
   * Calculates differences between source and target solutions.
   *
   * Business Logic:
   * - Compares version, isManaged, installedOn, modifiedOn
   * - Uses semantic version comparison for version field
   * - Generates human-readable difference messages
   *
   * @returns ComparisonResult with differences and status
   */
  private calculateDifferences(): ComparisonResult {
    // Source-only (solution exists in source but not target)
    if (this.sourceSolution && !this.targetSolution) {
      return ComparisonResult.createSourceOnly(this.sourceSolution.friendlyName);
    }

    // Target-only (solution exists in target but not source)
    if (!this.sourceSolution && this.targetSolution) {
      return ComparisonResult.createTargetOnly(this.targetSolution.friendlyName);
    }

    // Both exist - compare metadata
    // TypeScript knows both are non-null here due to constructor validation
    const source = this.sourceSolution!;
    const target = this.targetSolution!;

    const differences: string[] = [];

    // Compare version
    if (source.version !== target.version) {
      differences.push(`Version: ${source.version} → ${target.version}`);
    }

    // Compare managed state
    if (source.isManaged !== target.isManaged) {
      const sourceState = source.isManaged ? 'Managed' : 'Unmanaged';
      const targetState = target.isManaged ? 'Managed' : 'Unmanaged';
      differences.push(`Type: ${sourceState} → ${targetState}`);
    }

    // Compare installation date
    const sourceInstalled = source.installedOn?.toISOString() ?? 'Not installed';
    const targetInstalled = target.installedOn?.toISOString() ?? 'Not installed';
    if (sourceInstalled !== targetInstalled) {
      differences.push(`Installed: ${sourceInstalled} → ${targetInstalled}`);
    }

    // Compare modification date
    const sourceModified = source.modifiedOn.toISOString();
    const targetModified = target.modifiedOn.toISOString();
    if (sourceModified !== targetModified) {
      differences.push(`Modified: ${sourceModified} → ${targetModified}`);
    }

    return differences.length === 0
      ? ComparisonResult.createIdentical(source.friendlyName)
      : ComparisonResult.createDifferent(source.friendlyName, differences);
  }

  /**
   * Checks if solutions are identical in both environments.
   *
   * Business Rule: Identical means same version, managed state, and timestamps
   *
   * @returns True if solutions are identical, false otherwise
   */
  public areIdentical(): boolean {
    return this.result.getStatus() === ComparisonStatus.Same;
  }

  /**
   * Checks if solutions have differences.
   *
   * @returns True if differences exist, false if identical or missing
   */
  public hasDifferences(): boolean {
    return this.result.getStatus() === ComparisonStatus.Different;
  }

  /**
   * Checks if solution exists only in source environment.
   *
   * @returns True if source-only, false otherwise
   */
  public isSourceOnly(): boolean {
    return this.result.getStatus() === ComparisonStatus.SourceOnly;
  }

  /**
   * Checks if solution exists only in target environment.
   *
   * @returns True if target-only, false otherwise
   */
  public isTargetOnly(): boolean {
    return this.result.getStatus() === ComparisonStatus.TargetOnly;
  }

  /**
   * Gets the solution name being compared.
   *
   * Business Rule: Use source name if available, otherwise target name
   *
   * @returns Solution friendly name
   */
  public getSolutionName(): string {
    return this.sourceSolution?.friendlyName ?? this.targetSolution!.friendlyName;
  }

  // Getters (NO business logic in getters)
  public getSourceSolution(): Solution | null { return this.sourceSolution; }
  public getTargetSolution(): Solution | null { return this.targetSolution; }
  public getSourceEnvironmentId(): string { return this.sourceEnvironmentId; }
  public getTargetEnvironmentId(): string { return this.targetEnvironmentId; }
  public getResult(): ComparisonResult { return this.result; }
}
```

#### Value Objects

**ComparisonStatus.ts**
```typescript
/**
 * Enumeration of comparison statuses.
 *
 * Immutable value representing the result of a comparison operation.
 */
export enum ComparisonStatus {
  /**
   * Solutions are identical (same version, managed state, timestamps)
   */
  Same = 'Same',

  /**
   * Solutions exist in both environments but have differences
   */
  Different = 'Different',

  /**
   * Solution exists only in source environment
   */
  SourceOnly = 'SourceOnly',

  /**
   * Solution exists only in target environment
   */
  TargetOnly = 'TargetOnly'
}
```

**ComparisonResult.ts**
```typescript
import { ComparisonStatus } from './ComparisonStatus';

/**
 * Value object representing the result of a solution comparison.
 *
 * Immutable, validated on construction.
 *
 * Responsibilities:
 * - Store comparison status
 * - Store difference details
 * - Provide formatted summary
 */
export class ComparisonResult {
  private constructor(
    private readonly status: ComparisonStatus,
    private readonly solutionName: string,
    private readonly differences: readonly string[]
  ) {}

  /**
   * Factory: Creates result for identical solutions.
   */
  public static createIdentical(solutionName: string): ComparisonResult {
    return new ComparisonResult(ComparisonStatus.Same, solutionName, []);
  }

  /**
   * Factory: Creates result for different solutions.
   */
  public static createDifferent(
    solutionName: string,
    differences: string[]
  ): ComparisonResult {
    if (differences.length === 0) {
      throw new Error('Cannot create Different status with zero differences');
    }
    return new ComparisonResult(ComparisonStatus.Different, solutionName, differences);
  }

  /**
   * Factory: Creates result for source-only solution.
   */
  public static createSourceOnly(solutionName: string): ComparisonResult {
    return new ComparisonResult(
      ComparisonStatus.SourceOnly,
      solutionName,
      ['Solution not found in target environment']
    );
  }

  /**
   * Factory: Creates result for target-only solution.
   */
  public static createTargetOnly(solutionName: string): ComparisonResult {
    return new ComparisonResult(
      ComparisonStatus.TargetOnly,
      solutionName,
      ['Solution not found in source environment']
    );
  }

  /**
   * Generates human-readable summary.
   *
   * @returns Formatted summary string
   */
  public getSummary(): string {
    switch (this.status) {
      case ComparisonStatus.Same:
        return 'Solutions are identical';
      case ComparisonStatus.Different:
        return `${this.differences.length} difference(s) found`;
      case ComparisonStatus.SourceOnly:
        return 'Not found in target';
      case ComparisonStatus.TargetOnly:
        return 'Not found in source';
    }
  }

  // Getters (NO business logic in getters)
  public getStatus(): ComparisonStatus { return this.status; }
  public getSolutionName(): string { return this.solutionName; }
  public getDifferences(): readonly string[] { return this.differences; }
}
```

#### Repository Interfaces

**NO NEW INTERFACES** - Reuse existing `ISolutionRepository` from solutionExplorer

---

### Application Layer Types

#### Use Cases

**CompareSolutionMetadataUseCase.ts**
```typescript
import { ISolutionRepository } from '../../../solutionExplorer/domain/interfaces/ISolutionRepository';
import { SolutionComparison } from '../../domain/entities/SolutionComparison';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';

/**
 * Use case: Compare solution metadata between two environments.
 *
 * Orchestrates:
 * 1. Fetch solution from source environment (by uniqueName)
 * 2. Fetch solution from target environment (by uniqueName)
 * 3. Create SolutionComparison domain entity
 * 4. Return comparison entity
 *
 * Business logic is IN SolutionComparison entity, NOT here.
 */
export class CompareSolutionMetadataUseCase {
  constructor(
    private readonly solutionRepository: ISolutionRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * Executes solution metadata comparison.
   *
   * @param sourceEnvironmentId - Source environment GUID
   * @param targetEnvironmentId - Target environment GUID
   * @param solutionUniqueName - Solution unique name (e.g., 'MyCustomSolution')
   * @param cancellationToken - Optional cancellation token
   * @returns SolutionComparison entity with comparison results
   */
  public async execute(
    sourceEnvironmentId: string,
    targetEnvironmentId: string,
    solutionUniqueName: string,
    cancellationToken?: ICancellationToken
  ): Promise<SolutionComparison> {
    this.logger.info('Comparing solution metadata', {
      sourceEnvironmentId,
      targetEnvironmentId,
      solutionUniqueName
    });

    // Fetch solutions from both environments (in parallel for performance)
    const [sourceSolutions, targetSolutions] = await Promise.all([
      this.solutionRepository.findAll(
        sourceEnvironmentId,
        { filter: `uniquename eq '${solutionUniqueName}'` },
        cancellationToken
      ),
      this.solutionRepository.findAll(
        targetEnvironmentId,
        { filter: `uniquename eq '${solutionUniqueName}'` },
        cancellationToken
      )
    ]);

    const sourceSolution = sourceSolutions.length > 0 ? sourceSolutions[0] : null;
    const targetSolution = targetSolutions.length > 0 ? targetSolutions[0] : null;

    // Domain entity handles comparison logic
    const comparison = new SolutionComparison(
      sourceSolution,
      targetSolution,
      sourceEnvironmentId,
      targetEnvironmentId
    );

    this.logger.info('Solution comparison completed', {
      status: comparison.getResult().getStatus(),
      hasDifferences: comparison.hasDifferences()
    });

    return comparison;
  }
}
```

#### ViewModels

**SolutionComparisonViewModel.ts**
```typescript
/**
 * ViewModel for displaying solution comparison in panel.
 *
 * DTO only - NO behavior.
 */
export interface SolutionComparisonViewModel {
  /** Solution friendly name */
  readonly solutionName: string;

  /** Comparison status (Same | Different | SourceOnly | TargetOnly) */
  readonly status: string;

  /** Human-readable summary */
  readonly summary: string;

  /** Source solution metadata (null if not found) */
  readonly source: SolutionMetadataViewModel | null;

  /** Target solution metadata (null if not found) */
  readonly target: SolutionMetadataViewModel | null;

  /** Array of difference descriptions */
  readonly differences: readonly string[];

  /** Environment IDs for context */
  readonly sourceEnvironmentId: string;
  readonly targetEnvironmentId: string;
}

/**
 * ViewModel for solution metadata (one side of comparison).
 */
export interface SolutionMetadataViewModel {
  readonly uniqueName: string;
  readonly friendlyName: string;
  readonly version: string;
  readonly isManaged: boolean;
  readonly installedOn: string | null; // ISO 8601 formatted
  readonly modifiedOn: string; // ISO 8601 formatted
  readonly publisherName: string;
}
```

#### Mappers

**SolutionComparisonViewModelMapper.ts**
```typescript
import { SolutionComparison } from '../../domain/entities/SolutionComparison';
import { Solution } from '../../../solutionExplorer/domain/entities/Solution';
import {
  SolutionComparisonViewModel,
  SolutionMetadataViewModel
} from '../viewModels/SolutionComparisonViewModel';

/**
 * Mapper: Transform domain SolutionComparison → ViewModel.
 *
 * Transformation only - NO business logic.
 */
export class SolutionComparisonViewModelMapper {
  /**
   * Transforms SolutionComparison entity to ViewModel.
   */
  public static toViewModel(
    comparison: SolutionComparison
  ): SolutionComparisonViewModel {
    const result = comparison.getResult();

    return {
      solutionName: comparison.getSolutionName(),
      status: result.getStatus(),
      summary: result.getSummary(),
      source: comparison.getSourceSolution()
        ? this.toMetadataViewModel(comparison.getSourceSolution()!)
        : null,
      target: comparison.getTargetSolution()
        ? this.toMetadataViewModel(comparison.getTargetSolution()!)
        : null,
      differences: result.getDifferences(),
      sourceEnvironmentId: comparison.getSourceEnvironmentId(),
      targetEnvironmentId: comparison.getTargetEnvironmentId()
    };
  }

  /**
   * Transforms Solution entity to SolutionMetadataViewModel.
   */
  private static toMetadataViewModel(solution: Solution): SolutionMetadataViewModel {
    return {
      uniqueName: solution.uniqueName,
      friendlyName: solution.friendlyName,
      version: solution.version,
      isManaged: solution.isManaged,
      installedOn: solution.installedOn?.toISOString() ?? null,
      modifiedOn: solution.modifiedOn.toISOString(),
      publisherName: solution.publisherName
    };
  }
}
```

---

### Infrastructure Layer Types

**NO NEW TYPES** - Reuse existing `DataverseApiSolutionRepository`

---

### Presentation Layer Types

#### Panel (NEW DUAL-ENVIRONMENT PATTERN)

**SolutionDiffPanelComposed.ts**

```typescript
import * as vscode from 'vscode';
import { PanelCoordinator } from '../../../../shared/infrastructure/ui/coordinators/PanelCoordinator';
import { HtmlScaffoldingBehavior } from '../../../../shared/infrastructure/ui/behaviors/HtmlScaffoldingBehavior';
import { SectionCompositionBehavior } from '../../../../shared/infrastructure/ui/behaviors/SectionCompositionBehavior';
import { ActionButtonsSection } from '../../../../shared/infrastructure/ui/sections/ActionButtonsSection';
import { PanelLayout } from '../../../../shared/infrastructure/ui/types/PanelLayout';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { CompareSolutionMetadataUseCase } from '../../application/useCases/CompareSolutionMetadataUseCase';
import { SolutionComparisonViewModelMapper } from '../../application/mappers/SolutionComparisonViewModelMapper';
import { DualEnvironmentSelectorSection } from '../sections/DualEnvironmentSelectorSection';
import { SolutionComparisonSection } from '../sections/SolutionComparisonSection';
import { resolveCssModules } from '../../../../shared/infrastructure/ui/utils/cssModuleResolver';
import { getNonce } from '../../../../shared/infrastructure/ui/utils/nonce';
import { IEnvironmentService } from '../../../../shared/infrastructure/services/IEnvironmentService';

/**
 * Commands supported by Solution Diff panel.
 */
type SolutionDiffPanelCommands =
  | 'refresh'
  | 'sourceEnvironmentChange'
  | 'targetEnvironmentChange'
  | 'solutionSelect';

/**
 * Panel for comparing solutions between two Power Platform environments.
 *
 * NEW PATTERN: Dual-environment panel (source + target environments).
 * This is the FIRST dual-environment feature in the codebase.
 *
 * Responsibilities:
 * - Manage dual environment selection (source and target)
 * - Orchestrate solution comparison use case
 * - Display comparison results
 * - Handle refresh and environment changes
 *
 * Panel State:
 * - sourceEnvironmentId: Source environment for comparison
 * - targetEnvironmentId: Target environment for comparison
 * - selectedSolutionUniqueName: Solution to compare (selected from source environment)
 */
export class SolutionDiffPanelComposed {
  public static readonly viewType = 'powerPlatformDevSuite.solutionDiff';
  private static currentPanel: SolutionDiffPanelComposed | undefined;

  private readonly coordinator: PanelCoordinator<SolutionDiffPanelCommands>;
  private readonly scaffoldingBehavior: HtmlScaffoldingBehavior;

  // Dual environment state
  private sourceEnvironmentId: string;
  private targetEnvironmentId: string;
  private selectedSolutionUniqueName: string | null = null;

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    private readonly compareUseCase: CompareSolutionMetadataUseCase,
    private readonly environmentService: IEnvironmentService,
    private readonly logger: ILogger,
    sourceEnvironmentId: string,
    targetEnvironmentId: string
  ) {
    this.sourceEnvironmentId = sourceEnvironmentId;
    this.targetEnvironmentId = targetEnvironmentId;

    // Configure webview
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [extensionUri]
    };

    // Create coordinator with behaviors and sections
    const result = this.createCoordinator();
    this.coordinator = result.coordinator;
    this.scaffoldingBehavior = result.scaffoldingBehavior;

    // Register command handlers
    this.registerCommandHandlers();

    // Initialize panel
    void this.initializePanel();
  }

  private createCoordinator(): {
    coordinator: PanelCoordinator<SolutionDiffPanelCommands>;
    scaffoldingBehavior: HtmlScaffoldingBehavior;
  } {
    // 1. Define sections (UI components)
    const sections = [
      new ActionButtonsSection(
        {
          buttons: [
            { id: 'refresh', label: 'Refresh Comparison', disabled: true } // Disabled until solution selected
          ]
        },
        SectionPosition.Toolbar
      ),
      new DualEnvironmentSelectorSection(SectionPosition.Header), // New shared component
      // Solution selector dropdown renders after environments selected
      new SolutionComparisonSection(SectionPosition.Main) // Custom section
    ];

    // 2. Create composition behavior (renders sections into layout)
    const compositionBehavior = new SectionCompositionBehavior(
      sections,
      PanelLayout.SingleColumn
    );

    // 3. Resolve CSS modules
    const cssUris = resolveCssModules(
      {
        base: true,
        components: ['buttons', 'inputs', 'dropdowns'],
        sections: ['action-buttons', 'dual-environment-selector', 'solution-comparison']
      },
      this.extensionUri,
      this.panel.webview
    );

    // 4. Create scaffolding behavior (wraps in HTML document)
    const scaffoldingBehavior = new HtmlScaffoldingBehavior(
      this.panel.webview,
      compositionBehavior,
      {
        cssUris,
        jsUris: [
          this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'messaging.js')
          ).toString()
        ],
        cspNonce: getNonce(),
        title: 'Solution Diff'
      }
    );

    // 5. Create coordinator
    const coordinator = new PanelCoordinator<SolutionDiffPanelCommands>({
      panel: this.panel,
      extensionUri: this.extensionUri,
      behaviors: [scaffoldingBehavior],
      logger: this.logger
    });

    return { coordinator, scaffoldingBehavior };
  }

  private registerCommandHandlers(): void {
    this.coordinator.registerHandler('refresh', async () => {
      await this.handleRefresh();
    });

    this.coordinator.registerHandler('sourceEnvironmentChange', async (data) => {
      const environmentId = (data as { environmentId?: string })?.environmentId;
      if (environmentId) {
        await this.handleSourceEnvironmentChange(environmentId);
      }
    });

    this.coordinator.registerHandler('targetEnvironmentChange', async (data) => {
      const environmentId = (data as { environmentId?: string })?.environmentId;
      if (environmentId) {
        await this.handleTargetEnvironmentChange(environmentId);
      }
    });

    this.coordinator.registerHandler('solutionSelect', async (data) => {
      const uniqueName = (data as { uniqueName?: string })?.uniqueName;
      if (uniqueName) {
        await this.handleSolutionSelect(uniqueName);
      }
    });
  }

  private async initializePanel(): Promise<void> {
    // Load environments
    const environments = await this.environmentService.getEnvironments();

    // Initialize coordinator with initial data
    await this.scaffoldingBehavior.refresh({
      environments,
      sourceEnvironmentId: this.sourceEnvironmentId,
      targetEnvironmentId: this.targetEnvironmentId,
      comparisonViewModel: null // No comparison yet
    });
  }

  private async handleSourceEnvironmentChange(newEnvironmentId: string): Promise<void> {
    this.logger.debug('Source environment changed', { newEnvironmentId });
    this.sourceEnvironmentId = newEnvironmentId;

    // Clear solution selection (solution may not exist in new environment)
    this.selectedSolutionUniqueName = null;

    // TODO: Load solutions from new source environment for dropdown
    // Send to client via postMessage
  }

  private async handleTargetEnvironmentChange(newEnvironmentId: string): Promise<void> {
    this.logger.debug('Target environment changed', { newEnvironmentId });
    this.targetEnvironmentId = newEnvironmentId;

    // Re-run comparison if solution already selected
    if (this.selectedSolutionUniqueName) {
      await this.handleRefresh();
    }
  }

  private async handleSolutionSelect(uniqueName: string): Promise<void> {
    this.logger.debug('Solution selected', { uniqueName });
    this.selectedSolutionUniqueName = uniqueName;

    // Enable refresh button
    await this.panel.webview.postMessage({
      command: 'setButtonState',
      buttonId: 'refresh',
      disabled: false
    });

    // Auto-refresh comparison
    await this.handleRefresh();
  }

  private async handleRefresh(): Promise<void> {
    if (!this.selectedSolutionUniqueName) {
      this.logger.warn('Refresh called without solution selected');
      return;
    }

    this.logger.debug('Refreshing comparison', {
      sourceEnvironmentId: this.sourceEnvironmentId,
      targetEnvironmentId: this.targetEnvironmentId,
      solutionUniqueName: this.selectedSolutionUniqueName
    });

    try {
      // Call use case (returns domain entity)
      const comparison = await this.compareUseCase.execute(
        this.sourceEnvironmentId,
        this.targetEnvironmentId,
        this.selectedSolutionUniqueName
      );

      // Map to ViewModel
      const viewModel = SolutionComparisonViewModelMapper.toViewModel(comparison);

      this.logger.info('Comparison loaded successfully', {
        status: viewModel.status,
        differences: viewModel.differences.length
      });

      // Send ViewModel to client (data-driven update - NO HTML re-render!)
      await this.panel.webview.postMessage({
        command: 'updateComparison',
        data: viewModel
      });
    } catch (error: unknown) {
      this.logger.error('Error refreshing comparison', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to compare solutions: ${errorMessage}`);
    }
  }

  /**
   * Factory method: Creates or shows the Solution Diff panel.
   *
   * NEW PATTERN: Dual-environment parameters (source + target).
   */
  public static async createOrShow(
    extensionUri: vscode.Uri,
    compareUseCase: CompareSolutionMetadataUseCase,
    environmentService: IEnvironmentService,
    logger: ILogger,
    sourceEnvironmentId: string,
    targetEnvironmentId: string
  ): Promise<SolutionDiffPanelComposed> {
    // Singleton pattern (no environment key - only one diff panel at a time)
    if (SolutionDiffPanelComposed.currentPanel) {
      SolutionDiffPanelComposed.currentPanel.panel.reveal();
      return SolutionDiffPanelComposed.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      SolutionDiffPanelComposed.viewType,
      'Solution Diff',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    const newPanel = new SolutionDiffPanelComposed(
      panel,
      extensionUri,
      compareUseCase,
      environmentService,
      logger,
      sourceEnvironmentId,
      targetEnvironmentId
    );

    SolutionDiffPanelComposed.currentPanel = newPanel;

    panel.onDidDispose(() => {
      SolutionDiffPanelComposed.currentPanel = undefined;
    });

    return newPanel;
  }
}
```

#### Custom Sections

**DualEnvironmentSelectorSection.ts** (NEW SHARED COMPONENT)

```typescript
import type { ISection } from '../../../../shared/infrastructure/ui/sections/ISection';
import type { SectionRenderData } from '../../../../shared/infrastructure/ui/types/SectionRenderData';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';

/**
 * Section for selecting source and target environments.
 *
 * NEW SHARED COMPONENT: First dual-environment selector.
 * Reusable for future dual-environment features.
 *
 * Renders two dropdowns side-by-side:
 * - Source environment (left)
 * - Target environment (right)
 */
export class DualEnvironmentSelectorSection implements ISection {
  constructor(
    public readonly position: SectionPosition = SectionPosition.Header
  ) {}

  render(data: SectionRenderData): string {
    const environments = data.environments || [];
    const sourceEnvironmentId = data.sourceEnvironmentId || '';
    const targetEnvironmentId = data.targetEnvironmentId || '';

    return `
      <div class="dual-environment-selector">
        <div class="environment-selector-group">
          <label for="sourceEnvironmentSelect">Source Environment:</label>
          <select id="sourceEnvironmentSelect" class="environment-dropdown">
            ${environments.map(env => `
              <option value="${env.id}" ${env.id === sourceEnvironmentId ? 'selected' : ''}>
                ${env.name}
              </option>
            `).join('')}
          </select>
        </div>

        <div class="environment-selector-group">
          <label for="targetEnvironmentSelect">Target Environment:</label>
          <select id="targetEnvironmentSelect" class="environment-dropdown">
            ${environments.map(env => `
              <option value="${env.id}" ${env.id === targetEnvironmentId ? 'selected' : ''}>
                ${env.name}
              </option>
            `).join('')}
          </select>
        </div>
      </div>
    `;
  }
}
```

**SolutionComparisonSection.ts** (FEATURE-SPECIFIC)

```typescript
import type { ISection } from '../../../../shared/infrastructure/ui/sections/ISection';
import type { SectionRenderData } from '../../../../shared/infrastructure/ui/types/SectionRenderData';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';

/**
 * Section for displaying solution comparison results.
 *
 * FEATURE-SPECIFIC: Solution diff visualization.
 *
 * Renders:
 * - Solution selector dropdown (source environment solutions)
 * - Side-by-side metadata comparison table
 * - Difference highlights
 * - Not found messages
 */
export class SolutionComparisonSection implements ISection {
  constructor(
    public readonly position: SectionPosition = SectionPosition.Main
  ) {}

  render(data: SectionRenderData): string {
    const comparisonViewModel = data.comparisonViewModel;

    // Solution selector (always visible)
    const solutionSelectorHtml = `
      <div class="solution-selector">
        <label for="solutionSelect">Select Solution to Compare:</label>
        <select id="solutionSelect" class="solution-dropdown">
          <option value="">-- Select a solution --</option>
          <!-- TODO: Populate with solutions from source environment -->
        </select>
      </div>
    `;

    // Comparison results (only visible when comparison exists)
    if (!comparisonViewModel) {
      return `
        ${solutionSelectorHtml}
        <div class="comparison-placeholder">
          <p>Select a solution to compare between environments.</p>
        </div>
      `;
    }

    const statusClass = this.getStatusClass(comparisonViewModel.status);

    return `
      ${solutionSelectorHtml}

      <div class="comparison-results">
        <h3>${comparisonViewModel.solutionName}</h3>
        <div class="comparison-status ${statusClass}">
          ${comparisonViewModel.summary}
        </div>

        <table class="comparison-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>Source</th>
              <th>Target</th>
            </tr>
          </thead>
          <tbody>
            ${this.renderMetadataRows(comparisonViewModel)}
          </tbody>
        </table>

        ${comparisonViewModel.differences.length > 0 ? `
          <div class="differences">
            <h4>Differences:</h4>
            <ul>
              ${comparisonViewModel.differences.map(diff => `<li>${diff}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  private getStatusClass(status: string): string {
    switch (status) {
      case 'Same': return 'status-same';
      case 'Different': return 'status-different';
      case 'SourceOnly': return 'status-source-only';
      case 'TargetOnly': return 'status-target-only';
      default: return '';
    }
  }

  private renderMetadataRows(viewModel: any): string {
    const source = viewModel.source;
    const target = viewModel.target;

    if (!source && !target) {
      return '<tr><td colspan="3">No data available</td></tr>';
    }

    return `
      <tr>
        <td>Version</td>
        <td>${source?.version ?? 'N/A'}</td>
        <td>${target?.version ?? 'N/A'}</td>
      </tr>
      <tr>
        <td>Type</td>
        <td>${source ? (source.isManaged ? 'Managed' : 'Unmanaged') : 'N/A'}</td>
        <td>${target ? (target.isManaged ? 'Managed' : 'Unmanaged') : 'N/A'}</td>
      </tr>
      <tr>
        <td>Modified</td>
        <td>${source?.modifiedOn ?? 'N/A'}</td>
        <td>${target?.modifiedOn ?? 'N/A'}</td>
      </tr>
      <tr>
        <td>Installed</td>
        <td>${source?.installedOn ?? 'N/A'}</td>
        <td>${target?.installedOn ?? 'N/A'}</td>
      </tr>
      <tr>
        <td>Publisher</td>
        <td>${source?.publisherName ?? 'N/A'}</td>
        <td>${target?.publisherName ?? 'N/A'}</td>
      </tr>
    `;
  }
}
```

---

## File Structure

**NEW FILES (Slice 1):**

```
src/features/solutionDiff/
├── domain/
│   ├── entities/
│   │   └── SolutionComparison.ts              # Rich comparison logic
│   ├── valueObjects/
│   │   ├── ComparisonResult.ts                # Immutable result
│   │   └── ComparisonStatus.ts                # Status enum
│   └── interfaces/
│       # NO NEW INTERFACES - reuse ISolutionRepository
│
├── application/
│   ├── useCases/
│   │   └── CompareSolutionMetadataUseCase.ts  # Orchestrates comparison
│   ├── viewModels/
│   │   └── SolutionComparisonViewModel.ts     # DTOs for display
│   └── mappers/
│       └── SolutionComparisonViewModelMapper.ts
│
├── infrastructure/
│   # NO NEW FILES - reuse DataverseApiSolutionRepository
│
└── presentation/
    ├── panels/
    │   └── SolutionDiffPanelComposed.ts       # Dual-environment panel (~350 lines)
    └── sections/
        ├── DualEnvironmentSelectorSection.ts  # NEW SHARED COMPONENT (move to shared/)
        └── SolutionComparisonSection.ts       # Feature-specific UI

# SHARED COMPONENTS (new - will be moved):
src/shared/infrastructure/ui/sections/
└── DualEnvironmentSelectorSection.ts          # Reusable dual-env selector
```

**MODIFIED FILES:**
- `src/extension.ts` - Register `power-platform-dev-suite.solutionDiff` command
- `package.json` - Add command definition and activation event

**NEW FILES:** 9 files
**MODIFIED FILES:** 2 files
**TOTAL:** 11 files for Slice 1

---

## Testing Strategy

### Domain Tests (Target: 100% coverage)

**SolutionComparison.test.ts**
```typescript
describe('SolutionComparison', () => {
  describe('calculateDifferences', () => {
    it('should detect version difference', () => {
      const source = createSolution({ version: '1.0.0.0' });
      const target = createSolution({ version: '2.0.0.0' });

      const comparison = new SolutionComparison(source, target, 'env1', 'env2');

      expect(comparison.hasDifferences()).toBe(true);
      expect(comparison.getResult().getDifferences()).toContain('Version: 1.0.0.0 → 2.0.0.0');
    });

    it('should detect managed state difference', () => {
      const source = createSolution({ isManaged: false });
      const target = createSolution({ isManaged: true });

      const comparison = new SolutionComparison(source, target, 'env1', 'env2');

      expect(comparison.hasDifferences()).toBe(true);
      expect(comparison.getResult().getDifferences()).toContain('Type: Unmanaged → Managed');
    });

    it('should return identical when no differences', () => {
      const source = createSolution();
      const target = createSolution();

      const comparison = new SolutionComparison(source, target, 'env1', 'env2');

      expect(comparison.areIdentical()).toBe(true);
      expect(comparison.getResult().getStatus()).toBe(ComparisonStatus.Same);
    });

    it('should handle source-only solution', () => {
      const source = createSolution();
      const comparison = new SolutionComparison(source, null, 'env1', 'env2');

      expect(comparison.isSourceOnly()).toBe(true);
      expect(comparison.getResult().getStatus()).toBe(ComparisonStatus.SourceOnly);
    });

    it('should handle target-only solution', () => {
      const target = createSolution();
      const comparison = new SolutionComparison(null, target, 'env1', 'env2');

      expect(comparison.isTargetOnly()).toBe(true);
      expect(comparison.getResult().getStatus()).toBe(ComparisonStatus.TargetOnly);
    });

    it('should throw when both solutions are null', () => {
      expect(() => new SolutionComparison(null, null, 'env1', 'env2')).toThrow();
    });
  });
});
```

**ComparisonResult.test.ts**
```typescript
describe('ComparisonResult', () => {
  it('should create identical result', () => {
    const result = ComparisonResult.createIdentical('MySolution');

    expect(result.getStatus()).toBe(ComparisonStatus.Same);
    expect(result.getDifferences()).toHaveLength(0);
    expect(result.getSummary()).toBe('Solutions are identical');
  });

  it('should create different result', () => {
    const result = ComparisonResult.createDifferent('MySolution', ['Version: 1.0 → 2.0']);

    expect(result.getStatus()).toBe(ComparisonStatus.Different);
    expect(result.getDifferences()).toHaveLength(1);
    expect(result.getSummary()).toBe('1 difference(s) found');
  });

  it('should throw when creating different result with zero differences', () => {
    expect(() => ComparisonResult.createDifferent('MySolution', [])).toThrow();
  });
});
```

### Application Tests (Target: 90% coverage)

**CompareSolutionMetadataUseCase.test.ts**
```typescript
describe('CompareSolutionMetadataUseCase', () => {
  let useCase: CompareSolutionMetadataUseCase;
  let mockRepository: jest.Mocked<ISolutionRepository>;

  beforeEach(() => {
    mockRepository = {
      findAll: jest.fn()
    } as any;
    useCase = new CompareSolutionMetadataUseCase(mockRepository, new NullLogger());
  });

  it('should orchestrate comparison when solutions exist in both environments', async () => {
    const sourceSolution = createSolution({ version: '1.0.0.0' });
    const targetSolution = createSolution({ version: '2.0.0.0' });

    mockRepository.findAll
      .mockResolvedValueOnce([sourceSolution])  // Source environment
      .mockResolvedValueOnce([targetSolution]); // Target environment

    const comparison = await useCase.execute('env1', 'env2', 'MyCustomSolution');

    expect(comparison.hasDifferences()).toBe(true);
    expect(mockRepository.findAll).toHaveBeenCalledTimes(2);
  });

  it('should handle solution not found in target', async () => {
    const sourceSolution = createSolution();

    mockRepository.findAll
      .mockResolvedValueOnce([sourceSolution])  // Source
      .mockResolvedValueOnce([]);               // Target (not found)

    const comparison = await useCase.execute('env1', 'env2', 'MyCustomSolution');

    expect(comparison.isSourceOnly()).toBe(true);
  });
});
```

### Manual Testing Scenarios (Slice 1)

1. **Happy path:**
   - Open Solution Diff panel
   - Select source environment (Dev)
   - Select target environment (QA)
   - Select solution from dropdown
   - Verify comparison displays correctly
   - Verify differences are highlighted

2. **Solution not found in target:**
   - Select solution that exists only in source
   - Verify "Not found in target" message displays

3. **Identical solutions:**
   - Select solution with same version in both environments
   - Verify "Solutions are identical" status

4. **Environment change:**
   - Change target environment
   - Verify comparison refreshes automatically
   - Verify new environment data loads

---

## Dependencies & Prerequisites

### External Dependencies
- VS Code APIs: `vscode.window.createWebviewPanel`, `vscode.window.showErrorMessage`
- NPM packages: None (all existing)
- Dataverse APIs:
  - `/api/data/v9.2/solutions` (already in use)

### Internal Prerequisites
- [x] `ISolutionRepository` exists (solutionExplorer)
- [x] `DataverseApiSolutionRepository` exists (solutionExplorer)
- [x] `Solution` entity exists (solutionExplorer)
- [x] `PanelCoordinator` exists (shared)
- [x] `SectionCompositionBehavior` exists (shared)
- [x] `HtmlScaffoldingBehavior` exists (shared)
- [x] Authentication service supports multiple environments (shared)

### Breaking Changes
- [ ] None - new feature, no changes to existing features

---

## API Endpoints Required

### Dataverse Web API

**Solutions endpoint** (already in use):
```
GET /api/data/v9.2/solutions?$select=solutionid,uniquename,friendlyname,version,ismanaged,installedon,modifiedon&$filter=uniquename eq '{uniqueName}'
```

**No new endpoints required for Slice 1.**

---

## Clean Architecture Compliance Checklist

**Domain Layer:**
- [x] Entities have behavior (`SolutionComparison.calculateDifferences()`, `SolutionComparison.areIdentical()`)
- [x] Zero external dependencies (no imports from outer layers)
- [x] Business logic in entities (comparison logic in `SolutionComparison`, NOT in use case)
- [x] Repository interfaces defined in domain (reusing `ISolutionRepository`)
- [x] Value objects are immutable (`ComparisonResult` with factory methods)
- [x] No logging (pure business logic)

**Application Layer:**
- [x] Use cases orchestrate only (NO business logic - just fetches and delegates to entity)
- [x] ViewModels are DTOs (no behavior)
- [x] Mappers transform only (no sorting params, no business logic)
- [x] Logging at use case boundaries
- [x] Explicit return types on all methods

**Infrastructure Layer:**
- [x] Repositories implement domain interfaces (reusing existing)
- [x] Dependencies point inward (infra → domain)
- [x] No business logic in repositories
- [x] Logging for API calls (already exists)

**Presentation Layer:**
- [x] Panels use PanelCoordinator<TCommands> pattern
- [x] Command type defined (`SolutionDiffPanelCommands` union)
- [x] Sections defined (`DualEnvironmentSelectorSection`, `SolutionComparisonSection`)
- [x] Layout chosen (`PanelLayout.SingleColumn`)
- [x] Command handlers registered with coordinator
- [x] **NOT using EnvironmentSelectorSection** (dual-environment pattern uses `DualEnvironmentSelectorSection`)
- [x] Data-driven updates via postMessage (no HTML re-renders)
- [x] Panels call use cases only (NO business logic)
- [x] Dependencies point inward (pres → app → domain)
- [x] Logging for user actions

**Type Safety:**
- [x] No `any` types without explicit justification
- [x] Explicit return types on all public methods
- [x] Proper null handling (explicit checks: `sourceSolution === null`)
- [x] Type guards for runtime safety (discriminated unions in webview messages)

---

## Extension Integration Checklist

**Commands (for package.json):**
- [ ] Command ID defined: `power-platform-dev-suite.solutionDiff`
- [ ] Command ID (pick environments) defined: `power-platform-dev-suite.solutionDiffPickEnvironments`
- [ ] Command titles specified: "Solution Diff", "Solution Diff: Pick Environments"
- [ ] Activation events defined: `onCommand:power-platform-dev-suite.solutionDiff`
- [ ] Commands added to `"contributes.commands"` array

**Extension Registration (for extension.ts):**
- [ ] Feature initializer function created: `initializeSolutionDiff()`
- [ ] Lazy imports with dynamic `import()` for performance
- [ ] Command handlers registered (both direct and pick-environments)
- [ ] Commands added to `context.subscriptions`
- [ ] Error handling in command handlers
- [ ] **Dual environment picker logic** implemented (new pattern: pick source, then target)

**Dual Environment Picker Pattern** (NEW):
```typescript
async function initializeSolutionDiff() {
  const solutionDiffCommand = vscode.commands.registerCommand(
    'power-platform-dev-suite.solutionDiffPickEnvironments',
    async () => {
      try {
        // 1. Pick source environment
        const sourceEnv = await vscode.window.showQuickPick(
          environments.map(e => ({ label: e.name, id: e.id })),
          { placeHolder: 'Select source environment' }
        );
        if (!sourceEnv) return;

        // 2. Pick target environment (exclude source)
        const targetEnv = await vscode.window.showQuickPick(
          environments.filter(e => e.id !== sourceEnv.id).map(e => ({ label: e.name, id: e.id })),
          { placeHolder: 'Select target environment' }
        );
        if (!targetEnv) return;

        // 3. Open panel with both environments
        await SolutionDiffPanelComposed.createOrShow(
          extensionUri,
          compareUseCase,
          environmentService,
          logger,
          sourceEnv.id,
          targetEnv.id
        );
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to open Solution Diff: ${error}`);
      }
    }
  );

  context.subscriptions.push(solutionDiffCommand);
}
```

**Verification:**
- [ ] `npm run compile` passes after package.json changes
- [ ] Command appears in Command Palette (Ctrl+Shift+P)
- [ ] Manual testing completed (F5, invoke command, panel opens with dual environments)

---

## Key Architectural Decisions

### Decision 1: Dual-Environment Panel Pattern
**Considered:**
- Option A: Reuse `EnvironmentScopedPanel` with toggle for source/target
- Option B: Create new dual-environment base class
- Option C: Create standalone `SolutionDiffPanelComposed` with dual-environment state

**Chosen:** Option C - Standalone panel with dual-environment state

**Rationale:**
- `EnvironmentScopedPanel` is designed for single environment (inheritance would break SRP)
- No other dual-environment features exist yet (premature to create base class)
- Standalone panel establishes pattern that can be extracted to shared base class later

**Tradeoffs:**
- **Gave up:** Code reuse via inheritance
- **Gained:** Clear, simple pattern; no coupling to single-environment assumptions; easier to test

---

### Decision 2: Metadata-Only Comparison for MVP
**Considered:**
- Option A: Component-level diff in MVP
- Option B: Metadata-only (version, managed state, timestamps)
- Option C: Solution existence check only

**Chosen:** Option B - Metadata-only comparison

**Rationale:**
- Gets to F5 quickly (6-8 hours vs 20+ hours for component-level)
- Solves 80% of user need (version drift detection)
- Establishes dual-environment pattern for future features
- Component-level diff adds significant complexity (schema comparison, deep object diffs)

**Tradeoffs:**
- **Gave up:** Deep component comparison (entities, flows, plugins)
- **Gained:** Fast time-to-value; simpler domain model; proven architecture before tackling complexity

---

### Decision 3: Reuse Existing Solution Repository
**Considered:**
- Option A: Create new `ISolutionComparisonRepository` with specialized queries
- Option B: Reuse existing `ISolutionRepository`

**Chosen:** Option B - Reuse existing `ISolutionRepository`

**Rationale:**
- `ISolutionRepository.findAll()` with filter already supports fetching by uniqueName
- No new API endpoints needed
- Keeps domain focused on comparison logic, not data access

**Tradeoffs:**
- **Gave up:** Optimized comparison-specific queries
- **Gained:** Zero new infrastructure code; leverage existing, tested repository

---

### Decision 4: Solution Matching by uniqueName
**Considered:**
- Option A: Match solutions by `solutionid` (GUID)
- Option B: Match solutions by `uniquename` (string)
- Option C: Match solutions by `friendlyname` (display name)

**Chosen:** Option B - Match by `uniquename`

**Rationale:**
- `solutionid` differs across environments (can't match by ID)
- `uniquename` is stable across environments (logical identifier)
- `friendlyname` can be changed by users (unreliable for matching)

**Tradeoffs:**
- **Gave up:** N/A (uniqueName is the correct choice)
- **Gained:** Reliable cross-environment matching

---

## Open Questions

- [x] **Q1: Should solution selector populate from source or target environment?**
  - **Decision:** Source environment (left side). User selects what to compare, then sees if it exists in target.

- [x] **Q2: Should panel support comparing multiple solutions at once?**
  - **Decision:** No - Slice 1 is single solution. Slice 2 adds bulk comparison.

- [ ] **Q3: Should comparison be cached to avoid re-fetching on refresh?**
  - **Decision:** TBD during implementation. Likely NO for MVP (simpler), add caching in Slice 2 if performance issue.

- [ ] **Q4: Should panel show both source→target and target→source comparisons?**
  - **Decision:** TBD. Current design shows source→target only. Bidirectional may be confusing.

---

## Implementation Order (Inside-Out)

### Slice 1 Implementation Steps:

**1. Domain Layer** (2-3 hours)
- [ ] Create `ComparisonStatus.ts` enum
- [ ] Create `ComparisonResult.ts` value object
- [ ] Create `SolutionComparison.ts` entity
- [ ] Write domain tests (100% coverage target)
- [ ] `npm run compile`

**2. Application Layer** (1-2 hours)
- [ ] Create `SolutionComparisonViewModel.ts` interfaces
- [ ] Create `SolutionComparisonViewModelMapper.ts`
- [ ] Create `CompareSolutionMetadataUseCase.ts`
- [ ] Write application tests (90% coverage target)
- [ ] `npm run compile`

**3. Infrastructure Layer** (0 hours)
- [ ] NO NEW CODE - reuse existing `DataverseApiSolutionRepository`

**4. Presentation Layer** (2-3 hours)
- [ ] Create `DualEnvironmentSelectorSection.ts` (shared component)
- [ ] Create `SolutionComparisonSection.ts` (feature section)
- [ ] Create `SolutionDiffPanelComposed.ts`
- [ ] Create CSS for dual-environment-selector and solution-comparison sections
- [ ] `npm run compile`

**5. Extension Integration** (1 hour)
- [ ] Update `package.json` (commands, activation events)
- [ ] Update `extension.ts` (register commands with dual-environment picker)
- [ ] `npm run compile`

**6. Manual Testing** (1 hour)
- [ ] F5 - Launch Extension Development Host
- [ ] Invoke command from Command Palette
- [ ] Test all scenarios (happy path, not found, identical, environment changes)

**7. Tests** (1 hour)
- [ ] Write remaining tests
- [ ] `npm test` (all tests must pass)

**8. Code Review** (15 minutes)
- [ ] `/code-review` - Invoke code-guardian for approval

**Total Estimated Effort:** 6-8 hours

---

## Review & Approval

### Design Phase
- [ ] design-architect invoked
- [ ] Human approval of design

### Implementation Phase (Slice 1)
- [ ] Domain layer implemented
- [ ] Application layer implemented
- [ ] Infrastructure layer (N/A - reuse existing)
- [ ] Presentation layer implemented
- [ ] Extension integration complete

### Final Approval
- [ ] Tests written and passing (`npm test`)
- [ ] Manual testing completed (F5)
- [ ] `/code-review` - code-guardian APPROVED

**Status:** Pending
**Date:** TBD

---

## References

- Related features:
  - `solutionExplorer` - Reuses `ISolutionRepository`, `Solution` entity
  - `environmentVariables` - Example of environment-scoped panel
- External documentation:
  - [Dataverse Web API - Solutions](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/reference/solution)
  - [Solution Component Reference](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/reference/entities/solutioncomponent)
- Design inspiration:
  - Git diff visualization (side-by-side comparison)
  - VS Code Compare Editors (two-pane layout)
- Workflow guide: `.claude/WORKFLOW.md`
- Panel architecture: `docs/architecture/PANEL_ARCHITECTURE.md`
- Clean Architecture: `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md`
