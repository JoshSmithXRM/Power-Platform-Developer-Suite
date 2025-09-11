# ESLint Architecture Enforcement Plan

## **Goal**: Prevent recurring architectural violations through automated linting

This document outlines a comprehensive strategy to use ESLint to automatically prevent the architectural violations that keep recurring in our codebase.

---

## **Recurring Violations We Need to Prevent**

### **1. Forbidden `updateWebview()` Calls**
- **Problem**: Panels call `this.updateWebview()` for data updates instead of using component messaging
- **Impact**: Causes UI flash and violates component architecture
- **Current State**: Still happening in `EnvironmentSetupPanel.ts:194`

### **2. Panel-Level Data Transformation Logic**
- **Problem**: Panels doing `.map()` transformations that should be in services
- **Impact**: Violates DRY, makes code non-reusable
- **Example**: `solutions.map(sol => ({ id: sol.solutionId, ... }))`

### **3. Console.log Usage in Extension Host**
- **Problem**: Using `console.log` instead of `this.componentLogger` in TypeScript files
- **Impact**: Violates logging architecture, not user-accessible
- **Current State**: Found in multiple TypeScript files

### **4. Duplicate Interface Definitions**
- **Problem**: Multiple `Solution` interfaces, `Environment` interfaces, etc.
- **Impact**: Type inconsistency, maintenance burden
- **Recently Fixed**: Had two different `Solution` interfaces

---

## **Phase 1: ESLint Setup & Configuration**

### **Install Dependencies**
```bash
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install --save-dev eslint-plugin-no-unsanitized  # Security rules
npm install --save-dev @typescript-eslint/eslint-plugin-tslint  # Advanced TypeScript rules
```

### **Create `.eslintrc.json`**
```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": [
    "@typescript-eslint"
  ],
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended"
  ],
  "rules": {
    // Custom architectural rules (defined below)
  }
}
```

---

## **Phase 2: Custom Architectural Rules**

### **Rule 1: No updateWebview() for Data Updates**
```json
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "CallExpression[callee.type='MemberExpression'][callee.property.name='updateWebview']",
        "message": "Use component messaging instead of updateWebview() for data updates. Only allowed in BasePanel initialization and specific contexts."
      }
    ]
  }
}
```

**Advanced Version** (custom rule):
```javascript
// eslint-plugin-architecture/no-updatewebview-for-data.js
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Prevent updateWebview() calls except in specific allowed contexts",
      category: "Architecture"
    }
  },
  create: function(context) {
    return {
      CallExpression(node) {
        if (node.callee.type === 'MemberExpression' && 
            node.callee.property.name === 'updateWebview') {
          
          const filename = context.getFilename();
          const functionName = getFunctionName(node);
          
          // Allow only in BasePanel and specific methods
          if (!filename.includes('BasePanel.ts') && 
              !['initialize', 'handleMessage'].includes(functionName)) {
            context.report(node, 
              "Use component messaging instead of updateWebview() for data updates");
          }
        }
      }
    };
  }
};
```

### **Rule 2: No Panel Data Transformation**
```json
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "ArrowFunctionExpression[parent.callee.property.name='map'] ObjectExpression",
        "message": "Move data transformation logic to services. Panels should use service data directly."
      }
    ]
  }
}
```

**Pattern Detection**:
- `.map((sol) => ({ id: sol.solutionId, ... }))`
- `const transformedSolutions = solutions.map(...)`
- `solutions.map(sol => ({ /* transformation */ }))`

### **Rule 3: No Console Logging in Extension Host**
```json
{
  "rules": {
    "no-console": "error",
    "no-restricted-syntax": [
      "error",
      {
        "selector": "CallExpression[callee.object.name='console']",
        "message": "Use this.componentLogger instead of console methods in Extension Host context"
      }
    ]
  },
  "overrides": [
    {
      "files": ["**/*.js", "src/old/**/*"],
      "rules": {
        "no-console": "off"  // Allow console.log in webview JS files
      }
    }
  ]
}
```

### **Rule 4: Prevent Duplicate Interfaces**
```javascript
// Custom rule to detect duplicate interface definitions
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Prevent duplicate interface definitions across files"
    }
  },
  create: function(context) {
    const STANDARD_INTERFACES = {
      'Solution': 'src/services/SolutionService.ts',
      'Environment': 'src/components/base/ComponentInterface.ts',
      'ConnectionReference': 'src/services/ConnectionReferencesService.ts'
    };
    
    return {
      TSInterfaceDeclaration(node) {
        const interfaceName = node.id.name;
        const filename = context.getFilename();
        
        if (STANDARD_INTERFACES[interfaceName] && 
            !filename.includes(STANDARD_INTERFACES[interfaceName])) {
          context.report(node, 
            `Use standardized ${interfaceName} interface from ${STANDARD_INTERFACES[interfaceName]} instead of defining duplicate`);
        }
      }
    };
  }
};
```

