import { BaseComponent } from '../../base/BaseComponent';

import { JsonViewerConfig, DEFAULT_JSON_VIEWER_CONFIG } from './JsonViewerConfig';
import { JsonViewerView } from './JsonViewerView';

export class JsonViewerComponent extends BaseComponent {
    protected config: JsonViewerConfig;
    private data: any = null;

    constructor(config: JsonViewerConfig) {
        const mergedConfig = { ...DEFAULT_JSON_VIEWER_CONFIG, ...config } as JsonViewerConfig;
        super(mergedConfig);
        this.config = mergedConfig;
        this.data = config.data || null;
    }

    public generateHTML(): string {
        return JsonViewerView.render(this.config, this.data);
    }

    /**
     * Get CSS file for this component
     */
    public getCSSFile(): string {
        return 'components/viewers/json-viewer.css';
    }

    /**
     * Get behavior script for this component
     */
    public getBehaviorScript(): string {
        return 'components/viewers/JsonViewerBehavior.js';
    }

    /**
     * Get default class name
     */
    protected getDefaultClassName(): string {
        return 'json-viewer';
    }

    /**
     * Get component type identifier
     */
    public getType(): string {
        return 'JsonViewer';
    }

    /**
     * Set JSON data to display
     */
    public setData(data: any): void {
        this.data = data;
        this.notifyUpdate();
    }

    /**
     * Get current JSON data
     */
    public getData(): any {
        return this.data;
    }

    /**
     * Clear the viewer
     */
    public clear(): void {
        this.data = null;
        this.notifyUpdate();
    }

    /**
     * Get config for use by view
     */
    public getConfig(): JsonViewerConfig {
        return { ...this.config };
    }

    protected notifyUpdate(): void {
        this.emit('update', {
            componentId: this.config.id,
            data: this.data,
            config: this.config
        });
    }
}
