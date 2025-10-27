import { BaseComponentConfig } from '../../base/ComponentInterface';

/**
 * Status badge variant types
 * Maps to different visual states
 */
export type StatusBadgeVariant =
    | 'completed'
    | 'failed'
    | 'in-progress'
    | 'unknown'
    | 'success'
    | 'error'
    | 'warning'
    | 'info';

/**
 * Status badge size options
 */
export type StatusBadgeSize = 'small' | 'medium' | 'large';

/**
 * Configuration interface for StatusBadgeComponent
 * Provides type-safe configuration for status badges
 */
export interface StatusBadgeConfig extends BaseComponentConfig {
    /**
     * Badge label text to display
     */
    label: string;

    /**
     * Badge variant determining visual style
     */
    variant: StatusBadgeVariant;

    /**
     * Badge size
     * @default 'medium'
     */
    size?: StatusBadgeSize;

    /**
     * Show indicator dot before label
     * @default true
     */
    showIndicator?: boolean;

    /**
     * Additional CSS classes to apply
     */
    className?: string;

    /**
     * Tooltip text to show on hover
     */
    tooltip?: string;

    /**
     * Custom icon to display instead of indicator dot
     */
    icon?: string;

    /**
     * Whether badge should be inline or block display
     * @default 'inline-flex'
     */
    display?: 'inline-flex' | 'block' | 'inline-block';
}
