/**
 * Shared JSON Renderer Utility
 * Renders JSON with syntax highlighting for detail panels
 * Used by: MetadataBrowserPanel, PluginTraceViewerPanel, PluginRegistrationPanel
 */

class JSONRenderer {
    /**
     * Render JSON object with syntax highlighting
     * @param {any} obj - The object to render
     * @param {number} depth - Current nesting depth
     * @returns {string} HTML string with syntax-highlighted JSON
     */
    static renderJSON(obj, depth = 0) {
        if (obj === null) return '<span class="json-null">null</span>';
        if (obj === undefined) return '<span class="json-undefined">undefined</span>';

        const type = typeof obj;
        const indent = '  '.repeat(depth);

        // Primitives
        if (type === 'string') {
            return `<span class="json-string">"${this.escapeHtml(obj)}"</span>`;
        }
        if (type === 'number') {
            return `<span class="json-number">${obj}</span>`;
        }
        if (type === 'boolean') {
            return `<span class="json-boolean">${obj}</span>`;
        }

        // Arrays
        if (Array.isArray(obj)) {
            if (obj.length === 0) return '[]';

            const items = obj.map(item =>
                `${indent}  ${this.renderJSON(item, depth + 1)}`
            ).join(',\n');

            return `[\n${items}\n${indent}]`;
        }

        // Objects
        if (type === 'object') {
            const keys = Object.keys(obj);
            if (keys.length === 0) return '{}';

            const items = keys.map(key =>
                `${indent}  <span class="json-key">"${this.escapeHtml(key)}"</span>: ${this.renderJSON(obj[key], depth + 1)}`
            ).join(',\n');

            return `{\n${items}\n${indent}}`;
        }

        // Fallback for unknown types
        return `<span class="json-undefined">${String(obj)}</span>`;
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML
     */
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Render JSON in a complete <pre> tag with json-display class
     * @param {any} obj - The object to render
     * @returns {string} Complete HTML string with <pre> wrapper
     */
    static renderJSONWithWrapper(obj) {
        return `<pre class="json-display">${this.renderJSON(obj, 0)}</pre>`;
    }
}

// Make available globally for webview behaviors
window.JSONRenderer = JSONRenderer;
