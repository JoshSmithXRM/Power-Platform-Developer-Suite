import * as vscode from 'vscode';
import { AuthenticationService } from '../../services/AuthenticationService';
import { WebviewMessage, EnvironmentConnection } from '../../types';

/**
 * Environment management functionality for panels
 */
export class EnvironmentManager {
    private _selectedEnvironmentId: string | undefined;
    private _cachedEnvironments: EnvironmentConnection[] | undefined;

    constructor(
        private _authService: AuthenticationService,
        private _postMessage: (message: WebviewMessage) => void
    ) {}

    /**
     * Load environments and send to webview
     */
    async loadEnvironments(): Promise<void> {
        try {
            // Use cached environments if available
            if (this._cachedEnvironments) {
                this._postMessage({
                    action: 'environmentsLoaded',
                    data: this._cachedEnvironments,
                    selectedEnvironmentId: this._selectedEnvironmentId
                });
                return;
            }

            const environments = await this._authService.getEnvironments();

            // Cache the environments
            this._cachedEnvironments = environments;

            this._postMessage({
                action: 'environmentsLoaded',
                data: environments,
                selectedEnvironmentId: this._selectedEnvironmentId
            });

        } catch (error: any) {
            console.error('Error loading environments:', error);
            this._postMessage({
                action: 'error',
                message: `Failed to load environments: ${error.message}`
            });
        }
    }

    /**
     * Get the selected environment
     */
    get selectedEnvironmentId(): string | undefined {
        return this._selectedEnvironmentId;
    }

    /**
     * Set the selected environment
     */
    set selectedEnvironmentId(environmentId: string | undefined) {
        this._selectedEnvironmentId = environmentId;
    }

    /**
     * Clear environment cache
     */
    clearCache(): void {
        this._cachedEnvironments = undefined;
    }

    /**
     * Get cached environments
     */
    getCachedEnvironments(): EnvironmentConnection[] | undefined {
        return this._cachedEnvironments;
    }

    /**
     * Get environment dropdown HTML
     */
    getEnvironmentSelectorHtml(): string {
        return `
            <div class="environment-selector">
                <label for="environmentSelect">Environment:</label>
                <select id="environmentSelect" class="environment-dropdown">
                    <option value="">Select an environment...</option>
                </select>
            </div>
        `;
    }

    /**
     * Get environment dropdown CSS
     */
    getEnvironmentSelectorCss(): string {
        return `
            .environment-selector {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 16px;
                padding: 12px;
                background-color: var(--vscode-sideBar-background);
                border-bottom: 1px solid var(--vscode-panel-border);
            }

            .environment-selector label {
                font-size: 12px;
                font-weight: 600;
                color: var(--vscode-foreground);
                min-width: 80px;
            }

            .environment-dropdown {
                flex: 1;
                padding: 4px 8px;
                border: 1px solid var(--vscode-input-border);
                background-color: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border-radius: 2px;
                font-size: 12px;
                min-width: 200px;
            }

            .environment-dropdown:focus {
                outline: 1px solid var(--vscode-focusBorder);
                border-color: var(--vscode-focusBorder);
            }
        `;
    }

    /**
     * Get environment dropdown JavaScript
     */
    getEnvironmentSelectorJs(): string {
        return `
            let currentEnvironmentId = null;

            function loadEnvironments() {
                vscode.postMessage({ action: 'loadEnvironments' });
            }

            function populateEnvironments(environments, selectedEnvironmentId) {
                const select = document.getElementById('environmentSelect');
                select.innerHTML = '<option value="">Select an environment...</option>';
                
                environments.forEach(env => {
                    const option = document.createElement('option');
                    option.value = env.id;
                    option.textContent = env.name;
                    select.appendChild(option);
                });

                // Restore selected environment or auto-select first environment if available
                if (selectedEnvironmentId && environments.find(env => env.id === selectedEnvironmentId)) {
                    select.value = selectedEnvironmentId;
                    currentEnvironmentId = selectedEnvironmentId;
                } else if (environments.length === 1) {
                    select.value = environments[0].id;
                    currentEnvironmentId = environments[0].id;
                    // Auto-load data for single environment
                    onEnvironmentChanged();
                }
            }

            function onEnvironmentChanged() {
                const select = document.getElementById('environmentSelect');
                const environmentId = select.value;
                
                if (environmentId && environmentId !== currentEnvironmentId) {
                    currentEnvironmentId = environmentId;
                    loadDataForEnvironment(environmentId);
                }
            }

            // Add event listener for environment selection
            document.addEventListener('DOMContentLoaded', function() {
                const environmentSelect = document.getElementById('environmentSelect');
                if (environmentSelect) {
                    environmentSelect.addEventListener('change', onEnvironmentChanged);
                }
                
                // Load environments on startup
                loadEnvironments();
            });
        `;
    }
}
