// Client-side script for Connection References Panel
const vscode = acquireVsCodeApi();
let currentEnvironmentId = '';
let currentSolutionId = '';
let currentRelationshipData = null;
let currentSolutionUniqueName = '';
let currentSolutionsData = [];

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
    
    // Initialize solution selector
    SolutionSelectorUtils.initializeSelector('solutionSelect', {
        onSelectionChange: 'onSolutionChange'
    });
});

function onEnvironmentChange(selectorId, environmentId, previousEnvironmentId) {
    currentEnvironmentId = environmentId;
    if (environmentId) {
        // Load solutions for the new environment
        loadSolutions(environmentId);
    } else {
        // Clear solution selector and content
        SolutionSelectorUtils.clearSelector('solutionSelect', 'Select an environment first...');
        currentSolutionId = '';
        panelUtils.clearContent('Select an environment to manage connection references...');
    }
}

function onSolutionChange(selectorId, solutionId, previousSolutionId) {
    currentSolutionId = solutionId;
    // Update the solution unique name when solution changes
    const selectedSolution = currentSolutionsData.find(s => s.solutionId === solutionId);
    currentSolutionUniqueName = selectedSolution?.uniqueName || '';
    
    if (solutionId && currentEnvironmentId) {
        loadConnectionReferences(currentEnvironmentId, solutionId);
    } else {
        panelUtils.clearContent('Select a solution to view connection references...');
    }
}

function loadSolutions(environmentId) {
    if (!environmentId) return;
    SolutionSelectorUtils.setLoadingState('solutionSelect', true);
    PanelUtils.sendMessage('loadSolutions', { environmentId });
}

function loadConnectionReferences(environmentId, solutionId) {
    if (!environmentId) return;
    panelUtils.showLoading('Loading connection references...');
    PanelUtils.sendMessage('loadConnectionReferences', { environmentId, solutionId });
}

function refreshData() {
    if (!currentEnvironmentId || !currentSolutionId) return;
    loadConnectionReferences(currentEnvironmentId, currentSolutionId);
}

function openInMaker() {
    if (!currentEnvironmentId || !currentSolutionId) {
        PanelUtils.sendMessage('error', { message: 'Please select an environment and solution first' });
        return;
    }
    
    PanelUtils.sendMessage('openInMaker', { 
        environmentId: currentEnvironmentId, 
        solutionId: currentSolutionId,
        entityType: 'connectionreferences'
    });
}

function syncDeploymentSettings() {
    if (!currentRelationshipData || !currentSolutionUniqueName) {
        PanelUtils.sendMessage('error', { message: 'No connection reference data or solution selected for sync' });
        return;
    }
    
    PanelUtils.sendMessage('syncDeploymentSettings', {
        relationships: currentRelationshipData,
        solutionUniqueName: currentSolutionUniqueName
    });
}

// Message handlers
PanelUtils.setupMessageHandler({
    'environmentsLoaded': (message) => {
        EnvironmentSelectorUtils.loadEnvironments('environmentSelect', message.data);
        if (message.selectedEnvironmentId) {
            EnvironmentSelectorUtils.setSelectedEnvironment('environmentSelect', message.selectedEnvironmentId);
            currentEnvironmentId = message.selectedEnvironmentId;
            loadSolutions(message.selectedEnvironmentId);
        }
    },

    'solutionsLoaded': (message) => {
        SolutionSelectorUtils.setLoadingState('solutionSelect', false);
        SolutionSelectorUtils.loadSolutions('solutionSelect', message.data, message.selectedSolutionId);
        // Store solutions data for later reference
        currentSolutionsData = message.data;
        if (message.selectedSolutionId) {
            currentSolutionId = message.selectedSolutionId;
            // Store solution unique name for deployment settings
            const selectedSolution = message.data.find(s => s.solutionId === message.selectedSolutionId);
            currentSolutionUniqueName = selectedSolution?.uniqueName || '';
            loadConnectionReferences(currentEnvironmentId, message.selectedSolutionId);
        }
    },

    'connectionReferencesLoaded': (message) => {
        const data = message.data || {};
        const relationships = data.relationships || [];
        currentRelationshipData = data; // Store for deployment settings sync

        if (relationships.length === 0) {
            panelUtils.showNoData('No flows or connection references found for the selected environment.');
            // Disable sync button when no data
            const syncBtn = document.getElementById('syncDeploymentBtn');
            if (syncBtn) {
                syncBtn.disabled = true;
            }
            return;
        }

        // Transform relationships to table data
        const tableData = relationships.map(rel => {
            // Determine the most recent modification date and author
            let modifiedOn = '';
            let modifiedBy = '';
            
            if (rel.flowModifiedOn && rel.crModifiedOn) {
                // Both exist, use the more recent one
                const flowDate = new Date(rel.flowModifiedOn);
                const crDate = new Date(rel.crModifiedOn);
                if (flowDate > crDate) {
                    modifiedOn = formatDate(rel.flowModifiedOn);
                    modifiedBy = rel.flowModifiedBy || '';
                } else {
                    modifiedOn = formatDate(rel.crModifiedOn);
                    modifiedBy = rel.crModifiedBy || '';
                }
            } else if (rel.flowModifiedOn) {
                modifiedOn = formatDate(rel.flowModifiedOn);
                modifiedBy = rel.flowModifiedBy || '';
            } else if (rel.crModifiedOn) {
                modifiedOn = formatDate(rel.crModifiedOn);
                modifiedBy = rel.crModifiedBy || '';
            }

            // Determine managed status - prioritize flow managed status if flow exists, otherwise CR
            let isManaged = '';
            if (rel.flowIsManaged !== undefined || rel.crIsManaged !== undefined) {
                if (rel.flowIsManaged !== undefined) {
                    isManaged = rel.flowIsManaged ? 'Yes' : 'No';
                } else if (rel.crIsManaged !== undefined) {
                    isManaged = rel.crIsManaged ? 'Yes' : 'No';
                }
            }

            return {
                id: rel.id,
                flowName: rel.flowName || '<span class="orphaned-item">No flows</span>',
                connectionReference: rel.connectionReferenceLogicalName || '<span class="orphaned-item">No connection references</span>',
                provider: cleanProviderName(rel.connectorType) || '',
                connection: rel.connectionName || '',
                ismanaged: isManaged,
                modifiedOn: modifiedOn,
                modifiedBy: modifiedBy,
                relationshipType: rel.relationshipType // For future styling
            };
        });

        // Use pre-generated table template
        const content = document.getElementById('content');
        const template = document.getElementById('connectionReferencesTableTemplate');
        content.innerHTML = template.innerHTML;

        // Initialize table with TableUtils for sorting and filtering
        TableUtils.initializeTable('connectionReferencesTable', {
            onRowClick: handleRowClick,
            onRowAction: handleRowAction
        });

        // Load data and apply default sorting by flow name
        TableUtils.loadTableData('connectionReferencesTable', tableData);
        TableUtils.sortTable('connectionReferencesTable', 'flowName', 'asc');

        // Enable and wire sync deployment settings button
        const syncBtn = document.getElementById('syncDeploymentBtn');
        if (syncBtn) {
            syncBtn.disabled = false;
            syncBtn.onclick = () => syncDeploymentSettings();
        }
    },

    'deploymentSettingsSynced': (message) => {
        const result = message.data;
        const actionText = result.isNewFile ? 'created' : 'updated';
        const summary = `Deployment settings file ${actionText}: ${result.added} added, ${result.removed} removed`;
        
        // Show success message with file path
        panelUtils.showSuccess(`${summary}\nFile: ${result.filePath}`);
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
