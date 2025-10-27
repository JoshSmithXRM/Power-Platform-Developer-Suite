# Panel Layout Guide

This guide documents the **mandatory** panel structure that ALL panels must follow to ensure consistent vertical spacing, proper CSS integration, and maintainable layouts.

## The Standard Panel Structure

Every panel in the Power Platform Developer Suite uses a three-layer flexbox structure:

```html
<div class="panel-container">
    <div class="panel-controls">
        <!-- Top bar: action buttons, selectors, filters -->
    </div>
    <div class="panel-content">
        <div class="panel-table-section">
            <!-- Main content: tables, forms, data displays -->
        </div>
    </div>
</div>
```

### Why This Structure is Mandatory

1. **Consistent vertical spacing** - All panels start content at the same vertical position
2. **Flexible layout** - Adapts to different control combinations without hardcoded heights
3. **CSS integration** - Works with semantic tokens and base styles
4. **Maintainability** - Single source of truth for layout patterns

## Layer Breakdown

### Layer 1: panel-container

**Purpose**: Root container that manages overall panel height

**CSS Properties**:
```css
.panel-container {
    height: 100vh;              /* Full viewport height */
    overflow: hidden;           /* Prevent page scroll */
    display: flex;
    flex-direction: column;     /* Stack controls above content */
}
```

**Responsibilities**:
- Establishes flexbox context
- Constrains total height to viewport
- Prevents scroll at document level

### Layer 2: panel-controls

**Purpose**: Top control bar that holds selectors, buttons, and filters

**CSS Properties**:
```css
.panel-controls {
    flex: 0 0 auto;             /* Don't grow or shrink */
    padding: 6px 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
    background: var(--vscode-editor-background);
    display: flex;
    flex-direction: row;        /* Horizontal layout */
    flex-wrap: wrap;            /* Allow wrapping if needed */
    align-items: center;
    gap: 12px;
    min-height: 40px;           /* Consistent baseline height */
}
```

**What Goes Here**:
- Action bars (Open in Maker, Refresh, etc.)
- Solution selector
- Environment selector
- Search/filter controls

**Component Ordering** (using flexbox order):
```css
.panel-controls .action-bar {
    order: 1;                   /* Left side */
}

.panel-controls .solution-selector {
    order: 2;                   /* Middle */
}

.panel-controls .environment-selector {
    order: 3;                   /* Right side */
    margin-left: auto;          /* Push to far right */
}
```

### Layer 3: panel-content

**Purpose**: Main content area that grows to fill remaining space

**CSS Properties**:
```css
.panel-content {
    flex: 1 1 auto;             /* Grow to fill available space */
    overflow: hidden;           /* Contain inner scrolling */
    display: flex;
    flex-direction: column;
    min-height: 0;              /* Critical for flex child shrinking */
    padding: 0;
    margin: 0;
}
```

**Why min-height: 0 is Critical**:
Without `min-height: 0`, flex children won't shrink below their content size, breaking the flexible layout. This is a common CSS gotcha.

### Layer 4: panel-table-section (or custom content)

**Purpose**: Actual content container with scrolling

**CSS Properties**:
```css
.panel-table-section {
    flex: 1 1 auto;             /* Fill parent */
    overflow: auto;             /* Enable scrolling */
    display: flex;
    flex-direction: column;
    min-height: 0;              /* Allow shrinking */
}
```

**What Goes Here**:
- Data tables
- Form sections
- Multi-panel layouts (like Metadata Browser)
- Any scrollable content

## Standard Panel Implementation

### Using PanelComposer.compose()

For standard layouts, use `PanelComposer.compose()` which automatically generates the correct structure:

```typescript
export class MyPanel extends BasePanel {
    private environmentSelector: EnvironmentSelectorComponent;
    private actionBar: ActionBarComponent;
    private dataTable: DataTableComponent;

    protected getHtmlContent(): string {
        // ✅ CORRECT: compose() generates full structure automatically
        return PanelComposer.compose([
            this.actionBar,           // Goes in panel-controls
            this.environmentSelector, // Goes in panel-controls
            this.dataTable           // Goes in panel-content
        ], this.getCommonWebviewResources(), 'My Panel');
    }
}
```

**Generated HTML** (automatic):
```html
<div class="panel-container">
    <div class="panel-controls">
        <!-- actionBar HTML -->
        <!-- environmentSelector HTML -->
    </div>
    <div class="panel-content">
        <div class="panel-table-section">
            <!-- dataTable HTML -->
        </div>
    </div>
</div>
```

