# Webview Development Patterns

Webview development patterns for VS Code panels, including message contracts, global variables, CSS layout patterns, and behavior file conventions. Following these patterns prevents common issues encountered during panel development.

---

## Table of Contents

1. [Message Format Contract](#1-message-format-contract)
2. [Global Variables in Webview Context](#2-global-variables-in-webview-context)
3. [CSS Layout for Scrollable Content](#3-css-layout-for-scrollable-content)
4. [Behavior File Patterns](#4-behavior-file-patterns)
5. [Panel Initialization Pattern](#5-panel-initialization-pattern)
6. [New Panel Implementation Checklist](#6-new-panel-implementation-checklist)
7. [Common Mistakes and Solutions](#7-common-mistakes-and-solutions)

---

## 1. Message Format Contract

### The Contract

Messages between webview and extension **MUST** follow this structure:

```typescript
// src/shared/infrastructure/ui/types/WebviewMessage.ts
interface WebviewMessage<T = unknown> {
  readonly command: string;
  readonly data?: T;
}
```

### Why This Matters

The `PanelCoordinator` extracts and passes `message.data` to handlers, **NOT** the entire message:

```typescript
// src/shared/infrastructure/ui/coordinators/PanelCoordinator.ts:171-200
public async handleMessage(message: WebviewMessage): Promise<void> {
  const { command, data } = message;  // <-- data is extracted here
  // ...
  await handler(data);  // <-- only data is passed to handler
}
```

### Correct Pattern

**From webview JavaScript:**
```javascript
// ✅ CORRECT: data payload is wrapped in { data: ... }
window.vscode.postMessage({
  command: 'updateSqlQuery',
  data: { sql: sql }  // Payload goes in data property
});
```

**In TypeScript handler:**
```typescript
coordinator.registerHandler('updateSqlQuery', async (payload) => {
  // payload is { sql: string }, NOT { command: ..., data: ... }
  const { sql } = payload as { sql: string };
});
```

### Incorrect Pattern

```javascript
// ❌ WRONG: Properties at top level won't be passed to handler
window.vscode.postMessage({
  command: 'updateSqlQuery',
  sql: sql  // This property will be LOST
});
```

### Reference Implementation

See `resources/webview/js/behaviors/DataExplorerBehavior.js:64-69`:
```javascript
window.vscode.postMessage({
  command: 'updateSqlQuery',
  data: { sql: sql }  // ✅ Correct structure
});
```

---

## 2. Global Variables in Webview Context

### Available Globals

The `messaging.js` script sets up these globals **before** your behavior runs:

| Global | Type | Description |
|--------|------|-------------|
| `window.vscode` | `WebviewApi` | VS Code API for posting messages back to extension |
| `window.createBehavior()` | `Function` | Helper for creating behavior modules |

### Important: It's `window.vscode`, NOT `window.vscodeApi`

```javascript
// ✅ CORRECT
window.vscode.postMessage({ command: 'refresh' });

// ❌ WRONG - This variable doesn't exist
window.vscodeApi.postMessage({ command: 'refresh' });
```

### The `createBehavior()` Helper

`messaging.js` provides a helper that handles common boilerplate:

```javascript
// resources/webview/js/messaging.js:36-62
window.createBehavior = function(config) {
  // 1. Validates config has initialize function
  // 2. Registers message handler if provided
  // 3. Calls initialize when DOM is ready
};
```

**Usage:**
```javascript
window.createBehavior({
  initialize() {
    // Called when DOM is ready
    // Setup event listeners, wire UI elements
  },
  handleMessage(message) {
    // Called for each message from extension
    // message is the raw event.data (full message object)
    if (message.command === 'queryResultsUpdated') {
      updateResults(message.data);
    }
  }
});
```

### Message Handler Security

`messaging.js` validates message origins:
```javascript
// Only accepts messages from:
// 1. Empty origin (VS Code extension host)
// 2. vscode-webview:// scheme
const origin = event.origin || '';
if (origin !== '' && !origin.startsWith('vscode-webview://')) {
  console.warn('Rejected message from untrusted origin:', event.origin);
  return;
}
```

### Reference Files

- `resources/webview/js/messaging.js` - Global setup and helpers
- `resources/webview/js/behaviors/*.js` - Behavior file examples

---

## 3. CSS Layout for Scrollable Content

### The Problem

Webview panels need scrollable content areas while keeping headers/toolbars fixed. Without proper CSS, content either doesn't scroll or overflows the viewport.

### The Solution: Flexbox with `min-height: 0`

**Critical CSS rules for scrollable content:**

```css
/* Parent container */
.parent {
  display: flex;
  flex-direction: column;
  height: 100%;  /* or 100vh for root */
  overflow: hidden;  /* Don't scroll here */
}

/* Fixed sections (headers, toolbars) */
.header,
.toolbar {
  flex-shrink: 0;  /* Never shrink */
}

/* Scrollable content area */
.content {
  flex: 1;  /* Take remaining space */
  min-height: 0;  /* CRITICAL: Allow shrinking below content size */
  overflow: auto;  /* Enable scrolling */
}
```

### Why `min-height: 0` is Critical

By default, flex items have `min-height: auto`, which prevents them from shrinking below their content size. This breaks scrolling. Setting `min-height: 0` allows the flex item to shrink and enables `overflow: auto` to work.

### Base Layout (layout.css)

```css
/* resources/webview/css/base/layout.css */
.panel-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.toolbar-section {
  flex-shrink: 0;  /* Fixed height */
}

.main-section {
  flex: 1;
  overflow: hidden;  /* Let children scroll */
  min-height: 0;     /* Allow shrinking */
}
```

### Nested Scrollable Containers

For nested structures (e.g., tabs inside main section):

```css
/* metadata-browser.css example */
.tab-content-container {
  flex: 1;
  min-height: 0;  /* Critical for nested flex */
  overflow: hidden;
}

.table-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;  /* Also needs this */
}

.table-wrapper {
  flex: 1;
  overflow: auto;  /* This is where scrolling happens */
}
```

### Constrained Scroll Areas Pattern

For content with a maximum height (e.g., code blocks, detail panels):

```css
.detail-code {
  max-height: 400px;
  overflow: auto;
}

/* Or using calc for viewport-relative sizing */
.constrained-area {
  max-height: calc(100vh - 200px);
  overflow: auto;
}
```

### Reference Files

- `resources/webview/css/base/layout.css` - Base panel layout
- `resources/webview/css/features/metadata-browser.css` - Complex nested layout
- `resources/webview/css/features/plugin-trace-viewer.css` - Split panel layout
- `resources/webview/css/sections/datatable.css` - Table scrolling

---

## 4. Behavior File Patterns

### File Structure

```
resources/webview/js/behaviors/
├── DataTableBehavior.js         # Shared table behavior
├── SolutionExplorerBehavior.js  # Feature-specific
├── DataExplorerBehavior.js      # Feature-specific
└── ...
```

### Standard Behavior Pattern

```javascript
/**
 * [Feature Name] Behavior
 * Handles client-side interactions for the [Feature] panel.
 */

window.createBehavior({
  initialize() {
    // Wire up event listeners
    wireMyFeatureElements();
  },
  handleMessage(message) {
    // Route messages to appropriate handlers
    switch (message.command) {
      case 'updateTableData':
        updateTableData(message.data);
        break;
      case 'showError':
        showError(message.data);
        break;
    }
  }
});

/**
 * Wires up feature-specific elements.
 */
function wireMyFeatureElements() {
  const element = document.getElementById('myElement');
  if (!element) {
    return;  // Guard against missing elements
  }

  element.addEventListener('click', handleClick);
}

/**
 * Updates table data without full page refresh.
 * @param {Object} data - Contains viewModels, columns, isLoading
 */
function updateTableData(data) {
  const { viewModels, columns, isLoading } = data;
  // ... update DOM
}

/**
 * Escapes HTML special characters.
 * ALWAYS use this for user-provided content.
 */
function escapeHtml(str) {
  if (str === null || str === undefined) {
    return '';
  }
  const text = String(str);
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

### Webpack Configuration

**Every behavior file MUST be added to webpack entry points:**

```javascript
// webpack.webview.config.js
entry: {
  // Add new behavior here
  MyFeatureBehavior: './resources/webview/js/behaviors/MyFeatureBehavior.js',
  // ... existing entries
}
```

**If you forget this step:**
- The behavior file won't be bundled
- The webview will silently fail to load the behavior
- Console will show 404 for the bundle file

### CSS Files

Create feature CSS in `resources/webview/css/features/`:

```css
/**
 * [Feature Name] Panel Styles
 * Panel-specific styling for [feature]
 */

/* Import shared styles if needed */
@import url('../shared/resizable-detail-panel.css');

/* Feature-specific styles */
.my-feature-container {
  /* ... */
}
```

### Reference Files

- `resources/webview/js/behaviors/SolutionExplorerBehavior.js` - Simple behavior
- `resources/webview/js/behaviors/DataExplorerBehavior.js` - Complex behavior with multiple handlers

---

## 5. Panel Initialization Pattern

### Overview

Panels use lazy-loading via dynamic imports to reduce extension activation time. This pattern involves:

1. **Initialization file** in `presentation/initialization/`
2. **Command registration** in `extension.ts` and `package.json`
3. **Tree view registration** in `TreeViewProviders.ts` (if applicable)

### Initialization File Pattern

```typescript
// src/features/{feature}/presentation/initialization/initialize{Feature}.ts

import * as vscode from 'vscode';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Lazy-loads and initializes [Feature] panel.
 * Dynamic imports reduce initial extension activation time.
 */
export async function initialize{Feature}(
  context: vscode.ExtensionContext,
  // ... other dependencies
  logger: ILogger
): Promise<void> {
  // Dynamic imports - only loaded when panel is opened
  const { MyService } = await import('../../infrastructure/services/MyService.js');
  const { MyUseCase } = await import('../../application/useCases/MyUseCase.js');
  const { MyPanel } = await import('../panels/MyPanel.js');
  const { MyMapper } = await import('../../application/mappers/MyMapper.js');

  // Create dependencies
  const service = new MyService(logger);
  const useCase = new MyUseCase(service, logger);
  const mapper = new MyMapper();

  // Create/show panel
  await MyPanel.createOrShow(
    context.extensionUri,
    useCase,
    mapper,
    logger
  );
}
```

### Command Registration

**In `extension.ts`:**
```typescript
// Register panel command
const myPanelCommand = vscode.commands.registerCommand(
  'powerPlatformDevSuite.openMyPanel',
  async () => {
    const { initializeMyFeature } = await import('./features/myFeature/presentation/initialization/initializeMyFeature.js');
    await initializeMyFeature(context, /* dependencies */, logger);
  }
);
context.subscriptions.push(myPanelCommand);
```

**In `package.json`:**
```json
{
  "contributes": {
    "commands": [
      {
        "command": "powerPlatformDevSuite.openMyPanel",
        "title": "Open My Panel",
        "category": "Power Platform"
      }
    ]
  }
}
```

### Tree View Registration

If your panel has a sidebar tree view, register in `TreeViewProviders.ts`:

```typescript
// src/infrastructure/dependencyInjection/TreeViewProviders.ts

export function registerTreeViewProviders(
  context: vscode.ExtensionContext,
  // ... dependencies
): void {
  // Register tree view provider
  const myTreeProvider = new MyTreeViewProvider(/* ... */);
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      'powerPlatformDevSuite.myTreeView',
      myTreeProvider
    )
  );
}
```

### Reference Files

- `src/features/solutionExplorer/presentation/initialization/initializeSolutionExplorer.ts`
- `src/extension.ts` - Command registration examples
- `.claude/templates/PANEL_INITIALIZATION_PATTERN.md` - Detailed two-phase initialization

---

## 6. New Panel Implementation Checklist

Use this checklist when implementing a new webview panel to avoid common issues.

### TypeScript (Extension Side)

- [ ] Create panel class with `static currentPanel` singleton pattern
- [ ] Implement `createOrShow()` factory method
- [ ] Create initialization file in `presentation/initialization/`
- [ ] Register command in `extension.ts`
- [ ] Add command to `package.json`
- [ ] Register message handlers using `coordinator.registerHandler()`
- [ ] Use `{ command: string, data?: T }` structure for `postMessage()`

### JavaScript (Webview Side)

- [ ] Create behavior file in `resources/webview/js/behaviors/`
- [ ] Use `window.createBehavior({ initialize(), handleMessage() })` pattern
- [ ] **Add behavior to `webpack.webview.config.js` entry points**
- [ ] Use `window.vscode` (NOT `window.vscodeApi`)
- [ ] Send messages with `{ command: 'x', data: { ... } }` structure
- [ ] Implement `escapeHtml()` for user-provided content
- [ ] Guard against missing DOM elements in `initialize()`

### CSS

- [ ] Create feature CSS in `resources/webview/css/features/`
- [ ] Use proper flexbox layout for scrollable areas:
  - [ ] Parent: `display: flex; flex-direction: column; height: 100%;`
  - [ ] Fixed sections: `flex-shrink: 0;`
  - [ ] Scrollable: `flex: 1; min-height: 0; overflow: auto;`
- [ ] Import shared styles if using common components
- [ ] Use VS Code CSS variables for theming

### Initialization

- [ ] Follow two-phase initialization pattern:
  - [ ] Phase 1: Full HTML refresh for initial load
  - [ ] Phase 2: Message-based updates for user-triggered refresh
- [ ] Handle race condition between `postMessage` and JS load
- [ ] See `.claude/templates/PANEL_INITIALIZATION_PATTERN.md`

### Testing

- [ ] Manual test: Initial load shows loading spinner, then data
- [ ] Manual test: Refresh button updates without losing search state
- [ ] Manual test: Environment change triggers full reload
- [ ] Manual test: Error states display correctly
- [ ] Verify no console errors in webview developer tools

---

## 7. Common Mistakes and Solutions

### Message Not Received by Handler

**Symptom:** Handler never fires even though message is sent.

**Cause:** Message structure doesn't match expected format.

```javascript
// ❌ WRONG
window.vscode.postMessage({ command: 'save', id: 123 });

// ✅ CORRECT
window.vscode.postMessage({ command: 'save', data: { id: 123 } });
```

### Behavior Doesn't Load

**Symptom:** `initialize()` never called, console shows 404 for JS file.

**Cause:** Behavior not added to webpack config.

**Solution:** Add to `webpack.webview.config.js`:
```javascript
entry: {
  MyBehavior: './resources/webview/js/behaviors/MyBehavior.js',
}
```

Then rebuild: `npm run compile:webview` or `npm run watch`.

### Content Doesn't Scroll

**Symptom:** Content overflows viewport or doesn't scroll.

**Cause:** Missing `min-height: 0` on flex containers.

```css
/* ❌ WRONG - default min-height: auto prevents shrinking */
.container {
  flex: 1;
  overflow: auto;
}

/* ✅ CORRECT */
.container {
  flex: 1;
  min-height: 0;  /* Critical! */
  overflow: auto;
}
```

### `window.vscodeApi is undefined`

**Symptom:** Error accessing VS Code API.

**Cause:** Using wrong global name.

```javascript
// ❌ WRONG
window.vscodeApi.postMessage(...);

// ✅ CORRECT
window.vscode.postMessage(...);
```

### Initial Data Doesn't Appear

**Symptom:** Panel loads but shows empty/loading state forever.

**Cause:** Race condition - `postMessage` sent before JS loaded.

**Solution:** Use full HTML refresh for initial load, not `postMessage`.

See `.claude/templates/PANEL_INITIALIZATION_PATTERN.md` for the two-phase pattern.

### XSS Vulnerability

**Symptom:** Security issue with user content.

**Cause:** Not escaping HTML in dynamic content.

```javascript
// ❌ WRONG - XSS vulnerability
element.innerHTML = userInput;

// ✅ CORRECT
element.innerHTML = escapeHtml(userInput);

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}
```

---

## Related Documentation

- `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md` - Panel architecture decision guide
- `.claude/templates/PANEL_INITIALIZATION_PATTERN.md` - Two-phase initialization pattern
- `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md` - Layer boundaries
- `src/shared/infrastructure/ui/types/WebviewMessage.ts` - Message type definition
- `src/shared/infrastructure/ui/coordinators/PanelCoordinator.ts` - Coordinator implementation
