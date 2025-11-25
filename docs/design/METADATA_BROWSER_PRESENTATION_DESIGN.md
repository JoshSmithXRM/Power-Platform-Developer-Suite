# Metadata Browser - Presentation Layer Technical Design

**Feature:** Metadata Browser MVP (Tab-Based Layout)
**Design Type:** Presentation Layer Architecture
**Status:** Design Phase

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Overview](#architecture-overview)
3. [Panel Architecture](#panel-architecture)
4. [ViewModel Specifications](#viewmodel-specifications)
5. [Use Case Specifications](#use-case-specifications)
6. [Mapper Specifications](#mapper-specifications)
7. [Type Contracts](#type-contracts)
8. [Message Protocol](#message-protocol)
9. [State Management](#state-management)
10. [Component Interaction](#component-interaction)
11. [Implementation Order](#implementation-order)

---

## Overview

### Business Value

The Metadata Browser provides power users (developers and administrators) with a comprehensive interface for exploring Dataverse metadata. This presentation layer design focuses on delivering a responsive, keyboard-friendly experience that enables quick navigation between entities, inspection of attributes/relationships/keys, and seamless integration with Power Apps Maker portal.

### Target Users

- **Developers** - Need to inspect entity schemas, understand relationships, and validate metadata configurations
- **Administrators** - Need to audit entity structures, review security settings, and understand data models
- **Power Users** - Need quick access to technical metadata details during development workflows

### Scope

This design covers the **presentation layer only**:
- Panel structure and lifecycle
- ViewModels (application layer DTOs)
- Use cases (orchestration logic)
- Mappers (domain → ViewModel transformation)
- Message protocol (extension ↔ webview)
- State management (workspace persistence)

**Out of Scope:**
- Domain layer (already exists: EntityMetadata, AttributeMetadata, etc.)
- Infrastructure layer (repository implementation exists)
- Webview UI implementation (HTML/CSS/JavaScript)

---

## Architecture Overview

### High-Level Component Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    VS Code Extension Host                         │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ MetadataBrowserPanel (Presentation)                        │  │
│  │                                                             │  │
│  │  • PanelCoordinator<MetadataBrowserCommands>              │  │
│  │  • Command handlers (type-safe)                            │  │
│  │  • State management (VSCodePanelStateRepository)          │  │
│  │  • Message routing                                         │  │
│  └─────────────┬────────────────────────────────────┬─────────┘  │
│                │                                     │             │
│       ┌────────▼──────────┐              ┌─────────▼──────────┐  │
│       │   Use Cases       │              │     Mappers        │  │
│       │ (Orchestration)   │              │ (Transformation)   │  │
│       │                   │              │                    │  │
│       │ • LoadMetadata*   │              │ • EntityTreeItem   │  │
│       │ • NavigateTo*     │              │ • AttributeRow     │  │
│       │ • OpenInMaker     │              │ • RelationshipRow  │  │
│       │ • Refresh         │              │ • KeyRow           │  │
│       └────────┬──────────┘              │ • PrivilegeRow     │  │
│                │                          │ • ChoiceValueRow   │  │
│       ┌────────▼──────────┐              │ • DetailPanel      │  │
│       │   Domain Layer    │              └────────────────────┘  │
│       │                   │                                       │
│       │ • EntityMetadata  │                                       │
│       │ • AttributeMetadata│                                      │
│       │ • Relationships   │                                       │
│       │ • EntityKey       │                                       │
│       └───────────────────┘                                       │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
                            │ postMessage
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                        Webview (Client)                           │
│                                                                    │
│  ┌──────────┬──────────────────────────────────┬──────────────┐  │
│  │   Tree   │     Center Panel (Tabs)         │ Detail Panel │  │
│  │          │                                  │ (Resizable)  │  │
│  │ Entities │  [Attributes][Keys][Rels][Privs] │              │  │
│  │ Choices  │                                  │  Properties  │  │
│  │          │  DataTableSection renders        │  Raw Data    │  │
│  └──────────┴──────────────────────────────────┴──────────────┘  │
│                                                                    │
│  Client-side behaviors:                                           │
│  • Tree filtering (CSS-based, no server roundtrip)               │
│  • Table sorting/searching (DataTableBehavior.js)                │
│  • Detail panel open/close (SplitPanelBehavior.js)              │
│  • Tab switching (maintains selection, sends state updates)      │
└──────────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Responsibilities | NOT Responsible For |
|-------|------------------|---------------------|
| **Presentation Panel** | • Panel lifecycle (singleton)<br>• Command registration<br>• State persistence<br>• Message routing<br>• Error display (VS Code notifications) | • Business logic<br>• Data transformation<br>• HTML generation (sections handle this) |
| **Use Cases** | • Orchestrate domain + repositories<br>• Coordinate multiple operations<br>• Call mappers<br>• Return ViewModels | • Business logic<br>• Validation rules<br>• Data formatting |
| **Mappers** | • Transform domain → ViewModel<br>• Format dates/numbers<br>• Calculate display values | • Business decisions<br>• Validation<br>• Orchestration |
| **Domain** | • Business logic<br>• Validation rules<br>• Entity behavior | • Data fetching<br>• Presentation formatting<br>• Infrastructure concerns |

---

## Panel Architecture

### MetadataBrowserPanel Class

```typescript
/**
 * Commands supported by Metadata Browser panel.
 * Type-safe command registration with PanelCoordinator.
 */
type MetadataBrowserCommands =
  | 'refresh'
  | 'openMaker'
  | 'environmentChange'
  | 'selectEntity'
  | 'selectChoice'
  | 'navigateToEntity'
  | 'navigateToEntityQuickPick'
  | 'openDetailPanel'
  | 'closeDetailPanel'
  | 'tabChange';

/**
 * Metadata Browser panel using PanelCoordinator architecture.
 *
 * Features:
 * - Three-panel layout: Tree (left), Tables (center), Detail (right)
 * - Tab-based metadata views (Attributes, Keys, Relationships, Privileges, Choice Values)
 * - Resizable detail panel with state persistence
 * - Environment-scoped metadata exploration
 * - Integration with Power Apps Maker portal
 *
 * Architecture:
 * - Uses PanelCoordinator for type-safe command handling
 * - Sections define UI (no HTML in panel class)
 * - Data-driven updates via postMessage (no full HTML re-renders)
 * - Workspace state persistence for user preferences
 */
export class MetadataBrowserPanel {
  public static readonly viewType = 'powerPlatformDevSuite.metadataBrowser';
  private static panels = new Map<string, MetadataBrowserPanel>();

  private readonly coordinator: PanelCoordinator<MetadataBrowserCommands>;
  private readonly scaffoldingBehavior: HtmlScaffoldingBehavior;
  private readonly stateRepository: VSCodePanelStateRepository;

  // Current state
  private currentEnvironmentId: string;
  private currentSelectionType: 'entity' | 'choice' | null = null;
  private currentSelectionId: string | null = null;
  private currentTab: MetadataTab = 'attributes';

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
    private readonly getEnvironmentById: (envId: string) => Promise<Environment | null>,
    // Use cases (injected)
    private readonly loadMetadataTreeUseCase: LoadMetadataTreeUseCase,
    private readonly loadEntityMetadataUseCase: LoadEntityMetadataUseCase,
    private readonly loadChoiceMetadataUseCase: LoadChoiceMetadataUseCase,
    private readonly openInMakerUseCase: OpenInMakerUseCase,
    private readonly logger: ILogger,
    environmentId: string
  ) {
    this.currentEnvironmentId = environmentId;
    this.stateRepository = new VSCodePanelStateRepository(
      context.workspaceState,
      logger
    );

    logger.debug('MetadataBrowserPanel: Initializing');

    // Configure webview
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [extensionUri]
    };

    // Create coordinator with sections
    const result = this.createCoordinator();
    this.coordinator = result.coordinator;
    this.scaffoldingBehavior = result.scaffoldingBehavior;

    // Register command handlers
    this.registerCommandHandlers();

    // Load persisted state and initialize
    void this.initializeWithPersistedState();
  }

  /**
   * Factory method implementing singleton pattern per environment.
   * Each environment gets its own panel instance to maintain independent state.
   */
  public static async createOrShow(
    extensionUri: vscode.Uri,
    getEnvironments: () => Promise<EnvironmentOption[]>,
    getEnvironmentById: (envId: string) => Promise<Environment | null>,
    useCases: {
      loadMetadataTreeUseCase: LoadMetadataTreeUseCase;
      loadEntityMetadataUseCase: LoadEntityMetadataUseCase;
      loadChoiceMetadataUseCase: LoadChoiceMetadataUseCase;
      openInMakerUseCase: OpenInMakerUseCase;
    },
    logger: ILogger,
    initialEnvironmentId?: string
  ): Promise<MetadataBrowserPanel> {
    const column = vscode.ViewColumn.One;

    // Determine target environment
    let targetEnvironmentId = initialEnvironmentId;
    if (!targetEnvironmentId) {
      const environments = await getEnvironments();
      targetEnvironmentId = environments[0]?.id;
    }

    if (!targetEnvironmentId) {
      throw new Error('No environments available');
    }

    // Check if panel already exists for this environment
    const existingPanel = MetadataBrowserPanel.panels.get(targetEnvironmentId);
    if (existingPanel) {
      existingPanel.panel.reveal(column);
      return existingPanel;
    }

    const environment = await getEnvironmentById(targetEnvironmentId);
    const environmentName = environment?.getName().getValue() || 'Unknown';

    const panel = vscode.window.createWebviewPanel(
      MetadataBrowserPanel.viewType,
      `Metadata - ${environmentName}`,
      column,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
        retainContextWhenHidden: true
      }
    );

    const newPanel = new MetadataBrowserPanel(
      panel,
      extensionUri,
      getEnvironments,
      getEnvironmentById,
      useCases.loadMetadataTreeUseCase,
      useCases.loadEntityMetadataUseCase,
      useCases.loadChoiceMetadataUseCase,
      useCases.openInMakerUseCase,
      logger,
      targetEnvironmentId
    );

    MetadataBrowserPanel.panels.set(targetEnvironmentId, newPanel);

    const envId = targetEnvironmentId; // Capture for closure
    panel.onDidDispose(() => {
      MetadataBrowserPanel.panels.delete(envId);
    });

    return newPanel;
  }

  /**
   * Creates PanelCoordinator with section composition.
   * Sections are composed into SingleColumn layout (tree + tables + detail).
   */
  private createCoordinator(): {
    coordinator: PanelCoordinator<MetadataBrowserCommands>;
    scaffoldingBehavior: HtmlScaffoldingBehavior;
  } {
    // Define sections (UI components)
    const sections = [
      // Toolbar buttons
      new ActionButtonsSection({
        buttons: [
          { id: 'openMaker', label: 'Open in Maker' },
          { id: 'refresh', label: 'Refresh', disabled: true }
        ]
      }, SectionPosition.Toolbar),

      // Environment selector
      new EnvironmentSelectorSection(),

      // Custom section: Three-panel layout with tree, tabs, and detail
      new MetadataBrowserLayoutSection()
    ];

    // Compose sections into layout
    const compositionBehavior = new SectionCompositionBehavior(
      sections,
      PanelLayout.SingleColumn
    );

    // Resolve CSS modules
    const cssUris = resolveCssModules(
      {
        base: true,
        components: ['buttons', 'inputs', 'split-panel', 'tabs'],
        sections: ['environment-selector', 'action-buttons', 'datatable']
      },
      this.extensionUri,
      this.panel.webview
    );

    // Add feature-specific CSS
    const featureCssUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extensionUri,
        'resources',
        'webview',
        'css',
        'features',
        'metadata-browser.css'
      )
    ).toString();

    // Create scaffolding behavior (wraps in HTML document)
    const scaffoldingBehavior = new HtmlScaffoldingBehavior(
      this.panel.webview,
      compositionBehavior,
      {
        cssUris: [...cssUris, featureCssUri],
        jsUris: [
          this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'messaging.js')
          ).toString(),
          this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'TableRenderer.js')
          ).toString(),
          this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'DataTableBehavior.js')
          ).toString(),
          this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'SplitPanelBehavior.js')
          ).toString(),
          this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'MetadataBrowserBehavior.js')
          ).toString()
        ],
        cspNonce: getNonce(),
        title: 'Metadata Browser'
      }
    );

    // Create coordinator
    const coordinator = new PanelCoordinator<MetadataBrowserCommands>({
      panel: this.panel,
      extensionUri: this.extensionUri,
      behaviors: [scaffoldingBehavior],
      logger: this.logger
    });

    return { coordinator, scaffoldingBehavior };
  }

  /**
   * Registers type-safe command handlers.
   * PanelCoordinator automatically manages button loading states.
   */
  private registerCommandHandlers(): void {
    // Refresh current selection
    this.coordinator.registerHandler('refresh', async () => {
      await this.handleRefresh();
    });

    // Open in Maker portal
    this.coordinator.registerHandler('openMaker', async () => {
      await this.handleOpenMaker();
    });

    // Environment change
    this.coordinator.registerHandler('environmentChange', async (data) => {
      const environmentId = (data as { environmentId?: string })?.environmentId;
      if (environmentId) {
        await this.handleEnvironmentChange(environmentId);
      }
    });

    // Entity selection
    this.coordinator.registerHandler('selectEntity', async (data) => {
      const logicalName = (data as { logicalName?: string })?.logicalName;
      if (logicalName) {
        await this.handleSelectEntity(logicalName);
      }
    });

    // Choice selection
    this.coordinator.registerHandler('selectChoice', async (data) => {
      const name = (data as { name?: string })?.name;
      if (name) {
        await this.handleSelectChoice(name);
      }
    });

    // Navigate to related entity (from relationship link)
    this.coordinator.registerHandler('navigateToEntity', async (data) => {
      const logicalName = (data as { logicalName?: string })?.logicalName;
      if (logicalName) {
        await this.handleNavigateToEntity(logicalName);
      }
    }, { disableOnExecute: false }); // Don't disable buttons during navigation

    // Navigate to entity via quick pick (N:N relationships)
    this.coordinator.registerHandler('navigateToEntityQuickPick', async (data) => {
      const options = (data as { entities?: string[] })?.entities;
      if (options && options.length > 0) {
        await this.handleNavigateToEntityQuickPick(options);
      }
    }, { disableOnExecute: false });

    // Open detail panel
    this.coordinator.registerHandler('openDetailPanel', async (data) => {
      const payload = data as {
        tab: MetadataTab;
        itemId: string;
        metadata: unknown;
      };
      await this.handleOpenDetailPanel(payload.tab, payload.itemId, payload.metadata);
    }, { disableOnExecute: false });

    // Close detail panel
    this.coordinator.registerHandler('closeDetailPanel', async () => {
      await this.handleCloseDetailPanel();
    }, { disableOnExecute: false });

    // Tab change (persist state)
    this.coordinator.registerHandler('tabChange', async (data) => {
      const tab = (data as { tab?: string })?.tab as MetadataTab | undefined;
      if (tab) {
        this.currentTab = tab;
        await this.persistState();
      }
    }, { disableOnExecute: false });
  }

  /**
   * Initializes panel with persisted state from workspace.
   * Restores: selected tab, detail panel state, sidebar collapsed state.
   */
  private async initializeWithPersistedState(): Promise<void> {
    this.logger.debug('Loading persisted panel state');

    // Load persisted state
    const state = await this.stateRepository.load({
      panelType: MetadataBrowserPanel.viewType,
      environmentId: this.currentEnvironmentId
    });

    // Restore state
    if (state) {
      this.currentTab = (state.selectedTab as MetadataTab) || 'attributes';
      // Detail panel state and sidebar state will be sent to client
    }

    // Load environments first
    const environments = await this.getEnvironments();

    // Initialize coordinator with environments and tree data
    await this.scaffoldingBehavior.refresh({
      environments,
      currentEnvironmentId: this.currentEnvironmentId,
      state: state || {}
    });

    // Load tree data
    await this.handleLoadTree();
  }

  /**
   * Loads entity and choice tree.
   */
  private async handleLoadTree(): Promise<void> {
    this.logger.debug('Loading metadata tree');

    try {
      const result = await this.loadMetadataTreeUseCase.execute(
        this.currentEnvironmentId
      );

      await this.panel.webview.postMessage({
        command: 'populateTree',
        data: {
          entities: result.entities,
          choices: result.choices
        }
      });

      this.logger.info('Metadata tree loaded', {
        entityCount: result.entities.length,
        choiceCount: result.choices.length
      });
    } catch (error: unknown) {
      this.logger.error('Failed to load metadata tree', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to load metadata tree: ${errorMessage}`);
    }
  }

  /**
   * Handles entity selection from tree.
   * Loads all entity metadata and displays in tabs.
   */
  private async handleSelectEntity(logicalName: string): Promise<void> {
    this.logger.debug('Selecting entity', { logicalName });

    this.currentSelectionType = 'entity';
    this.currentSelectionId = logicalName;
    this.currentTab = 'attributes'; // Reset to attributes tab

    // Enable refresh button
    this.setButtonState('refresh', false);

    try {
      const result = await this.loadEntityMetadataUseCase.execute(
        this.currentEnvironmentId,
        logicalName
      );

      // Send all tab data to client
      await this.panel.webview.postMessage({
        command: 'setEntityMode',
        data: {
          entity: result.entity,
          attributes: result.attributes,
          keys: result.keys,
          relationships: result.relationships,
          privileges: result.privileges,
          selectedTab: this.currentTab
        }
      });

      this.logger.info('Entity metadata loaded', { logicalName });
      await this.persistState();
    } catch (error: unknown) {
      this.logger.error('Failed to load entity metadata', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to load entity metadata: ${errorMessage}`);
    }
  }

  /**
   * Handles choice selection from tree.
   * Loads choice metadata and displays choice values.
   */
  private async handleSelectChoice(name: string): Promise<void> {
    this.logger.debug('Selecting choice', { name });

    this.currentSelectionType = 'choice';
    this.currentSelectionId = name;

    // Enable refresh button
    this.setButtonState('refresh', false);

    try {
      const result = await this.loadChoiceMetadataUseCase.execute(
        this.currentEnvironmentId,
        name
      );

      // Send choice data to client
      await this.panel.webview.postMessage({
        command: 'setChoiceMode',
        data: {
          choice: result.choice,
          choiceValues: result.choiceValues
        }
      });

      this.logger.info('Choice metadata loaded', { name });
      await this.persistState();
    } catch (error: unknown) {
      this.logger.error('Failed to load choice metadata', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to load choice metadata: ${errorMessage}`);
    }
  }

  /**
   * Handles navigation to related entity via relationship link.
   * Switches to Attributes tab by default.
   */
  private async handleNavigateToEntity(logicalName: string): Promise<void> {
    this.logger.debug('Navigating to entity', { logicalName });
    this.currentTab = 'attributes'; // Reset to attributes when navigating
    await this.handleSelectEntity(logicalName);
  }

  /**
   * Handles navigation via quick pick (N:N relationships).
   * Shows VS Code quick pick with two entity options.
   */
  private async handleNavigateToEntityQuickPick(entities: string[]): Promise<void> {
    const selected = await vscode.window.showQuickPick(entities, {
      placeHolder: 'Select which entity to open'
    });

    if (selected) {
      await this.handleNavigateToEntity(selected);
    }
  }

  /**
   * Opens detail panel with metadata for selected item.
   */
  private async handleOpenDetailPanel(
    tab: MetadataTab,
    itemId: string,
    metadata: unknown
  ): Promise<void> {
    this.logger.debug('Opening detail panel', { tab, itemId });

    await this.panel.webview.postMessage({
      command: 'showDetailPanel',
      data: {
        tab,
        itemId,
        metadata
      }
    });

    await this.persistState();
  }

  /**
   * Closes detail panel.
   */
  private async handleCloseDetailPanel(): Promise<void> {
    this.logger.debug('Closing detail panel');

    await this.panel.webview.postMessage({
      command: 'hideDetailPanel'
    });

    await this.persistState();
  }

  /**
   * Refreshes current selection (entity or choice).
   */
  private async handleRefresh(): Promise<void> {
    this.logger.debug('Refreshing current selection');

    if (this.currentSelectionType === 'entity' && this.currentSelectionId) {
      await this.handleSelectEntity(this.currentSelectionId);
    } else if (this.currentSelectionType === 'choice' && this.currentSelectionId) {
      await this.handleSelectChoice(this.currentSelectionId);
    }
  }

  /**
   * Opens current selection in Maker portal.
   */
  private async handleOpenMaker(): Promise<void> {
    try {
      await this.openInMakerUseCase.execute(
        this.currentEnvironmentId,
        this.currentSelectionType,
        this.currentSelectionId
      );
      this.logger.info('Opened in Maker portal');
    } catch (error: unknown) {
      this.logger.error('Failed to open in Maker', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to open in Maker: ${errorMessage}`);
    }
  }

  /**
   * Handles environment change.
   * Clears current selection and reloads tree.
   */
  private async handleEnvironmentChange(environmentId: string): Promise<void> {
    this.logger.debug('Environment changed', { environmentId });

    this.currentEnvironmentId = environmentId;
    this.currentSelectionType = null;
    this.currentSelectionId = null;
    this.currentTab = 'attributes';

    // Update panel title
    const environment = await this.getEnvironmentById(environmentId);
    if (environment) {
      this.panel.title = `Metadata - ${environment.getName().getValue()}`;
    }

    // Disable refresh button (no selection)
    this.setButtonState('refresh', true);

    // Clear tables
    await this.panel.webview.postMessage({
      command: 'clearSelection'
    });

    // Reload tree
    await this.handleLoadTree();
  }

  /**
   * Persists panel state to workspace storage.
   */
  private async persistState(): Promise<void> {
    await this.stateRepository.save(
      {
        panelType: MetadataBrowserPanel.viewType,
        environmentId: this.currentEnvironmentId
      },
      {
        selectedTab: this.currentTab,
        lastUpdated: new Date().toISOString()
      }
    );
  }

  /**
   * Sets button state (enabled/disabled).
   */
  private setButtonState(buttonId: string, disabled: boolean): void {
    this.panel.webview.postMessage({
      command: 'setButtonState',
      buttonId,
      disabled,
      showSpinner: false
    });
  }
}
```

### Lifecycle Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. createOrShow()                                                │
│    • Check for existing panel (singleton per environment)       │
│    • Create vscode.WebviewPanel if needed                        │
│    • Instantiate MetadataBrowserPanel                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│ 2. constructor()                                                 │
│    • Set currentEnvironmentId                                    │
│    • Create VSCodePanelStateRepository                          │
│    • Create PanelCoordinator + sections                         │
│    • Register command handlers                                   │
│    • Call initializeWithPersistedState()                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│ 3. initializeWithPersistedState()                               │
│    • Load state from workspace (selected tab, detail state)     │
│    • Load environments list                                      │
│    • Initialize scaffoldingBehavior.refresh() (renders HTML)    │
│    • Call handleLoadTree()                                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│ 4. handleLoadTree()                                             │
│    • Execute LoadMetadataTreeUseCase                            │
│    • Send 'populateTree' message to webview                     │
│    • User sees entity/choice tree                               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                  ┌─────────┴─────────┐
                  │ User interacts... │
                  └─────────┬─────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│ 5. Message Loop (webview → extension)                           │
│    • selectEntity → handleSelectEntity()                        │
│    • selectChoice → handleSelectChoice()                        │
│    • navigateToEntity → handleNavigateToEntity()                │
│    • openDetailPanel → handleOpenDetailPanel()                  │
│    • refresh → handleRefresh()                                  │
│    • tabChange → persistState()                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ViewModel Specifications

### EntityTreeItemViewModel

**Purpose:** Display entity in tree view (left sidebar).

```typescript
/**
 * ViewModel for displaying entity in tree.
 *
 * Transformation rules:
 * - displayName: EntityMetadata.displayName (fallback to logicalName if empty)
 * - logicalName: EntityMetadata.logicalName.getValue()
 * - isCustom: EntityMetadata.isCustomEntity
 * - icon: "🏷️" if isCustom, "📋" if system
 */
export interface EntityTreeItemViewModel {
  /** Unique identifier for tree node (same as logicalName) */
  readonly id: string;

  /** Display name shown in tree (bold) */
  readonly displayName: string;

  /** Logical name shown in tree (gray, parentheses) */
  readonly logicalName: string;

  /** Whether this is a custom entity */
  readonly isCustom: boolean;

  /** Icon emoji for tree node */
  readonly icon: string;
}
```

**Example:**
```typescript
{
  id: "account",
  displayName: "Account",
  logicalName: "account",
  isCustom: false,
  icon: "📋"
}
```

---

### ChoiceTreeItemViewModel

**Purpose:** Display global choice in tree view (left sidebar).

```typescript
/**
 * ViewModel for displaying global choice in tree.
 *
 * Transformation rules:
 * - displayName: OptionSetMetadata.DisplayName.UserLocalizedLabel.Label (fallback to name)
 * - name: OptionSetMetadata.Name
 * - isCustom: OptionSetMetadata.IsCustomOptionSet
 * - icon: Always "🔽" (dropdown)
 */
export interface ChoiceTreeItemViewModel {
  /** Unique identifier for tree node (same as name) */
  readonly id: string;

  /** Display name shown in tree (bold) */
  readonly displayName: string;

  /** Name shown in tree (gray, parentheses) */
  readonly name: string;

  /** Whether this is a custom choice */
  readonly isCustom: boolean;

  /** Icon emoji for tree node */
  readonly icon: string;
}
```

---

### AttributeRowViewModel

**Purpose:** Display attribute in Attributes tab table.

```typescript
/**
 * ViewModel for displaying attribute in table.
 *
 * Transformation rules:
 * - displayName: AttributeMetadata.displayName (fallback to logicalName)
 * - logicalName: AttributeMetadata.logicalName.getValue()
 * - type: AttributeMetadata.attributeType.getDisplayName()
 * - required: AttributeMetadata.requiredLevel (formatted as enum string)
 * - maxLength: AttributeMetadata.maxLength?.toString() || "-"
 * - isLinkable: true (all attributes can open detail panel)
 */
export interface AttributeRowViewModel {
  /** Unique identifier (same as logicalName) */
  readonly id: string;

  /** Display name (hyperlink) */
  readonly displayName: string;

  /** Logical name (plain text) */
  readonly logicalName: string;

  /** Attribute type (String, Integer, Lookup, etc.) */
  readonly type: string;

  /** Required level (None, ApplicationRequired, SystemRequired) */
  readonly required: string;

  /** Max length (number string or "-" if N/A) */
  readonly maxLength: string;

  /** Whether display name should be hyperlink */
  readonly isLinkable: boolean;

  /** Raw metadata for detail panel (passed as-is) */
  readonly metadata: AttributeMetadata;
}
```

**Example:**
```typescript
{
  id: "name",
  displayName: "Account Name",
  logicalName: "name",
  type: "String",
  required: "SystemRequired",
  maxLength: "160",
  isLinkable: true,
  metadata: { /* full AttributeMetadata entity */ }
}
```

---

### KeyRowViewModel

**Purpose:** Display entity key in Keys tab table.

```typescript
/**
 * ViewModel for displaying entity key in table.
 *
 * Transformation rules:
 * - name: EntityKey.logicalName
 * - type: "Primary" if isPrimary, else "Alternate"
 * - keyAttributes: EntityKey.keyAttributes.join(", ")
 */
export interface KeyRowViewModel {
  /** Unique identifier (same as name) */
  readonly id: string;

  /** Key name (hyperlink) */
  readonly name: string;

  /** Key type (Primary or Alternate) */
  readonly type: string;

  /** Comma-separated list of key attributes */
  readonly keyAttributes: string;

  /** Whether name should be hyperlink */
  readonly isLinkable: boolean;

  /** Raw metadata for detail panel */
  readonly metadata: EntityKey;
}
```

---

### RelationshipRowViewModel

**Purpose:** Display relationship in Relationships tab table.

```typescript
/**
 * ViewModel for displaying relationship in table.
 *
 * Transformation rules:
 * - name: Relationship.schemaName.getValue()
 * - type: "1:N" | "N:1" | "N:N"
 * - relatedEntity: For 1:N/N:1: single entity name (hyperlink)
 *                  For N:N: "entity1 ↔ entity2" (both hyperlinks)
 * - referencingAttribute: For 1:N/N:1: attribute name
 *                         For N:N: intersect entity name
 * - isNavigable: true for 1:N/N:1, "quickPick" for N:N
 */
export interface RelationshipRowViewModel {
  /** Unique identifier (same as name) */
  readonly id: string;

  /** Relationship schema name (hyperlink to detail) */
  readonly name: string;

  /** Relationship type */
  readonly type: '1:N' | 'N:1' | 'N:N';

  /** Related entity or entities (formatted for display) */
  readonly relatedEntity: string;

  /** Referencing attribute or intersect entity */
  readonly referencingAttribute: string;

  /** Whether related entity is clickable */
  readonly isNavigable: boolean | 'quickPick';

  /** For N:N: array of both entity names */
  readonly navigationTargets?: string[];

  /** Raw metadata for detail panel */
  readonly metadata: OneToManyRelationship | ManyToManyRelationship;
}
```

**Example (1:N):**
```typescript
{
  id: "account_contact",
  name: "account_contact",
  type: "1:N",
  relatedEntity: "contact",
  referencingAttribute: "parentaccountid",
  isNavigable: true,
  metadata: { /* OneToManyRelationship */ }
}
```

**Example (N:N):**
```typescript
{
  id: "accountleads_association",
  name: "accountleads_association",
  type: "N:N",
  relatedEntity: "account ↔ lead",
  referencingAttribute: "accountleads",
  isNavigable: "quickPick",
  navigationTargets: ["account", "lead"],
  metadata: { /* ManyToManyRelationship */ }
}
```

---

### PrivilegeRowViewModel

**Purpose:** Display privilege in Privileges tab table.

```typescript
/**
 * ViewModel for displaying privilege in table.
 *
 * Transformation rules:
 * - name: Privilege.name
 * - privilegeType: Privilege.privilegeType (enum string)
 * - depth: Calculate from CanBeBasic/Local/Deep/Global flags
 *          Join enabled depths with ", "
 *          Return "None" if all false
 */
export interface PrivilegeRowViewModel {
  /** Unique identifier (privilege ID) */
  readonly id: string;

  /** Privilege name (hyperlink) */
  readonly name: string;

  /** Privilege type (Create, Read, Write, Delete, etc.) */
  readonly privilegeType: string;

  /** Comma-separated depth levels (Basic, Local, Deep, Global) */
  readonly depth: string;

  /** Whether name should be hyperlink */
  readonly isLinkable: boolean;

  /** Raw metadata for detail panel */
  readonly metadata: SecurityPrivilege;
}
```

**Example:**
```typescript
{
  id: "guid-123",
  name: "prvReadAccount",
  privilegeType: "Read",
  depth: "Basic, Local, Deep, Global",
  isLinkable: true,
  metadata: { /* SecurityPrivilege */ }
}
```

---

### ChoiceValueRowViewModel

**Purpose:** Display choice value in Choice Values tab table.

```typescript
/**
 * ViewModel for displaying choice value in table.
 *
 * Transformation rules:
 * - label: OptionValue.Label.UserLocalizedLabel.Label
 * - value: OptionValue.Value.toString()
 * - description: OptionValue.Description?.UserLocalizedLabel?.Label || ""
 */
export interface ChoiceValueRowViewModel {
  /** Unique identifier (value as string) */
  readonly id: string;

  /** Option label (hyperlink) */
  readonly label: string;

  /** Numeric option value */
  readonly value: string;

  /** Option description (may be empty) */
  readonly description: string;

  /** Whether label should be hyperlink */
  readonly isLinkable: boolean;

  /** Raw metadata for detail panel */
  readonly metadata: OptionValue;
}
```

---

### DetailPanelViewModel

**Purpose:** Display metadata in detail panel (right side).

```typescript
/**
 * ViewModel for displaying metadata in detail panel.
 *
 * Properties tab: Flattened key-value pairs
 * Raw Data tab: JSON string of raw metadata
 *
 * Transformation rules:
 * - title: Formatted based on tab type
 *          "Attribute: {displayName}"
 *          "Key: {name}"
 *          "Relationship: {name}"
 *          "Privilege: {name}"
 *          "Choice Value: {label}"
 * - properties: Flatten nested objects with dot notation
 *               Filter out null/empty values
 *               Format booleans as "Yes"/"No"
 *               Arrays shown with index notation
 * - rawData: JSON.stringify(metadata, null, 2)
 */
export interface DetailPanelViewModel {
  /** Panel title (shown in header) */
  readonly title: string;

  /** Tab type for context */
  readonly tab: MetadataTab;

  /** Flattened properties for Properties tab */
  readonly properties: DetailProperty[];

  /** JSON string for Raw Data tab */
  readonly rawData: string;
}

export interface DetailProperty {
  /** Property name (dot notation for nested) */
  readonly name: string;

  /** Property value (formatted for display) */
  readonly value: string;
}

export type MetadataTab = 'attributes' | 'keys' | 'relationships' | 'privileges' | 'choiceValues';
```

**Example:**
```typescript
{
  title: "Attribute: Account Name",
  tab: "attributes",
  properties: [
    { name: "LogicalName", value: "name" },
    { name: "SchemaName", value: "Name" },
    { name: "DisplayName.UserLocalizedLabel.Label", value: "Account Name" },
    { name: "AttributeType", value: "String" },
    { name: "MaxLength", value: "160" },
    { name: "RequiredLevel", value: "SystemRequired" },
    { name: "IsCustomAttribute", value: "No" },
    { name: "IsPrimaryId", value: "No" },
    { name: "IsPrimaryName", value: "Yes" }
  ],
  rawData: "{\n  \"logicalName\": \"name\",\n  ..."
}
```

---

## Use Case Specifications

### LoadMetadataTreeUseCase

**Purpose:** Load all entities and global choices for tree display.

```typescript
/**
 * Loads metadata tree (entities and choices) for an environment.
 *
 * Orchestration:
 * 1. Fetch all entities from repository
 * 2. Fetch all global choices from repository
 * 3. Sort entities alphabetically by display name
 * 4. Sort choices alphabetically by display name
 * 5. Map to tree item ViewModels
 * 6. Return ViewModels
 *
 * Business logic delegation:
 * - Entity domain object provides displayName
 * - Sorting done BEFORE mapping (data preparation)
 * - Mapper handles all formatting
 */
export class LoadMetadataTreeUseCase {
  constructor(
    private readonly repository: IEntityMetadataRepository,
    private readonly entityTreeItemMapper: EntityTreeItemMapper,
    private readonly choiceTreeItemMapper: ChoiceTreeItemMapper,
    private readonly logger: ILogger
  ) {}

  async execute(environmentId: string): Promise<LoadMetadataTreeResponse> {
    this.logger.debug('Loading metadata tree', { environmentId });

    try {
      // Fetch entities and choices in parallel
      const [entities, choices] = await Promise.all([
        this.repository.getAllEntities(environmentId),
        this.repository.getAllGlobalChoices(environmentId)
      ]);

      // Sort before mapping (data preparation)
      const sortedEntities = entities.sort((a, b) =>
        a.displayName.localeCompare(b.displayName)
      );
      const sortedChoices = choices.sort((a, b) =>
        a.displayName.localeCompare(b.displayName)
      );

      // Map to ViewModels
      const entityViewModels = sortedEntities.map(e =>
        this.entityTreeItemMapper.toViewModel(e)
      );
      const choiceViewModels = sortedChoices.map(c =>
        this.choiceTreeItemMapper.toViewModel(c)
      );

      this.logger.info('Metadata tree loaded', {
        entityCount: entityViewModels.length,
        choiceCount: choiceViewModels.length
      });

      return {
        entities: entityViewModels,
        choices: choiceViewModels
      };
    } catch (error: unknown) {
      this.logger.error('Failed to load metadata tree', error);
      throw error;
    }
  }
}

export interface LoadMetadataTreeResponse {
  readonly entities: EntityTreeItemViewModel[];
  readonly choices: ChoiceTreeItemViewModel[];
}
```

---

### LoadEntityMetadataUseCase

**Purpose:** Load complete entity metadata for all tabs.

```typescript
/**
 * Loads complete entity metadata including all tabs.
 *
 * Orchestration:
 * 1. Fetch entity metadata from repository (includes all relationships, keys, etc.)
 * 2. Extract data for each tab
 * 3. Sort data before mapping
 * 4. Map to ViewModels
 * 5. Return all ViewModels
 *
 * Sorting strategy:
 * - Attributes: By display name ascending
 * - Keys: By name ascending
 * - Relationships: By schema name ascending
 * - Privileges: By name ascending
 */
export class LoadEntityMetadataUseCase {
  constructor(
    private readonly repository: IEntityMetadataRepository,
    private readonly attributeRowMapper: AttributeRowMapper,
    private readonly keyRowMapper: KeyRowMapper,
    private readonly relationshipRowMapper: RelationshipRowMapper,
    private readonly privilegeRowMapper: PrivilegeRowMapper,
    private readonly entityTreeItemMapper: EntityTreeItemMapper,
    private readonly logger: ILogger
  ) {}

  async execute(
    environmentId: string,
    logicalName: string
  ): Promise<LoadEntityMetadataResponse> {
    this.logger.debug('Loading entity metadata', { environmentId, logicalName });

    try {
      // Fetch complete entity metadata
      const entity = await this.repository.getEntityByLogicalName(
        environmentId,
        logicalName
      );

      if (!entity) {
        throw new Error(`Entity not found: ${logicalName}`);
      }

      // Sort attributes before mapping
      const sortedAttributes = [...entity.attributes].sort((a, b) =>
        a.displayName.localeCompare(b.displayName)
      );

      // Sort keys before mapping
      const sortedKeys = [...entity.keys].sort((a, b) =>
        a.logicalName.getValue().localeCompare(b.logicalName.getValue())
      );

      // Combine and sort all relationships
      const allRelationships = [
        ...entity.oneToManyRelationships.map(r => ({ type: '1:N' as const, rel: r })),
        ...entity.manyToOneRelationships.map(r => ({ type: 'N:1' as const, rel: r })),
        ...entity.manyToManyRelationships.map(r => ({ type: 'N:N' as const, rel: r }))
      ].sort((a, b) =>
        a.rel.schemaName.getValue().localeCompare(b.rel.schemaName.getValue())
      );

      // Map to ViewModels
      const attributeVMs = sortedAttributes.map(attr =>
        this.attributeRowMapper.toViewModel(attr)
      );

      const keyVMs = sortedKeys.map(key =>
        this.keyRowMapper.toViewModel(key)
      );

      const relationshipVMs = allRelationships.map(({ type, rel }) =>
        this.relationshipRowMapper.toViewModel(rel, type)
      );

      const privilegeVMs = entity.privileges.map(priv =>
        this.privilegeRowMapper.toViewModel(priv)
      );

      const entityVM = this.entityTreeItemMapper.toViewModel(entity);

      this.logger.info('Entity metadata loaded', {
        logicalName,
        attributeCount: attributeVMs.length,
        keyCount: keyVMs.length,
        relationshipCount: relationshipVMs.length,
        privilegeCount: privilegeVMs.length
      });

      return {
        entity: entityVM,
        attributes: attributeVMs,
        keys: keyVMs,
        relationships: relationshipVMs,
        privileges: privilegeVMs
      };
    } catch (error: unknown) {
      this.logger.error('Failed to load entity metadata', error);
      throw error;
    }
  }
}

export interface LoadEntityMetadataResponse {
  readonly entity: EntityTreeItemViewModel;
  readonly attributes: AttributeRowViewModel[];
  readonly keys: KeyRowViewModel[];
  readonly relationships: RelationshipRowViewModel[];
  readonly privileges: PrivilegeRowViewModel[];
}
```

---

### LoadChoiceMetadataUseCase

**Purpose:** Load global choice metadata.

```typescript
/**
 * Loads global choice metadata.
 *
 * Orchestration:
 * 1. Fetch choice metadata from repository
 * 2. Sort choice values by label ascending
 * 3. Map to ViewModels
 * 4. Return ViewModels
 */
export class LoadChoiceMetadataUseCase {
  constructor(
    private readonly repository: IEntityMetadataRepository,
    private readonly choiceTreeItemMapper: ChoiceTreeItemMapper,
    private readonly choiceValueRowMapper: ChoiceValueRowMapper,
    private readonly logger: ILogger
  ) {}

  async execute(
    environmentId: string,
    name: string
  ): Promise<LoadChoiceMetadataResponse> {
    this.logger.debug('Loading choice metadata', { environmentId, name });

    try {
      // Fetch choice metadata
      const choice = await this.repository.getGlobalChoiceByName(
        environmentId,
        name
      );

      if (!choice) {
        throw new Error(`Choice not found: ${name}`);
      }

      // Sort choice values before mapping
      const sortedValues = [...choice.options].sort((a, b) =>
        a.label.localeCompare(b.label)
      );

      // Map to ViewModels
      const choiceVM = this.choiceTreeItemMapper.toViewModel(choice);
      const valueVMs = sortedValues.map(val =>
        this.choiceValueRowMapper.toViewModel(val)
      );

      this.logger.info('Choice metadata loaded', {
        name,
        valueCount: valueVMs.length
      });

      return {
        choice: choiceVM,
        choiceValues: valueVMs
      };
    } catch (error: unknown) {
      this.logger.error('Failed to load choice metadata', error);
      throw error;
    }
  }
}

export interface LoadChoiceMetadataResponse {
  readonly choice: ChoiceTreeItemViewModel;
  readonly choiceValues: ChoiceValueRowViewModel[];
}
```

---

### OpenInMakerUseCase

**Purpose:** Open entity or choice in Power Apps Maker portal.

```typescript
/**
 * Opens entity or choice in Power Apps Maker portal.
 *
 * Orchestration:
 * 1. Fetch environment to get Power Platform environment ID
 * 2. Build URL based on selection type
 * 3. Open URL in external browser
 *
 * URL patterns:
 * - No selection: /environments/{envId}/entities (entities list)
 * - Entity: /environments/{envId}/entities/{metadataId}
 * - Choice: Not supported (show warning)
 */
export class OpenInMakerUseCase {
  constructor(
    private readonly getEnvironmentById: (envId: string) => Promise<Environment | null>,
    private readonly urlBuilder: IMakerUrlBuilder,
    private readonly logger: ILogger
  ) {}

  async execute(
    environmentId: string,
    selectionType: 'entity' | 'choice' | null,
    selectionId: string | null
  ): Promise<void> {
    this.logger.debug('Opening in Maker', { selectionType, selectionId });

    // Get environment
    const environment = await this.getEnvironmentById(environmentId);
    if (!environment) {
      throw new Error('Environment not found');
    }

    const powerPlatformEnvId = environment.getPowerPlatformEnvironmentId();
    if (!powerPlatformEnvId) {
      throw new Error('Environment ID not configured. Please configure the Environment ID in environment settings.');
    }

    // Build URL based on selection
    let url: string;

    if (selectionType === null) {
      // No selection: open entities list
      url = this.urlBuilder.buildEntitiesListUrl(powerPlatformEnvId);
    } else if (selectionType === 'entity' && selectionId) {
      // Entity selected: open entity page
      url = this.urlBuilder.buildEntityUrl(powerPlatformEnvId, selectionId);
    } else if (selectionType === 'choice') {
      // Choice selected: not supported
      throw new Error('Opening choices in Maker portal is not supported');
    } else {
      throw new Error('Invalid selection');
    }

    // Open in browser
    await vscode.env.openExternal(vscode.Uri.parse(url));
    this.logger.info('Opened in Maker portal', { url });
  }
}
```

---

## Mapper Specifications

### EntityTreeItemMapper

```typescript
/**
 * Maps EntityMetadata to EntityTreeItemViewModel.
 *
 * Transformation rules:
 * - displayName: entity.displayName || entity.logicalName.getValue()
 * - icon: "🏷️" if custom, "📋" if system
 */
export class EntityTreeItemMapper {
  toViewModel(entity: EntityMetadata): EntityTreeItemViewModel {
    return {
      id: entity.logicalName.getValue(),
      displayName: entity.displayName || entity.logicalName.getValue(),
      logicalName: entity.logicalName.getValue(),
      isCustom: entity.isCustomEntity,
      icon: entity.isCustomEntity ? '🏷️' : '📋'
    };
  }
}
```

---

### AttributeRowMapper

```typescript
/**
 * Maps AttributeMetadata to AttributeRowViewModel.
 *
 * Transformation rules:
 * - maxLength: Format as string, "-" if null
 * - required: Enum string (None, ApplicationRequired, SystemRequired)
 * - type: Get display name from AttributeType value object
 */
export class AttributeRowMapper {
  toViewModel(attribute: AttributeMetadata): AttributeRowViewModel {
    return {
      id: attribute.logicalName.getValue(),
      displayName: attribute.displayName || attribute.logicalName.getValue(),
      logicalName: attribute.logicalName.getValue(),
      type: attribute.attributeType.getDisplayName(),
      required: attribute.requiredLevel,
      maxLength: attribute.maxLength?.toString() ?? '-',
      isLinkable: true,
      metadata: attribute
    };
  }
}
```

---

### RelationshipRowMapper

```typescript
/**
 * Maps relationship entities to RelationshipRowViewModel.
 *
 * Transformation rules:
 * - 1:N/N:1: Single related entity (navigable)
 * - N:N: "entity1 ↔ entity2" format (quick pick navigation)
 */
export class RelationshipRowMapper {
  toViewModel(
    relationship: OneToManyRelationship | ManyToManyRelationship,
    type: '1:N' | 'N:1' | 'N:N'
  ): RelationshipRowViewModel {
    if (type === 'N:N' && relationship instanceof ManyToManyRelationship) {
      // N:N relationship
      return {
        id: relationship.schemaName.getValue(),
        name: relationship.schemaName.getValue(),
        type: 'N:N',
        relatedEntity: `${relationship.entity1LogicalName} ↔ ${relationship.entity2LogicalName}`,
        referencingAttribute: relationship.intersectEntityName,
        isNavigable: 'quickPick',
        navigationTargets: [
          relationship.entity1LogicalName,
          relationship.entity2LogicalName
        ],
        metadata: relationship
      };
    } else if (relationship instanceof OneToManyRelationship) {
      // 1:N or N:1 relationship
      const relatedEntity = type === '1:N'
        ? relationship.referencingEntity
        : relationship.referencedEntity;

      return {
        id: relationship.schemaName.getValue(),
        name: relationship.schemaName.getValue(),
        type,
        relatedEntity,
        referencingAttribute: relationship.referencingAttribute,
        isNavigable: true,
        metadata: relationship
      };
    }

    throw new Error('Invalid relationship type');
  }
}
```

---

### DetailPanelMapper

```typescript
/**
 * Maps any metadata entity to DetailPanelViewModel.
 *
 * Transformation rules:
 * - Flatten nested objects with dot notation
 * - Filter out null/undefined/empty values
 * - Format booleans as "Yes"/"No"
 * - Arrays shown with index notation [0], [1], etc.
 * - rawData: JSON.stringify with 2-space indentation
 */
export class DetailPanelMapper {
  toViewModel(
    tab: MetadataTab,
    itemName: string,
    metadata: unknown
  ): DetailPanelViewModel {
    const title = this.formatTitle(tab, itemName);
    const properties = this.flattenMetadata(metadata);
    const rawData = JSON.stringify(metadata, null, 2);

    return {
      title,
      tab,
      properties,
      rawData
    };
  }

  private formatTitle(tab: MetadataTab, itemName: string): string {
    switch (tab) {
      case 'attributes':
        return `Attribute: ${itemName}`;
      case 'keys':
        return `Key: ${itemName}`;
      case 'relationships':
        return `Relationship: ${itemName}`;
      case 'privileges':
        return `Privilege: ${itemName}`;
      case 'choiceValues':
        return `Choice Value: ${itemName}`;
      default:
        return itemName;
    }
  }

  private flattenMetadata(obj: unknown, prefix = ''): DetailProperty[] {
    const result: DetailProperty[] = [];

    if (obj === null || obj === undefined) {
      return result;
    }

    if (typeof obj !== 'object') {
      return [{ name: prefix, value: String(obj) }];
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const nested = this.flattenMetadata(item, `${prefix}[${index}]`);
        result.push(...nested);
      });
      return result;
    }

    // Object
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined || value === '') {
        continue; // Skip empty values
      }

      const newPrefix = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'boolean') {
        result.push({
          name: newPrefix,
          value: value ? 'Yes' : 'No'
        });
      } else if (typeof value === 'object') {
        const nested = this.flattenMetadata(value, newPrefix);
        result.push(...nested);
      } else {
        result.push({
          name: newPrefix,
          value: String(value)
        });
      }
    }

    return result;
  }
}
```

---

## Type Contracts

### Complete Type Definitions

```typescript
// ==================== VIEWMODELS ====================

export interface EntityTreeItemViewModel {
  readonly id: string;
  readonly displayName: string;
  readonly logicalName: string;
  readonly isCustom: boolean;
  readonly icon: string;
}

export interface ChoiceTreeItemViewModel {
  readonly id: string;
  readonly displayName: string;
  readonly name: string;
  readonly isCustom: boolean;
  readonly icon: string;
}

export interface AttributeRowViewModel {
  readonly id: string;
  readonly displayName: string;
  readonly logicalName: string;
  readonly type: string;
  readonly required: string;
  readonly maxLength: string;
  readonly isLinkable: boolean;
  readonly metadata: AttributeMetadata;
}

export interface KeyRowViewModel {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly keyAttributes: string;
  readonly isLinkable: boolean;
  readonly metadata: EntityKey;
}

export interface RelationshipRowViewModel {
  readonly id: string;
  readonly name: string;
  readonly type: '1:N' | 'N:1' | 'N:N';
  readonly relatedEntity: string;
  readonly referencingAttribute: string;
  readonly isNavigable: boolean | 'quickPick';
  readonly navigationTargets?: string[];
  readonly metadata: OneToManyRelationship | ManyToManyRelationship;
}

export interface PrivilegeRowViewModel {
  readonly id: string;
  readonly name: string;
  readonly privilegeType: string;
  readonly depth: string;
  readonly isLinkable: boolean;
  readonly metadata: SecurityPrivilege;
}

export interface ChoiceValueRowViewModel {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly description: string;
  readonly isLinkable: boolean;
  readonly metadata: OptionValue;
}

export interface DetailPanelViewModel {
  readonly title: string;
  readonly tab: MetadataTab;
  readonly properties: DetailProperty[];
  readonly rawData: string;
}

export interface DetailProperty {
  readonly name: string;
  readonly value: string;
}

export type MetadataTab = 'attributes' | 'keys' | 'relationships' | 'privileges' | 'choiceValues';

// ==================== USE CASE RESPONSES ====================

export interface LoadMetadataTreeResponse {
  readonly entities: EntityTreeItemViewModel[];
  readonly choices: ChoiceTreeItemViewModel[];
}

export interface LoadEntityMetadataResponse {
  readonly entity: EntityTreeItemViewModel;
  readonly attributes: AttributeRowViewModel[];
  readonly keys: KeyRowViewModel[];
  readonly relationships: RelationshipRowViewModel[];
  readonly privileges: PrivilegeRowViewModel[];
}

export interface LoadChoiceMetadataResponse {
  readonly choice: ChoiceTreeItemViewModel;
  readonly choiceValues: ChoiceValueRowViewModel[];
}

// ==================== STATE PERSISTENCE ====================

export interface MetadataBrowserPanelState {
  readonly selectedTab: MetadataTab;
  readonly detailPanelOpen: boolean;
  readonly detailPanelWidth: number;
  readonly leftSidebarCollapsed: boolean;
  readonly lastUpdated: string;
}

export interface PanelStateKey {
  readonly panelType: string;
  readonly environmentId: string;
}

// ==================== PANEL COMMANDS ====================

export type MetadataBrowserCommands =
  | 'refresh'
  | 'openMaker'
  | 'environmentChange'
  | 'selectEntity'
  | 'selectChoice'
  | 'navigateToEntity'
  | 'navigateToEntityQuickPick'
  | 'openDetailPanel'
  | 'closeDetailPanel'
  | 'tabChange';
```

---

## Message Protocol

### Extension → Webview Messages

```typescript
// Populate tree with entities and choices
{
  command: 'populateTree',
  data: {
    entities: EntityTreeItemViewModel[],
    choices: ChoiceTreeItemViewModel[]
  }
}

// Switch to entity mode (show 4 tabs)
{
  command: 'setEntityMode',
  data: {
    entity: EntityTreeItemViewModel,
    attributes: AttributeRowViewModel[],
    keys: KeyRowViewModel[],
    relationships: RelationshipRowViewModel[],
    privileges: PrivilegeRowViewModel[],
    selectedTab: MetadataTab
  }
}

// Switch to choice mode (show choice values tab)
{
  command: 'setChoiceMode',
  data: {
    choice: ChoiceTreeItemViewModel,
    choiceValues: ChoiceValueRowViewModel[]
  }
}

// Clear selection (on environment change)
{
  command: 'clearSelection'
}

// Show detail panel
{
  command: 'showDetailPanel',
  data: {
    tab: MetadataTab,
    itemId: string,
    metadata: unknown
  }
}

// Hide detail panel
{
  command: 'hideDetailPanel'
}

// Set button state
{
  command: 'setButtonState',
  buttonId: string,
  disabled: boolean,
  showSpinner: boolean
}

// Restore persisted state
{
  command: 'restoreState',
  data: {
    selectedTab: MetadataTab,
    detailPanelOpen: boolean,
    detailPanelWidth: number,
    leftSidebarCollapsed: boolean
  }
}
```

---

### Webview → Extension Messages

```typescript
// User clicked entity in tree
{
  command: 'selectEntity',
  data: {
    logicalName: string
  }
}

// User clicked choice in tree
{
  command: 'selectChoice',
  data: {
    name: string
  }
}

// User clicked related entity link (1:N/N:1)
{
  command: 'navigateToEntity',
  data: {
    logicalName: string
  }
}

// User clicked related entity link (N:N, needs quick pick)
{
  command: 'navigateToEntityQuickPick',
  data: {
    entities: string[] // [entity1, entity2]
  }
}

// User double-clicked row or clicked hyperlink
{
  command: 'openDetailPanel',
  data: {
    tab: MetadataTab,
    itemId: string,
    metadata: unknown // Full metadata object
  }
}

// User clicked close button or pressed ESC
{
  command: 'closeDetailPanel'
}

// User clicked refresh button
{
  command: 'refresh'
}

// User clicked "Open in Maker" button
{
  command: 'openMaker'
}

// User changed environment
{
  command: 'environmentChange',
  data: {
    environmentId: string
  }
}

// User switched tabs
{
  command: 'tabChange',
  data: {
    tab: MetadataTab
  }
}

// Detail panel resized
{
  command: 'detailPanelResize',
  data: {
    width: number
  }
}

// Sidebar toggled
{
  command: 'sidebarToggle',
  data: {
    collapsed: boolean
  }
}
```

---

## State Management

### Workspace State Persistence

**State Schema:**
```typescript
interface MetadataBrowserWorkspaceState {
  selectedTab: MetadataTab;           // Last selected tab
  detailPanelOpen: boolean;           // Detail panel open/closed
  detailPanelWidth: number;           // Split panel width (pixels)
  leftSidebarCollapsed: boolean;      // Sidebar collapsed state
  lastUpdated: string;                // ISO 8601 timestamp
}
```

**Storage Key Format:**
```
panel-state-powerPlatformDevSuite.metadataBrowser
```

**Storage Structure:**
```typescript
{
  "env-123-abc": {
    selectedTab: "attributes",
    detailPanelOpen: false,
    detailPanelWidth: 400,
    leftSidebarCollapsed: false,
    lastUpdated: "2025-11-09T10:30:00.000Z"
  },
  "env-456-def": {
    selectedTab: "relationships",
    detailPanelOpen: true,
    detailPanelWidth: 500,
    leftSidebarCollapsed: false,
    lastUpdated: "2025-11-09T09:15:00.000Z"
  }
}
```

**Persistence Strategy:**

| Event | State Updated | Notes |
|-------|---------------|-------|
| Tab change | selectedTab | Immediate persist |
| Detail panel open | detailPanelOpen | Immediate persist |
| Detail panel close | detailPanelOpen | Immediate persist |
| Detail panel resize | detailPanelWidth | Debounced (300ms) |
| Sidebar toggle | leftSidebarCollapsed | Immediate persist |
| Environment change | All reset | Load state for new environment |

**Session State (NOT Persisted):**
- Selected entity/choice (lost on panel close)
- Table sort order (client-side state)
- Table search queries (client-side state)
- Scroll positions (client-side state)
- Detail panel active tab (Properties vs Raw Data)

---

## Component Interaction

### Sequence Diagram: Select Entity

```
User          Webview          Panel          UseCase          Repository
 │              │                │               │                 │
 │─Click Entity─▶               │               │                 │
 │              │──selectEntity─▶               │                 │
 │              │                │               │                 │
 │              │    handleSelectEntity()       │                 │
 │              │                │               │                 │
 │              │                │──execute()───▶                 │
 │              │                │               │──getEntity()──▶
 │              │                │               │◀────Entity─────┤
 │              │                │               │                 │
 │              │                │    Map domain → ViewModels     │
 │              │                │               │                 │
 │              │◀─setEntityMode─┤               │                 │
 │              │   (ViewModels) │               │                 │
 │              │                │               │                 │
 │──Render Tables                │               │                 │
 │              │                │               │                 │
 │              │                │    persistState()              │
 │              │                │◀──────────────┴────────────────┘
```

---

### Sequence Diagram: Open Detail Panel

```
User          Webview          Panel          Mapper
 │              │                │               │
 │─DblClick Row─▶               │               │
 │              │─openDetailPanel▶              │
 │              │   (metadata)   │               │
 │              │                │               │
 │              │    handleOpenDetailPanel()    │
 │              │                │               │
 │              │                │──toViewModel()▶
 │              │                │◀─DetailVM─────┤
 │              │                │               │
 │              │◀showDetailPanel┤               │
 │              │   (DetailVM)   │               │
 │              │                │               │
 │──Render Detail                │               │
 │  (Properties + Raw Data tabs)│               │
 │              │                │               │
 │              │                │    persistState()
 │              │                │◀───────────────┘
```

---

### Sequence Diagram: Navigate to Related Entity (N:N)

```
User          Webview          Panel          VSCode
 │              │                │               │
 │─Click N:N Link─▶             │               │
 │              │─navigateToEntityQuickPick─▶   │
 │              │   (entities:[entity1,entity2])│
 │              │                │               │
 │              │                │──showQuickPick()▶
 │              │                │◀──Selected────┤
 │              │                │               │
 │              │                │    handleSelectEntity()
 │              │                │    (reset to Attributes tab)
 │              │                │               │
 │              │◀─setEntityMode─┤               │
 │              │   (ViewModels) │               │
 │              │                │               │
 │──Render Selected Entity       │               │
 │  (Attributes tab)             │               │
```

---

## Implementation Order

### Phase 1: Foundation (Panel + Basic Use Cases)

**Goal:** Get basic panel structure working with tree view.

1. **Create ViewModels** (1 hour)
   - EntityTreeItemViewModel
   - ChoiceTreeItemViewModel
   - All row ViewModels (attributes, keys, relationships, privileges, choice values)
   - DetailPanelViewModel

2. **Create Mappers** (1 hour)
   - EntityTreeItemMapper
   - ChoiceTreeItemMapper
   - AttributeRowMapper
   - KeyRowMapper
   - RelationshipRowMapper
   - PrivilegeRowMapper
   - ChoiceValueRowMapper
   - DetailPanelMapper

3. **Create LoadMetadataTreeUseCase** (30 min)
   - Fetch entities and choices
   - Sort and map to ViewModels
   - Unit tests

4. **Create MetadataBrowserPanel** (2 hours)
   - Singleton factory (createOrShow)
   - PanelCoordinator setup
   - Command handlers (stub implementations)
   - Message routing
   - State management integration

5. **Test Phase 1** (30 min)
   - F5 run
   - Verify tree loads
   - Verify environment selector works

---

### Phase 2: Entity Mode (Tabs)

**Goal:** Load and display entity metadata in tabs.

6. **Create LoadEntityMetadataUseCase** (1 hour)
   - Fetch entity metadata
   - Sort and map all tabs
   - Unit tests

7. **Implement handleSelectEntity()** (1 hour)
   - Call use case
   - Send setEntityMode message
   - Enable refresh button

8. **Create MetadataBrowserLayoutSection** (2 hours)
   - Custom section for three-panel layout
   - Tree HTML structure
   - Tab HTML structure
   - DataTable rendering

9. **Test Phase 2** (1 hour)
   - Select entity from tree
   - Verify all 4 tabs render
   - Verify data displays correctly

---

### Phase 3: Choice Mode

**Goal:** Load and display choice values.

10. **Create LoadChoiceMetadataUseCase** (30 min)
    - Fetch choice metadata
    - Map to ViewModels

11. **Implement handleSelectChoice()** (30 min)
    - Call use case
    - Send setChoiceMode message

12. **Test Phase 3** (30 min)
    - Select choice from tree
    - Verify choice values tab renders

---

### Phase 4: Detail Panel

**Goal:** Open detail panel on double-click.

13. **Implement handleOpenDetailPanel()** (1 hour)
    - Call DetailPanelMapper
    - Send showDetailPanel message
    - Persist state

14. **Create SplitPanelBehavior (webview)** (2 hours)
    - Resizable split panel JavaScript
    - Persist width on resize
    - ESC key closes panel

15. **Test Phase 4** (1 hour)
    - Double-click rows
    - Verify detail panel opens
    - Test resize
    - Test close (button + ESC)

---

### Phase 5: Navigation

**Goal:** Navigate via relationship links.

16. **Implement handleNavigateToEntity()** (30 min)
    - Reset to Attributes tab
    - Call handleSelectEntity()

17. **Implement handleNavigateToEntityQuickPick()** (30 min)
    - Show VS Code quick pick
    - Navigate to selected entity

18. **Test Phase 5** (30 min)
    - Click 1:N/N:1 relationship links
    - Click N:N relationship links
    - Verify quick pick appears
    - Verify navigation works

---

### Phase 6: Polish

**Goal:** Complete remaining features.

19. **Implement OpenInMakerUseCase** (30 min)
    - Build Maker URLs
    - Open in browser

20. **Implement State Persistence** (1 hour)
    - Save/load state on all events
    - Test across sessions

21. **Create MetadataBrowserBehavior (webview)** (2 hours)
    - Tree filtering (CSS-based)
    - Sidebar toggle
    - Tab switching

22. **Final Testing** (2 hours)
    - Full workflow testing
    - Error scenarios
    - Performance testing

---

**Total Estimated Time:** ~20 hours

**Critical Path:**
1. Phase 1 (foundation) → Phase 2 (entity mode) → Phase 4 (detail panel)
2. Phase 3 (choice mode) can be done in parallel with Phase 4
3. Phase 5 (navigation) depends on Phase 2
4. Phase 6 (polish) depends on all previous phases

---

## Open Questions

1. **Should we cache metadata in memory?**
   - Pro: Faster navigation between entities
   - Con: Memory usage, cache invalidation complexity
   - **Decision needed:** Yes for tree data, no for entity metadata (refresh on select)

2. **Should we virtualize large tables?**
   - Entities can have 500+ attributes
   - DataTableBehavior.js may need virtualization
   - **Decision needed:** Defer to Phase 6 if performance issues arise

3. **Should we add keyboard shortcuts?**
   - Ctrl+R for refresh
   - Ctrl+E for "Open in Maker"
   - **Decision needed:** Phase 6 enhancement

4. **Should detail panel remember active tab (Properties vs Raw Data)?**
   - Pro: Better UX for users who prefer one tab
   - Con: More state to manage
   - **Decision needed:** No for MVP (always open to Properties tab)

5. **Should we show row count badges on tabs?**
   - Example: `[Attributes (127)]`
   - **Decision needed:** Phase 6 enhancement

6. **Should tree search support regex patterns?**
   - **Decision needed:** No for MVP (simple contains search)

---

## Success Criteria

**MVP is successful when:**

1. ✅ Users can browse all entities and choices for an environment
2. ✅ Users can view all metadata types (Attributes, Keys, Relationships, Privileges, Choice Values)
3. ✅ Users can view detailed metadata for any item via detail panel
4. ✅ Users can copy/paste any data easily (select text + Ctrl+C)
5. ✅ Users can navigate to related entities via hyperlinks (1:N, N:1, N:N)
6. ✅ Users can open entities in Power Apps Maker portal
7. ✅ Panel state persists across sessions (environment, tab, detail panel state)
8. ✅ Loading states and errors are clear and actionable
9. ✅ Performance is responsive (no lag when switching entities/tabs)
10. ✅ All use cases have unit tests (90%+ coverage)

---

## References

- **Requirements:** `docs/design/METADATA_BROWSER_PRESENTATION_REQUIREMENTS.md`
- **Panel Architecture:** `docs/architecture/PANEL_ARCHITECTURE.md`
- **Clean Architecture:** `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md`
- **Logging Guide:** `docs/architecture/LOGGING_GUIDE.md`
- **Domain Layer:** `src/features/metadataBrowser/domain/`
- **Reference Panel:** `src/features/solutionExplorer/presentation/panels/SolutionExplorerPanelComposed.ts`