## Custom Panel Layouts

### When to Use Custom Layouts

Use `PanelComposer.composeWithCustomHTML()` ONLY when you need:
- Multi-panel layouts (left sidebar, main content, right detail panel)
- Complex nested structures
- Non-standard content organization

**Examples**: Metadata Browser (3-panel grid layout)

### Custom Layout Requirements

⚠️ **CRITICAL**: Even with custom HTML, you MUST maintain the base structure:

```typescript
protected getHtmlContent(): string {
    const customHTML = `
        <div class="panel-container">
            <div class="panel-controls">
                ${this.actionBar.generateHTML()}
                ${this.environmentSelector.generateHTML()}
            </div>

            <div class="panel-content">
                <!-- ✅ CRITICAL: panel-content wrapper is MANDATORY -->
                <div class="my-custom-layout">
                    <!-- Your custom structure goes here -->
                </div>
            </div>
        </div>
    `;

    return PanelComposer.composeWithCustomHTML(
        customHTML,
        [this.actionBar, this.environmentSelector, ...],
        ['css/panels/my-custom-panel.css'],  // Panel-specific CSS
        [],                                  // Panel-specific JS
        this.getCommonWebviewResources(),
        'My Panel Title'
    );
}
```

### Metadata Browser Example

The Metadata Browser uses a 3-panel grid layout but still maintains the base structure:

```typescript
const customHTML = `
    <div class="panel-container">
        <div class="panel-controls">
            ${this.actionBarComponent.generateHTML()}
            ${this.environmentSelectorComponent.generateHTML()}
        </div>

        <div class="panel-content">
            <!-- Custom 3-panel grid layout -->
            <div class="metadata-container">
                <div class="left-panel"><!-- Sidebar --></div>
                <div class="right-panel"><!-- Main content --></div>
                <div class="detail-panel"><!-- Details --></div>
            </div>
        </div>
    </div>
`;
```

**Custom CSS for metadata-container**:
```css
.metadata-container {
    display: grid;
    grid-template-columns: 280px 1fr 400px;
    flex: 1;                    /* Fill panel-content */
    min-height: 0;              /* Allow shrinking */
    gap: 0;
    overflow: hidden;
}
```

## Common Mistakes

### ❌ MISTAKE 1: Skipping panel-content wrapper

**Wrong**:
```html
<div class="panel-container">
    <div class="panel-controls">...</div>
    <!-- ❌ Missing panel-content wrapper -->
    <div class="my-custom-container">...</div>
</div>
```

**Impact**:
- Content starts at wrong vertical position (too high)
- Doesn't integrate with flex layout system
- Looks different from other panels

**Fix**:
```html
<div class="panel-container">
    <div class="panel-controls">...</div>
    <div class="panel-content">
        <!-- ✅ Wrapped properly -->
        <div class="my-custom-container">...</div>
    </div>
</div>
```

### ❌ MISTAKE 2: Custom body/container styles

**Wrong**:
```css
/* In panel-specific CSS */
body {
    display: flex;
    flex-direction: column;
    height: 100vh;
}
```

**Impact**:
- Overrides base layout system
- Breaks other panels if CSS loads globally
- Causes inconsistent behavior

**Fix**: Remove body styles, use `.panel-container` classes only

### ❌ MISTAKE 3: Using custom header classes instead of panel-controls

**Wrong**:
```html
<div class="panel-container">
    <div class="sticky-header">  <!-- ❌ Custom header class -->
        ...
    </div>
</div>
```

**Impact**:
- Doesn't get panel-controls flex layout
- Missing component ordering (action-bar, solution-selector, etc.)
- Custom CSS duplication

**Fix**: Use standard `panel-controls` class

### ❌ MISTAKE 4: Hardcoded heights

**Wrong**:
```css
.panel-content {
    height: 600px;              /* ❌ Fixed height */
    max-height: 800px;          /* ❌ Arbitrary limit */
}
```

**Impact**:
- Doesn't adapt to viewport size
- Breaks on different screen sizes
- Wastes or clips content

**Fix**: Use flex properties
```css
.panel-content {
    flex: 1 1 auto;             /* ✅ Flexible */
    min-height: 0;
    overflow: auto;
}
```

## Component-Specific Widths

For consistent component sizing across all panels:

