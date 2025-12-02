# TypeScript-Based Webview Behaviors - Technical Design

**Status:** Draft
**Date:** 2025-11-17
**Complexity:** Complex

---

## Overview

**User Problem:** Webview behaviors are written in plain JavaScript without type safety, creating an architectural inconsistency with the extension's TypeScript strict mode philosophy and increasing refactoring risk as webview complexity grows.

**Solution:** Migrate webview behaviors from JavaScript to TypeScript with a separate compilation pipeline that maintains clean separation between extension host (Node.js) and webview (browser) contexts while providing full type safety.

**Value:** Eliminates type safety blind spots, enables safe refactoring of complex webview code (1000+ line behaviors), provides IntelliSense for webview development, and establishes scalable foundation for future webview features.

---

## Requirements

### Functional Requirements
- [ ] Webview behaviors written in TypeScript with strict mode enabled
- [ ] TypeScript compilation from source to bundled JavaScript for webview context
- [ ] Shared type definitions for message contracts between extension host and webview
- [ ] Source maps for debugging webview TypeScript code
- [ ] Maintain existing `window.createBehavior()` pattern for consistency
- [ ] Support ES module imports in webview TypeScript code
- [ ] Zero runtime changes to existing panels (backward compatible migration)

### Non-Functional Requirements
- [ ] Build time: Webview compilation adds <5 seconds to full build
- [ ] Developer experience: IntelliSense works in webview TypeScript files
- [ ] Type safety: No `any` types in webview code without explicit justification
- [ ] Bundle size: TypeScript compilation does not significantly increase bundle size
- [ ] Source maps: Webview debugger shows TypeScript source, not compiled JavaScript

### Success Criteria
- [ ] All webview behaviors migrated to TypeScript with strict mode
- [ ] Shared ViewModels used in both extension host and webview contexts
- [ ] Message contracts fully typed (no `any` in postMessage calls)
- [ ] Developer can set breakpoints in TypeScript webview source
- [ ] `npm run compile` successfully builds both extension and webview code
- [ ] Existing panels work identically after migration (no functional changes)

---

## Implementation Slices (Vertical Slicing)

### MVP Slice (Slice 1): "Infrastructure + Single Pilot Migration"
**Goal:** Establish TypeScript compilation pipeline and migrate one simple behavior to prove architecture.

**Infrastructure Setup:**
- Create `src/webview/` directory structure
- Create `tsconfig.webview.json` with DOM types and ES module support
- Update `webpack.webview.config.js` to use `ts-loader` for TypeScript files
- Create shared types directory for message contracts
- Configure source maps for webview debugging

**Pilot Migration:**
- Migrate `DataTableBehavior.js` to TypeScript (simple, well-defined behavior)
- Create type definitions for table message contracts
- Verify compilation, bundling, and runtime behavior
- Test debugging with TypeScript source maps

**Result:** WORKING TYPESCRIPT WEBVIEW INFRASTRUCTURE ✅ (proves entire pipeline)

**Files Created:**
- `src/webview/behaviors/DataTableBehavior.ts`
- `src/webview/types/MessageContracts.ts`
- `src/webview/types/BehaviorConfig.ts`
- `tsconfig.webview.json`
- Updated `webpack.webview.config.js`

---

### Slice 2: "Shared ViewModel Types + Simple Behavior Migration"
**Builds on:** Slice 1

**Shared Types:**
- Extract ViewModels to `src/shared/types/viewModels/` (usable in both contexts)
- Create message contract interfaces for all existing commands
- Define type-safe `window.createBehavior<TMessageData>()` pattern

**Additional Migrations:**
- Migrate `EnvironmentSetupBehavior.js` to TypeScript
- Migrate `ConnectionReferencesBehavior.js` to TypeScript
- Migrate `EnvironmentVariablesBehavior.js` to TypeScript

**Result:** TYPE-SAFE MESSAGE PASSING ✅ (shared types between host and webview)

---

### Slice 3: "Complex Behavior Migration (1000+ Lines)"
**Builds on:** Slice 2

**Complex Migrations:**
- Migrate `PluginTraceViewerBehavior.js` to TypeScript (1113 lines)
- Migrate `MetadataBrowserBehavior.js` to TypeScript (large, complex)
- Migrate `SolutionExplorerBehavior.js` to TypeScript

**Challenges:**
- Large state management in webview
- Complex DOM manipulation logic
- Multiple message types and handlers
- Integration with renderers and utilities

**Result:** COMPLEX BEHAVIORS TYPE-SAFE ✅ (proves scalability)

---

### Slice 4: "Utilities + Final Migration"
**Builds on:** Slice 3

**Remaining Migrations:**
- Migrate `JsonHighlighter.js` to TypeScript
- Migrate `WebviewLogger.js` to TypeScript
- Migrate `TableRenderer.js` to TypeScript
- Migrate `DetailPanelRenderer.js` to TypeScript
- Migrate `DropdownComponent.js` to TypeScript
- Migrate `InputDialog.js` to TypeScript
- Migrate `TimelineBehavior.js` to TypeScript

**Cleanup:**
- Remove old JavaScript files from `resources/webview/js/`
- Update all panel references to use new TypeScript bundle paths
- Final verification testing

**Result:** FULL TYPESCRIPT MIGRATION COMPLETE ✅

---

## Architecture Design

### Directory Structure

