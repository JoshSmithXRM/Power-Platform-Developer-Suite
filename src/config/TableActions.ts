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
        label: 'View Details',
        icon: 'eye'
    },
    {
        id: 'openInDynamics',
        label: 'Open in Dynamics',
        icon: 'link-external'
    },
    {
        id: 'separator1',
        label: '',
        separator: true
    },
    {
        id: 'copyTraceId',
        label: 'Copy Trace ID',
        icon: 'copy'
    },
    {
        id: 'copyCorrelationId',
        label: 'Copy Correlation ID',
        icon: 'copy'
    },
    {
        id: 'separator2',
        label: '',
        separator: true
    },
    {
        id: 'showRelated',
        label: 'Show Related Traces',
        icon: 'group'
    },
    {
        id: 'showInTimeline',
        label: 'Show in Timeline',
        icon: 'timeline'
    },
    {
        id: 'separator3',
        label: '',
        separator: true
    },
    {
        id: 'deleteTrace',
        label: 'Delete This Trace',
        icon: 'trash'
    }
];

/**
 * Metadata Browser Context Menus
 * Actions for metadata browsing and navigation
 */
export const METADATA_CONTEXT_MENU_ITEMS = {
    attributes: [
        {
            id: 'copyLogicalName',
            label: 'Copy Logical Name',
            icon: 'copy'
        },
        {
            id: 'openAttributeInMaker',
            label: 'Open in Maker',
            icon: 'globe'
        }
    ] as DataTableContextMenuItem[],

    relationships: [
        {
            id: 'openRelatedEntity',
            label: 'Open Related Entity',
            icon: 'link-external'
        },
        {
            id: 'copyLogicalName',
            label: 'Copy Relationship Name',
            icon: 'copy'
        }
    ] as DataTableContextMenuItem[]
};
