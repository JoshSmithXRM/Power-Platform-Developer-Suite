/**
 * Solution Explorer Panel Script
 * Handles solution listing, filtering, and solution operations
 */

const vscode = acquireVsCodeApi();
let currentEnvironmentId = '';
let solutions = [];

// Initialize panel with PanelUtils
const panelUtils = PanelUtils.initializePanel({
    environmentSelectorId: 'environmentSelect',
    onEnvironmentChange: 'onEnvironmentChange',
    clearMessage: 'Select an environment to load solutions...'
});

// Initialize environment selector and load environments
document.addEventListener('DOMContentLoaded', () => {
    panelUtils.loadEnvironments();
});

// Load environments on startup (fallback)
panelUtils.loadEnvironments();

/**
 * Handle environment selection change
 * @param {string} selectorId - Environment selector ID
 * @param {string} environmentId - Selected environment ID
 * @param {string} previousEnvironmentId - Previously selected environment ID
 */
function onEnvironmentChange(selectorId, environmentId, previousEnvironmentId) {
    currentEnvironmentId = environmentId;
    if (environmentId) {
        loadSolutions();
    } else {
        panelUtils.clearContent('Select an environment to load solutions...');
    }
}

/**
 * Load solutions for current environment
 */
function loadSolutions() {
    if (!currentEnvironmentId) return;
    
    panelUtils.showLoading('Loading solutions...');
    PanelUtils.sendMessage('loadSolutions', { 
        environmentId: currentEnvironmentId 
    });
}

/**
 * Refresh solutions for the current environment
 */
function refreshSolutions() {
    if (currentEnvironmentId) {
        loadSolutions();
    }
}

/**
 * Populate solutions table using ComponentFactory
 * @param {Array} solutionsData - Array of solution objects
 */
function populateSolutions(solutionsData) {
    solutions = solutionsData;
    
    if (solutions.length === 0) {
        panelUtils.showNoData('No solutions found in this environment.');
        return;
    }
    
    // Use pre-generated table template
    const template = document.getElementById('solutionsTableTemplate');
    document.getElementById('content').innerHTML = template.innerHTML;
    
    // Transform solutions data for the table
    const tableData = solutions.map(solution => ({
        id: solution.solutionId,
        friendlyName: solution.friendlyName,
        uniqueName: solution.uniqueName,
        version: solution.version,
        type: solution.isManaged ? 'Managed' : 'Unmanaged',
        publisherName: solution.publisherName,
        installedDate: PanelUtils.formatDate(solution.installedOn)
    }));
    
    // Initialize table with TableUtils
    TableUtils.initializeTable('solutionsTable', {
        onRowAction: handleRowAction
    });
    
    // Load data into table
    TableUtils.loadTableData('solutionsTable', tableData);
    
    // Apply default sort to show indicator
    TableUtils.sortTable('solutionsTable', 'friendlyName', 'asc');
}

/**
 * Handle table row actions (buttons, context menu)
 * @param {string} actionId - Action identifier
 * @param {Object} rowData - Row data object
 */
function handleRowAction(actionId, rowData) {
    switch (actionId) {
        case 'openInMaker':
            openSolutionInMaker(rowData.id);
            break;
        case 'openInClassic':
            openSolutionInClassic(rowData.id);
            break;
    }
}

/**
 * Open solution in maker portal
 * @param {string} solutionId - Solution ID to open
 */
function openSolutionInMaker(solutionId) {
    PanelUtils.sendMessage('openSolutionInMaker', {
        environmentId: currentEnvironmentId,
        solutionId: solutionId
    });
}

/**
 * Open solution in classic UI
 * @param {string} solutionId - Solution ID to open
 */
function openSolutionInClassic(solutionId) {
    PanelUtils.sendMessage('openSolutionInClassic', {
        environmentId: currentEnvironmentId,
        solutionId: solutionId
    });
}

// Setup message handlers
PanelUtils.setupMessageHandler({
    'environmentsLoaded': (message) => {
        EnvironmentSelectorUtils.loadEnvironments('environmentSelect', message.data);
        if (message.selectedEnvironmentId) {
            EnvironmentSelectorUtils.setSelectedEnvironment('environmentSelect', message.selectedEnvironmentId);
            currentEnvironmentId = message.selectedEnvironmentId;
            loadSolutions();
        }
    },
    
    'solutionsLoaded': (message) => {
        populateSolutions(message.data);
    }
});
