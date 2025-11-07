# Data-Driven Webview Update Pattern

Quick reference for implementing data-driven updates in VS Code webview panels.

## Pattern Overview

Instead of regenerating full HTML when data changes, send **ViewModels** via `postMessage` and let frontend render the updates.

**Benefits:**
- ✅ No visual flash on updates
- ✅ Event listeners survive (dropdowns, tabs, search)
- ✅ Faster updates (targeted DOM changes)
- ✅ Better user experience

## Implementation Steps

### 1. Create Frontend Renderer

**Location:** `resources/webview/js/renderers/YourRenderer.js`

```javascript
function escapeHtml(text) {
	if (text === null || text === undefined) return '';
	const str = String(text);
	const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
	return str.replace(/[&<>"']/g, char => map[char] || char);
}

function renderYourComponent(viewModel) {
	return `<div>${escapeHtml(viewModel.someField)}</div>`;
}

// Make available globally
window.YourRenderer = {
	renderYourComponent
};
```

### 2. Add to Webpack Config

**File:** `webpack.webview.config.js`

```javascript
entry: {
	YourRenderer: './resources/webview/js/renderers/YourRenderer.js'
},
```

### 3. Load Script in Panel

**File:** `YourPanelComposed.ts`

```typescript
jsUris: [
	this.panel.webview.asWebviewUri(
		vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'YourRenderer.js')
	).toString(),
	// ... other scripts
],
```

### 4. Add Message Handler in Behavior

**File:** `YourBehavior.js`

```javascript
window.createBehavior({
	initialize() {
		// Setup code
	},
	handleMessage(message) {
		if (message.command === 'updateYourComponent') {
			updateYourComponent(message.data);
		}
	}
});

function updateYourComponent(data) {
	const container = document.querySelector('.your-container');
	if (!container) return;

	// Render new HTML
	const html = window.YourRenderer.renderYourComponent(data.viewModel);

	// Update DOM
	container.innerHTML = html;

	// Re-apply any event listeners if needed
	setupEventListeners();
}
```

### 5. Send Data from Backend

**File:** `YourPanelComposed.ts`

```typescript
// Instead of this (causes full page refresh):
await this.scaffoldingBehavior.refresh({ ... });

// Do this (targeted update):
await this.panel.webview.postMessage({
	command: 'updateYourComponent',
	data: {
		viewModel: yourViewModel
	}
});
```

## Examples in Codebase

### Table Updates
- **Frontend:** `TableRenderer.js`
- **Handler:** `PluginTraceViewerBehavior.js` → `updateTableData()`
- **Backend:** `handleRefresh()` sends `updateTableData` message

### Dropdown State
- **Frontend:** `DropdownComponent.js` → `updateDropdownState()`
- **Handler:** `PluginTraceViewerBehavior.js`
- **Backend:** `handleSetTraceLevel()`, `handleSetAutoRefresh()`
- **Pattern:** Optimistic updates (update immediately on click, backend confirms)

### Detail Panel
- **Frontend:** `DetailPanelRenderer.js`
- **Handler:** `PluginTraceViewerBehavior.js` → `updateDetailPanel()`
- **Backend:** `handleViewDetail()` sends `updateDetailPanel` message

## Tips

1. **Optimistic Updates:** For user interactions (clicks), update UI immediately before sending to backend
2. **Event Listeners:** If your update replaces elements with listeners, re-apply them after update
3. **DOM Selectors:** Use specific selectors (`.your-container`) to avoid updating too much
4. **Event Bubbling:** Use custom DOM events with `{ bubbles: true }` for cross-component communication

## Anti-Patterns

❌ **Don't:** Call `scaffoldingBehavior.refresh()` for every update
✅ **Do:** Send targeted `postMessage` with ViewModels

❌ **Don't:** Generate HTML in backend TypeScript
✅ **Do:** Send ViewModels, let frontend render

❌ **Don't:** Use `innerHTML` on parent containers with event listeners
✅ **Do:** Target specific child containers that need updates
