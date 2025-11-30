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
		'!src/**/__tests__/**'
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
		// FetchXmlToSqlTranspiler uses regex-based parsing with inherent branch limitations
		// for edge cases in XML parsing. Full coverage would require a proper XML parser
		// which violates domain layer purity constraints (no external dependencies).
		'./src/features/dataExplorer/domain/services/FetchXmlToSqlTranspiler.ts': {
			branches: 84,
			functions: 100,
			lines: 100,
			statements: 100
		},
		// Domain layer (excluding FetchXmlToSqlTranspiler which has special threshold above)
		'./src/!(features/dataExplorer/domain/services/FetchXmlToSqlTranspiler)/**/domain/**/*.ts': {
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
