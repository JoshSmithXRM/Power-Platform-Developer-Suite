import { escapeHtml } from './HtmlUtils';

/**
 * LoadingIndicatorView - Shared loading indicator HTML generator
 * Used by all data components (DataTable, TreeView, etc.) for consistent loading UX
 *
 * Generates a spinner + message display that matches VS Code styling
 */
export class LoadingIndicatorView {
    /**
     * Generate loading indicator HTML
     * @param message - The loading message to display (default: "Loading...")
     * @returns HTML string with loading spinner and message
     */
    public static generate(message: string = 'Loading...'): string {
        return `
            <div class="component-loading">
                <div class="component-loading-spinner"></div>
                <div class="component-loading-message">${escapeHtml(message)}</div>
            </div>
        `;
    }
}
