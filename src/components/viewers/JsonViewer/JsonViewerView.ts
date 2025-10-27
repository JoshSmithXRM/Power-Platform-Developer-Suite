import { JsonViewerConfig } from './JsonViewerConfig';

export class JsonViewerView {
    static render(config: JsonViewerConfig, data: unknown): string {
        const maxHeightStyle = config.maxHeight && config.maxHeight !== 'none'
            ? `max-height: ${config.maxHeight};`
            : '';

        return `
            <div
                id="${config.id}"
                class="json-viewer-container"
                data-component-type="JsonViewer"
                data-component-id="${config.id}"
                data-collapsible="${config.collapsible || false}"
                data-show-line-numbers="${config.showLineNumbers || false}"
                data-initial-collapse-depth="${config.initialCollapseDepth || 0}"
                style="${maxHeightStyle}"
            >
                ${config.showCopy ? this.renderCopyButton(config.id) : ''}
                <div class="json-viewer-content" id="${config.id}-content">
                    ${data ? this.renderJson(data, config, 0) : this.renderEmpty()}
                </div>
            </div>
        `;
    }

    private static renderCopyButton(id: string): string {
        return `
            <div class="json-viewer-toolbar">
                <button
                    class="json-copy-button"
                    onclick="window.JsonViewerBehavior?.copyJson('${id}')"
                    title="Copy JSON to clipboard"
                >
                    <span class="codicon codicon-copy"></span>
                    Copy JSON
                </button>
            </div>
        `;
    }

    private static renderEmpty(): string {
        return '<div class="json-viewer-empty">No data to display</div>';
    }

    private static renderJson(data: unknown, config: JsonViewerConfig, depth: number): string {
        const isCollapsed = depth >= (config.initialCollapseDepth || 0) && (config.collapsible === true);
        return this.renderValue(data, depth, config, isCollapsed);
    }

    private static renderValue(value: unknown, depth: number, config: JsonViewerConfig, isCollapsed: boolean): string {
        if (value === null) {
            return `<span class="json-null">null</span>`;
        }

        if (value === undefined) {
            return `<span class="json-undefined">undefined</span>`;
        }

        const type = typeof value;

        switch (type) {
            case 'boolean':
                return `<span class="json-boolean">${value}</span>`;

            case 'number':
                return `<span class="json-number">${value}</span>`;

            case 'string':
                return `<span class="json-string">"${this.escapeHtml(value as string)}"</span>`;

            case 'object':
                if (Array.isArray(value)) {
                    return this.renderArray(value, depth, config, isCollapsed);
                } else {
                    return this.renderObject(value, depth, config, isCollapsed);
                }

            default:
                return `<span class="json-unknown">${this.escapeHtml(String(value))}</span>`;
        }
    }

    private static renderObject(obj: unknown, depth: number, config: JsonViewerConfig, isCollapsed: boolean): string {
        if (!obj || typeof obj !== 'object') {
            return '';
        }
        const keys = Object.keys(obj);

        if (keys.length === 0) {
            return `<span class="json-object">{}</span>`;
        }

        const collapsibleClass = config.collapsible ? ' collapsible' : '';
        const collapsedClass = isCollapsed ? ' collapsed' : '';
        const toggleButton = config.collapsible
            ? `<span class="json-toggle" onclick="window.JsonViewerBehavior?.toggleCollapse(this)">▼</span>`
            : '';

        const lines = keys.map((key, index) => {
            const isLast = index === keys.length - 1;
            const comma = isLast ? '' : ',';
            const valueHtml = this.renderValue((obj as Record<string, unknown>)[key], depth + 1, config, config.initialCollapseDepth ? depth + 1 >= config.initialCollapseDepth : false);

            return `
                <div class="json-line json-object-line">
                    <span class="json-key">"${this.escapeHtml(key)}"</span><span class="json-colon">:</span> ${valueHtml}${comma}
                </div>
            `;
        }).join('');

        return `
            <span class="json-object${collapsibleClass}${collapsedClass}">
                ${toggleButton}<span class="json-brace">{</span>
                <div class="json-content">
                    ${lines}
                </div>
                <span class="json-brace">}</span>
            </span>
        `;
    }

    private static renderArray(arr: unknown[], depth: number, config: JsonViewerConfig, isCollapsed: boolean): string {
        if (arr.length === 0) {
            return `<span class="json-array">[]</span>`;
        }

        const collapsibleClass = config.collapsible ? ' collapsible' : '';
        const collapsedClass = isCollapsed ? ' collapsed' : '';
        const toggleButton = config.collapsible
            ? `<span class="json-toggle" onclick="window.JsonViewerBehavior?.toggleCollapse(this)">▼</span>`
            : '';

        const lines = arr.map((item, index) => {
            const isLast = index === arr.length - 1;
            const comma = isLast ? '' : ',';
            const valueHtml = this.renderValue(item, depth + 1, config, config.initialCollapseDepth ? depth + 1 >= config.initialCollapseDepth : false);

            return `
                <div class="json-line json-array-line">
                    ${valueHtml}${comma}
                </div>
            `;
        }).join('');

        return `
            <span class="json-array${collapsibleClass}${collapsedClass}">
                ${toggleButton}<span class="json-bracket">[</span>
                <div class="json-content">
                    ${lines}
                </div>
                <span class="json-bracket">]</span>
            </span>
        `;
    }

    private static escapeHtml(text: string): string {
        const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}