```
Power-Platform-Developer-Suite/
├── src/
│   ├── webview/                          # NEW - Webview TypeScript source
│   │   ├── behaviors/                    # Webview behaviors (replaces resources/webview/js/behaviors/)
│   │   │   ├── DataTableBehavior.ts
│   │   │   ├── PluginTraceViewerBehavior.ts
│   │   │   ├── MetadataBrowserBehavior.ts
│   │   │   ├── EnvironmentSetupBehavior.ts
│   │   │   └── ... (all behaviors)
│   │   ├── components/                   # Reusable webview components
│   │   │   ├── DropdownComponent.ts
│   │   │   └── InputDialog.ts
│   │   ├── renderers/                    # DOM rendering utilities
│   │   │   ├── TableRenderer.ts
│   │   │   └── DetailPanelRenderer.ts
│   │   ├── utils/                        # Webview utilities
│   │   │   ├── JsonHighlighter.ts
│   │   │   └── WebviewLogger.ts
│   │   └── types/                        # Webview-specific types
│   │       ├── BehaviorConfig.ts         # window.createBehavior() config type
│   │       ├── VsCodeApi.ts              # VS Code webview API types
│   │       └── DomHelpers.ts             # DOM utility types
│   │
│   ├── shared/
│   │   └── types/                        # NEW - Shared types between host and webview
│   │       ├── viewModels/               # ViewModels (used by both contexts)
│   │       │   ├── PluginTraceViewModel.ts
│   │       │   ├── EntityMetadataViewModel.ts
│   │       │   └── ... (all ViewModels)
│   │       └── messages/                 # Message contracts
│   │           ├── PluginTraceViewerMessages.ts
│   │           ├── MetadataBrowserMessages.ts
│   │           └── BaseMessages.ts
│   │
│   ├── features/                         # Extension host features (unchanged)
│   │   └── ...
│   │
│   └── messaging.js                      # Stays JavaScript (loaded directly in HTML)
│
├── resources/
│   └── webview/
│       ├── js/
│       │   └── messaging.js              # Generic messaging utilities (stays JavaScript)
│       └── css/
│           └── ...
│
├── dist/
│   └── webview/                          # Webpack output (compiled bundles)
│       ├── DataTableBehavior.js
│       ├── DataTableBehavior.js.map
│       ├── PluginTraceViewerBehavior.js
│       ├── PluginTraceViewerBehavior.js.map
│       └── ... (all bundled behaviors)
│
├── tsconfig.json                         # Extension host TypeScript config (unchanged)
├── tsconfig.webview.json                 # NEW - Webview TypeScript config
└── webpack.webview.config.js             # UPDATED - Add ts-loader for TypeScript
```

**Key Decisions:**

1. **Source Location: `src/webview/`** - Keeps TypeScript source in standard `src/` directory
2. **Shared Types: `src/shared/types/`** - ViewModels and message contracts shared between contexts
3. **Messaging.js Stays JavaScript** - Generic messaging utilities loaded directly (no bundling needed)
4. **Separate tsconfig** - `tsconfig.webview.json` for webview-specific compiler options

---

### TypeScript Configuration

#### `tsconfig.webview.json` (NEW)

```json
{
  "compilerOptions": {
    "module": "ES2020",
    "target": "ES2020",
    "lib": [
      "ES2020",
      "DOM"
    ],
    "outDir": "out/webview",
    "sourceMap": true,
    "rootDir": "src/webview",
    "strict": true,
    "isolatedModules": true,
    "moduleResolution": "node",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "noUncheckedIndexedAccess": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true,

    "allowJs": false,
    "checkJs": false,

    "baseUrl": ".",
    "paths": {
      "@shared/*": ["src/shared/*"],
      "@webview/*": ["src/webview/*"]
    }
  },
  "include": [
    "src/webview/**/*",
    "src/shared/types/**/*"
  ],
  "exclude": [
    "node_modules",
    "out",
    "dist",
    "Old/**/*",
    "resources/**/*"
  ]
}
```

**Key Settings:**
- **`module: "ES2020"`** - ES modules for tree-shaking and modern browser support
- **`lib: ["ES2020", "DOM"]`** - ES2020 features + DOM types for webview context
- **`strict: true`** - Full strict mode matching extension host
- **`isolatedModules: true`** - Required for webpack/ts-loader
- **`paths`** - Alias imports for shared types and webview utilities

---

### Webpack Configuration Update

#### `webpack.webview.config.js` (UPDATED)

```javascript
const path = require('path');
const webpack = require('webpack');

/**@type {(env: any, argv: any) => import('webpack').Configuration}*/
module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    target: 'web',
    mode: argv.mode || 'none',

    entry: {
      // TypeScript behaviors (src/webview/behaviors/*.ts)
      DataTableBehavior: './src/webview/behaviors/DataTableBehavior.ts',
      PluginTraceViewerBehavior: './src/webview/behaviors/PluginTraceViewerBehavior.ts',
      MetadataBrowserBehavior: './src/webview/behaviors/MetadataBrowserBehavior.ts',
      EnvironmentSetupBehavior: './src/webview/behaviors/EnvironmentSetupBehavior.ts',
      SolutionExplorerBehavior: './src/webview/behaviors/SolutionExplorerBehavior.ts',
      ConnectionReferencesBehavior: './src/webview/behaviors/ConnectionReferencesBehavior.ts',
      ImportJobViewerBehavior: './src/webview/behaviors/ImportJobViewerBehavior.ts',
      EnvironmentVariablesBehavior: './src/webview/behaviors/EnvironmentVariablesBehavior.ts',
      TimelineBehavior: './src/webview/behaviors/TimelineBehavior.ts',

      // Renderers
      TableRenderer: './src/webview/renderers/TableRenderer.ts',
      DetailPanelRenderer: './src/webview/renderers/DetailPanelRenderer.ts'
    },

    output: {
      path: path.resolve(__dirname, 'dist/webview'),
      filename: '[name].js'
    },

    plugins: [
      new webpack.DefinePlugin({
        'DEV_MODE': JSON.stringify(!isProduction)
      })
    ],

    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@shared': path.resolve(__dirname, 'src/shared'),
        '@webview': path.resolve(__dirname, 'src/webview')
      }
    },

    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.webview.json',
              transpileOnly: false, // Type-check during build
              compilerOptions: {
                noEmit: false
              }
            }
          }
        }
      ]
    },

    devtool: 'source-map', // Full source maps for debugging

    infrastructureLogging: {
      level: 'log'
    }
  };
};
```

