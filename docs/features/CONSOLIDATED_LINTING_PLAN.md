# Consolidated Linting Plan - Power Platform Developer Suite

## **Goal**: Prevent recurring architectural violations through automated linting

This document consolidates both architectural and CSS linting strategies into a practical, phased implementation plan that follows ESLint best practices while enforcing our component-based architecture.

---

## **Current State Analysis**

✅ **Found**: Basic ESLint already configured (`"lint": "eslint src --ext ts"` in package.json)  
❌ **Missing**: Custom architectural rules, CSS linting, proper configuration  
🎯 **Target**: Zero architectural violations, consistent styling patterns

**Key Metrics to Track**:
- Semantic token adoption rate: Target 80%+
- Direct VS Code variables: Current unknown (Target: 0)
- Hardcoded CSS values: Current 74 violations (Target: 0)
- updateWebview() usage: Should only be in BasePanel initialization

---

## **Phase 1: Critical Architectural Rules (Start Here)**

### **1. Component Architecture Violations**

**Priority: CRITICAL** - These cause UI flash and violate core architecture

- [ ] **Forbidden `updateWebview()` for data updates**
  - **Problem**: Causes UI flash, violates component messaging pattern
  - **Rule**: Only allowed in BasePanel initialization and handleMessage()
  - **Current**: Still happening in `EnvironmentSetupPanel.ts:194`

- [ ] **Panel data transformation logic** 
  - **Problem**: `.map()` transformations in panels should be in services
  - **Impact**: Violates DRY, makes code non-reusable
  - **Pattern**: `solutions.map(sol => ({ id: sol.solutionId, ... }))`

- [ ] **Missing ComponentFactory usage**
  - **Problem**: Direct component instantiation instead of factory pattern
  - **Required**: All components must use `ComponentFactory.create*()`

- [ ] **Component event bridge setup**
  - **Problem**: Panels not using event bridges for updates
  - **Required**: `setupComponentEventBridges()` in all panels

### **2. Context Separation Violations**

**Priority: HIGH** - Prevents runtime errors

- [ ] **Extension Host classes in webview**
  - **Problem**: Trying to use ComponentFactory/ServiceFactory in browser context
  - **Rule**: Webview can only access what's in HTML or loaded via `<script>` tags

- [ ] **Missing behavior registration**
  - **Problem**: Webview behaviors not registering with ComponentUtils
  - **Required**: `window.ComponentUtils.registerBehavior()` pattern

### **3. Logging Architecture Violations**

**Priority: MEDIUM** - Affects debugging and user experience

- [ ] **Console.log in Extension Host (TypeScript files)**
  - **Problem**: Using `console.log` instead of `this.componentLogger`
  - **Impact**: Violates logging architecture, not user-accessible

- [ ] **Missing component loggers in services**
  - **Problem**: Services not using proper logger setup
  - **Required**: Private logger getter pattern

---

## **Phase 2: CSS & Styling Violations**

### **4. Theme Compatibility Issues**

**Priority: HIGH** - Affects all themes and user experience

- [ ] **Direct VS Code variables in components**
  - **Problem**: Components using `var(--vscode-*)` directly
  - **Rule**: Use semantic tokens `var(--component-*)` instead
  - **Acceptable**: Only font-family/font-size in base files

- [ ] **Hardcoded colors/dimensions**
  - **Problem**: 74 violations found using `#hex` or `rgba()` values
  - **Target**: 0 violations
  - **Check**: `grep -rE "#[0-9a-fA-F]{3,6}|rgba?\\(" resources/webview/css/components/`

- [ ] **Excessive !important usage**
  - **Problem**: Should be avoided, indicates CSS architecture issues
  - **Check**: `grep -r "!important" resources/webview/css/components/`

### **5. CSS Architecture Standards**

**Priority: MEDIUM** - Ensures consistency and maintainability

- [ ] **Missing semantic token adoption**
  - **Problem**: Components not using `--component-*` token system
  - **Required**: All surface, border, and text colors use semantic tokens

- [ ] **Mixed border variable usage**
  - **Problem**: Inconsistent border styling patterns
  - **Rule**: Standardize on `--component-border*` tokens

- [ ] **Inconsistent naming patterns**
  - **Problem**: CSS classes not following established conventions
  - **Rule**: Follow BEM or component-specific patterns

---

## **Phase 3: Code Quality Standards**

### **6. TypeScript Standards**

**Priority: MEDIUM** - Prevents type issues and improves maintainability

- [ ] **Interface duplication**
  - **Problem**: Multiple `Solution` interfaces, `Environment` interfaces
  - **Rule**: Use standardized interfaces from designated files
  - **Recently Fixed**: Had two different `Solution` interfaces

- [ ] **Missing base class extensions**
  - **Problem**: Components/Panels not extending proper base classes
  - **Required**: Components extend `BaseComponent`, Panels extend `BasePanel`

- [ ] **Explicit return types for service methods**
  - **Problem**: Service methods without return type annotations
  - **Required**: Methods like `getSolutions()`, `getEnvironments()` need explicit types

### **7. Import/Export Standards**

**Priority: LOW** - Code organization and performance

- [ ] **Circular dependencies**
  - **Problem**: Modules importing each other creating cycles
  - **Detection**: Use ESLint import rules

- [ ] **Unused imports**
  - **Problem**: Dead code and bundle size
  - **Fix**: Auto-remove with ESLint --fix

