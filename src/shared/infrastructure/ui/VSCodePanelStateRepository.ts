import * as vscode from 'vscode';

import type { ILogger } from '../../../infrastructure/logging/ILogger';
import { Solution } from '../../../features/solutionExplorer/domain/entities/Solution';

import type {
	IPanelStateRepository,
	PanelStateKey,
	PanelState,
} from './IPanelStateRepository';

/**
 * Type guard for storage-related errors (quota exceeded, serialization failures)
 */
function isStorageError(error: unknown): boolean {
	if (error instanceof Error) {
		return (
			error.message.includes('quota') ||
			error.message.includes('storage') ||
			error.message.includes('JSON')
		);
	}
	return false;
}

/**
 * VS Code implementation of panel state repository using workspace state.
 * Stores panel UI preferences in VS Code's workspace-level storage.
 */
export class VSCodePanelStateRepository implements IPanelStateRepository {
	constructor(
		private readonly workspaceState: vscode.Memento,
		private readonly logger: ILogger
	) {}

	/**
	 * Load persisted state for a specific panel and environment.
	 * Migrates legacy null solution IDs to DEFAULT_SOLUTION_ID.
	 */
	async load(key: PanelStateKey): Promise<PanelState | null> {
		try {
			const storageKey = this.getStorageKey(key.panelType);
			const allStates = this.workspaceState.get<Record<string, PanelState>>(
				storageKey,
				{}
			);
			const state = allStates[key.environmentId] ?? null;

			if (state === null) {
				return null;
			}

			// Migration: Legacy null selectedSolutionId becomes DEFAULT_SOLUTION_ID
			if (state.selectedSolutionId === null) {
				this.logger.warn('Migrating legacy null solution ID to default', {
					panelType: key.panelType,
					environmentId: key.environmentId
				});

				const migratedState: PanelState = {
					selectedSolutionId: Solution.DEFAULT_SOLUTION_ID,
					lastUpdated: new Date().toISOString()
				};

				// Persist migrated value back to storage
				allStates[key.environmentId] = migratedState;
				await this.workspaceState.update(storageKey, allStates);

				return migratedState;
			}

			return state;
		} catch (error) {
			if (isStorageError(error)) {
				return null;
			}
			this.logger.error('Unexpected error loading panel state', error);
			throw error;
		}
	}

	/**
	 * Save state for a specific panel and environment
	 */
	async save(key: PanelStateKey, state: PanelState): Promise<void> {
		try {
			const storageKey = this.getStorageKey(key.panelType);
			const allStates = this.workspaceState.get<Record<string, PanelState>>(
				storageKey,
				{}
			);

			allStates[key.environmentId] = state;

			await this.workspaceState.update(storageKey, allStates);
		} catch (error) {
			if (isStorageError(error)) {
				return;
			}
			this.logger.error('Unexpected error saving panel state', error);
			throw error;
		}
	}

	/**
	 * Clear state for a specific panel and environment
	 */
	async clear(key: PanelStateKey): Promise<void> {
		try {
			const storageKey = this.getStorageKey(key.panelType);
			const allStates = this.workspaceState.get<Record<string, PanelState>>(
				storageKey,
				{}
			);

			delete allStates[key.environmentId];

			await this.workspaceState.update(storageKey, allStates);
		} catch (error) {
			if (isStorageError(error)) {
				return;
			}
			this.logger.error('Unexpected error clearing panel state', error);
			throw error;
		}
	}

	/**
	 * Clear all state for a specific panel type across all environments
	 */
	async clearAll(panelType: string): Promise<void> {
		try {
			const storageKey = this.getStorageKey(panelType);
			await this.workspaceState.update(storageKey, undefined);
		} catch (error) {
			if (isStorageError(error)) {
				return;
			}
			this.logger.error('Unexpected error clearing all panel state', error);
			throw error;
		}
	}

	/**
	 * Generate storage key for a panel type
	 */
	private getStorageKey(panelType: string): string {
		return `panel-state-${panelType}`;
	}
}