**Key Changes:**
- **`ts-loader`** - Compiles TypeScript to JavaScript
- **`configFile: 'tsconfig.webview.json'`** - Uses webview-specific config
- **`resolve.extensions: ['.ts', '.js']`** - Resolves TypeScript imports
- **`resolve.alias`** - Path aliases for clean imports
- **`devtool: 'source-map'`** - Full source maps for debugging (not `nosources-source-map`)

---

## Type Contracts (Define BEFORE Implementation)

### Shared Types Layer

#### Shared ViewModels

```typescript
// src/shared/types/viewModels/PluginTraceViewModel.ts

/**
 * ViewModel for plugin trace table row.
 *
 * SHARED: Used by both extension host (PluginTraceViewModelMapper) and webview (PluginTraceViewerBehavior).
 *
 * All properties are formatted strings ready for display.
 */
export interface PluginTraceTableRowViewModel {
  readonly [key: string]: unknown; // Allow table renderer to iterate properties
  readonly createdOn: string;
  readonly pluginName: string;
  readonly pluginNameHtml: string;
  readonly entityName: string;
  readonly messageName: string;
  readonly operationType: string;
  readonly mode: string;
  readonly depth: string;
  readonly duration: string;
  readonly status: string;
  readonly statusClass: string;
}

/**
 * ViewModel for plugin trace detail panel.
 *
 * SHARED: Used by both extension host and webview.
 */
export interface PluginTraceDetailViewModel {
  readonly id: string;
  readonly createdOn: string;
  readonly pluginName: string;
  readonly entityName: string;
  readonly messageName: string;
  readonly operationType: string;
  readonly mode: string;
  readonly stage: string;
  readonly depth: string;
  readonly duration: string;
  readonly constructorDuration: string;
  readonly executionStartTime: string;
  readonly constructorStartTime: string;
  readonly status: string;
  readonly statusBadgeClass: string;
  readonly exceptionDetails: string;
  readonly messageBlock: string;
  readonly configuration: string;
  readonly secureConfiguration: string;
  readonly correlationId: string;
  readonly requestId: string;
  readonly pluginStepId: string;
  readonly persistenceKey: string;
  readonly organizationId: string;
  readonly profile: string;
  readonly isSystemCreated: string;
  readonly createdBy: string;
  readonly createdOnBehalfBy: string;
}
```

#### Message Contracts

```typescript
// src/shared/types/messages/BaseMessages.ts

/**
 * Base message sent from webview to extension host.
 */
export interface WebviewMessage<TCommand extends string = string, TData = unknown> {
  readonly command: TCommand;
  readonly data?: TData;
}

/**
 * Base message sent from extension host to webview.
 */
export interface HostMessage<TCommand extends string = string, TData = unknown> {
  readonly command: TCommand;
  readonly data?: TData;
}

/**
 * Message to update table data without full page refresh.
 */
export interface UpdateTableDataMessage<TViewModel> extends HostMessage<'updateTableData'> {
  readonly command: 'updateTableData';
  readonly data: {
    readonly viewModels: readonly TViewModel[];
    readonly columns: readonly TableColumn[];
    readonly isLoading?: boolean;
  };
}

/**
 * Table column definition.
 */
export interface TableColumn {
  readonly key: string;
  readonly label: string;
  readonly sortable?: boolean;
}
```

```typescript
// src/shared/types/messages/PluginTraceViewerMessages.ts

import type { WebviewMessage, HostMessage, UpdateTableDataMessage } from './BaseMessages';
import type { PluginTraceTableRowViewModel, PluginTraceDetailViewModel } from '../viewModels/PluginTraceViewModel';
import type { TimelineViewModel } from '../viewModels/TimelineViewModel';

/**
 * Commands sent from webview to extension host.
 */
export type PluginTraceViewerWebviewCommand =
  | 'refresh'
  | 'openMaker'
  | 'environmentChange'
  | 'viewDetail'
  | 'viewTrace'
  | 'closeDetail'
  | 'deleteSelected'
  | 'deleteAll'
  | 'deleteOld'
  | 'exportCsv'
  | 'exportJson'
  | 'setTraceLevel'
  | 'setAutoRefresh'
  | 'loadRelatedTraces'
  | 'loadTimeline'
  | 'applyFilters'
  | 'clearFilters';

/**
 * Message: View trace detail
 */
export interface ViewDetailMessage extends WebviewMessage<'viewDetail'> {
  readonly command: 'viewDetail';
  readonly data: {
    readonly traceId: string;
  };
}

/**
 * Message: Delete selected traces
 */
export interface DeleteSelectedMessage extends WebviewMessage<'deleteSelected'> {
  readonly command: 'deleteSelected';
  readonly data: {
    readonly traceIds: readonly string[];
  };
}

/**
 * Message: Environment change
 */
export interface EnvironmentChangeMessage extends WebviewMessage<'environmentChange'> {
  readonly command: 'environmentChange';
  readonly data: {
    readonly environmentId: string;
  };
}

/**
 * Union of all webview messages.
 */
export type PluginTraceViewerWebviewMessage =
  | ViewDetailMessage
  | DeleteSelectedMessage
  | EnvironmentChangeMessage
  | WebviewMessage<PluginTraceViewerWebviewCommand>;

/**
 * Commands sent from extension host to webview.
 */
export type PluginTraceViewerHostCommand =
  | 'updateTableData'
  | 'updateDetailPanel'
  | 'updateTimeline'
  | 'clearFilterPanel'
  | 'updateDropdownState';

/**
 * Message: Update table data
 */
export type UpdatePluginTraceTableMessage = UpdateTableDataMessage<PluginTraceTableRowViewModel>;

/**
 * Message: Update detail panel
 */
export interface UpdateDetailPanelMessage extends HostMessage<'updateDetailPanel'> {
  readonly command: 'updateDetailPanel';
  readonly data: PluginTraceDetailViewModel;
}

/**
 * Message: Update timeline
 */
export interface UpdateTimelineMessage extends HostMessage<'updateTimeline'> {
  readonly command: 'updateTimeline';
  readonly data: TimelineViewModel;
}

/**
 * Union of all host messages.
 */
export type PluginTraceViewerHostMessage =
  | UpdatePluginTraceTableMessage
  | UpdateDetailPanelMessage
  | UpdateTimelineMessage
  | HostMessage<PluginTraceViewerHostCommand>;
```

