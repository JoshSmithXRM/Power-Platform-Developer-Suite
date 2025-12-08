/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/src'],
	testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
	collectCoverageFrom: [
		'src/**/*.ts',
		'!src/**/*.d.ts',
		'!src/extension.ts',
		'!src/**/__tests__/**',
		'!src/**/index.ts',
		'!src/**/initialization/**',
		'!src/infrastructure/dependencyInjection/**',
		'!src/**/application/types/**',
		'!src/**/presentation/panels/**',
		'!src/**/infrastructure/services/VsCode*.ts',
		// Excluded: Regex-based parsers with nested XML limitation
		// See docs/technical-debt/PARSER_REFACTORING.md for details
		'!src/features/dataExplorer/domain/services/FetchXmlParser.ts',
		'!src/features/dataExplorer/domain/services/FetchXmlToSqlTranspiler.ts',
		// Excluded: VS Code Notebook API - requires VS Code runtime
		'!src/**/notebooks/**',
		// Excluded: VS Code Language API completion providers - heavy VS Code integration
		'!src/**/presentation/providers/**',
		// Excluded: Panel coordinators - heavy webview message passing, tested via E2E
		'!src/**/presentation/coordinators/**',
		// Excluded: VS Code event handlers - require VS Code event bus
		'!src/**/infrastructure/eventHandlers/**',
		// Excluded: VS Code command handlers - UI integration layer
		'!src/**/presentation/commands/**',
		// Excluded: VS Code OutputChannel logger - direct VS Code API
		'!src/infrastructure/logging/OutputChannelLogger.ts',
		// Excluded: Simple constant providers - no logic to test
		'!src/**/infrastructure/providers/Hardcoded*.ts',
		// Excluded: VS Code storage repositories - direct VS Code ExtensionContext API
		'!src/**/infrastructure/repositories/VsCode*.ts',
		// Excluded: External API services - require network/auth
		'!src/**/infrastructure/services/PowerPlatformApiService.ts',
		'!src/**/infrastructure/services/WhoAmIService.ts',
		// Excluded: VS Code data provider adapters - deep VS Code integration
		'!src/**/infrastructure/adapters/*DataProviderAdapter*.ts',
		// Excluded: Test utilities - not production code
		'!src/infrastructure/logging/SpyLogger.ts',
		'!src/shared/testing/**',
		// Excluded: IntelliSense repository - requires VS Code language API
		'!src/features/dataExplorer/infrastructure/repositories/DataverseIntelliSenseMetadataRepository.ts',
		// Excluded: Webview base class - VS Code webview integration
		'!src/shared/infrastructure/ui/panels/SafeWebviewPanel.ts',
		// Excluded: VS Code browser service - vscode.env API
		'!src/**/infrastructure/services/VSCodeBrowserService.ts',
		// Excluded: Configuration constants - pure data, no logic
		'!src/**/presentation/constants/**'
	],
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov', 'html'],
	coverageThreshold: {
		global: {
			branches: 80,
			functions: 85,
			lines: 85,
			statements: 85
		},
		'./src/**/domain/**/*.ts': {
			branches: 90,
			functions: 95,
			lines: 95,
			statements: 95
		},
		'./src/**/application/**/*.ts': {
			branches: 85,
			functions: 90,
			lines: 90,
			statements: 90
		}
	},
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
	transform: {
		'^.+\\.tsx?$': ['ts-jest', {
			tsconfig: {
				isolatedModules: false
			},
			diagnostics: {
				ignoreCodes: [151002]
			}
		}]
	}
};
