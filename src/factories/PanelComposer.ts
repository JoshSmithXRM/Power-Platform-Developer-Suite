import { BaseComponent } from '../components/base/BaseComponent';
import * as vscode from 'vscode';

/**
 * WebviewResources interface for resource management
 */
export interface WebviewResources {
    tableUtilsScript: vscode.Uri;
    tableStylesSheet: vscode.Uri;
    panelStylesSheet: vscode.Uri;
    panelUtilsScript: vscode.Uri;
}

/**
 * PanelComposer.ts
 * 
 * Composes complete HTML templates from multiple components
 * Handles resource collection (CSS, JS), multi-instance support, and panel generation
 */

export interface ComponentDefinition {
    component: BaseComponent;
    placeholder?: string; // Where to place the component in the template
    order?: number; // Rendering order
}

export interface PanelTemplate {
    title: string;
    template: string; // HTML template with placeholders
    components: ComponentDefinition[];
    customCSS?: string[];
    customJS?: string[];
    variables?: Record<string, any>;
}

export interface ComposedPanel {
    html: string;
    cssFiles: string[];
    jsFiles: string[];
    components: BaseComponent[];
}

export interface PanelComposerConfig {
    baseTemplate?: string;
    includeDefaultResources?: boolean;
    minifyOutput?: boolean;
    enableSourceMap?: boolean;
    resourceUriScheme?: string;
}

export class PanelComposer {
    private config: PanelComposerConfig;
    private extensionUri: vscode.Uri;

    constructor(extensionUri: vscode.Uri, config: PanelComposerConfig = {}) {
        this.extensionUri = extensionUri;
        this.config = {
            includeDefaultResources: true,
            minifyOutput: false,
            enableSourceMap: false,
            resourceUriScheme: 'vscode-resource',
            ...config
        };
    }

    /**
     * Simple composition method as specified in architecture guide
     * Composes components directly into HTML string
     * 
     * @param components Array of components to compose
     * @param webviewResources Resource URIs for CSS and JS files
     * @param panelTitle Optional panel title (also used for panel-specific CSS)
     */
    public static compose(
        components: BaseComponent[], 
        webviewResources: WebviewResources,
        panelTitle?: string
    ): string {
        // Generate component HTML by concatenating component outputs
        const componentHTML = components.map(component => component.generateHTML()).join('\n');
        
        // Collect required CSS files (including optional panel-specific CSS)
        const cssFiles = PanelComposer.collectCSSFiles(components, panelTitle);
        
        // Collect required behavior scripts  
        const behaviorScripts = PanelComposer.collectBehaviorScripts(components);
        
        // Generate complete HTML document
        return PanelComposer.generateCompleteHTML({
            title: panelTitle || 'Panel',
            componentHTML,
            cssFiles,
            behaviorScripts,
            webviewResources
        });
    }

    /**
     * Compose a complete panel from components
     */
    public compose(template: PanelTemplate, webview: vscode.Webview): ComposedPanel {
        // Sort components by order
        const sortedComponents = template.components.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        // Generate component HTML
        const componentHtml = this.generateComponentHtml(sortedComponents);
        
        // Collect resources
        const resources = this.collectResources(sortedComponents, template);
        
        // Generate complete HTML
        const html = this.generateCompleteHtml(template, componentHtml, resources, webview);
        
        return {
            html,
            cssFiles: resources.cssFiles,
            jsFiles: resources.jsFiles,
            components: sortedComponents.map(c => c.component)
        };
    }

    /**
     * Generate a simple panel with a single component
     */
    public composeSimple(
        component: BaseComponent, 
        title: string, 
        webview: vscode.Webview,
        additionalCSS?: string[],
        additionalJS?: string[]
    ): ComposedPanel {
        const template: PanelTemplate = {
            title,
            template: this.getDefaultTemplate(),
            components: [{ component, placeholder: '{{CONTENT}}' }],
            customCSS: additionalCSS,
            customJS: additionalJS
        };

        return this.compose(template, webview);
    }

    /**
     * Generate a multi-component panel with automatic layout
     */
    public composeMultiple(
        components: BaseComponent[], 
        title: string, 
        webview: vscode.Webview,
        layout: 'vertical' | 'horizontal' | 'grid' = 'vertical'
    ): ComposedPanel {
        const template: PanelTemplate = {
            title,
            template: this.getLayoutTemplate(layout, components.length),
            components: components.map((component, index) => ({
                component,
                placeholder: `{{COMPONENT_${index}}}`,
                order: index
            }))
        };

        return this.compose(template, webview);
    }