---

### Webview Types Layer

#### Behavior Configuration

```typescript
// src/webview/types/BehaviorConfig.ts

/**
 * Configuration for window.createBehavior().
 *
 * Generic over message type for type-safe message handling.
 */
export interface BehaviorConfig<TMessage = unknown> {
  /**
   * Initialize behavior when DOM is ready.
   *
   * Setup event listeners, wire up UI, perform initial rendering.
   */
  initialize(): void;

  /**
   * Handle messages from extension host.
   *
   * @param message - Typed message from extension host
   */
  handleMessage(message: TMessage): void;
}

/**
 * Creates and initializes a webview behavior.
 *
 * Handles common boilerplate:
 * - VS Code API access
 * - DOM ready detection
 * - Message handler registration
 *
 * @param config - Behavior configuration
 */
declare global {
  interface Window {
    createBehavior<TMessage = unknown>(config: BehaviorConfig<TMessage>): void;
  }
}
```

#### VS Code API

```typescript
// src/webview/types/VsCodeApi.ts

/**
 * VS Code webview API.
 *
 * Acquired via acquireVsCodeApi() in webview context.
 */
export interface VsCodeApi {
  /**
   * Get persisted state.
   */
  getState(): unknown;

  /**
   * Set persisted state.
   */
  setState(state: unknown): void;

  /**
   * Send message to extension host.
   */
  postMessage(message: unknown): void;
}

declare global {
  interface Window {
    vscode: VsCodeApi;
    acquireVsCodeApi(): VsCodeApi;
  }
}
```

---

### Extension Host Updates

#### Panel Message Sending (Type-Safe)

```typescript
// src/features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanelComposed.ts

import type { UpdatePluginTraceTableMessage, UpdateDetailPanelMessage } from '@shared/types/messages/PluginTraceViewerMessages';
import type { PluginTraceTableRowViewModel } from '@shared/types/viewModels/PluginTraceViewModel';

export class PluginTraceViewerPanelComposed {
  private async handleRefresh(): Promise<void> {
    const entities = await this.getTracesUseCase.execute(this.currentEnvironmentId);
    const viewModels: readonly PluginTraceTableRowViewModel[] = entities.map(e =>
      this.mapper.toTableRowViewModel(e)
    );

    // Type-safe message sending
    const message: UpdatePluginTraceTableMessage = {
      command: 'updateTableData',
      data: {
        viewModels,
        columns: this.getTableConfig().columns,
        isLoading: false
      }
    };

    await this.panel.webview.postMessage(message);
  }

  private async handleViewDetail(traceId: string): Promise<void> {
    const trace = await this.getTraceByIdUseCase.execute(traceId);
    const viewModel = this.mapper.toDetailViewModel(trace);

    // Type-safe message sending
    const message: UpdateDetailPanelMessage = {
      command: 'updateDetailPanel',
      data: viewModel
    };

    await this.panel.webview.postMessage(message);
  }
}
```

---

### Webview TypeScript Implementation

#### Example: DataTableBehavior

