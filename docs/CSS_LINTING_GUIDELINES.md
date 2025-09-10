# CSS Linting & Validation Guidelines

## 🔍 Overview

This document provides practical validation rules and checks to maintain CSS standards consistency across the Power Platform Developer Suite.

## 🚨 Automated Checks

### **VS Code Variable Detection**

Use this regex pattern to find direct VS Code variable usage in component CSS:

```bash
# Find components using VS Code variables directly (should be replaced with semantic tokens)
grep -r "var(--vscode-" resources/webview/css/components/

# Acceptable: Only in base files
# ✅ resources/webview/css/base/component-base.css
# ❌ resources/webview/css/components/*.css
```

### **Hardcoded Color Detection**

```bash
# Find hardcoded colors (should use CSS custom properties)
grep -rE "#[0-9a-fA-F]{3,6}|rgba?\(" resources/webview/css/components/
```

### **!important Usage Detection**

```bash
# Find !important usage (should be avoided)
grep -r "!important" resources/webview/css/components/
```

## ✅ Pre-Commit Validation Checklist

### **For New Components**

- [ ] Uses semantic tokens (not VS Code variables directly)
- [ ] No hardcoded colors or dimensions
- [ ] Follows established naming patterns
- [ ] Tested with dark/light/high-contrast themes
- [ ] Includes hover/focus/disabled states using semantic tokens

### **For Component Modifications**

- [ ] Maintains visual consistency with other components
- [ ] Doesn't introduce new VS Code variable usage
- [ ] Border weights match existing components
- [ ] Text colors use semantic hierarchy

## 🛠️ Validation Commands

### **Quick Consistency Check**

```bash
# Check for common inconsistency patterns
cd "resources/webview/css/components"

# 1. Find direct VS Code variable usage (should be minimal)
echo "=== Direct VS Code Variables (should be replaced) ===" 
grep -c "var(--vscode-" *.css | grep -v ":0"

# 2. Find missing semantic token usage
echo "=== Files not using semantic tokens ===" 
grep -L "var(--component-" *.css

# 3. Check for hardcoded values
echo "=== Hardcoded colors (should be tokenized) ==="
grep -rE "#[0-9a-fA-F]{3,6}" *.css || echo "None found ✅"

# 4. Check for excessive !important usage
echo "=== Excessive !important usage ==="
grep -c "!important" *.css | grep -v ":0" || echo "None found ✅"
```

### **Theme Compatibility Test**

Create this test script to validate theme compatibility:

```bash
#!/bin/bash
# theme-test.sh - Test component consistency across themes

echo "🎨 Testing CSS theme compatibility..."

# Check that all components use semantic tokens for backgrounds
echo "=== Background Token Usage ==="
missing_bg=$(grep -L "var(--component-.*-surface)" resources/webview/css/components/*.css)
if [ -z "$missing_bg" ]; then
    echo "✅ All components use semantic background tokens"
else
    echo "❌ Components missing semantic background tokens:"
    echo "$missing_bg"
fi

# Check border consistency 
echo "=== Border Token Usage ==="
missing_border=$(grep -L "var(--component-border" resources/webview/css/components/*.css)
if [ -z "$missing_border" ]; then
    echo "✅ All components use semantic border tokens"
else
    echo "❌ Components missing semantic border tokens:"
    echo "$missing_border"
fi

# Check text color consistency
echo "=== Text Color Token Usage ==="
missing_text=$(grep -L "var(--component-text-" resources/webview/css/components/*.css)
if [ -z "$missing_text" ]; then
    echo "✅ All components use semantic text tokens"
else
    echo "❌ Components missing semantic text tokens:"
    echo "$missing_text"
fi
```

## 📋 Code Review Guidelines

### **CSS Code Review Checklist**

When reviewing CSS changes, check for:

1. **Semantic Token Usage**
   - ✅ Uses `var(--component-*)` tokens
   - ❌ Uses `var(--vscode-*)` directly in components

