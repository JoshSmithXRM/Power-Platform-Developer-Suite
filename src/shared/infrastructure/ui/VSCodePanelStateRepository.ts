import * as vscode from 'vscode';

import type { ILogger } from '../../../infrastructure/logging/ILogger';
import { DEFAULT_SOLUTION_ID } from '../../domain/constants/SolutionConstants';

import type {
	IPanelStateRepository,
	PanelStateKey,
	PanelState,
} from './IPanelStateRepository';

/**
 * Legacy panel state format (before migration to non-null selectedSolutionId)
 */
interface LegacyPanelState {
	selectedSolutionId: string | null;
	lastUpdated: string;
}

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
	 * Handles migration of legacy null selectedSolutionId to DEFAULT_SOLUTION_ID.
	 */
	async load(key: PanelStateKey): Promise<PanelState | null> {
		try {
			const storageKey = this.getStorageKey(key.panelType);
			const allStates = this.workspaceState.get<Record<string, LegacyPanelState>>(
				storageKey,
				{}
			);
			const rawState = allStates[key.environmentId];

			if (!rawState) {
				return null;
			}

			// Migration: Legacy null selectedSolutionId becomes DEFAULT_SOLUTION_ID
			if (rawState.selectedSolutionId === null || rawState.selectedSolutionId === undefined) {
				this.logger.warn('Migrating legacy null solution ID to default', {
					panelType: key.panelType,
					environmentId: key.environmentId
				});

				const migratedState: PanelState = {
					selectedSolutionId: DEFAULT_SOLUTION_ID,
					lastUpdated: new Date().toISOString()
				};

				// Persist migrated value back to storage
				await this.save(key, migratedState);

				return migratedState;
			}

			return {
				selectedSolutionId: rawState.selectedSolutionId,
				lastUpdated: rawState.lastUpdated
			};
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