```typescript
// src/webview/behaviors/DataTableBehavior.ts

import type { BehaviorConfig } from '@webview/types/BehaviorConfig';
import type { UpdateTableDataMessage } from '@shared/types/messages/BaseMessages';

/**
 * Data Table Behavior.
 *
 * Handles client-side table interactions:
 * - Row striping
 * - Search filtering
 * - Table updates without full page refresh
 */
window.createBehavior<UpdateTableDataMessage<unknown>>({
  initialize() {
    setupRowStriping();
    setupSearch();
  },

  handleMessage(message) {
    if (message.command === 'updateTableData') {
      updateTableData(message.data);
    }
  }
});

/**
 * Setup alternating row colors (zebra striping).
 */
function setupRowStriping(): void {
  const table = document.querySelector('table');
  if (!table) {
    return;
  }

  // Apply striping on initial load
  applyStriping(table);

  // Re-apply striping when table updates
  table.addEventListener('tableUpdated', () => {
    applyStriping(table);
  });
}

/**
 * Apply zebra striping to visible rows.
 */
function applyStriping(table: HTMLTableElement): void {
  const rows = table.querySelectorAll<HTMLTableRowElement>('tbody tr');
  let visibleIndex = 0;

  rows.forEach(row => {
    if (row.style.display !== 'none') {
      row.classList.toggle('even-row', visibleIndex % 2 === 0);
      row.classList.toggle('odd-row', visibleIndex % 2 === 1);
      visibleIndex++;
    }
  });
}

/**
 * Setup client-side search filtering.
 */
function setupSearch(): void {
  const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
  if (!searchInput) {
    return;
  }

  searchInput.addEventListener('input', () => {
    performSearch(searchInput.value.toLowerCase());
  });
}

/**
 * Filter table rows based on search query.
 */
function performSearch(query: string): void {
  const tbody = document.querySelector('tbody');
  if (!tbody) {
    return;
  }

  const rows = tbody.querySelectorAll<HTMLTableRowElement>('tr');
  let visibleCount = 0;

  rows.forEach(row => {
    const text = row.textContent?.toLowerCase() ?? '';
    const matches = query === '' || text.includes(query);

    row.style.display = matches ? '' : 'none';
    if (matches) {
      visibleCount++;
    }
  });

  // Update footer with count
  window.TableRenderer?.updateTableFooter(visibleCount);

  // Re-apply striping to visible rows
  const table = document.querySelector('table');
  if (table) {
    table.dispatchEvent(new Event('tableUpdated', { bubbles: true }));
  }
}

/**
 * Update table data without full page refresh.
 */
function updateTableData(data: {
  readonly viewModels: readonly unknown[];
  readonly columns: readonly { key: string; label: string }[];
  readonly isLoading?: boolean;
}): void {
  const { viewModels, columns, isLoading } = data;
  const tbody = document.querySelector('tbody');

  if (!tbody) {
    console.warn('[DataTableBehavior] No tbody found for table update');
    return;
  }

  if (isLoading) {
    window.TableRenderer?.showTableLoading(tbody, 'Loading data...');
    return;
  }

  // Render new rows
  const rowsHtml = window.TableRenderer?.renderTableRows(viewModels, columns) ?? '';
  tbody.innerHTML = rowsHtml;

  // Re-apply search filter if active
  const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
  if (searchInput?.value) {
    performSearch(searchInput.value.toLowerCase());
  } else {
    window.TableRenderer?.updateTableFooter(viewModels.length);
  }

  // Trigger table update event for striping
  const table = document.querySelector('table');
  if (table) {
    table.dispatchEvent(new Event('tableUpdated', { bubbles: true }));
  }
}
```

#### Example: PluginTraceViewerBehavior (Complex)

```typescript
// src/webview/behaviors/PluginTraceViewerBehavior.ts

import type { BehaviorConfig } from '@webview/types/BehaviorConfig';
import type {
  PluginTraceViewerHostMessage,
  UpdatePluginTraceTableMessage,
  UpdateDetailPanelMessage,
  UpdateTimelineMessage
} from '@shared/types/messages/PluginTraceViewerMessages';
import type { PluginTraceTableRowViewModel, PluginTraceDetailViewModel } from '@shared/types/viewModels/PluginTraceViewModel';
import type { TimelineViewModel } from '@shared/types/viewModels/TimelineViewModel';
import { JsonHighlighter } from '@webview/utils/JsonHighlighter';

/**
 * Plugin Trace Viewer Behavior.
 *
 * Handles all client-side interactions for the Plugin Trace Viewer panel:
 * - Table updates
 * - Detail panel display
 * - Timeline rendering
 * - Filter panel management
 * - Row selection
 */

// Module-level state
let currentTraceData: PluginTraceDetailViewModel | null = null;
let currentTraces: readonly PluginTraceTableRowViewModel[] = [];
let timelineData: TimelineViewModel | null = null;

window.createBehavior<PluginTraceViewerHostMessage>({
  initialize() {
    setupTraceLevelButton();
    setupDetailPanelTabs();
    setupDetailPanelVisibility();
    setupRowSelection();
    initializeDropdowns();
    setupFilterPanel();
  },

  handleMessage(message) {
    switch (message.command) {
      case 'updateTableData':
        updateTableData(message.data);
        break;
      case 'updateDetailPanel':
        updateDetailPanel(message.data);
        break;
      case 'updateTimeline':
        updateTimeline(message.data);
        break;
      case 'clearFilterPanel':
        clearFilterPanel();
        break;
      case 'updateDropdownState':
        window.updateDropdownState?.(
          message.data.dropdownId,
          message.data.selectedId
        );
        break;
    }
  }
});

/**
 * Updates table data without full page refresh.
 */
function updateTableData(data: UpdatePluginTraceTableMessage['data']): void {
  const { viewModels, columns, isLoading } = data;
  currentTraces = viewModels;

  const tbody = document.querySelector('tbody');
  if (!tbody) {
    console.warn('[PluginTraceViewer] No tbody found for table update');
    return;
  }

  if (isLoading) {
    window.TableRenderer?.showTableLoading(tbody, 'Loading plugin traces...');
    return;
  }

  const rowsHtml = window.TableRenderer?.renderTableRows(viewModels, columns) ?? '';
  tbody.innerHTML = rowsHtml;

  // Re-apply search filter if active
  const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
  if (searchInput?.value) {
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    window.TableRenderer?.updateTableFooter(viewModels.length);
  }

  // Re-apply row striping
  const table = document.querySelector('table');
  if (table) {
    table.dispatchEvent(new Event('tableUpdated', { bubbles: true }));
  }
}

/**
 * Updates detail panel with trace information.
 */
function updateDetailPanel(data: PluginTraceDetailViewModel): void {
  const detailSection = document.querySelector('.detail-section');
  if (!detailSection) {
    console.warn('[PluginTraceViewer] No detail section found for panel update');
    return;
  }

  currentTraceData = data;

  // Render detail panel using DetailPanelRenderer
  const detailHtml = window.DetailPanelRenderer?.renderPluginTraceDetail(data) ?? '';
  detailSection.innerHTML = detailHtml;

  // Re-setup detail panel interactions
  setupDetailPanelTabs();
  setupDetailPanelVisibility();

  // Show detail section
  detailSection.classList.remove('hidden');

  // Highlight JSON in configuration fields
  highlightJsonFields();
}

/**
 * Updates timeline visualization.
 */
function updateTimeline(data: TimelineViewModel): void {
  timelineData = data;

  const timelineContainer = document.getElementById('timeline-container');
  if (!timelineContainer) {
    console.warn('[PluginTraceViewer] No timeline container found');
    return;
  }

  // Render timeline using TimelineBehavior
  if (window.renderTimeline) {
    window.renderTimeline(timelineContainer, data);
  }
}

/**
 * Setup detail panel tab switching.
 */
function setupDetailPanelTabs(): void {
  const tabButtons = document.querySelectorAll<HTMLButtonElement>('[data-tab]');
  const tabPanes = document.querySelectorAll<HTMLDivElement>('.tab-pane');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.dataset['tab'];
      if (!targetTab) {
        return;
      }

      // Update active button
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      // Update visible pane
      tabPanes.forEach(pane => {
        if (pane.id === targetTab) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      });
    });
  });
}

/**
 * Highlight JSON fields in detail panel.
 */
function highlightJsonFields(): void {
  const jsonFields = document.querySelectorAll<HTMLPreElement>('.json-field');
  jsonFields.forEach(field => {
    const jsonText = field.textContent ?? '';
    try {
      const parsed = JSON.parse(jsonText);
      const highlighted = JsonHighlighter.highlight(parsed);
      field.innerHTML = highlighted;
    } catch {
      // Not valid JSON - leave as-is
    }
  });
}

// ... additional helper functions
```

