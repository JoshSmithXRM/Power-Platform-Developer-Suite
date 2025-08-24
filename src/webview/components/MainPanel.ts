// MainPanel.ts - Main UI entry point for Dynamics DevTools webview

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
                    font-family: Segoe UI, Arial, sans-serif;
                    background: #f3f6fb;
                    min-height: 100vh;
                }
                .container {
                    display: flex;
                    flex-direction: row;
                    height: 100vh;
                }
                .sidebar {
                    width: 220px;
                    background: #fff;
                    border-right: 1px solid #e1e4e8;
                    padding: 24px 0;
                    box-shadow: 2px 0 8px rgba(0,0,0,0.03);
                }
                .sidebar h2 {
                    font-size: 1.2em;
                    margin: 0 0 24px 24px;
                    color: #0078d4;
                }
                .sidebar button {
                    display: block;
                    width: 180px;
                    margin: 12px 20px;
                    padding: 10px 0;
                    font-size: 1em;
                    background: #e5f1fb;
                    border: none;
                    border-radius: 6px;
                    color: #0078d4;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .sidebar button:hover {
                    background: #d0e7fa;
                }
                .main {
                    flex: 1;
                    padding: 32px;
                }
            </style>
            <div class="container">
                <div class="sidebar">
                    <h2>Dynamics DevTools</h2>
                    <button id="envBtn">Environment Connection</button>
                    <button id="entityBtn">Entity Browser</button>
                    <button id="queryBtn">Query Data</button>
                    <button id="solutionBtn">Solution Explorer</button>
                </div>
                <div class="main" id="mainContent">
                    <h1>Welcome to Dynamics DevTools</h1>
                    <p>Select a feature from the sidebar to get started.</p>
                </div>
            </div>
        `;
        this.setupEvents();
    }

    setupEvents() {
        const envBtn = this.shadowRoot?.getElementById('envBtn');
        if (envBtn) envBtn.onclick = () => this.showContent('Environment Connection');
        const entityBtn = this.shadowRoot?.getElementById('entityBtn');
        if (entityBtn) entityBtn.onclick = () => this.showContent('Entity Browser');
        const queryBtn = this.shadowRoot?.getElementById('queryBtn');
        if (queryBtn) queryBtn.onclick = () => this.showContent('Query Data');
        const solutionBtn = this.shadowRoot?.getElementById('solutionBtn');
        if (solutionBtn) solutionBtn.onclick = () => this.showContent('Solution Explorer');
    }

    showContent(feature) {
        const main = this.shadowRoot?.getElementById('mainContent');
        if (main) {
            main.innerHTML = `<h1>${feature}</h1><p>Feature UI coming soon...</p>`;
        }
    }
}

customElements.define('main-panel', MainPanel);
