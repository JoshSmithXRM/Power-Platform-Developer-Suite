# Styling Patterns Guide

This guide documents CSS and styling patterns for the Power Platform Developer Suite, ensuring visual consistency across components while maintaining VS Code theme compatibility.

## CSS Architecture Integration

### **Three-Layer CSS Architecture**

1. **VS Code Theme Variables** (Foundation Layer)
   - Native VS Code CSS custom properties
   - Theme-specific values automatically provided by VS Code
   - Examples: `--vscode-foreground`, `--vscode-input-background`

2. **Semantic Component Tokens** (Abstraction Layer)  
   - Our standardized design system layer defined in `component-base.css`
   - Maps semantic purposes to VS Code variables
   - Examples: `--component-elevated-surface`, `--component-text-primary`

3. **Component-Specific Styles** (Implementation Layer)
   - Individual component CSS files in `resources/webview/css/components/`
   - Uses semantic tokens exclusively, never VS Code variables directly
   - Component variants, states, and specific styling

### **CSS Structure and Loading Order**

```
resources/webview/css/
├── base/
│   ├── component-base.css      # Semantic tokens + flexible layout foundation
│   └── panel-base.css          # Panel-specific layout patterns
└── components/
    ├── environment-selector.css # Component-specific styles
    ├── data-table.css          # Table styling patterns
    └── action-bar.css          # Action bar styling
```

**Loading Order**:
1. `component-base.css` - Establishes semantic tokens and flexible layout system
2. `panel-base.css` - Panel container and layout patterns
3. Component-specific CSS files - Individual component styling

## Semantic Design Tokens

### **Token Definitions (component-base.css)**

```css
/* Surface/Background Tokens */
:root {
    --component-elevated-surface: var(--vscode-input-background);      /* Cards, selectors */
    --component-main-surface: var(--vscode-editor-background);         /* Panel backgrounds */
    --component-interactive-surface: var(--vscode-button-background);  /* Buttons, inputs */
    --component-table-surface: var(--vscode-editor-background);        /* Table content */
    --component-header-surface: var(--vscode-titleBar-activeBackground); /* Headers */

    /* Border Tokens */
    --component-border: var(--vscode-panel-border);
    --component-border-subtle: var(--vscode-widget-border);
    --component-border-focus: var(--vscode-focusBorder);
    --component-border-error: var(--vscode-inputValidation-errorBorder);
    --component-border-hover: var(--vscode-button-hoverBackground);

    /* Text Color Tokens */
    --component-text-primary: var(--vscode-foreground);
    --component-text-secondary: var(--vscode-descriptionForeground);
    --component-text-muted: var(--vscode-disabledForeground);
    --component-text-accent: var(--vscode-textLink-foreground);
    --component-text-error: var(--vscode-errorForeground);
    --component-text-success: var(--vscode-terminal-ansiGreen);

    /* State Tokens */
    --component-state-hover: var(--vscode-list-hoverBackground);
    --component-state-active: var(--vscode-list-activeSelectionBackground);
    --component-state-disabled: var(--vscode-widget-shadow);
    --component-state-loading: var(--vscode-progressBar-background);

    /* Layout Tokens */
    --component-padding: 12px;
    --component-gap: 12px;
    --component-border-radius: 4px;
}
```

### **Flexible Layout Integration**

The semantic tokens work with the flexible panel layout system:

```css
/* Panel Layout Structure */
.panel-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--component-main-surface);
}

.panel-controls {
    flex: 0 0 auto;
    padding: var(--component-padding);
    background: var(--component-main-surface);
    border-bottom: 1px solid var(--component-border-subtle);
    display: flex;
    flex-direction: column;
    gap: var(--component-gap);
}

.panel-content {
    flex: 1 1 auto;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: var(--component-main-surface);
}

.panel-table-section {
    flex: 1 1 auto;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: var(--component-table-surface);
}
```

## Component Styling Patterns

### **Mandatory Rules**

1. **ALWAYS use semantic tokens, NEVER use VS Code variables directly**
   ```css
   /* ✅ CORRECT */
   .my-component {
       background: var(--component-elevated-surface);
       color: var(--component-text-primary);
       border: 1px solid var(--component-border);
   }
   
   /* ❌ WRONG - Don't use VS Code variables directly */
   .my-component {
       background: var(--vscode-input-background);
       color: var(--vscode-foreground);
       border: 1px solid var(--vscode-panel-border);
   }
   ```

