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
      '@typescript-eslint/no-explicit-any': 'error',  // Changed from 'warn' to 'error'
      '@typescript-eslint/no-var-requires': 'error',

      // 6. Type Safety - Prevent implicit 'any' violations
      // TODO: Enable these rules and fix 739 violations (see docs/TECHNICAL_DEBT_TYPE_SAFETY.md)
      // '@typescript-eslint/no-unsafe-return': 'error',
      // '@typescript-eslint/no-unsafe-assignment': 'error',
      // '@typescript-eslint/no-unsafe-member-access': 'error',
      // '@typescript-eslint/no-unsafe-call': 'error',
      // '@typescript-eslint/no-unsafe-argument': 'error'
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
      'no-case-declarations': 'off',
      // Prevent webview JS from importing Extension Host TS (would fail anyway)
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/panels/**', '**/services/**', '**/components/**'],
              message: '❌ Cannot import Extension Host code in webview context. Webview behaviors should only use postMessage() to communicate. See: docs/EXECUTION_CONTEXTS.md'
            }
          ]
        }
      ]
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
      'no-restricted-syntax': [
        'error',
        // NOTE: console.log IS ALLOWED in webview context - don't add console restriction here!
        // Detect ANY camelCase in sendMessage calls using regex
        {
          selector: "CallExpression[callee.property.name='sendMessage'] > Literal:nth-child(2)[value=/[a-z][A-Z]/]",
          message: "❌ Use kebab-case in sendMessage() message names (detected camelCase). Example: 'nodeSelected' should be 'node-selected'. See: docs/MESSAGE_CONVENTIONS.md"
        }
      ]
    }
  },
  {
    // Services are ALLOWED to do data transformation - that's their job!
    files: ['src/services/**/*.ts'],
    rules: {
      // Enforce explicit return types on all service methods
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
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
    files: ['src/components/**/*View.ts', 'src/components/**/*Config.ts', 'src/factories/**/*.ts', '!src/factories/PanelComposer.ts', 'src/panels/**/*Panel.ts', '!src/panels/base/**'],
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
    // PHASE 2: MESSAGE CONVENTIONS & ERROR HANDLING
    // Stricter rules for panels to enforce message naming and error handling standards
    files: [
      'src/panels/**/*Panel.ts',
      '!src/panels/base/**'
    ],
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
          // Only enforce on panels that use singleton pattern (have static currentPanel field)
          // This selector checks: class has currentPanel AND method doesn't call handlePanelCreation
          selector: "ClassDeclaration:has(PropertyDefinition[static=true][key.name='currentPanel']) MethodDefinition[key.name=/^(createOrShow|createNew)$/][static=true]:not(:has(BlockStatement CallExpression[callee.object.name='BasePanel'][callee.property.name='handlePanelCreation']))",
          message: '❌ Panel createOrShow() and createNew() methods must use BasePanel.handlePanelCreation() helper to eliminate code duplication. See: CLAUDE.md#refactoring-principles'
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
        // Detect ANY camelCase in message handler switch statements using regex
        // Only matches switches on message.command or message.action
        {
          selector: "SwitchStatement[discriminant.property.name=/^(command|action)$/] > SwitchCase > Literal[value=/[a-z][A-Z]/]",
          message: "❌ Use kebab-case in message handler case statements (detected camelCase). Example: case 'nodeSelected' should be case 'node-selected'. See: docs/MESSAGE_CONVENTIONS.md"
        },
        // Detect camelCase in postMessage action property
        {
          selector: "CallExpression[callee.property.name='postMessage'] ObjectExpression > Property[key.name='action'] > Literal[value=/[a-z][A-Z]/]",
          message: "❌ Use kebab-case in postMessage action field (detected camelCase). Example: action: 'nodeSelected' should be action: 'node-selected'. See: docs/MESSAGE_CONVENTIONS.md"
        },
        // Detect camelCase in postMessage command property
        {
          selector: "CallExpression[callee.property.name='postMessage'] ObjectExpression > Property[key.name='command'] > Literal[value=/[a-z][A-Z]/]",
          message: "❌ Use kebab-case in postMessage command field (detected camelCase). Example: command: 'nodeSelected' should be command: 'node-selected'. See: docs/MESSAGE_CONVENTIONS.md"
        }
      ]
    }
  },
  {
    // FINAL OVERRIDE: BasePanel exemption - must be last to override all previous rules
    // BasePanel is allowed to use updateWebview() during initialization and for full UI refresh
    files: ['src/panels/base/BasePanel.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='console']",
          message: '❌ Use this.componentLogger instead of console methods in Extension Host context'
        }
        // Note: updateWebview() IS ALLOWED in BasePanel for initialization
        // Note: Data transformation (map) IS ALLOWED in BasePanel
      ]
    }
  },
  {
    // FINAL OVERRIDE: PanelComposer exemption - bootstrap scripts are necessary infrastructure
    // Must be last to override all previous script block restrictions
    files: ['src/factories/PanelComposer.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='console']",
          message: '❌ Use this.componentLogger instead of console methods in Extension Host context'
        }
        // Note: Inline <script> blocks ARE ALLOWED in PanelComposer (bootstrap code for vscode API)
        // Note: onclick handlers NOT allowed (use data-action instead)
        // Note: updateWebview() calls NOT allowed
      ]
    }
  }
);