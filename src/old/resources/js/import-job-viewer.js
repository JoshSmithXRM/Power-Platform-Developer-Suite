/**
 * Import Job Viewer Panel Script
 * Handles import job listing, filtering, and XML viewing functionality
 */

// Initialize panel with PanelUtils
const panelUtils = PanelUtils.initializePanel({
    environmentSelectorId: 'environmentSelect',
    onEnvironmentChange: 'onEnvironmentChange',
    clearMessage: 'Select an environment to load import jobs...'
});

// Load environments on startup
document.addEventListener('DOMContentLoaded', () => {
    panelUtils.loadEnvironments();
});

// Fallback for environments loading
panelUtils.loadEnvironments();

let importJobs = [];

/**
 * Calculate status badge HTML based on import job data
 * @param {Object} job - Import job data
 * @returns {string} HTML for status badge
 */
function calculateStatus(job) {
    // If it has a completed date, check progress
    if (job.completedon) {
        // If completed but less than 100% progress, it failed
        if (job.progress && job.progress < 100) {
            return '<span class="status-badge status-failed">Failed</span>';
        }
        return '<span class="status-badge status-completed">Completed</span>';
    }
    
    // If started but no completed date
    if (job.startedon) {
        // If no progress (N/A) and no completed date, it failed at 0%
        if (!job.progress || job.progress === null) {
            return '<span class="status-badge status-failed">Failed</span>';
        }
        return '<span class="status-badge status-in-progress">In Progress</span>';
    }
    
    return '<span class="status-badge status-unknown">Unknown</span>';
}

/**
 * Handle environment change event
 * @param {string} selectorId - Environment selector ID
 * @param {string} environmentId - Selected environment ID
 * @param {string} previousEnvironmentId - Previously selected environment ID
 */
function onEnvironmentChange(selectorId, environmentId, previousEnvironmentId) {
    currentEnvironmentId = environmentId;
    
    if (environmentId) {
        const solutionHistoryBtn = document.getElementById('solutionHistoryBtn');
        if (solutionHistoryBtn) {
            solutionHistoryBtn.disabled = false;
        }
        loadImportJobsForEnvironment(environmentId);
    } else {
        const solutionHistoryBtn = document.getElementById('solutionHistoryBtn');
        if (solutionHistoryBtn) {
            solutionHistoryBtn.disabled = true;
        }
        panelUtils.clearContent('Select an environment to load import jobs...');
    }
}

/**
 * Load import jobs for the current environment
 */
function loadImportJobs() {
    if (!currentEnvironmentId) {
        showMessage('Please select an environment first.');
        return;
    }
    
    showLoading('Loading import jobs...');
    vscode.postMessage({
        command: 'loadImportJobs',
        environmentId: currentEnvironmentId
    });
}

/**
 * Refresh import jobs for the current environment
 */
function refreshImportJobs() {
    if (currentEnvironmentId) {
        loadImportJobsForEnvironment(currentEnvironmentId);
    } else {
        panelUtils.showError('Please select an environment first.');
    }
}

/**
 * Open solution history panel
 */
function openSolutionHistory() {
    if (!currentEnvironmentId) {
        panelUtils.showError('Please select an environment first.');
        return;
    }
    
    PanelUtils.sendMessage('openSolutionHistory', {
        environmentId: currentEnvironmentId
    });
}

/**
 * Display import jobs in the table
 * @param {Array} jobs - Array of import job objects
 */
function displayImportJobs(jobs) {
    importJobs = jobs || [];
    
    const content = document.getElementById('content');
    if (!content) return;
    
    if (importJobs.length === 0) {
        panelUtils.showNoData('No import jobs found for this environment.');
        return;
    }
    
    // Use pre-generated table template
    const template = document.getElementById('importJobsTableTemplate');
    content.innerHTML = template.innerHTML;
    
    // Transform import jobs data for the table
    const tableData = importJobs.map(job => ({
        id: job.importjobid, // TableUtils requires 'id' property for row identification
        importjobid: job.importjobid,
        solutionname: job.solutionname || 'N/A',
        progress: job.progress ? job.progress + '%' : 'N/A',
        startedon: job.startedon ? new Date(job.startedon).toLocaleString() : 'N/A',
        completedon: job.completedon ? new Date(job.completedon).toLocaleString() : 'N/A',
        status: calculateStatus(job),
        importcontext: job.importcontext || 'N/A',
        operationcontext: job.operationcontext || 'N/A'
    }));
    
    // Initialize table with TableUtils
    TableUtils.initializeTable('importJobsTable', {
        onRowClick: handleRowClick,
        onRowAction: handleRowAction
    });
    
    // Load data into table
    TableUtils.loadTableData('importJobsTable', tableData);
    
    // Apply default sort to show indicator
    TableUtils.sortTable('importJobsTable', 'startedon', 'desc');
}

/**
 * Handle table row click events
 * @param {Object} rowData - Row data object
 * @param {HTMLElement} rowElement - Row DOM element
 */
function handleRowClick(rowData, rowElement) {
    console.log('handleRowClick called with rowData:', rowData);
    if (rowData && rowData.importjobid) {
        console.log('Sending viewImportJobXml message with importJobId:', rowData.importjobid);
        PanelUtils.sendMessage('viewImportJobXml', {
            importJobId: rowData.importjobid
        });
    }
}

/**
 * Handle table row action events (buttons, context menu)
 * @param {string} actionId - Action identifier
 * @param {Object} rowData - Row data object
 */
function handleRowAction(actionId, rowData) {
    console.log('handleRowAction called with actionId:', actionId, 'rowData:', rowData);
    
    if (actionId === 'viewImportJobXml' && rowData && rowData.importjobid) {
        console.log('Sending viewImportJobXml message from row action with importJobId:', rowData.importjobid);
        PanelUtils.sendMessage('viewImportJobXml', {
            importJobId: rowData.importjobid
        });
    }
}

/**
 * Load import jobs for a specific environment
 * @param {string} environmentId - Environment ID to load jobs for
 */
function loadImportJobsForEnvironment(environmentId) {
    if (environmentId) {
        panelUtils.showLoading('Loading import jobs...');
        PanelUtils.sendMessage('loadImportJobs', { 
            environmentId: environmentId 
        });
    }
}

// Setup message handlers using shared pattern
PanelUtils.setupMessageHandler({
    'environmentsLoaded': (message) => {
        EnvironmentSelectorUtils.loadEnvironments('environmentSelect', message.data);
        if (message.selectedEnvironmentId) {
            EnvironmentSelectorUtils.setSelectedEnvironment('environmentSelect', message.selectedEnvironmentId);
            currentEnvironmentId = message.selectedEnvironmentId;
            loadImportJobsForEnvironment(message.selectedEnvironmentId);
        }
        
        // Enable solution history button if we have an environment
        if (message.selectedEnvironmentId || message.data.length > 0) {
            const solutionHistoryBtn = document.getElementById('solutionHistoryBtn');
            if (solutionHistoryBtn) {
                solutionHistoryBtn.disabled = false;
            }
        }
    },
    
    'importJobsLoaded': (message) => {
        displayImportJobs(message.data);
    },
    
    'xmlContentLoaded': (message) => {
        if (message.content && message.jobId) {
            showXmlViewer(message.content, message.jobId);
        }
    }
});