### **Rule 5: Service Interface Compliance**
```javascript
// Ensure services return standardized interfaces
{
  "rules": {
    "@typescript-eslint/explicit-function-return-type": [
      "error",
      {
        "allowedNames": ["getSolutions", "getEnvironments", "getConnectionReferences"]
      }
    ]
  }
}
```

---

## **Phase 3: Component Architecture Rules**

### **Component Requirements**
```json
{
  "rules": {
    "component-must-have-getdata": {
      "message": "Components must have getData() method for event bridges",
      "files": ["src/components/**/*Component.ts"]
    },
    "component-must-extend-base": {
      "message": "Components must extend BaseComponent",
      "pattern": "export class.*Component.*extends BaseComponent"
    },
    "component-behavior-registration": {
      "message": "Component behaviors must register with ComponentUtils",
      "files": ["resources/webview/js/components/**Behavior.js"],
      "required": "window.ComponentUtils.registerBehavior"
    }
  }
}
```

### **Panel Architecture Rules**
```json
{
  "rules": {
    "panel-must-extend-base": {
      "message": "Panels must extend BasePanel",
      "files": ["src/panels/**Panel.ts"],
      "pattern": "export class.*Panel.*extends BasePanel"
    },
    "panel-must-use-component-factory": {
      "message": "Use ComponentFactory for all component creation",
      "pattern": "ComponentFactory\\.(create|new)",
      "files": ["src/panels/**Panel.ts"]
    },
    "panel-must-setup-event-bridges": {
      "message": "Panels must setup event bridges for all components",
      "required": "setupComponentEventBridges",
      "files": ["src/panels/**Panel.ts"]
    }
  }
}
```

---

## **Phase 4: Build Integration**

### **Update package.json**
```json
{
  "scripts": {
    "lint": "eslint src --ext ts --max-warnings 0",
    "lint:fix": "eslint src --ext ts --fix --max-warnings 0",
    "lint:architecture": "eslint src --ext ts --config .eslintrc.architecture.json",
    "prebuild": "npm run lint && npm run type-check",
    "precommit": "lint-staged"
  },
  "lint-staged": {
    "src/**/*.ts": [
      "eslint --fix --max-warnings 0",
      "prettier --write"
    ]
  }
}
```

### **VS Code Integration**
Create `.vscode/settings.json`:
```json
{
  "eslint.validate": ["typescript"],
  "eslint.run": "onSave",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.workingDirectories": ["."],
  "eslint.format.enable": true
}
```

---

## **Phase 5: Pre-commit Hooks**

### **Husky Setup**
```bash
npm install --save-dev husky lint-staged
npx husky install
npx husky add .husky/pre-commit "lint-staged"
```

### **Lint-Staged Configuration**
```json
{
  "lint-staged": {
    "src/**/*.ts": [
      "eslint --fix --max-warnings 0",
      "npm run type-check"
    ],
    "src/panels/**/*.ts": [
      "eslint --config .eslintrc.architecture.json --max-warnings 0"
    ]
  }
}
```

---

## **Phase 6: Error Messages & Documentation**

### **Helpful Error Messages**
```javascript
// Example custom rule with educational message
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

### **Quick Fix Suggestions**
```javascript
// ESLint rule with autofix capability
{
  meta: { fixable: "code" },
  create: function(context) {
    return {
      CallExpression(node) {
        if (isConsoleLog(node)) {
          context.report({
            node,
            message: "Use this.componentLogger instead of console.log",
            fix: function(fixer) {
              return fixer.replaceText(node.callee, "this.componentLogger.debug");
            }
          });
        }
      }
    };
  }
}
```

---

## **Implementation Timeline**

### **Week 1: Setup**
- Install ESLint dependencies
- Create basic configuration
- Fix existing violations

### **Week 2: Custom Rules**
- Implement architectural rules
- Test on codebase
- Refine rule accuracy

### **Week 3: Integration**
- Add pre-commit hooks
- Update build scripts
- VS Code integration

### **Week 4: Enforcement**
- Enable error-level rules
- Team training
- Full enforcement

---

## **Monitoring & Maintenance**

### **Rule Effectiveness Tracking**
- Count violations prevented
- Monitor false positives
- Developer feedback collection

### **Rule Updates**
- Add new rules for emerging patterns
- Refine existing rules based on usage
- Regular architecture review

---

## **Expected Benefits**

1. **Automatic Prevention**: Cannot commit architectural violations
2. **Real-time Feedback**: VS Code shows violations while coding
3. **Educational**: Error messages explain proper patterns
4. **Consistency**: All developers follow same architecture
5. **Maintainability**: Catch violations immediately, not in code review

This comprehensive ESLint strategy will eliminate recurring architectural violations and ensure consistent adherence to our component-based architecture principles.