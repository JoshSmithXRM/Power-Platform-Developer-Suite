import type { Webview } from 'vscode';

import type { IPanelStateRepository, PanelState } from '../IPanelStateRepository';
import type { SolutionOption } from '../DataTablePanel';
import { DEFAULT_SOLUTION_ID } from '../../../domain/constants/SolutionConstants';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

import { SolutionFilterBehavior } from './SolutionFilterBehavior';
import { IEnvironmentBehavior } from './IEnvironmentBehavior';

// Mock webview with only the methods needed for testing
interface MockWebview {
	postMessage: jest.Mock;
}

function createMockWebview(): MockWebview {
	return { postMessage: jest.fn() };
}

describe('SolutionFilterBehavior', () => {
	let webviewMock: MockWebview;
	let environmentBehaviorMock: jest.Mocked<IEnvironmentBehavior>;
	let loadSolutionsMock: jest.Mock<Promise<SolutionOption[]>>;
	let panelStateRepositoryMock: jest.Mocked<IPanelStateRepository>;
	let onSolutionChangedMock: jest.Mock<Promise<void>>;
	let loggerMock: jest.Mocked<ILogger>;
	let behavior: SolutionFilterBehavior;

	const mockSolutions: SolutionOption[] = [
		{ id: DEFAULT_SOLUTION_ID, name: 'All Solutions', uniqueName: 'all' },
		{ id: 'sol-1', name: 'Solution 1', uniqueName: 'solution1' },
		{ id: 'sol-2', name: 'Solution 2', uniqueName: 'solution2' }
	];

	beforeEach(() => {
		jest.clearAllMocks();

		webviewMock = createMockWebview();

		environmentBehaviorMock = {
			getCurrentEnvironmentId: jest.fn().mockReturnValue('env-1'),
			initialize: jest.fn(),
			switchEnvironment: jest.fn(),
			dispose: jest.fn()
		};

		loadSolutionsMock = jest.fn().mockResolvedValue(mockSolutions);

		panelStateRepositoryMock = {
			load: jest.fn().mockResolvedValue(null),
			save: jest.fn().mockResolvedValue(undefined),
			clear: jest.fn().mockResolvedValue(undefined),
			clearAll: jest.fn().mockResolvedValue(undefined)
		};

		onSolutionChangedMock = jest.fn().mockResolvedValue(undefined);

		loggerMock = {
			trace: jest.fn(),
		debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn()
		};
	});

	describe('initialize - when enabled', () => {
		beforeEach(() => {
			// Safely cast to Webview interface - only uses postMessage which is mocked
			behavior = new SolutionFilterBehavior(
				webviewMock as unknown as Webview,
				'test-panel',
				environmentBehaviorMock,
				loadSolutionsMock,
				panelStateRepositoryMock,
				onSolutionChangedMock,
				loggerMock,
				true // enabled
			);
		});

		it('should load solutions on initialization', async () => {
			await behavior.initialize();

			expect(loadSolutionsMock).toHaveBeenCalled();
		});

		it('should send solution options to webview', async () => {
			await behavior.initialize();

			expect(webviewMock.postMessage).toHaveBeenCalledWith({
				command: 'solutionFilterOptionsData',
				data: mockSolutions
			});
		});

		it('should set default solution ID when no persisted state', async () => {
			panelStateRepositoryMock.load.mockResolvedValue(null);

			await behavior.initialize();

			expect(behavior.getCurrentSolutionId()).toBe(DEFAULT_SOLUTION_ID);
			expect(webviewMock.postMessage).toHaveBeenCalledWith({
				command: 'setCurrentSolution',
				solutionId: DEFAULT_SOLUTION_ID
			});
		});

		it('should restore persisted solution ID', async () => {
			const persistedState: PanelState = {
				selectedSolutionId: 'sol-1',
				lastUpdated: '2024-01-15T10:00:00Z'
			};
			panelStateRepositoryMock.load.mockResolvedValue(persistedState);

			await behavior.initialize();

			expect(behavior.getCurrentSolutionId()).toBe('sol-1');
			expect(webviewMock.postMessage).toHaveBeenCalledWith({
				command: 'setCurrentSolution',
				solutionId: 'sol-1'
			});
		});

		it('should load persisted state using current environment ID', async () => {
			environmentBehaviorMock.getCurrentEnvironmentId.mockReturnValue('env-123');

			await behavior.initialize();

			expect(panelStateRepositoryMock.load).toHaveBeenCalledWith({
				panelType: 'test-panel',
				environmentId: 'env-123'
			});
		});

		it('should use default solution ID when environment ID is null', async () => {
			environmentBehaviorMock.getCurrentEnvironmentId.mockReturnValue(null);

			await behavior.initialize();

			expect(panelStateRepositoryMock.load).not.toHaveBeenCalled();
			expect(behavior.getCurrentSolutionId()).toBe(DEFAULT_SOLUTION_ID);
		});

		it('should use default solution ID when no state repository', async () => {
			// Safely cast to Webview interface - only uses postMessage which is mocked
			behavior = new SolutionFilterBehavior(
				webviewMock as unknown as Webview,
				'test-panel',
				environmentBehaviorMock,
				loadSolutionsMock,
				undefined, // no repository
				onSolutionChangedMock,
				loggerMock,
				true
			);

			await behavior.initialize();

			expect(behavior.getCurrentSolutionId()).toBe(DEFAULT_SOLUTION_ID);
		});

		it('should warn and use default when loading persisted state fails', async () => {
			const error = new Error('Load failed');
			panelStateRepositoryMock.load.mockRejectedValue(error);

			await behavior.initialize();

			expect(loggerMock.warn).toHaveBeenCalledWith(
				'Failed to load persisted solution filter',
				error
			);
			expect(behavior.getCurrentSolutionId()).toBe(DEFAULT_SOLUTION_ID);
		});
	});

	describe('initialize - when disabled', () => {
		it('should do nothing when filter is disabled', async () => {
			// Safely cast to Webview interface - only uses postMessage which is mocked
			behavior = new SolutionFilterBehavior(
				webviewMock as unknown as Webview,
				'test-panel',
				environmentBehaviorMock,
				loadSolutionsMock,
				panelStateRepositoryMock,
				onSolutionChangedMock,
				loggerMock,
				false // disabled
			);

			await behavior.initialize();

			expect(loadSolutionsMock).not.toHaveBeenCalled();
			expect(webviewMock.postMessage).not.toHaveBeenCalled();
			expect(panelStateRepositoryMock.load).not.toHaveBeenCalled();
		});
	});

	describe('getCurrentSolutionId', () => {
		beforeEach(() => {
			// Safely cast to Webview interface - only uses postMessage which is mocked
			behavior = new SolutionFilterBehavior(
				webviewMock as unknown as Webview,
				'test-panel',
				environmentBehaviorMock,
				loadSolutionsMock,
				panelStateRepositoryMock,
				onSolutionChangedMock,
				loggerMock,
				true
			);
		});

		it('should return default solution ID before initialization', () => {
			expect(behavior.getCurrentSolutionId()).toBe(DEFAULT_SOLUTION_ID);
		});

		it('should return current solution ID after initialization', async () => {
			const persistedState: PanelState = {
				selectedSolutionId: 'sol-2',
				lastUpdated: '2024-01-15T10:00:00Z'
			};
			panelStateRepositoryMock.load.mockResolvedValue(persistedState);

			await behavior.initialize();

			expect(behavior.getCurrentSolutionId()).toBe('sol-2');
		});
	});

	describe('setSolutionId', () => {
		beforeEach(async () => {
			// Safely cast to Webview interface - only uses postMessage which is mocked
			behavior = new SolutionFilterBehavior(
				webviewMock as unknown as Webview,
				'test-panel',
				environmentBehaviorMock,
				loadSolutionsMock,
				panelStateRepositoryMock,
				onSolutionChangedMock,
				loggerMock,
				true
			);

			await behavior.initialize();
			jest.clearAllMocks();
		});

		it('should update current solution ID', async () => {
			await behavior.setSolutionId('sol-1');

			expect(behavior.getCurrentSolutionId()).toBe('sol-1');
		});

		it('should log the change', async () => {
			await behavior.setSolutionId('sol-1');

			expect(loggerMock.debug).toHaveBeenCalledWith('Solution filter changed', {
				solutionId: 'sol-1'
			});
		});

		it('should persist the selection', async () => {
			await behavior.setSolutionId('sol-1');

			expect(panelStateRepositoryMock.save).toHaveBeenCalledWith(
				{
					panelType: 'test-panel',
					environmentId: 'env-1'
				},
				expect.objectContaining({
					selectedSolutionId: 'sol-1'
				})
			);
		});

		it('should include lastUpdated timestamp in persisted state', async () => {
			await behavior.setSolutionId('sol-1');

			expect(panelStateRepositoryMock.save).toHaveBeenCalledTimes(1);
			const [, savedState] = panelStateRepositoryMock.save.mock.calls[0]!;
			expect(savedState.lastUpdated).toBeDefined();
			expect(typeof savedState.lastUpdated).toBe('string');
		});

		it('should call onSolutionChanged callback', async () => {
			await behavior.setSolutionId('sol-1');

			expect(onSolutionChangedMock).toHaveBeenCalledWith('sol-1');
		});

		it('should warn when persistence fails', async () => {
			const error = new Error('Save failed');
			panelStateRepositoryMock.save.mockRejectedValue(error);

			await behavior.setSolutionId('sol-1');

			expect(loggerMock.warn).toHaveBeenCalledWith(
				'Failed to persist solution filter',
				error
			);
		});

		it('should still call callback even if persistence fails', async () => {
			panelStateRepositoryMock.save.mockRejectedValue(new Error('Save failed'));

			await behavior.setSolutionId('sol-1');

			expect(onSolutionChangedMock).toHaveBeenCalledWith('sol-1');
		});

		it('should not persist when no state repository', async () => {
			// Safely cast to Webview interface - only uses postMessage which is mocked
			behavior = new SolutionFilterBehavior(
				webviewMock as unknown as Webview,
				'test-panel',
				environmentBehaviorMock,
				loadSolutionsMock,
				undefined,
				onSolutionChangedMock,
				loggerMock,
				true
			);

			await behavior.setSolutionId('sol-1');

			expect(onSolutionChangedMock).toHaveBeenCalledWith('sol-1');
		});

		it('should not persist when environment ID is null', async () => {
			environmentBehaviorMock.getCurrentEnvironmentId.mockReturnValue(null);

			await behavior.setSolutionId('sol-1');

			expect(panelStateRepositoryMock.save).not.toHaveBeenCalled();
			expect(onSolutionChangedMock).toHaveBeenCalledWith('sol-1');
		});
	});

	describe('dispose', () => {
		it('should not throw when disposing', () => {
			// Safely cast to Webview interface - only uses postMessage which is mocked
			behavior = new SolutionFilterBehavior(
				webviewMock as unknown as Webview,
				'test-panel',
				environmentBehaviorMock,
				loadSolutionsMock,
				panelStateRepositoryMock,
				onSolutionChangedMock,
				loggerMock,
				true
			);

			expect(() => behavior.dispose()).not.toThrow();
		});
	});

	describe('persistence per environment', () => {
		beforeEach(() => {
			// Safely cast to Webview interface - only uses postMessage which is mocked
			behavior = new SolutionFilterBehavior(
				webviewMock as unknown as Webview,
				'test-panel',
				environmentBehaviorMock,
				loadSolutionsMock,
				panelStateRepositoryMock,
				onSolutionChangedMock,
				loggerMock,
				true
			);
		});

		it('should load state specific to current environment', async () => {
			environmentBehaviorMock.getCurrentEnvironmentId.mockReturnValue('env-123');

			await behavior.initialize();

			expect(panelStateRepositoryMock.load).toHaveBeenCalledWith({
				panelType: 'test-panel',
				environmentId: 'env-123'
			});
		});

		it('should save state specific to current environment', async () => {
			await behavior.initialize();

			environmentBehaviorMock.getCurrentEnvironmentId.mockReturnValue('env-456');

			await behavior.setSolutionId('sol-2');

			expect(panelStateRepositoryMock.save).toHaveBeenCalledWith(
				{
					panelType: 'test-panel',
					environmentId: 'env-456'
				},
				expect.objectContaining({})
			);
		});
	});
});
