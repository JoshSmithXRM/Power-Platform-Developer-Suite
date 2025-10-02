import { DataTableContextMenuItem } from '../components/tables/DataTable/DataTableConfig';

/**
 * Reusable table action configurations
 * Centralized definitions for context menus and row actions across panels
 * Follows DRY principle and ensures consistency
 */

/**
 * Solution Explorer Context Menu
 * Actions for solution management
 */
export const SOLUTION_CONTEXT_MENU_ITEMS: DataTableContextMenuItem[] = [
    {
        id: 'openMaker',
        label: 'Open in Maker',
        icon: 'globe'
    },
    {
        id: 'openClassic',
        label: 'Open in Classic',
        icon: 'server'
    }
];

/**
 * Import Job Viewer Context Menu
 * Actions for import job management
 */
export const IMPORT_JOB_CONTEXT_MENU_ITEMS: DataTableContextMenuItem[] = [
    {
        id: 'viewXml',
        label: 'View Import Job XML',
        icon: 'file-code'
    }
];

/**
 * Connection References Context Menu
 * Actions for connection reference management
 */
export const CONNECTION_REFERENCE_CONTEXT_MENU_ITEMS: DataTableContextMenuItem[] = [
    {
        id: 'viewDetails',
        label: 'View Details',
        icon: 'info'
    }
];

/**
 * Environment Variables Context Menu
 * Actions for environment variable management
 */
export const ENVIRONMENT_VARIABLE_CONTEXT_MENU_ITEMS: DataTableContextMenuItem[] = [
    {
        id: 'viewDetails',
        label: 'View Details',
        icon: 'info'
    },
    {
        id: 'copyValue',
        label: 'Copy Value',
        icon: 'copy'
    }
];

/**
 * Plugin Trace Context Menu
 * Actions for plugin trace management
 */
export const PLUGIN_TRACE_CONTEXT_MENU_ITEMS: DataTableContextMenuItem[] = [
    {
        id: 'viewDetails',
        label: 'View Trace Details',
        icon: 'file-code'
    },
    {
        id: 'copyError',
        label: 'Copy Error Message',
        icon: 'copy'
    }
];