---

## Migration Strategy

### Phase 1: Infrastructure Setup (Week 1)

**Goal:** Establish TypeScript compilation pipeline without breaking existing functionality.

**Tasks:**
1. Create `src/webview/` directory structure
2. Create `tsconfig.webview.json` configuration
3. Update `webpack.webview.config.js` to support TypeScript
4. Add `ts-loader` to dependencies
5. Configure source maps for debugging
6. Test compilation with empty TypeScript file

**Verification:**
- [ ] `npm run build:webview` compiles TypeScript successfully
- [ ] Source maps generated in `dist/webview/`
- [ ] No changes to existing panels (still use JavaScript)

---

### Phase 2: Shared Types (Week 1-2)

**Goal:** Extract shared ViewModels and message contracts to shared location.

**Tasks:**
1. Create `src/shared/types/viewModels/` directory
2. Move ViewModels from `src/features/*/application/viewModels/` to shared location
3. Create message contract interfaces in `src/shared/types/messages/`
4. Update extension host imports to use shared types
5. Create webview-specific types (`BehaviorConfig`, `VsCodeApi`)

**Verification:**
- [ ] Extension host uses shared ViewModels (compilation succeeds)
- [ ] Message contracts fully typed
- [ ] No runtime changes to extension behavior

---

### Phase 3: Pilot Migration (Week 2)

**Goal:** Migrate one simple behavior to TypeScript to validate architecture.

**Tasks:**
1. Migrate `DataTableBehavior.js` → `DataTableBehavior.ts`
2. Type all message handlers
3. Update webpack entry point
4. Test in panel (verify identical behavior)
5. Test debugging with TypeScript source maps

**Verification:**
- [ ] TypeScript behavior compiles and bundles correctly
- [ ] Panel functionality identical to JavaScript version
- [ ] Breakpoints work in TypeScript source
- [ ] IntelliSense works in webview TypeScript

---

### Phase 4: Simple Behaviors (Week 2-3)

**Goal:** Migrate simple behaviors to build confidence.

**Migrations:**
- `EnvironmentSetupBehavior.js` → TypeScript
- `ConnectionReferencesBehavior.js` → TypeScript
- `EnvironmentVariablesBehavior.js` → TypeScript
- `ImportJobViewerBehavior.js` → TypeScript
- `SolutionExplorerBehavior.js` → TypeScript

**Verification:**
- [ ] Each behavior tested in respective panel
- [ ] No functional regressions
- [ ] Type safety improves code quality

---

### Phase 5: Complex Behaviors (Week 3-4)

**Goal:** Migrate large, complex behaviors to prove scalability.

**Migrations:**
- `PluginTraceViewerBehavior.js` (1113 lines) → TypeScript
- `MetadataBrowserBehavior.js` (large, complex) → TypeScript

**Challenges:**
- Large state management
- Complex DOM manipulation
- Multiple message types
- Integration with renderers

**Verification:**
- [ ] All functionality preserved
- [ ] Type safety catches potential bugs
- [ ] Refactoring easier with types

---

### Phase 6: Utilities + Cleanup (Week 4)

**Goal:** Complete migration and remove old JavaScript files.

**Migrations:**
- `JsonHighlighter.js` → TypeScript
- `WebviewLogger.js` → TypeScript
- `TableRenderer.js` → TypeScript
- `DetailPanelRenderer.js` → TypeScript
- `DropdownComponent.js` → TypeScript
- `InputDialog.js` → TypeScript
- `TimelineBehavior.js` → TypeScript

**Cleanup:**
- Remove `resources/webview/js/behaviors/` (old JavaScript)
- Remove `resources/webview/js/renderers/`
- Remove `resources/webview/js/components/`
- Remove `resources/webview/js/utils/` (except `messaging.js`)
- Update documentation

