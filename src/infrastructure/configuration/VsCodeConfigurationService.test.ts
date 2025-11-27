import * as vscode from 'vscode';

import { VsCodeConfigurationService } from './VsCodeConfigurationService';

describe('VsCodeConfigurationService', () => {
	let service: VsCodeConfigurationService;
	let mockGet: jest.Mock;

	beforeEach(() => {
		mockGet = jest.fn();
		(vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
			get: mockGet
		});
		service = new VsCodeConfigurationService();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('get', () => {
		it('should read configuration with powerPlatformDevSuite namespace', () => {
			mockGet.mockReturnValue(100);

			service.get('pluginTrace.defaultLimit', 100);

			expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('powerPlatformDevSuite');
		});

		it('should pass key and default value to config.get', () => {
			mockGet.mockReturnValue(250);

			service.get('pluginTrace.defaultLimit', 100);

			expect(mockGet).toHaveBeenCalledWith('pluginTrace.defaultLimit', 100);
		});

		it('should return configured value when set', () => {
			mockGet.mockReturnValue(500);

			const result = service.get('pluginTrace.defaultLimit', 100);

			expect(result).toBe(500);
		});

		it('should return default value when not configured', () => {
			mockGet.mockImplementation((_key: string, defaultValue: number) => defaultValue);

			const result = service.get('pluginTrace.defaultLimit', 100);

			expect(result).toBe(100);
		});

		it('should support string configuration values', () => {
			mockGet.mockReturnValue('custom-value');

			const result = service.get('some.stringKey', 'default');

			expect(result).toBe('custom-value');
		});

		it('should support boolean configuration values', () => {
			mockGet.mockReturnValue(true);

			const result = service.get('some.booleanKey', false);

			expect(result).toBe(true);
		});

		it('should support nested key paths', () => {
			mockGet.mockReturnValue(42);

			service.get('deeply.nested.key.path', 0);

			expect(mockGet).toHaveBeenCalledWith('deeply.nested.key.path', 0);
		});
	});
});
