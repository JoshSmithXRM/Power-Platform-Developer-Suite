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
		'!src/**/infrastructure/services/VsCode*.ts'
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