**Verification:**
- [ ] All webview code in TypeScript
- [ ] No JavaScript files in behaviors/renderers/components/utils
- [ ] All panels tested and working
- [ ] Build pipeline clean

---

## Build System Design

### NPM Scripts (No Changes)

Existing scripts already support webview compilation:

```json
{
  "scripts": {
    "compile": "npm run lint:all && npm test && npm run build:extension && npm run build:webview",
    "build:webview": "webpack --mode development --config webpack.webview.config.js",
    "watch:webview": "webpack --config webpack.webview.config.js --watch"
  }
}
```

### Development Workflow

**Standard Development:**
```bash
# Full build (extension + webview)
npm run compile

# Watch mode (auto-rebuild on changes)
npm run watch

# Watch webview only
npm run watch:webview
```

**Debugging Webview:**
1. Set breakpoint in TypeScript source (e.g., `src/webview/behaviors/PluginTraceViewerBehavior.ts`)
2. Launch extension (F5)
3. Open panel
4. Open Developer Tools (Help → Toggle Developer Tools)
5. Breakpoint hits in TypeScript source (not compiled JavaScript)

---

## Testing Strategy

### Type Safety Verification

**Automated Type Checks:**
- `npm run compile` verifies webview TypeScript compiles without errors
- Strict mode catches type issues at compile time
- No `any` types without explicit justification

**Manual Type Verification:**
- IntelliSense shows correct types in webview code
- Message contracts validated at compile time
- Shared ViewModels prevent type drift between host and webview

### Functional Testing (Per Migration)

**For Each Migrated Behavior:**

1. **Compile Test:**
   - TypeScript compiles without errors
   - Bundle generated in `dist/webview/`
   - Source map generated

2. **Runtime Test:**
   - Panel opens without errors
   - All buttons/controls work
   - Data displays correctly
   - Interactions work (search, filter, sort)

3. **Message Test:**
   - Extension host → webview messages handled correctly
   - Webview → extension host messages received correctly
   - Type safety enforced at compile time

4. **Regression Test:**
   - Side-by-side comparison with JavaScript version
   - Identical functionality
   - No visual differences
   - No performance degradation

### Integration Testing

**After Full Migration:**

1. Test all panels with TypeScript behaviors
2. Verify source maps work for debugging
3. Verify IntelliSense works in webview code
4. Verify no JavaScript files remain in behaviors/renderers/components

---

## Clean Architecture Compliance Checklist

**Webview Layer:**
- [ ] Webview behaviors have ZERO business logic (only UI interactions)
- [ ] Webview behaviors handle messages from extension host
- [ ] Webview behaviors send commands to extension host (no direct API calls)
- [ ] Webview behaviors use shared ViewModels (DTOs from extension host)
- [ ] No `any` types without explicit justification
- [ ] Explicit types on all message handlers

**Shared Types Layer:**
- [ ] ViewModels are simple DTOs (no behavior)
- [ ] Message contracts fully typed
- [ ] No circular dependencies between host and webview

**Extension Host Layer:**
- [ ] Panels send type-safe messages to webview
- [ ] Panels use shared ViewModels when sending data
- [ ] No dependency on webview implementation details

**Type Safety:**
- [ ] All webview TypeScript files compile with strict mode
- [ ] Message contracts prevent type mismatches
- [ ] IntelliSense works in webview code
- [ ] Source maps enable debugging TypeScript source

---

## Key Architectural Decisions

### Decision 1: Source Location (`src/webview/` vs `resources/webview/ts/`)

**Considered:**
- `src/webview/` - TypeScript source in standard `src/` directory
- `resources/webview/ts/` - TypeScript source alongside JavaScript
- `src/presentation/webview/` - Webview as part of presentation layer

**Chosen:** `src/webview/`

**Rationale:**
- Consistent with project convention (TypeScript in `src/`)
- Clear separation from resources (static assets)
- Easy path aliasing (`@webview/*`)
- Build tool conventions expect source in `src/`

**Tradeoffs:**
- **Gained:** Consistency, clear separation, standard conventions
- **Lost:** Webview source not physically near CSS/HTML resources (but logical separation is correct)

---

### Decision 2: Separate tsconfig (`tsconfig.webview.json` vs single config)

**Considered:**
- Single `tsconfig.json` with different `lib` settings
- Separate `tsconfig.webview.json` for webview context
- Project references for multi-context compilation

**Chosen:** Separate `tsconfig.webview.json`

**Rationale:**
- Extension host needs Node.js types (`lib: ["ES2020"]`)
- Webview needs DOM types (`lib: ["ES2020", "DOM"]`)
- Different module systems (extension: `node16`, webview: `ES2020`)
- Clearer separation of concerns

**Tradeoffs:**
- **Gained:** Clear separation, context-appropriate types, no type conflicts
- **Lost:** Slight complexity (two configs to maintain)

---

### Decision 3: Shared Types Location (`src/shared/types/` vs per-feature)

**Considered:**
- `src/shared/types/` - Centralized shared types
- Per-feature ViewModels (keep in `src/features/*/application/viewModels/`)
- Separate `@types/` package

**Chosen:** `src/shared/types/`

**Rationale:**
- ViewModels are shared between extension host and webview (truly shared)
- Message contracts bridge the host/webview boundary
- Single source of truth prevents type drift
- Easy path aliasing (`@shared/types/*`)

