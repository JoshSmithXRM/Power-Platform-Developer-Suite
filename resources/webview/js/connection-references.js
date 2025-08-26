// Client-side script for Connection References Panel
const vscode = acquireVsCodeApi();
let currentEnvironmentId = '';

// Helper function to clean up provider names
function cleanProviderName(providerName) {
    if (!providerName) return '';
    // Remove the redundant Microsoft PowerApps prefix
    return providerName.replace(/^\/providers\/Microsoft\.PowerApps\/apis\//, '');
}

// Helper function to format dates
function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
}

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
                        provider: cleanProviderName(cr.connectorLogicalName),
                        connectionName: cr.referencedConnectionId || '',
                        ismanaged: cr.ismanaged ? 'Yes' : 'No',
                        modifiedon: formatDate(cr.modifiedon),
                        modifiedby: cr.modifiedby || ''
                    });
                }
            });
        });

        (data.connectionReferences || []).forEach(cr => {
            if (!cr.flowIds || cr.flowIds.length === 0) {
                rows.push({
                    id: `no-flow-${cr.id}`,
                    flowName: '',
                    crLogicalName: cr.name,
                    provider: cleanProviderName(cr.connectorLogicalName),
                    connectionName: cr.referencedConnectionId || '',
                    ismanaged: cr.ismanaged ? 'Yes' : 'No',
                    modifiedon: formatDate(cr.modifiedon),
                    modifiedby: cr.modifiedby || ''
                });
            }
        });

        if ((data.connectionReferences || []).length === 0 && (data.flows || []).length > 0) {
            (data.flows || []).forEach(f => {
                rows.push({
                    id: f.id,
                    flowName: f.name,
                    crLogicalName: '<em>none found</em>',
                    provider: '<em>direct connections</em>',
                    connectionName: '<em>n/a</em>',
                    ismanaged: f.ismanaged ? 'Yes' : 'No',
                    modifiedon: formatDate(f.modifiedon),
                    modifiedby: f.modifiedby || ''
                });
            });
        }

        if (rows.length === 0) {
            panelUtils.showNoData('No flows or connection references found for the selected environment.');
            return;
        }

        // Use pre-generated table template
        const template = document.getElementById('connectionReferencesTableTemplate');
        content.innerHTML = template.innerHTML;

        // Initialize table with TableUtils for sorting and filtering
        TableUtils.initializeTable('connectionReferencesTable', {
            onRowClick: handleRowClick,
            onRowAction: handleRowAction
        });

        // Load data and apply default sorting by flow name
        TableUtils.loadTableData('connectionReferencesTable', rows);
        TableUtils.sortTable('connectionReferencesTable', 'flowName', 'asc');

        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.onclick = () => PanelUtils.sendMessage('exportDeploymentSkeleton', { relationships: data });
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

function handleRowClick(rowData, rowElement) {
    console.log('Connection reference row clicked:', rowData);
}

function handleRowAction(actionId, rowData) {
    switch (actionId) {
        case 'openInMaker':
            console.log('Open in Maker:', rowData);
            break;
        default:
            console.log('Unknown action:', actionId, rowData);
    }
}