```css
/* Environment Selector - right side */
.panel-controls .environment-selector {
    flex: 0 0 auto;             /* Fixed size */
    width: 350px;               /* Consistent across panels */
    margin-left: auto;          /* Push to right */
    order: 3;
}

/* Solution Selector - middle */
.panel-controls .solution-selector {
    flex: 0 0 auto;
    width: 250px;
    order: 2;
}

/* Action Bar - left side */
.panel-controls .action-bar {
    flex: 0 1 auto;             /* Can shrink if needed */
    order: 1;
}
```

This ensures:
- Environment selector always 350px wide
- Solution selector always 250px wide
- No variation between panels with/without solution selector

## Responsive Considerations

### Minimum Widths

The layout assumes minimum panel width of ~900px:
- Action bar: ~200px minimum
- Solution selector: 250px (if present)
- Environment selector: 350px
- Gaps: ~50px

### Handling Narrow Viewports

For panels narrower than minimum:
```css
@media (max-width: 900px) {
    .panel-controls {
        flex-direction: column;  /* Stack vertically */
        align-items: stretch;
    }

    .panel-controls .environment-selector {
        margin-left: 0;          /* Remove right-push */
        width: 100%;             /* Full width */
    }
}
```

## Panel Composition Flow

### 1. Component Creation (Extension Host)

```typescript
private initializeComponents(): void {
    this.environmentSelector = ComponentFactory.createEnvironmentSelector({...});
    this.actionBar = ComponentFactory.createActionBar({...});
    this.dataTable = ComponentFactory.createDataTable({...});
}
```

### 2. HTML Generation

```typescript
protected getHtmlContent(): string {
    return PanelComposer.compose([
        this.actionBar,
        this.environmentSelector,
        this.dataTable
    ], this.getCommonWebviewResources(), 'Panel Title');
}
```

### 3. PanelComposer Processing

PanelComposer automatically:
1. Separates control components from content components
2. Generates panel-container structure
3. Places controls in panel-controls
4. Places content in panel-content → panel-table-section
5. Collects CSS and JS dependencies
6. Generates complete HTML document

### 4. CSS Application

Base styles apply automatically:
1. `component-base.css` - Semantic tokens, flex layout
2. `panel-base.css` - Panel-specific patterns
3. Component CSS files - Individual styling

## Validation Checklist

Before completing any panel implementation, verify:

- [ ] Uses standard `panel-container` → `panel-controls` → `panel-content` structure
- [ ] Does NOT have custom body/html styles
- [ ] Does NOT skip `panel-content` wrapper
- [ ] Uses standard CSS classes (not custom alternatives)
- [ ] Controls have correct flexbox ordering (action-bar=1, solution=2, environment=3)
- [ ] Components use semantic tokens (not hardcoded colors)
- [ ] No hardcoded heights (uses flex properties)
- [ ] Content area has `overflow: auto` for scrolling
- [ ] Works with and without solution selector (for applicable panels)

## Quick Reference

### Standard Panel Template

```typescript
export class MyPanel extends BasePanel {
    private actionBar: ActionBarComponent;
    private environmentSelector: EnvironmentSelectorComponent;
    private dataTable: DataTableComponent;

    protected getHtmlContent(): string {
        return PanelComposer.compose([
            this.actionBar,
            this.environmentSelector,
            this.dataTable
        ], this.getCommonWebviewResources(), 'My Panel');
    }
}
```

### Custom Panel Template

```typescript
export class MyCustomPanel extends BasePanel {
    protected getHtmlContent(): string {
        const customHTML = `
            <div class="panel-container">
                <div class="panel-controls">
                    ${this.actionBar.generateHTML()}
                    ${this.environmentSelector.generateHTML()}
                </div>
                <div class="panel-content">
                    <div class="my-custom-layout">
                        <!-- Custom structure -->
                    </div>
                </div>
            </div>
        `;

        return PanelComposer.composeWithCustomHTML(
            customHTML,
            [this.actionBar, this.environmentSelector, ...],
            ['css/panels/my-custom-panel.css'],
            [],
            this.getCommonWebviewResources(),
            'My Custom Panel'
        );
    }
}
```

## See Also

- `docs/STYLING_PATTERNS.md` - CSS semantic tokens and component styling
- `docs/COMPONENT_PATTERNS.md` - Component design patterns
- `CLAUDE.md` - Quick reference for essential patterns
