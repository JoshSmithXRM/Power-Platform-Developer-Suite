# CSS Standards Guide - Power Platform Developer Suite

## 🎨 Overview

This document establishes CSS standards for the Power Platform Developer Suite to ensure visual consistency across all components and panels while maintaining VS Code theme compatibility.

## 🏗️ Architecture

### **Three-Layer CSS Architecture**

1. **VS Code Theme Variables** (Bottom Layer)
   - Native VS Code CSS custom properties
   - Theme-specific values (colors, fonts, spacing)
   - Examples: `--vscode-foreground`, `--vscode-input-background`

2. **Semantic Component Tokens** (Middle Layer)  
   - Our standardized design system layer
   - Maps semantic purposes to VS Code variables
   - Examples: `--component-elevated-surface`, `--component-text-primary`

3. **Component-Specific Styles** (Top Layer)
   - Individual component CSS files
   - Uses semantic tokens, not VS Code variables directly
   - Component variants and states

## 📋 Semantic Design Tokens

### **Surface/Background Tokens**

```css
/* Use these semantic tokens in your components */
--component-elevated-surface     /* Cards, selectors, elevated panels */
--component-main-surface         /* Main panel background */
--component-interactive-surface  /* Buttons, inputs, dropdowns */
--component-table-surface        /* Table backgrounds */
--component-header-surface       /* Table headers, action bars */
```

### **Border Tokens**

```css
--component-border         /* Standard component borders */
--component-border-subtle  /* Subtle dividers */
--component-border-focus   /* Focus states */
--component-border-error   /* Error states */
--component-border-hover   /* Hover states */
```

### **Text Color Tokens**

```css
--component-text-primary    /* Primary text */
--component-text-secondary  /* Secondary text */
--component-text-muted      /* Muted/disabled text */
--component-text-accent     /* Accent/link text */
--component-text-error      /* Error text */
--component-text-success    /* Success text */
```

### **State Tokens**

```css
--component-state-hover     /* Hover backgrounds */
--component-state-active    /* Active/selected */
--component-state-disabled  /* Disabled state */
--component-state-loading   /* Loading state */
```

## ✅ CSS Standards Rules

### **MANDATORY Rules**

1. **ALWAYS use semantic tokens, NEVER use VS Code variables directly**
   ```css
   /* ✅ CORRECT */
   background: var(--component-elevated-surface);
   color: var(--component-text-primary);
   border: 1px solid var(--component-border);
   
   /* ❌ WRONG - Don't use VS Code variables directly */
   background: var(--vscode-input-background);
   color: var(--vscode-foreground);
   border: 1px solid var(--vscode-panel-border);
   ```

2. **Use consistent component structure patterns**
   ```css
   .my-component {
       background: var(--component-elevated-surface);
       border: 1px solid var(--component-border);
       border-radius: var(--component-border-radius);
       padding: var(--component-padding);
       color: var(--component-text-primary);
   }
   ```

3. **Follow semantic naming for component purposes**
   - **Elevated surfaces**: Environment selectors, solution selectors, cards
   - **Header surfaces**: Action bars, table headers
   - **Interactive surfaces**: Buttons, inputs, dropdowns
   - **Table surfaces**: Data table content areas

### **Component-Specific Guidelines**

#### **Selectors (Environment, Solution, Entity)**
```css
.selector-component {
    background: var(--component-elevated-surface);
    border: 1px solid var(--component-border);
    color: var(--component-text-primary);
}
```

#### **Action Bars**
```css
.action-bar {
    background: var(--component-header-surface);
    border: 1px solid var(--component-border);
    color: var(--component-text-primary);
}
```

#### **Data Tables**
```css
.data-table {
    background: var(--component-table-surface);
    border: 1px solid var(--component-border);
    color: var(--component-text-primary);
}

.data-table-thead {
    background: var(--component-header-surface);
    border-bottom: 2px solid var(--component-border-subtle);
}
```

#### **Interactive Elements**
```css
.button, .input, .dropdown {
    background: var(--component-interactive-surface);
    border: 1px solid var(--component-border);
    color: var(--component-text-primary);
}

.button:hover {
    background: var(--component-state-hover);
    border-color: var(--component-border-hover);
}

.button:focus {
    border-color: var(--component-border-focus);
}
```

## 🚫 Anti-Patterns (Don't Do This)

### **Never Mix VS Code Variables**
```css
/* ❌ WRONG - Inconsistent variable usage */
.my-component {
    background: var(--vscode-input-background);      /* One variable type */
    border: 1px solid var(--vscode-panel-border);   /* Different variable type */
    color: var(--vscode-dropdown-foreground);       /* Another variable type */
}
```

### **Never Hardcode Colors**
```css
/* ❌ WRONG - Breaks theme compatibility */
.my-component {
    background: #2d2d30;
    border: 1px solid #454545;
    color: #cccccc;
}
```

### **Never Use !important Unless Absolutely Necessary**
```css
/* ❌ WRONG - Avoid !important */
.my-component {
    background: var(--component-elevated-surface) !important;
}

/* ✅ CORRECT - Use specificity instead */
.panel-container .my-component {
    background: var(--component-elevated-surface);
}
```

## 🔧 Development Workflow

### **Creating New Components**

1. **Start with semantic tokens**
   ```css
   .new-component {
       background: var(--component-elevated-surface);
       border: 1px solid var(--component-border);
       color: var(--component-text-primary);
   }
   ```

2. **Test with different VS Code themes**
   - Dark theme
   - Light theme  
   - High contrast theme
   - Custom themes

3. **Validate consistency**
   - Compare with existing components
   - Check border weights match
   - Verify text contrast

### **Modifying Existing Components**

1. **Replace VS Code variables with semantic tokens**
2. **Test visual consistency**
3. **Update documentation if new patterns emerge**

## 📚 Reference

### **When to Use Each Surface Token**

| Token | Use For | Examples |
|-------|---------|----------|
| `--component-elevated-surface` | Components that appear "raised" | Environment selector, solution selector, cards |
| `--component-header-surface` | Headers and navigation | Action bars, table headers |
| `--component-interactive-surface` | User input elements | Buttons, dropdowns, form inputs |
| `--component-table-surface` | Data display areas | Table bodies, list content |
| `--component-main-surface` | Background areas | Panel backgrounds, main content |

### **Border Weight Guidelines**

- **Standard borders**: `1px solid var(--component-border)`
- **Emphasis borders**: `2px solid var(--component-border-subtle)`
- **Focus borders**: `1px solid var(--component-border-focus)`

### **Text Hierarchy**

- **Primary text**: Headings, labels, main content
- **Secondary text**: Descriptions, help text
- **Muted text**: Disabled states, placeholders
- **Accent text**: Links, call-to-action elements

## ✨ Benefits

✅ **Visual Consistency**: All components share the same design language  
✅ **Theme Compatibility**: Automatic adaptation to any VS Code theme  
✅ **Maintainability**: Change one token to update all components  
✅ **Developer Experience**: Clear guidelines prevent inconsistencies  
✅ **Future-Proof**: New components automatically inherit standards  

## 🔄 Migration

If you find VS Code variables in component CSS:
1. Identify the semantic purpose
2. Replace with appropriate semantic token
3. Test across themes
4. Update documentation if needed

---

*This standards guide ensures the Power Platform Developer Suite maintains a professional, consistent appearance across all VS Code themes and user configurations.*