# New Panel

Scaffold a new VS Code panel.

## Usage

```
/new-panel [panel name and purpose]
```

If not provided, ask: "What panel should I create? (name and purpose)"

## Process

1. **Read existing panel for reference**
   - Look at `src/features/solutionExplorer/` or similar existing panel

2. **Create directory structure**
   ```
   src/features/{featureName}/
   ├── {FeatureName}Panel.ts      # Main panel class
   └── {featureName}View.ts       # HTML generation
   ```

3. **Implement panel with singleton pattern**

## Key Patterns

### Singleton Pattern (Required)

```typescript
export class MyPanel {
  private static currentPanel: MyPanel | undefined;

  public static createOrShow(context: vscode.ExtensionContext): void {
    if (MyPanel.currentPanel) {
      MyPanel.currentPanel.panel.reveal();
      return;
    }
    // Create new panel...
  }
}
```

### Webview Message Handling

```typescript
this.panel.webview.onDidReceiveMessage(async (message) => {
  switch (message.command) {
    case 'refresh':
      await this.refresh();
      break;
  }
});

this.panel.webview.postMessage({ type: 'data', payload: result });
```

## After Scaffolding

1. Register command in `package.json`
2. Register panel in `extension.ts`
3. F5 test the panel
4. Iterate until working
