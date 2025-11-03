import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import localRules from 'eslint-plugin-local-rules';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Global ignores
    ignores: ['dist/**', 'out/**', 'node_modules/**', '*.config.js', 'webpack.config.js']
  },
  {
    // TypeScript files (Extension Host) - excluding tests
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    ignores: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
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
      'import': importPlugin,
      'local-rules': localRules
    },
    rules: {
      // ===========================
      // TYPE SAFETY (CLAUDE.md: NEVER use `any` without explicit type)
      // ===========================
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',

      // ===========================
      // EXPLICIT RETURN TYPES (CLAUDE.md: ALWAYS explicit return types)
      // ===========================
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true
        }
      ],

      // ===========================
      // GENERAL CODE QUALITY
      // ===========================
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/no-var-requires': 'error',

      // ===========================
      // IMPORT ORGANIZATION
      // ===========================
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

      // ===========================
      // LOGGING (No console in Extension Host)
      // ===========================
      'no-console': 'error',

      // ===========================
      // CLEAN ARCHITECTURE BOUNDARIES (CLAUDE.md: Layer separation)
      // ===========================
      'local-rules/no-domain-in-presentation': 'error',
      'local-rules/no-outer-layers-in-domain': 'error',
      'local-rules/no-presentation-in-application': 'error',

      // ===========================
      // ASYNC/PROMISE HANDLING
      // ===========================
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/promise-function-async': 'error',

      // ===========================
      // CODE COMPLEXITY
      // ===========================
      'complexity': ['warn', 15],
      'max-lines': ['warn', { max: 500, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 100, skipBlankLines: true, skipComments: true }],
      'max-depth': ['warn', 4],
      'max-nested-callbacks': ['warn', 3]
    }
  },
  {
    // Test files - Relax structural complexity rules
    // These rules measure framework structure (describe → it → expect), not logical complexity
    // See: Clean Architecture Guardian recommendation (2025-11-02)
    files: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    rules: {
      // DISABLED: Framework nesting is structural, not algorithmic complexity
      'max-nested-callbacks': 'off',
      'max-lines-per-function': 'off',
      'max-lines': 'off',
      'complexity': 'off',

      // KEPT: These catch actual problems even in tests
      'max-depth': ['warn', 4],  // Deeply nested if/for/while IS bad
      'max-statements': ['warn', 30]  // Too many statements = unclear test
    }
  },
  {
    // Composition root - naturally long due to DI wiring
    files: ['src/extension.ts'],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off'
    }
  },
  {
    // Authentication service - complex auth flows are inherently long
    files: ['src/features/environmentSetup/infrastructure/services/MsalAuthenticationService.ts'],
    rules: {
      'max-lines-per-function': 'off'
    }
  },
  {
    // HTML rendering - template generation is naturally verbose
    files: [
      'src/features/persistenceInspector/presentation/views/persistenceInspector.ts',
      'src/shared/infrastructure/ui/views/dataTable.ts'
    ],
    rules: {
      'max-lines-per-function': 'off'
    }
  },
  {
    // JavaScript files (Webview Context)
    files: ['resources/webview/**/*.js'],
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
        module: 'writable'
      }
    },
    rules: {
      // Console IS allowed in webview context
      'no-console': 'off',

      // Turn off TypeScript rules for JS files
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-undef': 'off',
      'no-prototype-builtins': 'off',
      'no-case-declarations': 'off',

      // Prevent webview JS from importing Extension Host code
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/core/**', '**/features/**', '**/infrastructure/**'],
              message: '❌ Cannot import Extension Host code in webview context. Use postMessage() to communicate.'
            }
          ]
        }
      ]
    }
  }
);
