# Panel Development Guide

How to build VS Code panels in the Power Platform Developer Suite.

---

## Overview

This extension is a **UI shell** - panels call CLI commands and render results. Keep panels simple.

---

## Panel Structure

```
src/features/{featureName}/
├── {FeatureName}Panel.ts      # Main panel class (singleton)
└── {featureName}View.ts       # HTML generation
```

---

## Singleton Pattern (Required)

All panels MUST use the singleton pattern:

```typescript
export class MyPanel {
  public static readonly viewType = 'powerPlatformDevSuite.myPanel';
  private static currentPanel: MyPanel | undefined;

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri
  ) {
    // Setup panel
    this.panel.onDidDispose(() => this.dispose());
    this.panel.webview.onDidReceiveMessage(msg => this.handleMessage(msg));
    this.panel.webview.html = this.getHtml();
  }

  public static createOrShow(context: vscode.ExtensionContext): void {
    // Reveal existing panel if it exists
    if (MyPanel.currentPanel) {
      MyPanel.currentPanel.panel.reveal();
      return;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      MyPanel.viewType,
      'My Panel',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    MyPanel.currentPanel = new MyPanel(panel, context.extensionUri);
  }

  private dispose(): void {
    MyPanel.currentPanel = undefined;
    this.panel.dispose();
  }
}
```

---

## Webview Communication

### Extension → Webview

```typescript
// Send data to webview
this.panel.webview.postMessage({
  type: 'data',
  payload: { items: [...] }
});
```

### Webview → Extension

```typescript
// Handle messages from webview
private handleMessage(message: WebviewMessage): void {
  switch (message.command) {
    case 'refresh':
      this.loadData();
      break;
    case 'action':
      this.performAction(message.payload);
      break;
  }
}
```

### Webview JavaScript

```javascript
// In webview HTML
const vscode = acquireVsCodeApi();

// Send message to extension
vscode.postMessage({ command: 'refresh' });

// Receive message from extension
window.addEventListener('message', event => {
  const message = event.data;
  if (message.type === 'data') {
    renderTable(message.payload.items);
  }
});
```

---

## CLI Integration

Panels should call CLI commands for business logic:

```typescript
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

private async loadData(): Promise<void> {
  try {
    const { stdout } = await execFileAsync('ppds', ['plugins', 'list', '--json']);
    const data = JSON.parse(stdout);

    this.panel.webview.postMessage({
      type: 'data',
      payload: data
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to load: ${error.message}`);
  }
}
```

---

## HTML Generation

Keep HTML in a separate view file:

```typescript
// {featureName}View.ts
export function getHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>My Panel</title>
    </head>
    <body>
      <div id="app">
        <h1>My Panel</h1>
        <table id="dataTable"></table>
      </div>
      <script>
        const vscode = acquireVsCodeApi();
        // ... webview JavaScript
      </script>
    </body>
    </html>`;
}
```

---

## Checklist for New Panels

- [ ] Singleton pattern with `createOrShow()`
- [ ] HTML in separate view file
- [ ] Message handling for webview communication
- [ ] CLI calls for data operations
- [ ] Error handling with user-friendly messages
- [ ] Registered in `extension.ts`
- [ ] Command registered in `package.json`
- [ ] F5 tested

---

## Reference Panels

Look at existing panels for examples:
- `src/features/solutionExplorer/` - Data table with filters
- `src/features/pluginTraceViewer/` - Complex filtering
- `src/features/environmentSetup/` - Form-based panel
