import { StatusBadgeConfig } from './StatusBadgeConfig';

/**
 * StatusBadgeView
 * Handles HTML generation for status badges
 * Generates semantic, accessible badge markup with appropriate styling
 */
export class StatusBadgeView {
    constructor(private config: StatusBadgeConfig) {}

    /**
     * Generate HTML for the status badge
     * @returns HTML string for the badge
     */
    public generateHTML(): string {
        const {
            id,
            label,
            variant,
            size = 'medium',
            showIndicator = true,
            className = '',
            tooltip,
            icon,
            display = 'inline-flex'
        } = this.config;

        // Build CSS classes
        const cssClasses = [
            'status-badge',
            `status-${variant}`,
            `status-badge-${size}`,
            className
        ].filter(Boolean).join(' ');

        // Build data attributes
        const dataAttrs = [
            `data-component-id="${id}"`,
            `data-component-type="StatusBadge"`,
            `data-variant="${variant}"`,
            `data-size="${size}"`
        ];

        if (tooltip) {
            dataAttrs.push(`title="${this.escapeHtml(tooltip)}"`);
        }

        // Build indicator HTML
        let indicatorHtml = '';
        if (showIndicator && !icon) {
            indicatorHtml = '<span class="status-badge-indicator"></span>';
        } else if (icon) {
            indicatorHtml = `<span class="status-badge-icon">${this.escapeHtml(icon)}</span>`;
        }

        // Generate badge HTML
        return `<span class="${cssClasses}"
                     ${dataAttrs.join(' ')}
                     style="display: ${display};">
            ${indicatorHtml}
            <span class="status-badge-label">${this.escapeHtml(label)}</span>
        </span>`;
    }

    /**
     * Get default CSS for status badges
     * @returns CSS string
     */
    public static getCSS(): string {
        return `
/* Status Badge Component Styles */
.status-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
}

.status-badge-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 6px;
    flex-shrink: 0;
}

.status-badge-icon {
    margin-right: 4px;
    display: inline-flex;
    align-items: center;
    font-size: 14px;
}

.status-badge-label {
    display: inline-block;
}

/* Size variants */
.status-badge-small {
    padding: 2px 6px;
    font-size: 11px;
}

.status-badge-small .status-badge-indicator {
    width: 6px;
    height: 6px;
    margin-right: 4px;
}

.status-badge-large {
    padding: 6px 12px;
    font-size: 13px;
}

.status-badge-large .status-badge-indicator {
    width: 10px;
    height: 10px;
    margin-right: 8px;
}

/* Status variants - Completed/Success */
.status-completed,
.status-success {
    background: rgba(0, 128, 0, 0.1);
    color: #00b300;
}

.status-completed .status-badge-indicator,
.status-success .status-badge-indicator {
    background: #00b300;
}

/* Status variants - Failed/Error */
.status-failed,
.status-error {
    background: rgba(255, 0, 0, 0.1);
    color: #e74c3c;
}

.status-failed .status-badge-indicator,
.status-error .status-badge-indicator {
    background: #e74c3c;
}

/* Status variants - In Progress/Warning */
.status-in-progress,
.status-warning {
    background: rgba(255, 165, 0, 0.1);
    color: #ff8c00;
}

.status-in-progress .status-badge-indicator,
.status-warning .status-badge-indicator {
    background: #ff8c00;
}

/* Status variants - Unknown/Info */
.status-unknown,
.status-info {
    background: rgba(128, 128, 128, 0.1);
    color: #808080;
}

.status-unknown .status-badge-indicator,
.status-info .status-badge-indicator {
    background: #808080;
}

/* Dark theme support */
body.vscode-dark .status-completed,
body.vscode-dark .status-success {
    background: rgba(0, 200, 0, 0.15);
    color: #00e600;
}

body.vscode-dark .status-failed,
body.vscode-dark .status-error {
    background: rgba(255, 60, 60, 0.15);
    color: #ff6b6b;
}

body.vscode-dark .status-in-progress,
body.vscode-dark .status-warning {
    background: rgba(255, 165, 0, 0.15);
    color: #ffa500;
}

body.vscode-dark .status-unknown,
body.vscode-dark .status-info {
    background: rgba(150, 150, 150, 0.15);
    color: #aaaaaa;
}
`;
    }

    /**
     * Escape HTML special characters to prevent XSS
     * Extension Host compatible (no DOM dependency)
     * @param text - Text to escape
     * @returns Escaped text
     */
    private escapeHtml(text: string): string {
        if (!text) return '';

        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
