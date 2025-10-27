import { BaseComponent } from '../../base/BaseComponent';

import { SplitPanelConfig, DEFAULT_SPLIT_PANEL_CONFIG } from './SplitPanelConfig';
import { SplitPanelView } from './SplitPanelView';

/**
 * Persisted state structure for SplitPanelComponent
 */
interface SplitPanelState {
    id: string;
    splitRatio: number;
    rightPanelVisible: boolean;
}

/**
 * SplitPanelComponent - Reusable resizable split panel
 * Provides horizontal or vertical split layout with draggable divider
 * Used by panels that need side-by-side or top-bottom views
 */
export class SplitPanelComponent extends BaseComponent {
    protected config: SplitPanelConfig;
    private splitRatio: number; // Current split ratio (0-100)
    private rightPanelVisible: boolean;

    constructor(config: SplitPanelConfig) {
        const mergedConfig = { ...DEFAULT_SPLIT_PANEL_CONFIG, ...config };
        super(mergedConfig);
        this.config = mergedConfig as SplitPanelConfig;
        this.splitRatio = this.config.initialSplit;
        this.rightPanelVisible = !this.config.rightPanelDefaultHidden;
        this.validateConfig();
    }

    /**
     * Generate HTML for this component (Extension Host context)
     */
    public generateHTML(): string {
        return SplitPanelView.generateHTML(this.config);
    }

    /**
     * Get the CSS file path for this component
     */
    public getCSSFile(): string {
        return 'components/split-panel.css';
    }

    /**
     * Get the behavior script file path for this component
     */
    public getBehaviorScript(): string {
        return 'components/SplitPanelBehavior.js';
    }

    /**
     * Get the default CSS class name for this component type
     */
    protected getDefaultClassName(): string {
        return 'split-panel';
    }

    /**
     * Get component type identifier
     */
    public getType(): string {
        return 'SplitPanel';
    }

    /**
     * Validate component configuration
     */
    protected validateConfig(): void {
        if (!this.config.id) {
            throw new Error('SplitPanel: id is required');
        }

        if (this.config.initialSplit < 0 || this.config.initialSplit > 100) {
            throw new Error('SplitPanel: initialSplit must be between 0 and 100');
        }

        if (this.config.minSize < 0) {
            throw new Error('SplitPanel: minSize must be >= 0');
        }

        if (!this.config.leftContent) {
            throw new Error('SplitPanel: leftContent is required');
        }

        if (!this.config.rightContent) {
            throw new Error('SplitPanel: rightContent is required');
        }
    }

    /**
     * Set split ratio (0-100)
     */
    public setSplitRatio(ratio: number): void {
        if (ratio < 0 || ratio > 100) {
            throw new Error('Split ratio must be between 0 and 100');
        }

        const oldRatio = this.splitRatio;
        this.splitRatio = ratio;

        if (oldRatio !== ratio) {
            this.notifyStateChange({
                splitRatio: this.splitRatio,
                oldSplitRatio: oldRatio
            });
        }
    }

    /**
     * Get current split ratio
     */
    public getSplitRatio(): number {
        return this.splitRatio;
    }

    /**
     * Show right panel
     */
    public showRightPanel(): void {
        if (this.rightPanelVisible) {
            return;
        }

        this.rightPanelVisible = true;

        this.notifyStateChange({
            rightPanelVisible: true
        });
    }

    /**
     * Hide right panel
     */
    public hideRightPanel(): void {
        if (!this.rightPanelVisible) {
            return;
        }

        this.rightPanelVisible = false;

        this.notifyStateChange({
            rightPanelVisible: false
        });
    }

    /**
     * Toggle right panel visibility
     */
    public toggleRightPanel(): void {
        if (this.rightPanelVisible) {
            this.hideRightPanel();
        } else {
            this.showRightPanel();
        }
    }

    /**
     * Check if right panel is visible
     */
    public isRightPanelVisible(): boolean {
        return this.rightPanelVisible;
    }

    /**
     * Update left panel content
     */
    public setLeftContent(content: string): void {
        this.config.leftContent = content;

        this.notifyStateChange({
            leftContentUpdated: true
        });
    }

    /**
     * Update right panel content
     */
    public setRightContent(content: string): void {
        this.config.rightContent = content;

        this.notifyStateChange({
            rightContentUpdated: true
        });
    }

    /**
     * Export component state (for persistence)
     */
    public exportState(): SplitPanelState {
        return {
            id: this.config.id,
            splitRatio: this.splitRatio,
            rightPanelVisible: this.rightPanelVisible
        };
    }

    /**
     * Import component state (from persistence)
     */
    public importState(state: unknown): void {
        if (!state || typeof state !== 'object') {
            return;
        }

        const typedState = state as Record<string, unknown>;

        if (typeof typedState.splitRatio === 'number') {
            this.splitRatio = typedState.splitRatio;
        }

        if (typeof typedState.rightPanelVisible === 'boolean') {
            this.rightPanelVisible = typedState.rightPanelVisible;
        }
    }
}