2. **Consistency Patterns**
   - ✅ Border weights match existing components
   - ✅ Spacing follows established patterns
   - ✅ Component structure follows conventions

3. **Theme Compatibility**
   - ✅ No hardcoded colors or dimensions
   - ✅ All states use semantic tokens
   - ✅ Tested with multiple themes

4. **Performance**
   - ✅ Minimal use of complex selectors
   - ✅ No redundant CSS rules
   - ✅ Follows BEM or established naming

### **Common Review Comments**

```css
/* ❌ REVIEW COMMENT: Use semantic token instead */
background: var(--vscode-input-background);
/* ✅ SUGGESTED FIX */
background: var(--component-elevated-surface);

/* ❌ REVIEW COMMENT: Avoid hardcoded values */
border: 1px solid #454545;
/* ✅ SUGGESTED FIX */
border: 1px solid var(--component-border);

/* ❌ REVIEW COMMENT: Use semantic text hierarchy */
color: var(--vscode-foreground);
/* ✅ SUGGESTED FIX */
color: var(--component-text-primary);
```

## 🔧 IDE Integration

### **VS Code Settings**

Add to `.vscode/settings.json`:

```json
{
  "css.lint.validProperties": [
    "--component-elevated-surface",
    "--component-main-surface", 
    "--component-interactive-surface",
    "--component-table-surface",
    "--component-header-surface",
    "--component-border",
    "--component-border-subtle",
    "--component-border-focus",
    "--component-text-primary",
    "--component-text-secondary",
    "--component-text-muted"
  ],
  "css.lint.unknownProperties": "warning"
}
```

### **CSS Snippets**

Add to `.vscode/css.code-snippets`:

```json
{
  "Component Base Structure": {
    "prefix": "comp-base",
    "body": [
      ".${1:component-name} {",
      "    background: var(--component-elevated-surface);",
      "    border: 1px solid var(--component-border);",
      "    border-radius: var(--component-border-radius);",
      "    padding: var(--component-padding);",
      "    color: var(--component-text-primary);",
      "    $0",
      "}"
    ],
    "description": "Standard component structure with semantic tokens"
  }
}
```

## 📊 Metrics & Monitoring

### **CSS Standards Compliance Metrics**

Track these metrics over time:

```bash
# Semantic token adoption rate
semantic_usage=$(grep -r "var(--component-" resources/webview/css/components/ | wc -l)
total_var_usage=$(grep -r "var(" resources/webview/css/components/ | wc -l)
echo "Semantic token adoption: $(($semantic_usage * 100 / $total_var_usage))%"

# VS Code variable reduction (should decrease over time) 
vscode_vars=$(grep -r "var(--vscode-" resources/webview/css/components/ | wc -l)
echo "Direct VS Code variables: $vscode_vars (target: 0)"

# Hardcoded value detection (should be 0)
hardcoded=$(grep -rE "#[0-9a-fA-F]{3,6}|rgba?\(" resources/webview/css/components/ | wc -l)
echo "Hardcoded values: $hardcoded (target: 0)"
```

## 🎯 Continuous Improvement

### **Monthly CSS Health Check**

1. Run validation commands
2. Review metrics trends
3. Update semantic tokens if new patterns emerge
4. Refactor components with high VS Code variable usage
5. Update documentation with new learnings

### **When to Add New Semantic Tokens**

Add new semantic tokens when:
- Multiple components need the same new pattern
- A VS Code variable is used 3+ times across components
- A new component type emerges with unique styling needs

### **Token Naming Conventions**

```css
/* Surface/Background tokens */
--component-{purpose}-surface

/* Border tokens */  
--component-border-{state}

/* Text tokens */
--component-text-{hierarchy}

/* State tokens */
--component-state-{interaction}
```

---

*These guidelines ensure maintainable, consistent CSS that adapts seamlessly to all VS Code themes while preventing technical debt.*