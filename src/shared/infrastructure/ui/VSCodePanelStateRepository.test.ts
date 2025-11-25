import * as vscode from 'vscode';
import { VSCodePanelStateRepository } from './VSCodePanelStateRepository';
import { DEFAULT_SOLUTION_ID } from '../../domain/constants/SolutionConstants';
import type { ILogger } from '../../../infrastructure/logging/ILogger';
import type { PanelStateKey, PanelState } from './IPanelStateRepository';

describe('VSCodePanelStateRepository', () => {
	let repository: VSCodePanelStateRepository;
	let mockWorkspaceState: jest.Mocked<vscode.Memento>;
	let mockLogger: jest.Mocked<ILogger>;

	const createMockKey = (panelType: string, environmentId: string): PanelStateKey => ({
		panelType,
		environmentId
	});

	const createMockState = (selectedSolutionId?: string): PanelState => ({
		selectedSolutionId: selectedSolutionId || 'solution-123',
		lastUpdated: '2024-01-01T12:00:00Z',
		filterCriteria: { status: 'active' },
		detailPanelWidth: 300,
		autoRefreshInterval: 5000
	});

	beforeEach(() => {
		mockWorkspaceState = {
			get: jest.fn(),
			update: jest.fn(),
			keys: jest.fn()
		} as unknown as jest.Mocked<vscode.Memento>;

		mockLogger = {
			trace: jest.fn(),
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn()
		} as unknown as jest.Mocked<ILogger>;

		repository = new VSCodePanelStateRepository(mockWorkspaceState, mockLogger);
	});

	describe('load', () => {
		it('should load panel state for a specific environment', async () => {
			// Arrange
			const key = createMockKey('solutionExplorer', 'env-123');
			const state = createMockState();
			const storageData = { 'env-123': state };

			mockWorkspaceState.get.mockReturnValue(storageData);

			// Act
			const result = await repository.load(key);

			// Assert
			expect(result).toEqual(state);
			expect(mockWorkspaceState.get).toHaveBeenCalledWith('panel-state-solutionExplorer', {});
		});

		it('should return null when no state exists for the environment', async () => {
			// Arrange
			const key = createMockKey('solutionExplorer', 'env-123');
			mockWorkspaceState.get.mockReturnValue({});

			// Act
			const result = await repository.load(key);

			// Assert
			expect(result).toBeNull();
			expect(mockWorkspaceState.get).toHaveBeenCalledWith('panel-state-solutionExplorer', {});
		});

		it('should respect the default empty object when storage is empty', async () => {
			// Arrange
			const key = createMockKey('solutionExplorer', 'env-123');
			// Simulate storage returning empty which should use the default {}
			mockWorkspaceState.get.mockImplementation((_key, defaultValue) => {
				// Simulate VS Code Memento behavior: return default when key doesn't exist
				return defaultValue;
			});

			// Act
			const result = await repository.load(key);

			// Assert
			expect(result).toBeNull();
		});

		it('should migrate legacy null selectedSolutionId to DEFAULT_SOLUTION_ID', async () => {
			// Arrange
			const key = createMockKey('solutionExplorer', 'env-123');
			const legacyState = {
				selectedSolutionId: null,
				lastUpdated: '2024-01-01T12:00:00Z'
			};
			const storageData = { 'env-123': legacyState };

			mockWorkspaceState.get.mockReturnValue(storageData);
			mockWorkspaceState.update.mockResolvedValue(undefined);

			// Act
			const result = await repository.load(key);

			// Assert
			expect(result).not.toBeNull();
			expect(result?.selectedSolutionId).toBe(DEFAULT_SOLUTION_ID);
			expect(mockLogger.warn).toHaveBeenCalledWith('Migrating legacy null solution ID to default', {
				panelType: 'solutionExplorer',
				environmentId: 'env-123'
			});
			expect(mockWorkspaceState.update).toHaveBeenCalled();
		});

		it('should migrate legacy undefined selectedSolutionId to DEFAULT_SOLUTION_ID', async () => {
			// Arrange
			const key = createMockKey('solutionExplorer', 'env-123');
			const legacyState = {
				selectedSolutionId: undefined,
				lastUpdated: '2024-01-01T12:00:00Z'
			};
			const storageData = { 'env-123': legacyState };

			mockWorkspaceState.get.mockReturnValue(storageData);
			mockWorkspaceState.update.mockResolvedValue(undefined);

			// Act
			const result = await repository.load(key);

			// Assert
			expect(result).not.toBeNull();
			expect(result?.selectedSolutionId).toBe(DEFAULT_SOLUTION_ID);
			expect(mockLogger.warn).toHaveBeenCalledWith('Migrating legacy null solution ID to default', {
				panelType: 'solutionExplorer',
				environmentId: 'env-123'
			});
		});

		it('should preserve other properties during migration', async () => {
			// Arrange
			const key = createMockKey('solutionExplorer', 'env-123');
			const legacyState = {
				selectedSolutionId: null,
				lastUpdated: '2024-01-01T12:00:00Z',
				filterCriteria: { status: 'active' },
				detailPanelWidth: 400,
				customProperty: 'custom-value'
			};
			const storageData = { 'env-123': legacyState };

			mockWorkspaceState.get.mockReturnValue(storageData);
			mockWorkspaceState.update.mockResolvedValue(undefined);

			// Act
			const result = await repository.load(key);

			// Assert
			expect(result).not.toBeNull();
			expect(result?.filterCriteria).toEqual({ status: 'active' });
			expect(result?.detailPanelWidth).toBe(400);
			expect(result?.['customProperty']).toBe('custom-value');
		});

		it('should handle storage error with quota exceeded', async () => {
			// Arrange
			const key = createMockKey('solutionExplorer', 'env-123');
			const error = new Error('quota exceeded');
			mockWorkspaceState.get.mockImplementation(() => {
				throw error;
			});

			// Act
			const result = await repository.load(key);

			// Assert
			expect(result).toBeNull();
			expect(mockLogger.error).not.toHaveBeenCalled();
		});

		it('should handle storage error with storage keyword', async () => {
			// Arrange
			const key = createMockKey('solutionExplorer', 'env-123');
			const error = new Error('storage limit exceeded');
			mockWorkspaceState.get.mockImplementation(() => {
				throw error;
			});

			// Act
			const result = await repository.load(key);

			// Assert
			expect(result).toBeNull();
		});

		it('should handle JSON serialization error', async () => {
			// Arrange
			const key = createMockKey('solutionExplorer', 'env-123');
			const error = new Error('JSON parse error');
			mockWorkspaceState.get.mockImplementation(() => {
				throw error;
			});

			// Act
			const result = await repository.load(key);

			// Assert
			expect(result).toBeNull();
		});

		it('should rethrow unexpected errors', async () => {
			// Arrange
			const key = createMockKey('solutionExplorer', 'env-123');
			const error = new Error('unexpected error');
			mockWorkspaceState.get.mockImplementation(() => {
				throw error;
			});

			// Act & Assert
			await expect(repository.load(key)).rejects.toThrow('unexpected error');
			expect(mockLogger.error).toHaveBeenCalledWith('Unexpected error loading panel state', error);
		});

		it('should rethrow non-Error objects', async () => {
			// Arrange
			const key = createMockKey('solutionExplorer', 'env-123');
			const error = 'not an error object';
			mockWorkspaceState.get.mockImplementation(() => {
				throw error;
			});

			// Act & Assert
			await expect(repository.load(key)).rejects.toBe('not an error object');
			expect(mockLogger.error).toHaveBeenCalledWith('Unexpected error loading panel state', error);
		});

		it('should load state from multiple environments independently', async () => {
			// Arrange
			const key1 = createMockKey('solutionExplorer', 'env-1');
			const key2 = createMockKey('solutionExplorer', 'env-2');
			const state1 = createMockState('solution-1');
			const state2 = createMockState('solution-2');
			const storageData = {
				'env-1': state1,
				'env-2': state2
			};

			mockWorkspaceState.get.mockReturnValue(storageData);

			// Act
			const result1 = await repository.load(key1);
			const result2 = await repository.load(key2);

			// Assert
			expect(result1).toEqual(state1);
			expect(result2).toEqual(state2);
		});

		it('should use correct storage key based on panel type', async () => {
			// Arrange
			const key = createMockKey('customPanel', 'env-123');
			mockWorkspaceState.get.mockReturnValue({});

			// Act
			await repository.load(key);

			// Assert
			expect(mockWorkspaceState.get).toHaveBeenCalledWith('panel-state-customPanel', {});
		});
	});

	describe('save', () => {
		it('should save panel state for a specific environment', async () => {
			// Arrange
			const key = createMockKey('solutionExplorer', 'env-123');
			const state = createMockState();
			mockWorkspaceState.get.mockReturnValue({});
			mockWorkspaceState.update.mockResolvedValue(undefined);

			// Act
			await repository.save(key, state);

			// Assert
			expect(mockWorkspaceState.get).toHaveBeenCalledWith('panel-state-solutionExplorer', {});
			expect(mockWorkspaceState.update).toHaveBeenCalled();
			const callArgs = mockWorkspaceState.update.mock.calls[0];
			expect(callArgs?.[0]).toBe('panel-state-solutionExplorer');
			expect(callArgs?.[1]).toEqual({ 'env-123': state });
		});

		it('should preserve existing states for other environments', async () => {
			// Arrange
			const key = createMockKey('solutionExplorer', 'env-2');
			const existingState = createMockState('solution-1');
			const newState = createMockState('solution-2');
			mockWorkspaceState.get.mockReturnValue({
				'env-1': existingState
			});
			mockWorkspaceState.update.mockResolvedValue(undefined);

			// Act
			await repository.save(key, newState);

			// Assert
			const callArgs = mockWorkspaceState.update.mock.calls[0];
			const savedData = callArgs?.[1] as Record<string, PanelState>;
			expect(savedData['env-1']).toEqual(existingState);
			expect(savedData['env-2']).toEqual(newState);
		});

		it('should overwrite existing state for same environment', async () => {
			// Arrange
			const key = createMockKey('solutionExplorer', 'env-123');
			const oldState = createMockState('solution-old');
			const newState = createMockState('solution-new');
			mockWorkspaceState.get.mockReturnValue({
				'env-123': oldState
			});
			mockWorkspaceState.update.mockResolvedValue(undefined);

			// Act
			await repository.save(key, newState);

			// Assert
			const callArgs = mockWorkspaceState.update.mock.calls[0];
			const savedData = callArgs?.[1] as Record<string, PanelState>;
			expect(savedData['env-123']).toEqual(newState);
			expect(savedData['env-123']).not.toEqual(oldState);
		});

		it('should handle storage error with quota exceeded', async () => {
			// Arrange
			const key = createMockKey('solutionExplorer', 'env-123');
			const state = createMockState();
			mockWorkspaceState.get.mockReturnValue({});
			const error = new Error('quota exceeded');
			mockWorkspaceState.update.mockRejectedValue(error);

			// Act & Assert - should not throw
			await expect(repository.save(key, state)).resolves.toBeUndefined();
			expect(mockLogger.error).not.toHaveBeenCalled();
		});

		it('should handle JSON serialization error on save', async () => {
			// Arrange
			const key = createMockKey('solutionExplorer', 'env-123');
			const state = createMockState();
			mockWorkspaceState.get.mockReturnValue({});
			const error = new Error('JSON stringify error');
			mockWorkspaceState.update.mockRejectedValue(error);

			// Act & Assert
			await expect(repository.save(key, state)).resolves.toBeUndefined();
		});

		it('should rethrow unexpected save errors', async () => {
			// Arrange
			const key = createMockKey('solutionExplorer', 'env-123');
			const state = createMockState();
			mockWorkspaceState.get.mockReturnValue({});
			const error = new Error('unexpected save error');
			mockWorkspaceState.update.mockRejectedValue(error);

			// Act & Assert
			await expect(repository.save(key, state)).rejects.toThrow('unexpected save error');
			expect(mockLogger.error).toHaveBeenCalledWith('Unexpected error saving panel state', error);
		});

		it('should save partial state updates', async () => {
			// Arrange
			const key = createMockKey('solutionExplorer', 'env-123');
			const partialState: PanelState = {
				detailPanelWidth: 500
			};
			mockWorkspaceState.get.mockReturnValue({});
			mockWorkspaceState.update.mockResolvedValue(undefined);

			// Act
			await repository.save(key, partialState);

			// Assert
			const callArgs = mockWorkspaceState.update.mock.calls[0];
			const savedData = callArgs?.[1] as Record<string, PanelState>;
			expect(savedData['env-123']).toEqual(partialState);
		});

		it('should handle save for multiple environments sequentially', async () => {
			// Arrange
			const key1 = createMockKey('solutionExplorer', 'env-1');
			const key2 = createMockKey('solutionExplorer', 'env-2');
			const state1 = createMockState('solution-1');
			const state2 = createMockState('solution-2');

			mockWorkspaceState.get.mockReturnValue({});
			mockWorkspaceState.update.mockResolvedValue(undefined);

			// Act
			await repository.save(key1, state1);
			await repository.save(key2, state2);

			// Assert
			expect(mockWorkspaceState.update).toHaveBeenCalledTimes(2);
		});
	});

	describe('clear', () => {
		it('should clear state for a specific environment', async () => {
			// Arrange
			const key = createMockKey('solutionExplorer', 'env-123');
			const state = createMockState();
			mockWorkspaceState.get.mockReturnValue({
				'env-123': state
			});
			mockWorkspaceState.update.mockResolvedValue(undefined);

			// Act
			await repository.clear(key);

			// Assert
			expect(mockWorkspaceState.get).toHaveBeenCalledWith('panel-state-solutionExplorer', {});
			const callArgs = mockWorkspaceState.update.mock.calls[0];
			const savedData = callArgs?.[1] as Record<string, PanelState>;
			expect(savedData['env-123']).toBeUndefined();
		});

		it('should preserve states for other environments when clearing one', async () => {
			// Arrange
			const key = createMockKey('solutionExplorer', 'env-2');
			const state1 = createMockState('solution-1');
			const state2 = createMockState('solution-2');
			mockWorkspaceState.get.mockReturnValue({
				'env-1': state1,
				'env-2': state2
			});
			mockWorkspaceState.update.mockResolvedValue(undefined);

			// Act
			await repository.clear(key);

			// Assert
			const callArgs = mockWorkspaceState.update.mock.calls[0];
			const savedData = callArgs?.[1] as Record<string, PanelState>;
			expect(savedData['env-1']).toEqual(state1);
			expect(savedData['env-2']).toBeUndefined();
		});

		it('should handle clearing non-existent state', async () => {
			// Arrange
			const key = createMockKey('solutionExplorer', 'env-123');
			mockWorkspaceState.get.mockReturnValue({});
			mockWorkspaceState.update.mockResolvedValue(undefined);

			// Act
			await repository.clear(key);

			// Assert
			expect(mockWorkspaceState.update).toHaveBeenCalled();
		});

		it('should handle storage error with quota exceeded on clear', async () => {
			// Arrange
			const key = createMockKey('solutionExplorer', 'env-123');
			mockWorkspaceState.get.mockReturnValue({
				'env-123': createMockState()
			});
			const error = new Error('storage quota exceeded');
			mockWorkspaceState.update.mockRejectedValue(error);

			// Act & Assert
			await expect(repository.clear(key)).resolves.toBeUndefined();
			expect(mockLogger.error).not.toHaveBeenCalled();
		});

		it('should rethrow unexpected clear errors', async () => {
			// Arrange
			const key = createMockKey('solutionExplorer', 'env-123');
			mockWorkspaceState.get.mockReturnValue({
				'env-123': createMockState()
			});
			const error = new Error('unexpected clear error');
			mockWorkspaceState.update.mockRejectedValue(error);

			// Act & Assert
			await expect(repository.clear(key)).rejects.toThrow('unexpected clear error');
			expect(mockLogger.error).toHaveBeenCalledWith('Unexpected error clearing panel state', error);
		});

		it('should use correct storage key for different panel types', async () => {
			// Arrange
			const key = createMockKey('customPanel', 'env-123');
			mockWorkspaceState.get.mockReturnValue({});
			mockWorkspaceState.update.mockResolvedValue(undefined);

			// Act
			await repository.clear(key);

			// Assert
			expect(mockWorkspaceState.get).toHaveBeenCalledWith('panel-state-customPanel', {});
		});

		it('should clear state from multiple environments sequentially', async () => {
			// Arrange
			const key1 = createMockKey('solutionExplorer', 'env-1');
			const key2 = createMockKey('solutionExplorer', 'env-2');
			const state1 = createMockState('solution-1');
			const state2 = createMockState('solution-2');

			mockWorkspaceState.get.mockReturnValue({
				'env-1': state1,
				'env-2': state2
			});
			mockWorkspaceState.update.mockResolvedValue(undefined);

			// Act
			await repository.clear(key1);
			await repository.clear(key2);

			// Assert
			expect(mockWorkspaceState.update).toHaveBeenCalledTimes(2);
		});
	});

	describe('clearAll', () => {
		it('should clear all state for a specific panel type', async () => {
			// Arrange
			mockWorkspaceState.update.mockResolvedValue(undefined);

			// Act
			await repository.clearAll('solutionExplorer');

			// Assert
			expect(mockWorkspaceState.update).toHaveBeenCalledWith('panel-state-solutionExplorer', undefined);
		});

		it('should use correct storage key based on panel type', async () => {
			// Arrange
			mockWorkspaceState.update.mockResolvedValue(undefined);

			// Act
			await repository.clearAll('customPanel');

			// Assert
			expect(mockWorkspaceState.update).toHaveBeenCalledWith('panel-state-customPanel', undefined);
		});

		it('should handle storage error with quota exceeded on clearAll', async () => {
			// Arrange
			const error = new Error('quota exceeded during clear all');
			mockWorkspaceState.update.mockRejectedValue(error);

			// Act & Assert
			await expect(repository.clearAll('solutionExplorer')).resolves.toBeUndefined();
			expect(mockLogger.error).not.toHaveBeenCalled();
		});

		it('should handle storage error on clearAll', async () => {
			// Arrange
			const error = new Error('storage error during clear all');
			mockWorkspaceState.update.mockRejectedValue(error);

			// Act & Assert
			await expect(repository.clearAll('solutionExplorer')).resolves.toBeUndefined();
		});

		it('should rethrow unexpected clearAll errors', async () => {
			// Arrange
			const error = new Error('unexpected clearAll error');
			mockWorkspaceState.update.mockRejectedValue(error);

			// Act & Assert
			await expect(repository.clearAll('solutionExplorer')).rejects.toThrow('unexpected clearAll error');
			expect(mockLogger.error).toHaveBeenCalledWith('Unexpected error clearing all panel state', error);
		});

		it('should clear different panel types independently', async () => {
			// Arrange
			mockWorkspaceState.update.mockResolvedValue(undefined);

			// Act
			await repository.clearAll('solutionExplorer');
			await repository.clearAll('metadataBrowser');

			// Assert
			expect(mockWorkspaceState.update).toHaveBeenCalledTimes(2);
			expect(mockWorkspaceState.update).toHaveBeenNthCalledWith(
				1,
				'panel-state-solutionExplorer',
				undefined
			);
			expect(mockWorkspaceState.update).toHaveBeenNthCalledWith(
				2,
				'panel-state-metadataBrowser',
				undefined
			);
		});
	});

	describe('storage key generation', () => {
		it('should generate consistent storage keys for same panel type', async () => {
			// Arrange
			const key1 = createMockKey('solutionExplorer', 'env-1');
			const key2 = createMockKey('solutionExplorer', 'env-2');
			mockWorkspaceState.get.mockReturnValue({});

			// Act
			await repository.load(key1);
			await repository.load(key2);

			// Assert
			const firstCall = mockWorkspaceState.get.mock.calls[0]?.[0];
			const secondCall = mockWorkspaceState.get.mock.calls[1]?.[0];
			expect(firstCall).toBe(secondCall);
			expect(firstCall).toBe('panel-state-solutionExplorer');
		});

		it('should generate different storage keys for different panel types', async () => {
			// Arrange
			const key1 = createMockKey('solutionExplorer', 'env-1');
			const key2 = createMockKey('metadataBrowser', 'env-1');
			mockWorkspaceState.get.mockReturnValue({});

			// Act
			await repository.load(key1);
			await repository.load(key2);

			// Assert
			const firstCall = mockWorkspaceState.get.mock.calls[0]?.[0];
			const secondCall = mockWorkspaceState.get.mock.calls[1]?.[0];
			expect(firstCall).not.toBe(secondCall);
			expect(firstCall).toBe('panel-state-solutionExplorer');
			expect(secondCall).toBe('panel-state-metadataBrowser');
		});

		it('should handle panel types with special characters in name', async () => {
			// Arrange
			const key = createMockKey('panel-with-dashes_and_underscores', 'env-1');
			mockWorkspaceState.get.mockReturnValue({});

			// Act
			await repository.load(key);

			// Assert
			expect(mockWorkspaceState.get).toHaveBeenCalledWith(
				'panel-state-panel-with-dashes_and_underscores',
				{}
			);
		});
	});

	describe('error handling and edge cases', () => {
		it('should handle non-Error objects thrown from storage', async () => {
			// Arrange
			const key = createMockKey('solutionExplorer', 'env-123');
			mockWorkspaceState.get.mockImplementation(() => {
				throw 'string error';
			});

			// Act & Assert
			await expect(repository.load(key)).rejects.toBe('string error');
		});

		it('should distinguish storage errors from other errors', async () => {
			// Arrange
			const key = createMockKey('solutionExplorer', 'env-123');
			const storageError = new Error('storage limit exceeded');
			const otherError = new Error('network error');

			// First call with storage error
			mockWorkspaceState.get.mockImplementationOnce(() => {
				throw storageError;
			});

			// Second call with other error
			mockWorkspaceState.get.mockImplementationOnce(() => {
				throw otherError;
			});

			// Act
			const result1 = await repository.load(key);
			await expect(repository.load(key)).rejects.toThrow('network error');

			// Assert
			expect(result1).toBeNull();
			expect(mockLogger.error).toHaveBeenCalledTimes(1);
		});

		it('should handle empty string panel type', async () => {
			// Arrange
			const key = createMockKey('', 'env-123');
			mockWorkspaceState.get.mockReturnValue({});

			// Act
			await repository.load(key);

			// Assert
			expect(mockWorkspaceState.get).toHaveBeenCalledWith('panel-state-', {});
		});

		it('should handle empty string environment ID', async () => {
			// Arrange
			const key = createMockKey('solutionExplorer', '');
			const state = createMockState();
			mockWorkspaceState.get.mockReturnValue({
				'': state
			});

			// Act
			const result = await repository.load(key);

			// Assert
			expect(result).toEqual(state);
		});
	});
});