- [ ] **Consistent import ordering**
  - **Problem**: Inconsistent import organization
  - **Rule**: External → Internal → Relative imports

---

## **Implementation Strategy**

### **Week 1: Quick Setup**
```bash
# 1. Install ESLint dependencies
npm install --save-dev @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-import

# 2. Create basic .eslintrc.json
# 3. Add critical architectural rules
# 4. Fix immediate violations
```

### **Week 2: Core Rules**
```json
{
  "rules": {
    "no-console": "error",
    "no-restricted-syntax": [
      "error",
      {
        "selector": "CallExpression[callee.property.name='updateWebview']",
        "message": "Use component event bridges instead of updateWebview() for data updates"
      },
      {
        "selector": "ArrowFunctionExpression[parent.callee.property.name='map'] ObjectExpression",
        "message": "Move data transformation logic to services"
      }
    ]
  }
}
```

### **Week 3: CSS Standards**
```bash
# Install CSS linting
npm install --save-dev stylelint stylelint-config-standard

# Add CSS validation commands
npm run css:lint
npm run css:validate-tokens
```

### **Week 4: Full Enforcement**
```bash
# Enable all rules as errors
# Add pre-commit hooks
# Update build pipeline
# Team training
```

---

## **Automated Enforcement**

### **ESLint Configuration Priority**

**Immediate (Week 1)**:
```json
{
  "extends": ["@typescript-eslint/recommended"],
  "rules": {
    "no-console": "error",
    "no-restricted-syntax": [
      "error",
      {
        "selector": "CallExpression[callee.property.name='updateWebview']",
        "message": "Use component messaging instead of updateWebview() for data updates"
      }
    ]
  }
}
```

**Advanced (Week 2+)**:
- Custom rules for Component/Panel architecture
- Interface duplication detection
- Context separation validation

### **Pre-commit Hooks**
```json
{
  "lint-staged": {
    "src/**/*.ts": [
      "eslint --fix --max-warnings 0",
      "npm run type-check"
    ],
    "resources/webview/css/**/*.css": [
      "stylelint --fix"
    ]
  }
}
```

### **Build Integration**
```json
{
  "scripts": {
    "lint": "eslint src --ext ts --max-warnings 0",
    "lint:architecture": "eslint src --ext ts --config .eslintrc.architecture.json",
    "css:lint": "stylelint resources/webview/css/**/*.css",
    "css:validate-tokens": "npm run css:check-hardcoded && npm run css:check-vscode-vars",
    "prebuild": "npm run lint && npm run css:lint && npm run type-check"
  }
}
```

---

## **Validation Commands**

### **Quick Architecture Check**
```bash
# Check for updateWebview usage (should be minimal)
grep -rn "updateWebview" src/

# Check for console.log in TypeScript (should be 0)
grep -rn "console\\." src/ --include="*.ts"

# Check for missing ComponentFactory usage
grep -rn "new.*Component(" src/ --include="*.ts"
```

### **CSS Standards Check**
```bash
# Navigate to CSS components directory
cd "resources/webview/css/components"

# 1. Direct VS Code variable usage (should be minimal)
echo "=== Direct VS Code Variables (should use semantic tokens) ==="
grep -rn "var(--vscode-" *.css | grep -v "font-family\\|font-size"

# 2. Hardcoded colors (CRITICAL - should be 0)
echo "=== Hardcoded colors (current: 74, target: 0) ==="
grep -rE "#[0-9a-fA-F]{3,6}|rgba?\\(" *.css | wc -l

# 3. Missing semantic token usage
echo "=== Files not using semantic tokens ==="
grep -L "var(--component-" *.css

# 4. Excessive !important usage
echo "=== Excessive !important usage ==="
grep -c "!important" *.css | grep -v ":0"
```

---

## **Success Metrics**

### **Target Compliance Rates**
- **updateWebview() calls**: Only in BasePanel initialization (< 5 occurrences)
- **Console.log in TypeScript**: 0 occurrences
- **Hardcoded CSS values**: 0 occurrences (down from 74)
- **Semantic token adoption**: 80%+ of component CSS
- **Direct VS Code variables**: 0 in component files

### **Monthly Health Check**
1. Run all validation commands
2. Review metrics trends
3. Update rules based on new patterns
4. Refactor high-violation components
5. Update documentation

---

## **Educational Error Messages**

### **Example Helpful Messages**
```javascript
{
  message: `
    ❌ Don't use updateWebview() for data updates
    
    ✅ Use component messaging instead:
    
    // BAD
    this.dataTable.setData(newData);
    this.updateWebview(); // Causes flash
    
    // GOOD  
    this.dataTable.setData(newData); // Component handles update automatically
    
    See: docs/ARCHITECTURE_GUIDE.md#component-update-communication
  `
}
```

---

## **Next Steps**

**Immediate Actions (This Week)**:
1. ✅ Create this consolidated plan
2. ⏳ Install ESLint TypeScript dependencies
3. ⏳ Create basic `.eslintrc.json` with critical rules
4. ⏳ Run CSS hardcoded color validation

**Priority Rule Implementation**:
```json
{
  "no-restricted-syntax": [
    "error",
    {
      "selector": "CallExpression[callee.property.name='updateWebview']",
      "message": "Use component event bridges instead of updateWebview() for data updates"
    }
  ]
}
```

This rule prevents the most critical architectural violation that causes UI flash and poor user experience.