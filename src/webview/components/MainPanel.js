// MainPanel.js - Main UI entry point for Dynamics DevTools webview

class MainPanel extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.render();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: var(--vscode-font-family, 'Segoe UI', Arial, sans-serif);
                    background: var(--vscode-editor-background, #f3f6fb);
                    color: var(--vscode-editor-foreground, #323130);
                    min-height: 100vh;
                }
                .container {
                    display: flex;
                    flex-direction: row;
                    height: 100vh;
                }
                .sidebar {
                    width: 220px;
                    background: var(--vscode-sideBar-background, #fff);
                    border-right: 1px solid var(--vscode-sideBar-border, #e1e4e8);
                    padding: 24px 0;
                    box-shadow: 2px 0 8px rgba(0,0,0,0.03);
                }
                .sidebar h2 {
                    font-size: 1.2em;
                    margin: 0 0 24px 24px;
                    color: var(--vscode-textLink-foreground, #0078d4);
                }
                .sidebar button {
                    display: block;
                    width: 180px;
                    margin: 12px 20px;
                    padding: 10px 16px;
                    font-size: 1em;
                    background: var(--vscode-button-secondaryBackground, #e5f1fb);
                    border: 1px solid var(--vscode-button-border, transparent);
                    border-radius: 6px;
                    color: var(--vscode-button-secondaryForeground, #0078d4);
                    cursor: pointer;
                    transition: background 0.2s;
                    text-align: left;
                }
                .sidebar button:hover {
                    background: var(--vscode-button-secondaryHoverBackground, #d0e7fa);
                }
                .sidebar button.active {
                    background: var(--vscode-button-background, #0078d4);
                    color: var(--vscode-button-foreground, #fff);
                }
                .main {
                    flex: 1;
                    padding: 32px;
                    overflow-y: auto;
                }
                .welcome-card {
                    background: var(--vscode-editorWidget-background, #fff);
                    border: 1px solid var(--vscode-editorWidget-border, #e1e4e8);
                    border-radius: 8px;
                    padding: 32px;
                    margin-bottom: 24px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                }
                .feature-card {
                    background: var(--vscode-editorWidget-background, #fff);
                    border: 1px solid var(--vscode-editorWidget-border, #e1e4e8);
                    border-radius: 8px;
                    padding: 24px;
                    margin-bottom: 16px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                }
                .feature-title {
                    font-size: 1.4em;
                    margin: 0 0 12px 0;
                    color: var(--vscode-textLink-foreground, #0078d4);
                }
                .feature-description {
                    color: var(--vscode-descriptionForeground, #6b6b6b);
                    margin-bottom: 16px;
                    line-height: 1.5;
                }
                .coming-soon {
                    background: var(--vscode-badge-background, #f3f6fb);
                    color: var(--vscode-badge-foreground, #0078d4);
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 0.9em;
                    font-weight: 500;
                }
            </style>
            <div class="container">
                <div class="sidebar">
                    <h2>Dynamics DevTools</h2>
                    <button id="envBtn">🔗 Environment Connection</button>
                    <button id="entityBtn">📊 Entity Browser</button>
                    <button id="queryBtn">🔍 Query Data</button>
                    <button id="solutionBtn">📦 Solution Explorer</button>
                </div>
                <div class="main" id="mainContent">
                    <div class="welcome-card">
                        <h1>🚀 Welcome to Dynamics DevTools</h1>
                        <p>A powerful VS Code extension for Dynamics 365/Dataverse development and administration.</p>
                        <p>Select a feature from the sidebar to get started with your development workflow.</p>
                    </div>
                </div>
            </div>
        `;
        this.setupEvents();
    }

    setupEvents() {
        const buttons = ['envBtn', 'entityBtn', 'queryBtn', 'solutionBtn'];
        buttons.forEach(btnId => {
            const btn = this.shadowRoot?.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.setActiveButton(btnId);
                    this.showContent(this.getFeatureInfo(btnId));
                });
            }
        });
    }

    setActiveButton(activeId) {
        const buttons = this.shadowRoot?.querySelectorAll('button');
        buttons?.forEach(btn => btn.classList.remove('active'));
        this.shadowRoot?.getElementById(activeId)?.classList.add('active');
    }

    getFeatureInfo(btnId) {
        const features = {
            envBtn: {
                title: '🔗 Environment Connection',
                description: 'Connect to your Dynamics 365/Dataverse environments using various authentication methods.',
                features: [
                    'Service Principal authentication',
                    'Interactive OAuth login',
                    'Multiple environment management',
                    'Secure credential storage'
                ]
            },
            entityBtn: {
                title: '📊 Entity Browser',
                description: 'Browse and explore your Dataverse tables, columns, and relationships.',
                features: [
                    'View all tables and their metadata',
                    'Explore table relationships',
                    'Browse table data with pagination',
                    'Export data to various formats'
                ]
            },
            queryBtn: {
                title: '🔍 Query Data',
                description: 'Execute custom queries against your Dataverse environment.',
                features: [
                    'FetchXML query builder',
                    'OData query interface',
                    'Query history and favorites',
                    'Results export and visualization'
                ]
            },
            solutionBtn: {
                title: '📦 Solution Explorer',
                description: 'Manage and explore Dynamics 365 solutions and components.',
                features: [
                    'Solution listing and details',
                    'Component dependency analysis',
                    'Solution import/export',
                    'Version comparison tools'
                ]
            }
        };
        return features[btnId];
    }

    showContent(feature) {
        const main = this.shadowRoot?.getElementById('mainContent');
        if (main && feature) {
            main.innerHTML = `
                <div class="feature-card">
                    <h1 class="feature-title">${feature.title}</h1>
                    <p class="feature-description">${feature.description}</p>
                    <div class="coming-soon">Coming Soon</div>
                </div>
                <div class="feature-card">
                    <h3>Planned Features:</h3>
                    <ul>
                        ${feature.features.map(f => `<li>${f}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
    }
}

customElements.define('main-panel', MainPanel);
