import type * as vscode from 'vscode';

import { LoadingStateBehavior } from './LoadingStateBehavior';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';

describe('LoadingStateBehavior', () => {
	let mockPanel: vscode.WebviewPanel;
	let postedMessages: unknown[];
	let behavior: LoadingStateBehavior;

	beforeEach(() => {
		postedMessages = [];
		mockPanel = {
			webview: {
				postMessage: jest.fn().mockImplementation((message) => {
					postedMessages.push(message);
					return Promise.resolve(true);
				})
			}
		} as unknown as vscode.WebviewPanel;
	});

	describe('setLoading', () => {
		it('should disable all buttons when loading is true', async () => {
			// Arrange
			const buttons = LoadingStateBehavior.createButtonConfigs(['refresh', 'openMaker', 'publish']);
			behavior = new LoadingStateBehavior(mockPanel, buttons, new NullLogger());

			// Act
			await behavior.setLoading(true);

			// Assert
			expect(postedMessages).toHaveLength(3);
			expect(postedMessages).toContainEqual({
				command: 'setButtonState',
				buttonId: 'refresh',
				disabled: true,
				showSpinner: true // refresh gets spinner by default
			});
			expect(postedMessages).toContainEqual({
				command: 'setButtonState',
				buttonId: 'openMaker',
				disabled: true,
				showSpinner: false
			});
			expect(postedMessages).toContainEqual({
				command: 'setButtonState',
				buttonId: 'publish',
				disabled: true,
				showSpinner: false
			});
		});

		it('should enable all buttons when loading is false', async () => {
			// Arrange
			const buttons = LoadingStateBehavior.createButtonConfigs(['refresh', 'openMaker']);
			behavior = new LoadingStateBehavior(mockPanel, buttons, new NullLogger());

			// Act
			await behavior.setLoading(false);

			// Assert
			expect(postedMessages).toHaveLength(2);
			expect(postedMessages).toContainEqual({
				command: 'setButtonState',
				buttonId: 'refresh',
				disabled: false,
				showSpinner: false
			});
			expect(postedMessages).toContainEqual({
				command: 'setButtonState',
				buttonId: 'openMaker',
				disabled: false,
				showSpinner: false
			});
		});

		it('should keep specified buttons disabled after loading completes', async () => {
			// Arrange
			const buttons = LoadingStateBehavior.createButtonConfigs(
				['refresh', 'publish'],
				{ keepDisabledButtons: ['publish'] }
			);
			behavior = new LoadingStateBehavior(mockPanel, buttons, new NullLogger());

			// Act
			await behavior.setLoading(false);

			// Assert
			expect(postedMessages).toContainEqual({
				command: 'setButtonState',
				buttonId: 'refresh',
				disabled: false,
				showSpinner: false
			});
			expect(postedMessages).toContainEqual({
				command: 'setButtonState',
				buttonId: 'publish',
				disabled: true, // Stays disabled
				showSpinner: false
			});
		});

		it('should show spinner only on configured buttons', async () => {
			// Arrange
			const buttons = LoadingStateBehavior.createButtonConfigs(
				['refresh', 'export'],
				{ spinnerButtons: ['refresh', 'export'] }
			);
			behavior = new LoadingStateBehavior(mockPanel, buttons, new NullLogger());

			// Act
			await behavior.setLoading(true);

			// Assert
			expect(postedMessages).toContainEqual({
				command: 'setButtonState',
				buttonId: 'refresh',
				disabled: true,
				showSpinner: true
			});
			expect(postedMessages).toContainEqual({
				command: 'setButtonState',
				buttonId: 'export',
				disabled: true,
				showSpinner: true
			});
		});

		it('should track loading state', async () => {
			// Arrange
			const buttons = LoadingStateBehavior.createButtonConfigs(['refresh']);
			behavior = new LoadingStateBehavior(mockPanel, buttons, new NullLogger());

			// Assert - initial state
			expect(behavior.getIsLoading()).toBe(false);

			// Act & Assert - after setLoading(true)
			await behavior.setLoading(true);
			expect(behavior.getIsLoading()).toBe(true);

			// Act & Assert - after setLoading(false)
			await behavior.setLoading(false);
			expect(behavior.getIsLoading()).toBe(false);
		});
	});

	describe('setButtonLoading', () => {
		it('should update only the specified button', async () => {
			// Arrange
			const buttons = LoadingStateBehavior.createButtonConfigs(['refresh', 'openMaker']);
			behavior = new LoadingStateBehavior(mockPanel, buttons, new NullLogger());

			// Act
			await behavior.setButtonLoading('refresh', true);

			// Assert - only one message sent
			expect(postedMessages).toHaveLength(1);
			expect(postedMessages[0]).toEqual({
				command: 'setButtonState',
				buttonId: 'refresh',
				disabled: true,
				showSpinner: true // refresh has spinner by default
			});
		});

		it('should not show spinner for buttons not configured for it', async () => {
			// Arrange
			const buttons = LoadingStateBehavior.createButtonConfigs(['refresh', 'openMaker']);
			behavior = new LoadingStateBehavior(mockPanel, buttons, new NullLogger());

			// Act
			await behavior.setButtonLoading('openMaker', true);

			// Assert
			expect(postedMessages[0]).toEqual({
				command: 'setButtonState',
				buttonId: 'openMaker',
				disabled: true,
				showSpinner: false // openMaker doesn't have spinner
			});
		});

		it('should enable button when loading is false', async () => {
			// Arrange
			const buttons = LoadingStateBehavior.createButtonConfigs(['refresh']);
			behavior = new LoadingStateBehavior(mockPanel, buttons, new NullLogger());

			// Act
			await behavior.setButtonLoading('refresh', false);

			// Assert
			expect(postedMessages[0]).toEqual({
				command: 'setButtonState',
				buttonId: 'refresh',
				disabled: false,
				showSpinner: false
			});
		});
	});

	describe('createButtonConfigs', () => {
		it('should create configs with refresh as default spinner button', () => {
			// Act
			const configs = LoadingStateBehavior.createButtonConfigs(['refresh', 'openMaker', 'publish']);

			// Assert
			expect(configs).toEqual([
				{ id: 'refresh', showSpinner: true, keepDisabled: false },
				{ id: 'openMaker', showSpinner: false, keepDisabled: false },
				{ id: 'publish', showSpinner: false, keepDisabled: false }
			]);
		});

		it('should apply custom spinner buttons', () => {
			// Act
			const configs = LoadingStateBehavior.createButtonConfigs(
				['refresh', 'export'],
				{ spinnerButtons: ['export'] }
			);

			// Assert
			expect(configs).toEqual([
				{ id: 'refresh', showSpinner: false, keepDisabled: false }, // Not in spinnerButtons
				{ id: 'export', showSpinner: true, keepDisabled: false }
			]);
		});

		it('should apply keepDisabled buttons', () => {
			// Act
			const configs = LoadingStateBehavior.createButtonConfigs(
				['refresh', 'publish', 'publishAll'],
				{ keepDisabledButtons: ['publish'] }
			);

			// Assert
			expect(configs).toEqual([
				{ id: 'refresh', showSpinner: true, keepDisabled: false },
				{ id: 'publish', showSpinner: false, keepDisabled: true },
				{ id: 'publishAll', showSpinner: false, keepDisabled: false }
			]);
		});

		it('should handle empty button list', () => {
			// Act
			const configs = LoadingStateBehavior.createButtonConfigs([]);

			// Assert
			expect(configs).toEqual([]);
		});
	});

	describe('edge cases', () => {
		it('should handle button not in config gracefully', async () => {
			// Arrange
			const buttons = LoadingStateBehavior.createButtonConfigs(['refresh']);
			behavior = new LoadingStateBehavior(mockPanel, buttons, new NullLogger());

			// Act - try to update a button not in config
			await behavior.setButtonLoading('nonexistent', true);

			// Assert - should still send message, just without spinner
			expect(postedMessages[0]).toEqual({
				command: 'setButtonState',
				buttonId: 'nonexistent',
				disabled: true,
				showSpinner: false
			});
		});

		it('should handle multiple rapid loading state changes', async () => {
			// Arrange
			const buttons = LoadingStateBehavior.createButtonConfigs(['refresh']);
			behavior = new LoadingStateBehavior(mockPanel, buttons, new NullLogger());

			// Act - rapid changes
			await behavior.setLoading(true);
			await behavior.setLoading(false);
			await behavior.setLoading(true);

			// Assert - all messages sent
			expect(postedMessages).toHaveLength(3);
			expect(behavior.getIsLoading()).toBe(true);
		});
	});
});
