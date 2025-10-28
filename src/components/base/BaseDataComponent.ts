import { BaseComponent, BaseComponentConfig } from './BaseComponent';

/**
 * BaseDataComponent - Base class for components that display async data
 * Provides shared loading state management for data-driven components
 *
 * Extends BaseComponent to add loading functionality without forcing it on all components.
 * Components like ActionBar, buttons, etc. don't need loading state.
 *
 * @template TData - The type-safe data structure returned by getData()
 */
export abstract class BaseDataComponent<TData> extends BaseComponent<TData> {
    protected loading: boolean = false;
    protected loadingMessage: string = 'Loading...';

    constructor(config: BaseComponentConfig) {
        super(config);
    }

    /**
     * Set loading state (triggers update via event bridge)
     * Call this before starting async operations, then call again with false when done
     *
     * @param loading - Whether component is currently loading
     * @param message - Optional loading message to display
     */
    public setLoading(loading: boolean, message?: string): void {
        this.loading = loading;
        if (message !== undefined) {
            this.loadingMessage = message;
        }
        this.notifyUpdate();
    }

    /**
     * Get current loading state
     * @returns Object with loading flag and message
     */
    public getLoadingState(): { loading: boolean; loadingMessage: string } {
        return {
            loading: this.loading,
            loadingMessage: this.loadingMessage
        };
    }

    /**
     * Check if component is currently loading
     * @returns true if loading, false otherwise
     */
    public isLoading(): boolean {
        return this.loading;
    }
}
