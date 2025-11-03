import * as vscode from 'vscode';

import type {
	IPanelStateRepository,
	PanelStateKey,
	PanelState,
} from './IPanelStateRepository';

/**
 * VS Code implementation of panel state repository using workspace state.
 * Stores panel UI preferences in VS Code's workspace-level storage.
 */
export class VSCodePanelStateRepository implements IPanelStateRepository {
	constructor(private readonly workspaceState: vscode.Memento) {}

	/**
	 * Load persisted state for a specific panel and environment
	 */
	async load(key: PanelStateKey): Promise<PanelState | null> {
		try {
			const storageKey = this.getStorageKey(key.panelType);
			const allStates = this.workspaceState.get<Record<string, PanelState>>(
				storageKey,
				{}
			);
			return allStates[key.environmentId] ?? null;
		} catch {
			return null;
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
		} catch {
			// Silently ignore persistence failures
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
		} catch {
			// Silently ignore persistence failures
		}
	}

	/**
	 * Clear all state for a specific panel type across all environments
	 */
	async clearAll(panelType: string): Promise<void> {
		try {
			const storageKey = this.getStorageKey(panelType);
			await this.workspaceState.update(storageKey, undefined);
		} catch {
			// Silently ignore persistence failures
		}
	}

	/**
	 * Generate storage key for a panel type
	 */
	private getStorageKey(panelType: string): string {
		return `panel-state-${panelType}`;
	}
}
