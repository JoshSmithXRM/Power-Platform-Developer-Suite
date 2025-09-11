import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
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
      '@typescript-eslint/no-unused-vars': 'error',

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
        vscode: 'readonly'
      }
    },
    rules: {
      'no-console': 'off',
      'no-restricted-syntax': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off'
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
    // Special allowance for BasePanel updateWebview usage
    files: ['src/panels/BasePanel.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "ArrowFunctionExpression[parent.callee.property.name='map'] ObjectExpression",
          message: '❌ Move data transformation logic to services'
        }
      ]
    }
  }
);