**Tradeoffs:**
- **Gained:** No type duplication, single source of truth, type safety across boundary
- **Lost:** ViewModels not physically in feature directories (but they're shared, not feature-specific)

---

### Decision 4: Webpack Loader (ts-loader vs babel vs esbuild)

**Considered:**
- `ts-loader` - TypeScript's official webpack loader
- `babel-loader` with `@babel/preset-typescript`
- `esbuild-loader` - Fast alternative

**Chosen:** `ts-loader`

**Rationale:**
- Official TypeScript support (best type-checking)
- Already used for extension host compilation
- Full type-checking during build (`transpileOnly: false`)
- Reliable source map generation
- Project already uses ts-loader (consistency)

**Tradeoffs:**
- **Gained:** Full type-checking, reliable, official support
- **Lost:** Slightly slower than esbuild-loader (acceptable for this project size)

---

### Decision 5: Migration Approach (big bang vs incremental)

**Considered:**
- Big bang migration (all behaviors at once)
- Incremental per-feature migration
- Dual support (JavaScript and TypeScript simultaneously)

**Chosen:** Incremental per-feature migration

**Rationale:**
- Lower risk (test each migration before next)
- Can validate architecture with pilot migration
- Easier to troubleshoot issues
- Allows learning and iteration
- No need to dual-support (webpack handles both `.js` and `.ts` entry points)

**Tradeoffs:**
- **Gained:** Low risk, incremental validation, learning opportunity
- **Lost:** Longer migration timeline (acceptable, ~4 weeks total)

---

## Dependencies & Prerequisites

### External Dependencies

**New NPM Packages:**
- [ ] `ts-loader` - TypeScript webpack loader (already installed for extension host)
- [ ] No new packages required (ts-loader already in dependencies)

**TypeScript Configuration:**
- [ ] `tsconfig.webview.json` - Webview TypeScript configuration
- [ ] Updated `webpack.webview.config.js` - Add ts-loader rule

### Internal Prerequisites

**Existing Infrastructure:**
- [ ] Webpack already configured for webview bundling
- [ ] VS Code webview architecture in place
- [ ] PanelCoordinator pattern established
- [ ] `window.createBehavior()` pattern in use

**Required Before Migration:**
- [ ] All existing panels tested and working (baseline)
- [ ] Build pipeline stable
- [ ] No outstanding webview bugs

### Breaking Changes

- [ ] None - migration is backward compatible
- [ ] Old JavaScript files removed only AFTER successful TypeScript migration per behavior
- [ ] Panels continue to work during migration (incremental approach)

---

## Open Questions

- [ ] **Q:** Should `messaging.js` be migrated to TypeScript?
  - **A:** NO - `messaging.js` is generic utilities loaded directly in HTML (no bundling). Keep as JavaScript for simplicity. Only bundle feature-specific behaviors.

- [ ] **Q:** Should we create utility base classes for behaviors?
  - **A:** DEFER - Start with functional approach matching existing pattern. Consider base classes if duplication emerges during migration.

- [ ] **Q:** How to handle CSS module types (if we add CSS imports)?
  - **A:** OUT OF SCOPE - CSS stays in `resources/webview/css/`, loaded via HtmlScaffoldingBehavior. No CSS imports in TypeScript.

- [ ] **Q:** Should webview behaviors have unit tests?
  - **A:** DEFER - Focus on type safety and functional testing for initial migration. Consider webview unit tests as future enhancement.

- [ ] **Q:** Should we use strict DOM types (e.g., `HTMLTableElement` vs `Element`)?
  - **A:** YES - Use strict DOM types (e.g., `querySelector<HTMLTableElement>('table')`) for better type safety and IntelliSense.

---

## References

**Architecture Guides:**
- `CLAUDE.md` - Project coding rules and TypeScript strict mode requirements
- `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md` - Clean architecture principles
- `docs/architecture/PANEL_ARCHITECTURE.md` - Panel composition architecture

**Existing Patterns:**
- `resources/webview/js/messaging.js` - Generic messaging utilities
- `src/features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanelComposed.ts` - Panel using PanelCoordinator
- `resources/webview/js/behaviors/PluginTraceViewerBehavior.js` - Complex behavior example

**TypeScript Configuration:**
- `tsconfig.json` - Extension host TypeScript configuration (reference for strict mode)
- `webpack.config.js` - Extension host webpack configuration (ts-loader usage)

**Build System:**
- `webpack.webview.config.js` - Webview webpack configuration
- `package.json` - NPM scripts for build pipeline

---

## Review & Approval

### Design Phase
- [ ] design-architect review (this document)
- [ ] Human approval of design

### Implementation Phase (per slice)
- [ ] Slice 1: Infrastructure + Pilot Migration
- [ ] Slice 2: Shared Types + Simple Behaviors
- [ ] Slice 3: Complex Behaviors
- [ ] Slice 4: Utilities + Cleanup

### Final Approval
- [ ] All webview behaviors migrated to TypeScript
- [ ] All panels tested and working
- [ ] `npm run compile` passes with zero errors
- [ ] Documentation updated
- [ ] code-guardian final approval

**Status:** Draft - Pending Review
**Approver:** TBD
**Date:** TBD

---

## Success Metrics

**Type Safety:**
- ✅ 100% of webview behaviors in TypeScript with strict mode
- ✅ Zero `any` types without explicit justification
- ✅ All message contracts fully typed

**Developer Experience:**
- ✅ IntelliSense works in all webview TypeScript files
- ✅ Breakpoints work in TypeScript source (not compiled JavaScript)
- ✅ Build time increase <5 seconds

**Quality:**
- ✅ No functional regressions after migration
- ✅ All panels tested and working
- ✅ Type safety catches at least 3 bugs during migration

**Maintainability:**
- ✅ Shared ViewModels prevent type drift
- ✅ Refactoring webview code safer with types
- ✅ New developers onboard faster with type hints