    /**
     * Generate component HTML
     */
    private generateComponentHtml(components: ComponentDefinition[]): Record<string, string> {
        const componentHtml: Record<string, string> = {};
        
        for (const componentDef of components) {
            const placeholder = componentDef.placeholder || `{{COMPONENT_${componentDef.component.getId()}}}`;
            
            try {
                componentHtml[placeholder] = componentDef.component.generateHTML();
            } catch (error) {
                console.error(`Error generating HTML for component ${componentDef.component.getId()}:`, error);
                componentHtml[placeholder] = this.generateErrorHtml(componentDef.component.getId(), error);
            }
        }
        
        return componentHtml;
    }

    /**
     * Collect CSS and JS resources from components
     */
    private collectResources(components: ComponentDefinition[], template: PanelTemplate): {
        cssFiles: string[];
        jsFiles: string[];
    } {
        const cssFiles = new Set<string>();
        const jsFiles = new Set<string>();
        
        // Add default resources if enabled
        if (this.config.includeDefaultResources) {
            cssFiles.add('css/base/reset.css');
            cssFiles.add('css/base/variables.css');
            cssFiles.add('css/base/component-base.css');
            jsFiles.add('js/utils/ComponentUtils.js');
            jsFiles.add('js/utils/PanelUtils.js');
        }
        
        // Collect component resources
        for (const componentDef of components) {
            try {
                const componentCssFile = componentDef.component.getCSSFile();
                if (componentCssFile) {
                    cssFiles.add(componentCssFile);
                }
                
                const componentJsFile = componentDef.component.getBehaviorScript();
                if (componentJsFile) {
                    jsFiles.add(componentJsFile);
                }
            } catch (error) {
                console.warn(`Warning collecting resources for component ${componentDef.component.getId()}:`, error);
            }
        }
        
        // Add custom resources from template
        if (template.customCSS) {
            template.customCSS.forEach(css => cssFiles.add(css));
        }
        
        if (template.customJS) {
            template.customJS.forEach(js => jsFiles.add(js));
        }
        
        return {
            cssFiles: Array.from(cssFiles),
            jsFiles: Array.from(jsFiles)
        };
    }