2. **Follow consistent component structure patterns**
   ```css
   .component-base {
       background: var(--component-elevated-surface);
       border: 1px solid var(--component-border);
       border-radius: var(--component-border-radius);
       padding: var(--component-padding);
       color: var(--component-text-primary);
   }
   ```

3. **Use semantic naming for component purposes**
   - **Elevated surfaces**: Environment selectors, solution selectors, cards
   - **Header surfaces**: Action bars, table headers
   - **Interactive surfaces**: Buttons, inputs, dropdowns
   - **Table surfaces**: Data table content areas

### **Component-Specific Patterns**

#### **Selector Components**
```css
/* Environment/Solution/Entity Selectors */
.selector-component {
    background: var(--component-elevated-surface);
    border: 1px solid var(--component-border);
    border-radius: var(--component-border-radius);
    padding: var(--component-padding);
    color: var(--component-text-primary);
    display: flex;
    align-items: center;
    gap: var(--component-gap);
}

.selector-component:hover {
    border-color: var(--component-border-hover);
    background: var(--component-state-hover);
}

.selector-component:focus-within {
    border-color: var(--component-border-focus);
}
```

#### **Data Table Pattern**
```css
.data-table {
    background: var(--component-table-surface);
    border: 1px solid var(--component-border);
    border-radius: var(--component-border-radius);
    overflow: hidden;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.data-table-thead {
    background: var(--component-header-surface);
    border-bottom: 2px solid var(--component-border-subtle);
    flex: 0 0 auto;
}

.data-table-tbody {
    flex: 1 1 auto;
    overflow: auto;
    background: var(--component-table-surface);
}

.data-table th, .data-table td {
    padding: 8px var(--component-padding);
    text-align: left;
    border-right: 1px solid var(--component-border-subtle);
    color: var(--component-text-primary);
}

.data-table tr:hover {
    background: var(--component-state-hover);
}
```

#### **Action Bar Pattern**
```css
.action-bar {
    background: var(--component-header-surface);
    border: 1px solid var(--component-border);
    border-radius: var(--component-border-radius);
    padding: var(--component-padding);
    display: flex;
    align-items: center;
    gap: var(--component-gap);
    justify-content: space-between;
}

.action-bar .button-group {
    display: flex;
    gap: calc(var(--component-gap) / 2);
}
```

#### **Interactive Elements Pattern**
```css
.button, .input, .dropdown {
    background: var(--component-interactive-surface);
    border: 1px solid var(--component-border);
    border-radius: var(--component-border-radius);
    padding: 6px var(--component-padding);
    color: var(--component-text-primary);
    font-family: inherit;
    font-size: inherit;
}

.button:hover, .input:hover, .dropdown:hover {
    background: var(--component-state-hover);
    border-color: var(--component-border-hover);
}

.button:focus, .input:focus, .dropdown:focus {
    outline: none;
    border-color: var(--component-border-focus);
    box-shadow: 0 0 0 1px var(--component-border-focus);
}

.button:disabled, .input:disabled, .dropdown:disabled {
    background: var(--component-state-disabled);
    color: var(--component-text-muted);
    cursor: not-allowed;
}
```

## Anti-Patterns to Avoid

### **Never Mix Variable Types**
```css
/* ❌ WRONG - Inconsistent variable usage */
.bad-component {
    background: var(--vscode-input-background);      /* VS Code variable */
    border: 1px solid var(--component-border);      /* Semantic token */
    color: var(--vscode-dropdown-foreground);       /* VS Code variable */
}
```

### **Never Hardcode Colors**
```css
/* ❌ WRONG - Breaks theme compatibility */
.bad-component {
    background: #2d2d30;
    border: 1px solid #454545;
    color: #cccccc;
}
```

### **Never Break Flexible Layout**
```css
/* ❌ WRONG - Fixed heights break flexible layout */
.bad-table {
    height: 400px;           /* Hardcoded height */
    max-height: 600px;       /* Fixed constraints */
}

/* ✅ CORRECT - Use flex properties */
.good-table {
    flex: 1 1 auto;          /* Grows to fill available space */
    min-height: 0;           /* Allows shrinking */
    overflow: auto;          /* Handles content overflow */
}
```

## Development Workflow

### **Creating New Component Styles**

1. **Start with semantic tokens**
   ```css
   .new-component {
       background: var(--component-elevated-surface);
       border: 1px solid var(--component-border);
       border-radius: var(--component-border-radius);
       padding: var(--component-padding);
       color: var(--component-text-primary);
   }
   ```

