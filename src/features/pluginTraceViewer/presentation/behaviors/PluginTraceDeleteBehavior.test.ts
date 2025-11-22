import * as vscode from 'vscode';

import { PluginTraceDeleteBehavior } from './PluginTraceDeleteBehavior';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { DeleteTracesUseCase } from '../../application/useCases/DeleteTracesUseCase';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';

// Type helper for VS Code message dialog responses
type MessageResponse = string | undefined;

describe('PluginTraceDeleteBehavior', () => {
	let behavior: PluginTraceDeleteBehavior;
	let mockDeleteTracesUseCase: jest.Mocked<DeleteTracesUseCase>;
	let mockLogger: ILogger;
	let mockOnRefreshNeeded: jest.Mock;

	const TEST_ENVIRONMENT_ID = 'test-env-id';

	beforeEach(() => {
		// Mock DeleteTracesUseCase
		mockDeleteTracesUseCase = {
			deleteMultiple: jest.fn(),
			deleteAll: jest.fn(),
			deleteOldTraces: jest.fn()
		} as unknown as jest.Mocked<DeleteTracesUseCase>;

		// Mock logger
		mockLogger = new NullLogger();

		// Mock refresh callback
		mockOnRefreshNeeded = jest.fn().mockResolvedValue(undefined);

		// Create behavior instance
		behavior = new PluginTraceDeleteBehavior(
			mockDeleteTracesUseCase,
			mockLogger,
			mockOnRefreshNeeded
		);
	});

	describe('deleteSelected', () => {
		it('should show warning when no traces selected', async () => {
			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue(undefined);

			await behavior.deleteSelected(TEST_ENVIRONMENT_ID, []);

			expect(showWarningSpy).toHaveBeenCalledWith('No traces selected for deletion');
			expect(mockDeleteTracesUseCase.deleteMultiple).not.toHaveBeenCalled();

			showWarningSpy.mockRestore();
		});

		it('should show confirmation dialog before deleting', async () => {
			const traceIds = ['trace-1', 'trace-2', 'trace-3'];
			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage') as unknown as jest.SpyInstance<Promise<MessageResponse>>;
			showWarningSpy.mockResolvedValue(undefined);

			await behavior.deleteSelected(TEST_ENVIRONMENT_ID, traceIds);

			expect(showWarningSpy).toHaveBeenCalledWith(
				'Delete 3 selected trace(s)? This cannot be undone.',
				{ modal: true },
				'Delete',
				'Cancel'
			);

			showWarningSpy.mockRestore();
		});

		it('should not delete when user cancels', async () => {
			const traceIds = ['trace-1', 'trace-2'];
			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage') as unknown as jest.SpyInstance<Promise<MessageResponse>>;
			showWarningSpy.mockResolvedValue(undefined);

			await behavior.deleteSelected(TEST_ENVIRONMENT_ID, traceIds);

			expect(mockDeleteTracesUseCase.deleteMultiple).not.toHaveBeenCalled();
			expect(mockOnRefreshNeeded).not.toHaveBeenCalled();

			showWarningSpy.mockRestore();
		});

		it('should delete traces when user confirms', async () => {
			const traceIds = ['trace-1', 'trace-2', 'trace-3'];
			mockDeleteTracesUseCase.deleteMultiple.mockResolvedValueOnce(3);

			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage') as unknown as jest.SpyInstance<Promise<MessageResponse>>;
			showWarningSpy.mockResolvedValue('Delete');
			const showInfoSpy = jest.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(undefined);

			await behavior.deleteSelected(TEST_ENVIRONMENT_ID, traceIds);

			expect(mockDeleteTracesUseCase.deleteMultiple).toHaveBeenCalledWith(TEST_ENVIRONMENT_ID, traceIds);
			expect(showInfoSpy).toHaveBeenCalledWith('Deleted 3 trace(s)');

			showWarningSpy.mockRestore();
			showInfoSpy.mockRestore();
		});

		it('should refresh after successful deletion', async () => {
			const traceIds = ['trace-1'];
			mockDeleteTracesUseCase.deleteMultiple.mockResolvedValueOnce(1);

			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage') as unknown as jest.SpyInstance<Promise<MessageResponse>>;
			showWarningSpy.mockResolvedValue('Delete');
			jest.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(undefined);

			await behavior.deleteSelected(TEST_ENVIRONMENT_ID, traceIds);

			expect(mockOnRefreshNeeded).toHaveBeenCalled();

			showWarningSpy.mockRestore();
		});

		it('should show error message on failure', async () => {
			const traceIds = ['trace-1', 'trace-2'];
			mockDeleteTracesUseCase.deleteMultiple.mockRejectedValueOnce(new Error('Delete failed'));

			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage') as unknown as jest.SpyInstance<Promise<MessageResponse>>;
			showWarningSpy.mockResolvedValue('Delete');
			const showErrorSpy = jest.spyOn(vscode.window, 'showErrorMessage').mockResolvedValue(undefined);

			await behavior.deleteSelected(TEST_ENVIRONMENT_ID, traceIds);

			expect(showErrorSpy).toHaveBeenCalledWith('Failed to delete traces');
			expect(mockOnRefreshNeeded).not.toHaveBeenCalled();

			showWarningSpy.mockRestore();
			showErrorSpy.mockRestore();
		});

		it('should handle single trace deletion', async () => {
			const traceIds = ['trace-1'];
			mockDeleteTracesUseCase.deleteMultiple.mockResolvedValueOnce(1);

			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage') as unknown as jest.SpyInstance<Promise<MessageResponse>>;
			showWarningSpy.mockResolvedValue('Delete');
			const showInfoSpy = jest.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(undefined);

			await behavior.deleteSelected(TEST_ENVIRONMENT_ID, traceIds);

			expect(showWarningSpy).toHaveBeenCalledWith(
				'Delete 1 selected trace(s)? This cannot be undone.',
				expect.any(Object),
				'Delete',
				'Cancel'
			);
			expect(showInfoSpy).toHaveBeenCalledWith('Deleted 1 trace(s)');

			showWarningSpy.mockRestore();
			showInfoSpy.mockRestore();
		});

		it('should handle partial deletion', async () => {
			const traceIds = ['trace-1', 'trace-2', 'trace-3'];
			mockDeleteTracesUseCase.deleteMultiple.mockResolvedValueOnce(2); // Only 2 deleted

			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage') as unknown as jest.SpyInstance<Promise<MessageResponse>>;
			showWarningSpy.mockResolvedValue('Delete');
			const showInfoSpy = jest.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(undefined);

			await behavior.deleteSelected(TEST_ENVIRONMENT_ID, traceIds);

			expect(showInfoSpy).toHaveBeenCalledWith('Deleted 2 trace(s)');

			showWarningSpy.mockRestore();
			showInfoSpy.mockRestore();
		});
	});

	describe('deleteAll', () => {
		it('should show confirmation dialog with correct message', async () => {
			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage') as unknown as jest.SpyInstance<Promise<MessageResponse>>;
			showWarningSpy.mockResolvedValue(undefined);

			await behavior.deleteAll(TEST_ENVIRONMENT_ID);

			expect(showWarningSpy).toHaveBeenCalledWith(
				'Delete ALL plugin traces? This cannot be undone.',
				{ modal: true },
				'Delete All',
				'Cancel'
			);

			showWarningSpy.mockRestore();
		});

		it('should not delete when user cancels', async () => {
			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage') as unknown as jest.SpyInstance<Promise<MessageResponse>>;
			showWarningSpy.mockResolvedValue(undefined);

			await behavior.deleteAll(TEST_ENVIRONMENT_ID);

			expect(mockDeleteTracesUseCase.deleteAll).not.toHaveBeenCalled();
			expect(mockOnRefreshNeeded).not.toHaveBeenCalled();

			showWarningSpy.mockRestore();
		});

		it('should delete all traces when user confirms with "Delete All"', async () => {
			mockDeleteTracesUseCase.deleteAll.mockResolvedValueOnce(150);

			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage') as unknown as jest.SpyInstance<Promise<MessageResponse>>;
			showWarningSpy.mockResolvedValue('Delete All');
			const showInfoSpy = jest.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(undefined);

			await behavior.deleteAll(TEST_ENVIRONMENT_ID);

			expect(mockDeleteTracesUseCase.deleteAll).toHaveBeenCalledWith(TEST_ENVIRONMENT_ID);
			expect(showInfoSpy).toHaveBeenCalledWith('Deleted 150 trace(s)');

			showWarningSpy.mockRestore();
			showInfoSpy.mockRestore();
		});

		it('should refresh after successful deletion', async () => {
			mockDeleteTracesUseCase.deleteAll.mockResolvedValueOnce(100);

			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage') as unknown as jest.SpyInstance<Promise<MessageResponse>>;
			showWarningSpy.mockResolvedValue('Delete All');
			jest.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(undefined);

			await behavior.deleteAll(TEST_ENVIRONMENT_ID);

			expect(mockOnRefreshNeeded).toHaveBeenCalled();

			showWarningSpy.mockRestore();
		});

		it('should show error message on failure', async () => {
			mockDeleteTracesUseCase.deleteAll.mockRejectedValueOnce(new Error('Delete failed'));

			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage') as unknown as jest.SpyInstance<Promise<MessageResponse>>;
			showWarningSpy.mockResolvedValue('Delete All');
			const showErrorSpy = jest.spyOn(vscode.window, 'showErrorMessage').mockResolvedValue(undefined);

			await behavior.deleteAll(TEST_ENVIRONMENT_ID);

			expect(showErrorSpy).toHaveBeenCalledWith('Failed to delete all traces');
			expect(mockOnRefreshNeeded).not.toHaveBeenCalled();

			showWarningSpy.mockRestore();
			showErrorSpy.mockRestore();
		});

		it('should handle zero traces deleted', async () => {
			mockDeleteTracesUseCase.deleteAll.mockResolvedValueOnce(0);

			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage') as unknown as jest.SpyInstance<Promise<MessageResponse>>;
			showWarningSpy.mockResolvedValue('Delete All');
			const showInfoSpy = jest.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(undefined);

			await behavior.deleteAll(TEST_ENVIRONMENT_ID);

			expect(showInfoSpy).toHaveBeenCalledWith('Deleted 0 trace(s)');

			showWarningSpy.mockRestore();
			showInfoSpy.mockRestore();
		});
	});

	describe('deleteOld', () => {
		it('should show confirmation dialog with days parameter', async () => {
			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage') as unknown as jest.SpyInstance<Promise<MessageResponse>>;
			showWarningSpy.mockResolvedValue(undefined);

			await behavior.deleteOld(TEST_ENVIRONMENT_ID, 30);

			expect(showWarningSpy).toHaveBeenCalledWith(
				'Delete all traces older than 30 days? This cannot be undone.',
				{ modal: true },
				'Delete',
				'Cancel'
			);

			showWarningSpy.mockRestore();
		});

		it('should not delete when user cancels', async () => {
			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage') as unknown as jest.SpyInstance<Promise<MessageResponse>>;
			showWarningSpy.mockResolvedValue(undefined);

			await behavior.deleteOld(TEST_ENVIRONMENT_ID, 30);

			expect(mockDeleteTracesUseCase.deleteOldTraces).not.toHaveBeenCalled();
			expect(mockOnRefreshNeeded).not.toHaveBeenCalled();

			showWarningSpy.mockRestore();
		});

		it('should delete old traces when user confirms', async () => {
			mockDeleteTracesUseCase.deleteOldTraces.mockResolvedValueOnce(45);

			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage') as unknown as jest.SpyInstance<Promise<MessageResponse>>;
			showWarningSpy.mockResolvedValue('Delete');
			const showInfoSpy = jest.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(undefined);

			await behavior.deleteOld(TEST_ENVIRONMENT_ID, 30);

			expect(mockDeleteTracesUseCase.deleteOldTraces).toHaveBeenCalledWith(TEST_ENVIRONMENT_ID, 30);
			expect(showInfoSpy).toHaveBeenCalledWith('Deleted 45 trace(s) older than 30 days');

			showWarningSpy.mockRestore();
			showInfoSpy.mockRestore();
		});

		it('should show specific message when no old traces found', async () => {
			mockDeleteTracesUseCase.deleteOldTraces.mockResolvedValueOnce(0);

			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage') as unknown as jest.SpyInstance<Promise<MessageResponse>>;
			showWarningSpy.mockResolvedValue('Delete');
			const showInfoSpy = jest.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(undefined);

			await behavior.deleteOld(TEST_ENVIRONMENT_ID, 30);

			expect(showInfoSpy).toHaveBeenCalledWith('No traces found older than 30 days');

			showWarningSpy.mockRestore();
			showInfoSpy.mockRestore();
		});

		it('should refresh after successful deletion', async () => {
			mockDeleteTracesUseCase.deleteOldTraces.mockResolvedValueOnce(20);

			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage') as unknown as jest.SpyInstance<Promise<MessageResponse>>;
			showWarningSpy.mockResolvedValue('Delete');
			jest.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(undefined);

			await behavior.deleteOld(TEST_ENVIRONMENT_ID, 30);

			expect(mockOnRefreshNeeded).toHaveBeenCalled();

			showWarningSpy.mockRestore();
		});

		it('should refresh even when zero traces deleted', async () => {
			mockDeleteTracesUseCase.deleteOldTraces.mockResolvedValueOnce(0);

			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage') as unknown as jest.SpyInstance<Promise<MessageResponse>>;
			showWarningSpy.mockResolvedValue('Delete');
			jest.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(undefined);

			await behavior.deleteOld(TEST_ENVIRONMENT_ID, 30);

			expect(mockOnRefreshNeeded).toHaveBeenCalled();

			showWarningSpy.mockRestore();
		});

		it('should show error message on failure', async () => {
			mockDeleteTracesUseCase.deleteOldTraces.mockRejectedValueOnce(new Error('Delete failed'));

			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage') as unknown as jest.SpyInstance<Promise<MessageResponse>>;
			showWarningSpy.mockResolvedValue('Delete');
			const showErrorSpy = jest.spyOn(vscode.window, 'showErrorMessage').mockResolvedValue(undefined);

			await behavior.deleteOld(TEST_ENVIRONMENT_ID, 30);

			expect(showErrorSpy).toHaveBeenCalledWith('Failed to delete old traces');
			expect(mockOnRefreshNeeded).not.toHaveBeenCalled();

			showWarningSpy.mockRestore();
			showErrorSpy.mockRestore();
		});

		it('should handle different day values', async () => {
			mockDeleteTracesUseCase.deleteOldTraces.mockResolvedValueOnce(10);

			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage') as unknown as jest.SpyInstance<Promise<MessageResponse>>;
			showWarningSpy.mockResolvedValue('Delete');
			const showInfoSpy = jest.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(undefined);

			await behavior.deleteOld(TEST_ENVIRONMENT_ID, 90);

			expect(showWarningSpy).toHaveBeenCalledWith(
				'Delete all traces older than 90 days? This cannot be undone.',
				expect.any(Object),
				'Delete',
				'Cancel'
			);
			expect(mockDeleteTracesUseCase.deleteOldTraces).toHaveBeenCalledWith(TEST_ENVIRONMENT_ID, 90);
			expect(showInfoSpy).toHaveBeenCalledWith('Deleted 10 trace(s) older than 90 days');

			showWarningSpy.mockRestore();
			showInfoSpy.mockRestore();
		});

		it('should handle single day parameter', async () => {
			mockDeleteTracesUseCase.deleteOldTraces.mockResolvedValueOnce(5);

			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage') as unknown as jest.SpyInstance<Promise<MessageResponse>>;
			showWarningSpy.mockResolvedValue('Delete');
			const showInfoSpy = jest.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(undefined);

			await behavior.deleteOld(TEST_ENVIRONMENT_ID, 1);

			expect(showWarningSpy).toHaveBeenCalledWith(
				'Delete all traces older than 1 days? This cannot be undone.',
				expect.any(Object),
				'Delete',
				'Cancel'
			);

			showWarningSpy.mockRestore();
			showInfoSpy.mockRestore();
		});
	});

	describe('edge cases', () => {
		it('should handle undefined response from confirmation dialog', async () => {
			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue(undefined);

			await behavior.deleteSelected(TEST_ENVIRONMENT_ID, ['trace-1']);

			expect(mockDeleteTracesUseCase.deleteMultiple).not.toHaveBeenCalled();

			showWarningSpy.mockRestore();
		});

		it('should handle ESC key (undefined) on deleteAll', async () => {
			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue(undefined);

			await behavior.deleteAll(TEST_ENVIRONMENT_ID);

			expect(mockDeleteTracesUseCase.deleteAll).not.toHaveBeenCalled();

			showWarningSpy.mockRestore();
		});

		it('should handle ESC key (undefined) on deleteOld', async () => {
			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue(undefined);

			await behavior.deleteOld(TEST_ENVIRONMENT_ID, 30);

			expect(mockDeleteTracesUseCase.deleteOldTraces).not.toHaveBeenCalled();

			showWarningSpy.mockRestore();
		});

		it('should handle use case returning negative count', async () => {
			mockDeleteTracesUseCase.deleteMultiple.mockResolvedValueOnce(-1);

			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage') as unknown as jest.SpyInstance<Promise<MessageResponse>>;
			showWarningSpy.mockResolvedValue('Delete');
			const showInfoSpy = jest.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(undefined);

			await behavior.deleteSelected(TEST_ENVIRONMENT_ID, ['trace-1']);

			expect(showInfoSpy).toHaveBeenCalledWith('Deleted -1 trace(s)');

			showWarningSpy.mockRestore();
			showInfoSpy.mockRestore();
		});

		it('should handle refresh callback failure gracefully', async () => {
			mockDeleteTracesUseCase.deleteMultiple.mockResolvedValueOnce(1);
			mockOnRefreshNeeded.mockRejectedValueOnce(new Error('Refresh failed'));

			const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage') as unknown as jest.SpyInstance<Promise<MessageResponse>>;
			showWarningSpy.mockResolvedValue('Delete');
			jest.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(undefined);

			// Should not throw even if refresh fails
			await expect(behavior.deleteSelected(TEST_ENVIRONMENT_ID, ['trace-1'])).resolves.not.toThrow();

			showWarningSpy.mockRestore();
		});
	});
});
