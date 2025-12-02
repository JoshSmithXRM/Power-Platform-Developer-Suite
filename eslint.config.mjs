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
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/prefer-optional-chain': 'warn',

      // ===========================
      // EXPLICIT RETURN TYPES (CLAUDE.md: ALWAYS explicit return types)
      // ===========================
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: false,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: false,
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
      'local-rules/no-static-entity-methods': 'error',
      'local-rules/no-presentation-methods-in-domain': 'error',
      'local-rules/no-html-in-typescript': 'error',
      'local-rules/no-static-dependency-instantiation': 'error',
      'local-rules/no-presentation-logic-in-application-layer': 'error',
      'local-rules/no-static-mapper-methods': 'warn',

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
      'max-nested-callbacks': ['warn', 3],

      // ===========================
      // ERROR HANDLING
      // ===========================
      'no-empty': ['error', { allowEmptyCatch: false }],

      // ===========================
      // TYPE DEFINITIONS
      // ===========================
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface']
    }
  },
  {
    // Use case files - Stricter complexity limits (CLAUDE.md: Use cases orchestrate only)
    files: ['src/**/application/useCases/**/*.ts'],
    ignores: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    rules: {
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      'complexity': ['error', 10]
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
      'max-statements': ['warn', 30],  // Too many statements = unclear test

      // Allow underscore prefix for unused parameters (abstract method implementations)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ]
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
    // MSAL supports 4 auth methods, each with its own flow
    files: ['src/features/environmentSetup/infrastructure/services/MsalAuthenticationService.ts'],
    rules: {
      'max-lines-per-function': 'off',
      'max-lines': ['warn', { max: 600, skipBlankLines: true, skipComments: true }]
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
  },
  {
    // Jest mock files - Need Jest globals
    files: ['src/__mocks__/**/*.js'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        module: 'writable',
        require: 'readonly'
      }
    },
    rules: {
      // Allow unused vars in mocks (structural setup)
      '@typescript-eslint/no-unused-vars': 'off'
    }
  },
  // ===========================
  // PATTERN-SPECIFIC OVERRIDES
  // These raise limits for patterns that are inherently complex
  // Goal: 0 warnings for known valid patterns, warnings only for NEW issues
  // ===========================
  {
    // Transpilers/Parsers - inherently complex (parsing requires many branches)
    files: [
      'src/**/domain/services/*Transpiler*.ts',
      'src/**/domain/services/*Lexer*.ts',
      'src/**/domain/services/*Parser*.ts'
    ],
    rules: {
      'complexity': ['warn', 30]
    }
  },
  {
    // Mappers with many fields - complexity is linear field assignment, not branching logic
    files: [
      'src/**/infrastructure/mappers/*.ts',
      'src/**/application/mappers/*.ts'
    ],
    rules: {
      'complexity': ['warn', 35]
    }
  },
  {
    // Domain entities with rich behavior - many properties require complex create() methods
    files: ['src/**/domain/entities/*.ts'],
    rules: {
      'complexity': ['warn', 30]
    }
  },
  {
    // Repository implementations - API aggregation methods can be complex
    files: ['src/**/infrastructure/repositories/*.ts'],
    rules: {
      'complexity': ['warn', 35],
      'max-depth': ['warn', 5]
    }
  },
  {
    // Panel coordinators - many simple command handlers create long files
    files: [
      'src/**/presentation/panels/*Panel*.ts',
      'src/**/presentation/panels/*Composed.ts'
    ],
    rules: {
      'max-lines': ['warn', { max: 900, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 150, skipBlankLines: true, skipComments: true }],
      'complexity': ['warn', 20]
    }
  },
  {
    // Test factories - many optional parameters create high "complexity" that's actually linear
    files: ['src/shared/testing/factories/*.ts'],
    rules: {
      'complexity': 'off'
    }
  },
  {
    // Serializers - transform complex objects with many fields
    files: ['src/**/presentation/serializers/*.ts'],
    rules: {
      'complexity': ['warn', 25]
    }
  },
  {
    // Integration test files - comprehensive tests naturally have many statements/lines
    files: ['src/**/*.integration.test.ts'],
    rules: {
      'max-statements': ['warn', 70],
      'max-lines-per-function': 'off',  // Integration tests are naturally long
      'max-lines': ['warn', { max: 1200, skipBlankLines: true, skipComments: true }]  // Allow large test suites
    }
  },
  {
    // Presentation sections - HTML rendering methods are naturally long
    files: ['src/**/presentation/sections/*.ts', 'src/**/presentation/views/*.ts'],
    ignores: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    rules: {
      'max-lines-per-function': ['warn', { max: 300, skipBlankLines: true, skipComments: true }]
    }
  },
  {
    // Section and serializer test files - comprehensive tests are long
    files: [
      'src/**/presentation/sections/*.test.ts',
      'src/**/presentation/serializers/*.test.ts'
    ],
    rules: {
      'max-lines-per-function': 'off',
      'max-statements': ['warn', 70]
    }
  },
  {
    // Presentation behaviors - filter/state management can be complex
    files: ['src/**/presentation/behaviors/*.ts'],
    rules: {
      'complexity': ['warn', 20],
      'max-depth': ['warn', 5]
    }
  },
  {
    // Test helper functions in test files - can have many optional params
    files: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    rules: {
      'complexity': ['warn', 30]  // Test setup functions have many branches
    }
  }
);