2. **Follow component structure pattern**
   ```css
   /* Component container */
   .new-component { /* Base styles */ }
   
   /* Component elements */
   .new-component .element { /* Element styles */ }
   
   /* Component states */
   .new-component:hover { /* Hover styles */ }
   .new-component:focus { /* Focus styles */ }
   .new-component.disabled { /* Disabled styles */ }
   ```

3. **Test across VS Code themes**
   - Dark theme (default)
   - Light theme
   - High contrast themes
   - Custom community themes

4. **Validate with flexible layout**
   - Test in panels with different control counts
   - Verify table fills available space correctly
   - Check responsive behavior

### **Theme Compatibility Testing**

```bash
# Test in VS Code Extension Development Host
# Switch themes: Ctrl+K Ctrl+T
# Test themes:
# - Dark+ (default dark)
# - Light+ (default light)  
# - Dark High Contrast
# - Light High Contrast
```

### **CSS File Organization**

```css
/* Component CSS File Structure */

/* 1. Component base styles */
.component-name {
    /* Base appearance using semantic tokens */
}

/* 2. Component layout (if needed) */
.component-name {
    /* Layout properties for flexible integration */
}

/* 3. Component elements */
.component-name .element {
    /* Nested element styles */
}

/* 4. Component states */
.component-name:hover,
.component-name:focus,
.component-name.disabled {
    /* State-specific styles */
}

/* 5. Component variants (if needed) */
.component-name--variant {
    /* Variant-specific overrides */
}
```

## Semantic Token Reference

### **Surface Token Usage Guide**

| Token | Purpose | Use Cases |
|-------|---------|-----------|
| `--component-elevated-surface` | Raised/card-like components | Environment selectors, solution selectors, form cards |
| `--component-header-surface` | Navigation and headers | Action bars, table headers, panel headers |
| `--component-interactive-surface` | User input elements | Buttons, form inputs, dropdowns, toggles |
| `--component-table-surface` | Data display areas | Table bodies, list content, data grids |
| `--component-main-surface` | Background areas | Panel backgrounds, main content areas |

### **Border and State Patterns**

- **Standard borders**: `1px solid var(--component-border)`
- **Emphasis borders**: `2px solid var(--component-border-subtle)`
- **Focus borders**: `1px solid var(--component-border-focus)` + box-shadow
- **Error borders**: `1px solid var(--component-border-error)`

### **Text Hierarchy**

- **Primary text**: Component labels, headings, main content
- **Secondary text**: Descriptions, help text, secondary information
- **Muted text**: Disabled states, placeholders, less important text
- **Accent text**: Links, call-to-action elements, interactive text

## Style Quality & Validation

### **Theme Compatibility Guidelines**

**Semantic Token Usage**:
- Use `var(--component-*)` tokens instead of direct VS Code variables in component files
- Only base files should reference VS Code variables for font-family/font-size
- Avoid hardcoded colors (`#hex`, `rgba()`) that don't adapt to theme changes

**CSS Architecture Standards**:
- Minimize `!important` declarations (indicates architectural issues)
- Follow consistent naming patterns (BEM or component-specific)
- Use semantic tokens for all surface, border, and text colors

### **Automated Validation**

**Style Compliance Checks**:
```bash
# Check for hardcoded colors (should be minimal)
grep -rE "#[0-9a-fA-F]{3,6}|rgba?\(" resources/webview/css/components/

# Check for direct VS Code variable usage (prefer semantic tokens)
grep -rn "var(--vscode-" resources/webview/css/components/ | grep -v "font-family\|font-size"

# Check for excessive !important usage
grep -c "!important" resources/webview/css/components/*.css
```

**Theme Testing**:
- Test components across light/dark/high-contrast themes
- Verify semantic token mapping provides appropriate contrast
- Ensure accessibility standards are maintained

## Migration Guidelines

### **Updating Existing CSS**

1. **Identify VS Code variables in component CSS**
2. **Map to appropriate semantic tokens**:
   ```css
   /* Before */
   background: var(--vscode-input-background);
   
   /* After */
   background: var(--component-elevated-surface);
   ```
3. **Test visual consistency across themes**
4. **Verify flexible layout integration**

### **Adding New Semantic Tokens**

If new semantic purposes emerge:
1. Add to `component-base.css` root definition
2. Map to appropriate VS Code variable
3. Document usage in this guide
4. Update affected components

This styling patterns guide ensures consistent, maintainable, and theme-compatible styling across the entire Power Platform Developer Suite extension.