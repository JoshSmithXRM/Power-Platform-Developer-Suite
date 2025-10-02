import { BaseComponent } from '../../base/BaseComponent';
import { StatusBadgeConfig, StatusBadgeVariant } from './StatusBadgeConfig';
import { StatusBadgeView } from './StatusBadgeView';

/**
 * StatusBadgeComponent
 * Lightweight component for generating status badge HTML
 * Can be used standalone or embedded in table cells
 *
 * Usage:
 * - In panels: Create instance and call generateHTML()
 * - In tables: Use generateBadgeHTML() static method for inline badges
 */
export class StatusBadgeComponent extends BaseComponent {
    private view: StatusBadgeView;

    constructor(config: StatusBadgeConfig) {
        super(config);
        this.view = new StatusBadgeView(config);
    }

    /**
     * Get component type identifier
     */
    public getType(): string {
        return 'StatusBadge';
    }

    /**
     * Generate HTML for this badge component
     */
    public generateHTML(): string {
        return this.view.generateHTML();
    }

    /**
     * Get the CSS file path for this component
     */
    public getCSSFile(): string {
        return 'css/components/status-badge.css';
    }

    /**
     * Get the behavior script file path
     * Note: Status badges are static, no behavior script needed
     */
    public getBehaviorScript(): string {
        return ''; // No behavior script needed for static badges
    }

    /**
     * Get default CSS class name
     */
    protected getDefaultClassName(): string {
        return 'status-badge';
    }

    /**
     * Update badge configuration
     */
    public updateConfig(config: Partial<StatusBadgeConfig>): void {
        Object.assign(this.config, config);
        this.view = new StatusBadgeView(this.config as StatusBadgeConfig);
        this.notifyUpdate();
    }

    /**
     * Get current badge label
     */
    public getLabel(): string {
        return (this.config as StatusBadgeConfig).label;
    }

    /**
     * Get current badge variant
     */
    public getVariant(): StatusBadgeVariant {
        return (this.config as StatusBadgeConfig).variant;
    }

    /**
     * Static helper method to generate badge HTML without creating component instance
     * Useful for embedding badges in table cells or other inline contexts
     *
     * @param label - Badge label text
     * @param variant - Badge variant/status type
     * @param options - Additional options
     * @returns HTML string for the badge
     */
    public static generateBadgeHTML(
        label: string,
        variant: StatusBadgeVariant,
        options: {
            size?: 'small' | 'medium' | 'large';
            showIndicator?: boolean;
            tooltip?: string;
            icon?: string;
        } = {}
    ): string {
        const config: StatusBadgeConfig = {
            id: `badge-${Date.now()}-${Math.random()}`, // Unique ID for inline badges
            label,
            variant,
            size: options.size || 'medium',
            showIndicator: options.showIndicator !== false,
            tooltip: options.tooltip,
            icon: options.icon
        };

        const view = new StatusBadgeView(config);
        return view.generateHTML();
    }

    /**
     * Get CSS for status badges
     * Can be included in panel stylesheets
     */
    public static getCSS(): string {
        return StatusBadgeView.getCSS();
    }
}