    /**
     * Generate complete HTML document
     */
    private generateCompleteHtml(
        template: PanelTemplate,
        componentHtml: Record<string, string>,
        resources: { cssFiles: string[]; jsFiles: string[] },
        webview: vscode.Webview
    ): string {
        // Replace component placeholders in template
        let html = template.template;
        
        for (const [placeholder, componentHtml_] of Object.entries(componentHtml)) {
            html = html.replace(new RegExp(placeholder, 'g'), componentHtml_);
        }
        
        // Replace variables
        if (template.variables) {
            for (const [key, value] of Object.entries(template.variables)) {
                const placeholder = `{{${key}}}`;
                html = html.replace(new RegExp(placeholder, 'g'), String(value));
            }
        }
        
        // Generate resource URIs
        const cssUris = resources.cssFiles.map(file => 
            webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', file))
        );
        
        const jsUris = resources.jsFiles.map(file => 
            webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', file))
        );
        
        // Generate CSS links
        const cssLinks = cssUris.map(uri => `<link rel="stylesheet" href="${uri}">`).join('\n    ');
        
        // Generate JS script tags
        const jsScripts = jsUris.map(uri => `<script src="${uri}"></script>`).join('\n    ');
        
        // Build complete document
        const completeHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${template.title}</title>
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; img-src ${webview.cspSource} data:;">
    ${cssLinks}
</head>
<body>
    ${html}
    
    <script>
        // Make vscode API available globally - avoid duplicate acquisition
        const vscode = window.vscode || acquireVsCodeApi();
        window.vscode = vscode;
        
        // Component registration tracking
        window.registeredComponents = window.registeredComponents || [];
        
        // Global error handler
        window.addEventListener('error', function(event) {
            console.error('Panel error:', event.error);
            vscode.postMessage({
                command: 'panel-error',
                error: {
                    message: event.error?.message || 'Unknown error',
                    stack: event.error?.stack,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                }
            });
        });
        
        // Page load tracking
        document.addEventListener('DOMContentLoaded', function() {
            vscode.postMessage({
                command: 'panel-ready',
                components: window.registeredComponents || []
            });
        });
    </script>
    ${jsScripts}
</body>
</html>`;

        return this.config.minifyOutput ? this.minifyHtml(completeHtml) : completeHtml;
    }

    /**
     * Get default template for single component panels
     */
    private getDefaultTemplate(): string {
        return `
            <div class="panel-container">
                <div class="panel-content">
                    {{CONTENT}}
                </div>
            </div>
        `;
    }

    /**
     * Get layout template for multi-component panels
     */
    private getLayoutTemplate(layout: 'vertical' | 'horizontal' | 'grid', componentCount: number = 0): string {
        const layoutClass = `panel-layout--${layout}`;
        
        // Generate component placeholders for the specified number of components
        const componentPlaceholders = Array.from({ length: componentCount }, (_, index) => 
            `{{COMPONENT_${index}}}`
        ).join('\n                    ');
        
        return `
            <div class="panel-container ${layoutClass}">
                <div class="panel-content">
                    ${componentPlaceholders}
                </div>
            </div>
        `;
    }

    /**
     * Generate error HTML for failed components
     */
    private generateErrorHtml(componentId: string, error: any): string {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        return `
            <div class="component-error" data-component-id="${componentId}">
                <div class="error-icon">⚠️</div>
                <div class="error-message">
                    <strong>Component Error:</strong> ${componentId}
                    <br>
                    <small>${errorMessage}</small>
                </div>
                <button type="button" class="error-retry" onclick="window.retryComponent('${componentId}')">
                    Retry
                </button>
            </div>
        `;
    }

    /**
     * Basic HTML minification
     */
    private minifyHtml(html: string): string {
        return html
            .replace(/\s+/g, ' ')
            .replace(/>\s+</g, '><')
            .replace(/\s+>/g, '>')
            .replace(/<\s+/g, '<')
            .trim();
    }

    /**
     * Create a template for common panel patterns
     */
    public static createStandardTemplate(
        title: string,
        headerComponents: BaseComponent[] = [],
        bodyComponents: BaseComponent[] = [],
        footerComponents: BaseComponent[] = []
    ): PanelTemplate {
        const components: ComponentDefinition[] = [];
        let componentIndex = 0;

        // Add header components
        headerComponents.forEach(component => {
            components.push({
                component,
                placeholder: `{{HEADER_${componentIndex}}}`,
                order: componentIndex
            });
            componentIndex++;
        });

        // Add body components
        bodyComponents.forEach(component => {
            components.push({
                component,
                placeholder: `{{BODY_${componentIndex}}}`,
                order: componentIndex
            });
            componentIndex++;
        });

        // Add footer components
        footerComponents.forEach(component => {
            components.push({
                component,
                placeholder: `{{FOOTER_${componentIndex}}}`,
                order: componentIndex
            });
            componentIndex++;
        });

        const template = `
            <div class="panel-container">
                ${headerComponents.length > 0 ? `
                    <div class="panel-header">
                        ${headerComponents.map((_, index) => `{{HEADER_${index}}}`).join('\n')}
                    </div>
                ` : ''}
                
                <div class="panel-body">
                    ${bodyComponents.map((_, index) => `{{BODY_${headerComponents.length + index}}}`).join('\n')}
                </div>
                
                ${footerComponents.length > 0 ? `
                    <div class="panel-footer">
                        ${footerComponents.map((_, index) => `{{FOOTER_${headerComponents.length + bodyComponents.length + index}}}`).join('\n')}
                    </div>
                ` : ''}
            </div>
        `;

        return {
            title,
            template,
            components
        };
    }

    /**
     * Create a template for dashboard-style layouts
     */
    public static createDashboardTemplate(
        title: string,
        widgets: BaseComponent[],
        columns: number = 2
    ): PanelTemplate {
        const components: ComponentDefinition[] = widgets.map((component, index) => ({
            component,
            placeholder: `{{WIDGET_${index}}}`,
            order: index
        }));

        const widgetGrid = widgets
            .map((_, index) => `<div class="dashboard-widget">{{WIDGET_${index}}}</div>`)
            .join('\n');

        const template = `
            <div class="panel-container dashboard">
                <div class="dashboard-grid" style="grid-template-columns: repeat(${columns}, 1fr);">
                    ${widgetGrid}
                </div>
            </div>
        `;

        return {
            title,
            template,
            components,
            customCSS: ['css/layouts/dashboard.css']
        };
    }

    /**
     * Create a template for master-detail layouts
     */
    public static createMasterDetailTemplate(
        title: string,
        masterComponent: BaseComponent,
        detailComponent: BaseComponent
    ): PanelTemplate {
        const template = `
            <div class="panel-container master-detail">
                <div class="master-panel">
                    {{MASTER}}
                </div>
                <div class="detail-panel">
                    {{DETAIL}}
                </div>
            </div>
        `;

        return {
            title,
            template,
            components: [
                { component: masterComponent, placeholder: '{{MASTER}}', order: 0 },
                { component: detailComponent, placeholder: '{{DETAIL}}', order: 1 }
            ],
            customCSS: ['css/layouts/master-detail.css']
        };
    }

    /**
     * Validate template and components
     */
    public static validateTemplate(template: PanelTemplate): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!template.title || template.title.trim() === '') {
            errors.push('Template title is required');
        }

        if (!template.template || template.template.trim() === '') {
            errors.push('Template HTML is required');
        }

        if (!template.components || template.components.length === 0) {
            errors.push('At least one component is required');
        }

        // Check for duplicate component IDs
        const componentIds = new Set<string>();
        for (const componentDef of template.components || []) {
            const id = componentDef.component.getId();
            if (componentIds.has(id)) {
                errors.push(`Duplicate component ID: ${id}`);
            }
            componentIds.add(id);
        }

        // Check that all placeholders in template have corresponding components
        const templatePlaceholders = Array.from(template.template.matchAll(/\{\{([^}]+)\}\}/g))
            .map(match => match[0]);
        
        const componentPlaceholders = new Set(
            template.components?.map(c => c.placeholder).filter(Boolean) || []
        );

        for (const placeholder of templatePlaceholders) {
            if (!componentPlaceholders.has(placeholder) && !placeholder.startsWith('{{COMPONENT_')) {
                // Allow variables and built-in placeholders
                if (!template.variables || !(placeholder.slice(2, -2) in template.variables)) {
                    errors.push(`Template placeholder ${placeholder} has no corresponding component`);
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Static helper methods for simple composition
     * 
     * Collects CSS files in order:
     * 1. Base component styles (applied to all components)
     * 2. Base panel styles (applied to all panels)
     * 3. Component-specific styles (from each component)
     * 4. Panel-specific styles (optional overrides for specific panels)
     */
    private static collectCSSFiles(components: BaseComponent[], panelTitle?: string): string[] {
        const cssFiles = new Set<string>();
        
        // 1. Add base CSS files (foundation styles)
        cssFiles.add('css/base/component-base.css');
        cssFiles.add('css/base/panel-base.css');
        
        // 2. Collect component-specific CSS files
        components.forEach(component => {
            try {
                const componentCSSFile = component.getCSSFile();
                if (componentCSSFile) {
                    // Prepend css/ if not already present
                    const cssPath = componentCSSFile.startsWith('css/') ? componentCSSFile : `css/${componentCSSFile}`;
                    cssFiles.add(cssPath);
                }
            } catch (error) {
                console.warn(`Warning collecting CSS for component ${component.getId()}:`, error);
            }
        });
        
        // 3. Add panel-specific CSS file if panel title is provided
        // This allows panels to override component styles for their specific needs
        if (panelTitle) {
            // Convert panel title to CSS filename format
            // e.g., "Environment Variables" -> "environment-variables-panel.css"
            const panelCssName = panelTitle
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');
            
            const panelCssFile = `css/panels/${panelCssName}-panel.css`;
            
            // Note: This file is optional - if it doesn't exist, it will just not load
            // This allows gradual adoption of panel-specific styles
            cssFiles.add(panelCssFile);
        }
        
        return Array.from(cssFiles);
    }

    private static collectBehaviorScripts(components: BaseComponent[]): string[] {
        const scripts: string[] = [];
        
        // IMPORTANT: Load PanelUtils first (has no dependencies)
        scripts.push('js/utils/PanelUtils.js');
        
        // Then load component-specific behavior scripts BEFORE ComponentUtils
        components.forEach(component => {
            try {
                const componentScript = component.getBehaviorScript();
                if (componentScript) {
                    // Ensure proper js/ prefix for component behavior scripts
                    let scriptPath = componentScript;
                    if (scriptPath.startsWith('components/')) {
                        scriptPath = `js/${scriptPath}`;
                    } else if (!scriptPath.startsWith('js/')) {
                        scriptPath = `js/${scriptPath}`;
                    }
                    // Avoid duplicates
                    if (!scripts.includes(scriptPath)) {
                        scripts.push(scriptPath);
                    }
                }
            } catch (error) {
                console.warn(`Warning collecting scripts for component ${component.getId()}:`, error);
            }
        });
        
        // Load ComponentUtils LAST so all behaviors are available when it initializes
        scripts.push('js/utils/ComponentUtils.js');
        
        return scripts;
    }

    /**
     * Organize components into flexible layout structure
     * Separates control components (selectors, action bars) from table components
     * and arranges them in the proper flex layout for optimal space usage
     */
    private static organizeComponentsForFlexibleLayout(componentHTML: string): string {
        // Reliable approach: Use string splitting by component markers to separate controls from tables
        // This avoids complex regex parsing that could break nested HTML
        
        let controlsHTML = '';
        let tablesHTML = '';
        
        // Split by main component types using simple string detection
        const lines = componentHTML.split('\n');
        let currentComponent = '';
        let isInTableComponent = false;
        
        for (const line of lines) {
            // Detect start of table components
            if (line.includes('data-table') || line.includes('class="data-table') || 
                line.includes('connection-references-table')) {
                isInTableComponent = true;
            }
            
            // Collect the HTML
            if (isInTableComponent) {
                tablesHTML += line + '\n';
            } else {
                // This includes selectors, action bars, and other controls
                controlsHTML += line + '\n';
            }
        }
        
        // Build the flexible layout structure
        return `<div class="panel-container">
        <div class="panel-controls">
            ${controlsHTML.trim()}
        </div>
        <div class="panel-content">
            <div class="panel-table-section">
                ${tablesHTML.trim()}
            </div>
        </div>
    </div>`;
    }

    private static generateCompleteHTML(params: {
        title: string;
        componentHTML: string;
        cssFiles: string[];
        behaviorScripts: string[];
        webviewResources: WebviewResources;
    }): string {
        // Create proper webview URIs for CSS and JS files
        // Extract the base URI pattern from existing resources and construct proper paths
        const baseUri = params.webviewResources.panelStylesSheet.toString().replace('/css/panel-base.css', '');
        
        const cssLinks = params.cssFiles.map(css => 
            `<link rel="stylesheet" href="${baseUri}/${css}">`
        ).join('\n    ');
        
        const jsScripts = params.behaviorScripts.map(script => 
            `<script src="${baseUri}/${script}"></script>`
        ).join('\n    ');
        
        // Organize components for flexible layout
        const organizedHTML = PanelComposer.organizeComponentsForFlexibleLayout(params.componentHTML);
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${params.title}</title>
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src vscode-resource: 'unsafe-inline'; script-src vscode-resource: 'unsafe-inline'; font-src vscode-resource:; img-src vscode-resource: data:;">
    ${cssLinks}
</head>
<body>
    ${organizedHTML}
    
    <script>
        // Make vscode API available globally - avoid duplicate acquisition
        const vscode = window.vscode || acquireVsCodeApi();
        window.vscode = vscode;
        
        // Global error handler
        window.addEventListener('error', function(event) {
            console.error('Panel error:', event.error);
            vscode.postMessage({
                command: 'panel-error',
                error: {
                    message: event.error?.message || 'Unknown error',
                    stack: event.error?.stack
                }
            });
        });
        
        // Initialize components when page loads
        document.addEventListener('DOMContentLoaded', function() {
            if (window.ComponentUtils && window.ComponentUtils.initializeAllComponents) {
                window.ComponentUtils.initializeAllComponents();
            }
            
            vscode.postMessage({
                command: 'panel-ready',
                components: window.registeredComponents || []
            });
        });
    </script>
    ${jsScripts}
</body>
</html>`;
    }
}

