import * as vscode from 'vscode';

import { IStateRepository } from './IStateRepository';

/**
 * Persistent state repository backed by VS Code GlobalState
 *
 * Purpose: Store state that persists across extension reloads and VS Code restarts.
 * Use cases:
 * - User preferences per environment (filters, sort order, view settings)
 * - Settings that should survive extension reload
 *
 * Lifecycle: Data persists until explicitly cleared or extension is uninstalled.
 *
 * Storage Location: VS Code's global storage (workspace-independent)
 *
 * Design Principles:
 * - Single Responsibility: Only manages VS Code GlobalState storage
 * - Encapsulation: Hides VS Code API details from consumers
 */
export class VSCodeStateRepository implements IStateRepository {
    constructor(private readonly context: vscode.ExtensionContext) {}

    async get<T>(key: string): Promise<T | null> {
        const value = this.context.globalState.get<T | null>(key, null);
        return value;
    }

    async set<T>(key: string, value: T): Promise<void> {
        await this.context.globalState.update(key, value);
    }

    async delete(key: string): Promise<void> {
        await this.context.globalState.update(key, undefined);
    }

    async keys(): Promise<string[]> {
        return Array.from(this.context.globalState.keys());
    }

    async clearWithPrefix(prefix: string): Promise<void> {
        const allKeys = this.context.globalState.keys();
        const keysToDelete = allKeys.filter(key => key.startsWith(prefix));

        for (const key of keysToDelete) {
            await this.context.globalState.update(key, undefined);
        }
    }

    /**
     * Get the underlying VS Code Memento
     * Useful for advanced scenarios that need direct access
     */
    getMemento(): vscode.Memento {
        return this.context.globalState;
    }
}
