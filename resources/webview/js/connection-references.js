// Client-side script for Connection References Panel
const vscode = acquireVsCodeApi();
let currentEnvironmentId = '';

// Initialize panel utilities similar to other panels
const panelUtils = PanelUtils.initializePanel({
    environmentSelectorId: 'environmentSelect',
    onEnvironmentChange: 'onEnvironmentChange',
    clearMessage: 'Select an environment to manage connection references...'
});

// Wire DOMContentLoaded to load environments
document.addEventListener('DOMContentLoaded', () => {
    panelUtils.loadEnvironments();
});

function onEnvironmentChange(selectorId, environmentId, previousEnvironmentId) {
    currentEnvironmentId = environmentId;
    if (environmentId) {
        loadConnectionReferences(environmentId);
    } else {
        panelUtils.clearContent('Select an environment to manage connection references...');
    }
}

function loadConnectionReferences(environmentId) {
    if (!environmentId) return;
    panelUtils.showLoading('Loading connection references...');
    PanelUtils.sendMessage('loadConnectionReferences', { environmentId });
}

// Message handlers
PanelUtils.setupMessageHandler({
    'environmentsLoaded': (message) => {
        EnvironmentSelectorUtils.loadEnvironments('environmentSelect', message.data);
        if (message.selectedEnvironmentId) {
            EnvironmentSelectorUtils.setSelectedEnvironment('environmentSelect', message.selectedEnvironmentId);
            currentEnvironmentId = message.selectedEnvironmentId;
            loadConnectionReferences(message.selectedEnvironmentId);
        }
    },

    'connectionReferencesLoaded': (message) => {
        const content = document.getElementById('content');
        const data = message.data || {};

        const rows = [];
        (data.flows || []).forEach(f => {
            (data.connectionReferences || []).forEach(cr => {
                if (cr.flowIds && cr.flowIds.includes(f.id)) {
                    rows.push({
                        id: `${f.id}-${cr.id}`, // Unique ID for table row actions
                        flowName: f.name,
                        crLogicalName: cr.name,
                        provider: cr.connectorLogicalName || '',
                        connectionName: cr.referencedConnectionName || ''
                    });
                }
            });
        });

        (data.connectionReferences || []).forEach(cr => {
            if (!cr.flowIds || cr.flowIds.length === 0) {
                rows.push({
                    id: `no-flow-${cr.id}`, // Unique ID for table row actions
                    flowName: '',
                    crLogicalName: cr.name,
                    provider: cr.connectorLogicalName || '',
                    connectionName: cr.referencedConnectionName || ''
                });
            }
        });

        if ((data.connectionReferences || []).length === 0 && (data.flows || []).length > 0) {
            (data.flows || []).forEach(f => {
                rows.push({
                    id: f.id, // Unique ID for table row actions
                    flowName: f.name,
                    crLogicalName: '<em>none found</em>',
                    provider: '<em>direct connections</em>',
                    connectionName: '<em>n/a</em>'
                });
            });
        }

        if (rows.length === 0) {
            panelUtils.showNoData('No flows or connection references found for the selected environment.');
            return;
        }

        let html = '<div class="table-container"><table class="data-table"><thead><tr>' +
            '<th>Flow Name</th><th>Connection Reference Logical Name</th><th>Provider</th><th>Connection</th>' +
            '</tr></thead><tbody>';

        rows.forEach(r => {
            html += '<tr>' +
                '<td>' + (r.flowName || '') + '</td>' +
                '<td>' + (r.crLogicalName || '') + '</td>' +
                '<td>' + (r.provider || '') + '</td>' +
                '<td>' + (r.connectionName || '<em>unbound</em>') + '</td>' +
                '</tr>';
        });

        html += '</tbody></table></div>';
        content.innerHTML = html;

        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.onclick = () => PanelUtils.sendMessage('exportDeploymentSkeleton', { relationships: data });
        }
    },

    'connectionReferencesDebug': (message) => {
        console.log('connectionReferencesDebug:', message.data);
        const content = document.getElementById('content');
        if (content) {
            const debugDetails = message.data._debug ? `<pre style="color:var(--vscode-editor-foreground);font-size:11px;opacity:0.85;">${JSON.stringify(message.data._debug, null, 2)}</pre>` : '';
            const debugHtml = `<div style="padding:8px;color:var(--vscode-editor-foreground);font-size:12px;opacity:0.85;">Relationships: flows=${message.data.flowsCount}, connectionReferences=${message.data.connectionReferencesCount}, connections=${message.data.connectionsCount}</div>` + debugDetails;
            +
                content.insertAdjacentHTML('afterbegin', debugHtml);
        }
    },

    'exportedSkeleton': (message) => {
        const content = document.getElementById('content');
        content.innerHTML = '<div style="padding:16px;"><h2>Exported Skeleton</h2><pre style="white-space:pre-wrap;">' + JSON.stringify(message.data, null, 2) + '</pre></div>';
    },

    'error': (message) => {
        panelUtils.showError(message.message || 'An error occurred');
    }
});
