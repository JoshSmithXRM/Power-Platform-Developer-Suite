import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Global ignores
    ignores: ['dist/**', 'out/**', 'node_modules/**', '*.config.js', 'webpack.config.js']
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'import': importPlugin
    },
    rules: {
      
      // PHASE 1: CRITICAL ARCHITECTURAL RULES
      
      // 1. Component Architecture Violations
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='updateWebview']",
          message: '❌ Use component event bridges instead of updateWebview() for data updates. Only allowed in BasePanel initialization. See: docs/ARCHITECTURE_GUIDE.md#component-update-communication'
        },
        {
          selector: "ArrowFunctionExpression[parent.callee.property.name='map'] ObjectExpression",
          message: '❌ Move data transformation logic to services. Panels should use service data directly. Pattern: solutions.map(sol => ({ id: sol.solutionId, ... })) should be in service layer.'
        },
        {
          selector: "CallExpression[callee.object.name='console']",
          message: '❌ Use this.componentLogger instead of console methods in Extension Host context. console.log is only allowed in webview JavaScript files.'
        }
      ],

      // 2. Logging Architecture Violations
      'no-console': 'error',

      // 3. TypeScript Standards  
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true
        }
      ],

      // 4. Import Standards
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external', 
            'internal',
            'parent',
            'sibling',
            'index'
          ],
          'newlines-between': 'always'
        }
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],

      // 5. General Code Quality
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-var-requires': 'error'
    }
  },
  {
    // Override for JavaScript files (webview)
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        vscode: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        confirm: 'readonly',
        ResizeObserver: 'readonly',
        MutationObserver: 'readonly',
        Node: 'readonly',
        CustomEvent: 'readonly',
        module: 'writable',
        ComponentUtils: 'readonly',
        EnvironmentSelectorUtils: 'readonly'
      }
    },
    rules: {
      'no-console': 'off',
      'no-restricted-syntax': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-undef': 'off',
      'no-prototype-builtins': 'off',
      'no-case-declarations': 'off'
    }
  },
  {
    // Override for webview JavaScript specifically
    files: ['resources/webview/js/**/*.js'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        vscode: 'readonly'
      }
    },
    rules: {
      'no-console': 'off',
      'no-restricted-syntax': 'off'
    }
  },
  {
    // Services are ALLOWED to do data transformation - that's their job!
    files: ['src/services/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='updateWebview']",
          message: '❌ Use component event bridges instead of updateWebview() for data updates'
        },
        {
          selector: "CallExpression[callee.object.name='console']",
          message: '❌ Use this.componentLogger instead of console methods in Extension Host context'
        }
        // Note: Data transformation (map) is ALLOWED in services
      ]
    }
  },
  {
    // View classes, config files, and panels are allowed to transform data for UI rendering purposes
    files: ['src/components/**/*View.ts', 'src/components/**/*Config.ts', 'src/factories/**/*.ts', 'src/panels/**/*Panel.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='updateWebview']",
          message: '❌ Use component event bridges instead of updateWebview() for data updates'
        },
        {
          selector: "CallExpression[callee.object.name='console']",
          message: '❌ Use this.componentLogger instead of console methods in Extension Host context'
        },
        {
          selector: "TemplateLiteral TemplateElement[value.raw=/onclick\\s*=/]",
          message: '❌ No inline onclick handlers in HTML templates. Use postMessage() and handle in message handler. See: docs/MESSAGE_CONVENTIONS.md and docs/EXECUTION_CONTEXTS.md'
        },
        {
          selector: "TemplateLiteral TemplateElement[value.raw=/oninput\\s*=/]",
          message: '❌ No inline oninput handlers in HTML templates. Use postMessage() and handle in message handler. See: docs/MESSAGE_CONVENTIONS.md and docs/EXECUTION_CONTEXTS.md'
        },
        {
          selector: "TemplateLiteral TemplateElement[value.raw=/<script[^>]*>/]",
          message: '❌ No inline <script> blocks in HTML templates. Move JavaScript to webview behavior files in resources/webview/js/. See: docs/EXECUTION_CONTEXTS.md'
        }
        // Note: Data transformation (map) is ALLOWED in View classes and Factories for UI rendering
      ]
    }
  },
  {
    // Special allowance for BasePanel - both updateWebview and data transformation allowed
    files: ['src/panels/BasePanel.ts', 'src/panels/base/BasePanel.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='console']",
          message: '❌ Use this.componentLogger instead of console methods in Extension Host context'
        }
        // Note: Both updateWebview() and data transformation (map) are ALLOWED in BasePanel
      ]
    }
  },
  {
    // PHASE 2: MESSAGE CONVENTIONS & ERROR HANDLING
    // Stricter rules for panels to enforce message naming and error handling standards
    files: ['src/panels/**/*Panel.ts', '!src/panels/base/**'],
    rules: {
      // Enforce kebab-case in case statement strings (common message patterns)
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='updateWebview']",
          message: '❌ Use component event bridges instead of updateWebview() for data updates'
        },
        {
          selector: "CallExpression[callee.object.name='console']",
          message: '❌ Use this.componentLogger instead of console methods in Extension Host context'
        },
        {
          selector: "TemplateLiteral TemplateElement[value.raw=/onclick\\s*=/]",
          message: '❌ No inline onclick handlers in HTML templates. Use postMessage() and handle in message handler. See: docs/MESSAGE_CONVENTIONS.md'
        },
        {
          selector: "TemplateLiteral TemplateElement[value.raw=/oninput\\s*=/]",
          message: '❌ No inline oninput handlers in HTML templates. Use postMessage() and handle in message handler. See: docs/MESSAGE_CONVENTIONS.md'
        },
        {
          selector: "TemplateLiteral TemplateElement[value.raw=/<script[^>]*>/]",
          message: '❌ No inline <script> blocks in HTML templates. Move JavaScript to webview behavior files. See: docs/EXECUTION_CONTEXTS.md'
        },
        // Detect common camelCase patterns in case statements
        {
          selector: "SwitchCase > Literal[value='loadTraces']",
          message: "❌ Use kebab-case 'load-traces' not camelCase 'loadTraces'. See: docs/MESSAGE_CONVENTIONS.md"
        },
        {
          selector: "SwitchCase > Literal[value='loadEnvironments']",
          message: "❌ Use kebab-case 'load-environments' not camelCase 'loadEnvironments'. See: docs/MESSAGE_CONVENTIONS.md"
        },
        {
          selector: "SwitchCase > Literal[value='traceLevelChanged']",
          message: "❌ Use kebab-case 'trace-level-changed' not camelCase 'traceLevelChanged'. See: docs/MESSAGE_CONVENTIONS.md"
        },
        {
          selector: "SwitchCase > Literal[value='filtersApplied']",
          message: "❌ Use kebab-case 'filters-applied' not camelCase 'filtersApplied'. See: docs/MESSAGE_CONVENTIONS.md"
        },
        {
          selector: "SwitchCase > Literal[value='traceSelected']",
          message: "❌ Use kebab-case 'trace-selected' not camelCase 'traceSelected'. See: docs/MESSAGE_CONVENTIONS.md"
        },
        {
          selector: "SwitchCase > Literal[value='contextMenuAction']",
          message: "❌ Use kebab-case 'context-menu-action' not camelCase 'contextMenuAction'. See: docs/MESSAGE_CONVENTIONS.md"
        },
        {
          selector: "SwitchCase > Literal[value='autoRefreshChanged']",
          message: "❌ Use kebab-case 'auto-refresh-changed' not camelCase 'autoRefreshChanged'. See: docs/MESSAGE_CONVENTIONS.md"
        },
        {
          selector: "SwitchCase > Literal[value='splitRatioChanged']",
          message: "❌ Use kebab-case 'split-ratio-changed' not camelCase 'splitRatioChanged'. See: docs/MESSAGE_CONVENTIONS.md"
        },
        {
          selector: "SwitchCase > Literal[value='rightPanelOpened']",
          message: "❌ Use kebab-case 'right-panel-opened' not camelCase 'rightPanelOpened'. See: docs/MESSAGE_CONVENTIONS.md"
        },
        {
          selector: "SwitchCase > Literal[value='rightPanelClosed']",
          message: "❌ Use kebab-case 'right-panel-closed' not camelCase 'rightPanelClosed'. See: docs/MESSAGE_CONVENTIONS.md"
        },
        {
          selector: "SwitchCase > Literal[value='environmentChanged']",
          message: "❌ Use kebab-case 'environment-changed' not camelCase 'environmentChanged'. Already handled by 'environment-changed' case. See: docs/MESSAGE_CONVENTIONS.md"
        }
      ]
    }
  }
);