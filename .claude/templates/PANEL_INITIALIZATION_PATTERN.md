# Panel Initialization Pattern

Avoid race conditions when initializing VS Code webview panels.

---

## The Problem

When a webview panel initializes, there's a race condition:
1. Extension sets webview HTML
2. Extension sends `postMessage` with data
3. **BUT** JavaScript may not be loaded yet!
4. Message arrives before JS is ready → **LOST**
5. User sees empty panel or loading spinner forever

---

## The Solution

**Embed initial state in HTML**, don't rely on postMessage for initial render.

### Pattern 1: Embed Data in HTML (Recommended)

```typescript
private getHtml(data: MyData[]): string {
  // Embed data directly in HTML
  const dataJson = JSON.stringify(data);

  return `<!DOCTYPE html>
    <html>
    <body>
      <div id="app"></div>
      <script>
        // Data is immediately available - no race condition
        const initialData = ${dataJson};
        renderTable(initialData);

        // Listen for updates AFTER initial render
        window.addEventListener('message', event => {
          if (event.data.type === 'update') {
            renderTable(event.data.payload);
          }
        });
      </script>
    </body>
    </html>`;
}
```

### Pattern 2: Ready Signal

If data isn't available at HTML render time:

```typescript
// Extension side
private constructor(...) {
  this.panel.webview.onDidReceiveMessage(msg => {
    if (msg.command === 'ready') {
      // Webview JS is loaded, safe to send data
      this.sendData();
    }
  });

  this.panel.webview.html = this.getHtml();
}

// Webview side
const vscode = acquireVsCodeApi();

// Signal that JS is ready
vscode.postMessage({ command: 'ready' });

// Now safe to receive data
window.addEventListener('message', event => {
  renderTable(event.data.payload);
});
```

---

## Loading States

Show loading state in initial HTML:

```typescript
private getHtml(): string {
  return `<!DOCTYPE html>
    <html>
    <body>
      <div id="loading">Loading...</div>
      <div id="content" style="display: none;"></div>
      <script>
        const vscode = acquireVsCodeApi();
        vscode.postMessage({ command: 'ready' });

        window.addEventListener('message', event => {
          document.getElementById('loading').style.display = 'none';
          document.getElementById('content').style.display = 'block';
          renderContent(event.data.payload);
        });
      </script>
    </body>
    </html>`;
}
```

---

## Common Mistakes

### ❌ Wrong: Send data immediately after setting HTML

```typescript
this.panel.webview.html = this.getHtml();
// ❌ JS may not be loaded yet!
this.panel.webview.postMessage({ type: 'data', payload: items });
```

### ✅ Correct: Wait for ready signal

```typescript
this.panel.webview.html = this.getHtml();
// Wait for 'ready' message before sending data
```

### ❌ Wrong: No loading state

```typescript
// User sees empty panel while data loads
<body><table id="data"></table></body>
```

### ✅ Correct: Show loading in initial HTML

```typescript
// User sees loading indicator immediately
<body>
  <div id="loading">Loading...</div>
  <table id="data" style="display: none;"></table>
</body>
```

---

## Checklist

- [ ] Initial HTML includes loading state
- [ ] Webview sends "ready" signal when JS loads
- [ ] Extension waits for "ready" before sending data
- [ ] OR data is embedded directly in HTML
- [ ] Updates use postMessage (after initial render)
