# Data Explorer - Technical Specification

**Feature:** Data Explorer (Technical Implementation)
**Version:** 1.0
**Last Updated:** 2025-10-27
**Status:** Design Phase
**Companion Doc:** [DATA_EXPLORER_DESIGN.md](./DATA_EXPLORER_DESIGN.md)

---

## Executive Summary

This document provides the technical implementation specification for Data Explorer. For high-level vision and UX design, see DATA_EXPLORER_DESIGN.md. This spec focuses on TypeScript interfaces, API requirements, component architecture, and implementation details based on user requirements.

---

## User Requirements (Confirmed)

### View Management
- ✅ Dropdown in action bar
- ✅ My Views listed first, then System Views
- ✅ Custom queries saveable and searchable

### Query Builder
- ✅ Extend existing FilterPanel for all field types
- ✅ Match Advanced Find capabilities
- ✅ Support related entities, aggregations, etc.
- ❓ Limitations: TBD based on Advanced Find capabilities

### Column Management
- ✅ User-controlled column visibility
- ✅ Column ordering and sorting
- ✅ Hide/show columns on the fly

### Data Operations
- ✅ Read-only for v1.0 (editing future enhancement)
- ✅ No row click action (read-only view)
- ✅ Export selected: Visible columns (default)
- ✅ Export all: All columns option (stretch)

### Export Features
- ✅ JSON: Developer-friendly structured data
- ✅ CSV: Excel-compatible
- ✅ Default: Visible columns only
- ✅ Option: Export ALL to JSON/CSV

### Performance
- ✅ 50 rows default (toggleable: 10, 25, 50, 100, 250)
- ✅ Footer shows record count (already exists in DataTable)
- ✅ Show record count before loading all data
- ✅ Reasonable limits on total records

### Integration
- ✅ Reuse DataTableComponent
- ✅ Reuse/extend FilterPanelComponent
- ⭐ Plugin Trace Viewer integration (stretch goal)

### UI/UX
- ✅ Similar to Plugin Trace Viewer layout (not Metadata Browser)
- ✅ Command palette access
- ✅ State persistence per session (standard pattern)
- ✅ Cache environment + entity + query settings

---

## Component Architecture

### DataExplorerPanel Structure

```typescript
export class DataExplorerPanel extends BasePanel {
    public static readonly viewType = 'dataExplorer';

    // Components
    private environmentSelectorComponent: EnvironmentSelectorComponent;
    private entitySelectorComponent: EntitySelectorComponent; // NEW
    private viewSelectorComponent: ViewSelectorComponent; // NEW
    private filterPanelComponent: FilterPanelComponent; // REUSED & ENHANCED
    private dataTableComponent: DataTableComponent; // REUSED
    private actionBarComponent: ActionBarComponent; // REUSED

    // Services
    private queryService: DataverseQueryService; // EXISTS
    private metadataService: DataverseMetadataService; // EXISTS

    // State
    private selectedEntityName?: string;
    private selectedView?: SavedQuery | UserQuery | CustomQuery;
    private customQueries: CustomQuery[] = [];
    private currentResults: QueryResult;
}
```

### New Components Required

**1. EntitySelectorComponent**
```typescript
export interface EntitySelectorConfig {
    id: string;
    placeholder: string;
    searchable: boolean;
    showMetadata: boolean; // Show record count, description
    grouping: 'solution' | 'type' | 'none'; // Group by solution, custom vs system, or flat
    onSelect: (entityName: string) => void;
}
```

**2. ViewSelectorComponent**
```typescript
export interface ViewSelectorConfig {
    id: string;
    entityName: string;
    grouping: 'type'; // My Views → System Views → Custom Queries
    searchable: boolean;
    onSelect: (view: SavedQuery | UserQuery | CustomQuery) => void;
    onNew: () => void;
    onSave: (query: CustomQuery) => void;
}

export interface ViewOption {
    id: string;
    name: string;
    type: 'system' | 'personal' | 'custom';
    entityName: string;
    fetchXml?: string;
    layoutXml?: string;
    isDefault: boolean;
}
```

---

## Data Models

### View Types

```typescript
// System views (savedquery)
export interface SavedQuery {
    savedqueryid: string;
    name: string;
    returnedtypecode: string; // Entity logical name
    fetchxml: string;
    layoutxml: string;
    querytype: number; // 0 = Public view
    isdefault: boolean;
    isquickfindquery: boolean;
    description?: string;
}

// Personal views (userquery)
export interface UserQuery {
    userqueryid: string;
    name: string;
    returnedtypecode: string;
    fetchxml: string;
    layoutxml: string;
    querytype: number; // 0 = Personal, 1 = Team, 2 = Organization
    description?: string;
}

// Custom queries (local storage + future: Dataverse sync)
export interface CustomQuery {
    id: string; // UUID
    name: string;
    entityName: string;
    description?: string;
    filters: AdvancedFilterCondition[];
    sorts: SortConfig[];
    columns: string[];
    relatedEntities?: RelatedEntityFilter[];
    pageSize: number;
    createdDate: Date;
    modifiedDate: Date;
    tags?: string[];
}

export interface RelatedEntityFilter {
    entityName: string;
    relationshipName: string;
    linkType: 'inner' | 'left' | 'outer';
    linkFromAttribute: string;
    linkToAttribute: string;
    alias: string;
    filters?: AdvancedFilterCondition[];
    columns?: string[];
}
```

### Enhanced Filter Model

```typescript
export interface AdvancedFilterCondition {
    id: string;
    field: string;
    operator: FilterOperator;
    value?: any;
    value2?: any; // For "between" operator
    logicalOperator: 'AND' | 'OR';
    fieldType: AttributeType;
}

export type FilterOperator =
    // String operators
    | 'equals' | 'notEquals' | 'contains' | 'notContains'
    | 'startsWith' | 'endsWith' | 'null' | 'notNull'
    // Numeric operators
    | 'greaterThan' | 'greaterOrEqual' | 'lessThan' | 'lessOrEqual' | 'between'
    // Date operators
    | 'on' | 'onOrBefore' | 'onOrAfter' | 'today' | 'yesterday' | 'tomorrow'
    | 'lastWeek' | 'thisWeek' | 'nextWeek' | 'last7Days' | 'next7Days'
    | 'lastMonth' | 'thisMonth' | 'nextMonth' | 'last30Days' | 'next30Days'
    | 'lastYear' | 'thisYear' | 'nextYear' | 'lastXDays' | 'nextXDays'
    // Lookup operators
    | 'equalsLookup' | 'notEqualsLookup' | 'containsLookup' | 'underUser' | 'underBusinessUnit'
    // Picklist operators
    | 'equalsPicklist' | 'notEqualsPicklist' | 'in' | 'notIn'
    // Boolean operators
    | 'equalsBoolean';

export enum AttributeType {
    String = 'string',
    Integer = 'integer',
    Decimal = 'decimal',
    Money = 'money',
    DateTime = 'datetime',
    Boolean = 'boolean',
    Lookup = 'lookup',
    Customer = 'customer',
    Owner = 'owner',
    Picklist = 'picklist',
    State = 'state',
    Status = 'status',
    MultiSelectPicklist = 'multiselectpicklist',
    Memo = 'memo',
    Virtual = 'virtual'
}
```

---

## Service Methods

### DataverseQueryService (Enhancements)

**Existing methods we'll use:**
- ✅ `getEntities()` - List all entities
- ✅ `getEntityViews()` - Get savedquery and userquery
- ✅ `executeFetchXml()` - Execute FetchXML
- ✅ `queryRecords()` - Execute OData query
- ✅ `queryNextPage()` - Pagination

**New methods required:**
```typescript
// Get entity attributes for filter builder
async getEntityAttributes(
    environmentId: string,
    entityName: string
): Promise<AttributeMetadata[]>

// Get relationship metadata
async getEntityRelationships(
    environmentId: string,
    entityName: string
): Promise<RelationshipMetadata[]>

// Get picklist options
async getPicklistOptions(
    environmentId: string,
    entityName: string,
    attributeName: string
): Promise<PicklistOption[]>

// Lookup search (for lookup filter values)
async searchLookupRecords(
    environmentId: string,
    entityName: string,
    searchTerm: string,
    maxResults?: number
): Promise<LookupValue[]>
```

### Custom Query Persistence Service

```typescript
export class CustomQueryService {
    private storageKey = 'dataExplorer.customQueries';

    async saveCustomQuery(query: CustomQuery): Promise<void> {
        const queries = await this.loadCustomQueries();
        const existingIndex = queries.findIndex(q => q.id === query.id);

        if (existingIndex >= 0) {
            queries[existingIndex] = { ...query, modifiedDate: new Date() };
        } else {
            queries.push({ ...query, createdDate: new Date(), modifiedDate: new Date() });
        }

        await this.stateService.saveWorkspaceState(this.storageKey, queries);
    }

    async loadCustomQueries(): Promise<CustomQuery[]> {
        return await this.stateService.getWorkspaceState(this.storageKey) || [];
    }

    async deleteCustomQuery(queryId: string): Promise<void> {
        const queries = await this.loadCustomQueries();
        const filtered = queries.filter(q => q.id !== queryId);
        await this.stateService.saveWorkspaceState(this.storageKey, filtered);
    }

    async searchCustomQueries(searchTerm: string, entityName?: string): Promise<CustomQuery[]> {
        const queries = await this.loadCustomQueries();
        return queries.filter(q => {
            const matchesEntity = !entityName || q.entityName === entityName;
            const matchesSearch = !searchTerm ||
                q.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                q.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
            return matchesEntity && matchesSearch;
        });
    }
}
```

### FetchXML Generation Service

```typescript
export class FetchXmlGenerationService {

    generateFromCustomQuery(query: CustomQuery): string {
        let xml = `<fetch version="1.0" output-format="xml-platform" mapping="logical">\n`;
        xml += `  <entity name="${query.entityName}">\n`;

        // Add columns
        if (query.columns && query.columns.length > 0) {
            query.columns.forEach(col => {
                xml += `    <attribute name="${col}" />\n`;
            });
        } else {
            xml += `    <all-attributes />\n`;
        }

        // Add filters
        if (query.filters && query.filters.length > 0) {
            xml += this.generateFilterGroup(query.filters, '    ');
        }

        // Add related entities
        if (query.relatedEntities && query.relatedEntities.length > 0) {
            query.relatedEntities.forEach(rel => {
                xml += this.generateLinkEntity(rel, '    ');
            });
        }

        // Add sorts
        if (query.sorts && query.sorts.length > 0) {
            query.sorts.forEach(sort => {
                const desc = sort.direction === 'desc' ? ' descending="true"' : '';
                xml += `    <order attribute="${sort.column}"${desc} />\n`;
            });
        }

        xml += `  </entity>\n`;
        xml += `</fetch>`;

        return xml;
    }

    private generateFilterGroup(filters: AdvancedFilterCondition[], indent: string): string {
        let xml = `${indent}<filter type="and">\n`;

        filters.forEach(filter => {
            xml += this.generateCondition(filter, indent + '  ');
        });

        xml += `${indent}</filter>\n`;
        return xml;
    }

    private generateCondition(filter: AdvancedFilterCondition, indent: string): string {
        const operator = this.mapOperatorToFetchXml(filter.operator);

        if (filter.operator === 'null' || filter.operator === 'notNull') {
            return `${indent}<condition attribute="${filter.field}" operator="${operator}" />\n`;
        }

        if (filter.operator === 'between' && filter.value && filter.value2) {
            return `${indent}<condition attribute="${filter.field}" operator="${operator}" value="${filter.value}" value2="${filter.value2}" />\n`;
        }

        if (filter.operator === 'contains' || filter.operator === 'notContains') {
            const value = `%${filter.value}%`;
            return `${indent}<condition attribute="${filter.field}" operator="${operator}" value="${value}" />\n`;
        }

        return `${indent}<condition attribute="${filter.field}" operator="${operator}" value="${filter.value}" />\n`;
    }

    private generateLinkEntity(rel: RelatedEntityFilter, indent: string): string {
        let xml = `${indent}<link-entity name="${rel.entityName}" from="${rel.linkFromAttribute}" to="${rel.linkToAttribute}" alias="${rel.alias}" link-type="${rel.linkType}">\n`;

        if (rel.columns) {
            rel.columns.forEach(col => {
                xml += `${indent}  <attribute name="${col}" />\n`;
            });
        }

        if (rel.filters && rel.filters.length > 0) {
            xml += this.generateFilterGroup(rel.filters, indent + '  ');
        }

        xml += `${indent}</link-entity>\n`;
        return xml;
    }

    private mapOperatorToFetchXml(operator: FilterOperator): string {
        const map: Record<FilterOperator, string> = {
            'equals': 'eq',
            'notEquals': 'ne',
            'contains': 'like',
            'notContains': 'not-like',
            'startsWith': 'begins-with',
            'endsWith': 'ends-with',
            'greaterThan': 'gt',
            'greaterOrEqual': 'ge',
            'lessThan': 'lt',
            'lessOrEqual': 'le',
            'null': 'null',
            'notNull': 'not-null',
            'between': 'between',
            'on': 'on',
            'onOrBefore': 'on-or-before',
            'onOrAfter': 'on-or-after',
            'today': 'today',
            'yesterday': 'yesterday',
            'tomorrow': 'tomorrow',
            'lastWeek': 'last-week',
            'thisWeek': 'this-week',
            'nextWeek': 'next-week',
            'last7Days': 'last-x-days', // Need to add value=7
            'next7Days': 'next-x-days', // Need to add value=7
            'lastMonth': 'last-month',
            'thisMonth': 'this-month',
            'nextMonth': 'next-month',
            'last30Days': 'last-x-days', // value=30
            'next30Days': 'next-x-days', // value=30
            'lastYear': 'last-year',
            'thisYear': 'this-year',
            'nextYear': 'next-year',
            'in': 'in',
            'notIn': 'not-in',
            'equalsLookup': 'eq',
            'notEqualsLookup': 'ne',
            'containsLookup': 'like',
            'underUser': 'eq-userid',
            'underBusinessUnit': 'eq-businessid',
            'equalsPicklist': 'eq',
            'notEqualsPicklist': 'ne',
            'equalsBoolean': 'eq'
        };

        return map[operator] || 'eq';
    }
}
```

---

## FilterPanel Enhancements

### Extended Configuration

```typescript
export interface DataExplorerFilterPanelConfig extends FilterPanelConfig {
    entityName: string;
    entityMetadata: EntityMetadata; // Full entity metadata

    // Field type handlers
    fieldTypeHandlers: Map<AttributeType, FieldTypeHandler>;

    // Advanced features
    supportRelatedEntityFilters: boolean;
    maxFilterConditions: number; // Default: 25
    maxRelatedEntityDepth: number; // Default: 3

    // Lookup search
    lookupSearchEnabled: boolean;
    lookupSearchMinChars: number; // Default: 2

    // Date helpers
    showDateHelpers: boolean; // Show "Last 7 days", "This month", etc.
}

export interface FieldTypeHandler {
    attributeType: AttributeType;
    supportedOperators: FilterOperator[];
    inputRenderer: (config: FilterInputConfig) => string;
    valueValidator: (value: any) => boolean;
    valueFormatter: (value: any) => string;
}

export interface FilterInputConfig {
    filterId: string;
    fieldName: string;
    currentValue: any;
    metadata: AttributeMetadata;
    onChange: (value: any) => void;
}
```

### Field Type Handler Implementations

**String Field Handler:**
```html
<input type="text"
       id="filter-${filterId}-value"
       value="${currentValue || ''}"
       placeholder="Enter value..."
       class="filter-value-input"
       onchange="updateFilterValue('${filterId}', this.value)" />
```

**Integer/Decimal Field Handler:**
```html
<input type="number"
       id="filter-${filterId}-value"
       value="${currentValue || ''}"
       step="${fieldType === 'decimal' ? '0.01' : '1'}"
       class="filter-value-input"
       onchange="updateFilterValue('${filterId}', parseFloat(this.value))" />
```

**DateTime Field Handler:**
```html
<div class="date-filter-input">
    <input type="date"
           id="filter-${filterId}-value"
           value="${currentValue || ''}"
           class="filter-value-input"
           onchange="updateFilterValue('${filterId}', this.value)" />

    <!-- OR -->

    <select id="filter-${filterId}-relative"
            class="filter-relative-date"
            onchange="updateFilterValue('${filterId}', this.value)">
        <option value="">Select relative date...</option>
        <option value="today">Today</option>
        <option value="yesterday">Yesterday</option>
        <option value="last7Days">Last 7 Days</option>
        <option value="last30Days">Last 30 Days</option>
        <option value="thisWeek">This Week</option>
        <option value="thisMonth">This Month</option>
        <option value="lastYear">Last Year</option>
    </select>
</div>
```

**Boolean Field Handler:**
```html
<select id="filter-${filterId}-value"
        class="filter-value-input"
        onchange="updateFilterValue('${filterId}', this.value === 'true')">
    <option value="">Select...</option>
    <option value="true">Yes</option>
    <option value="false">No</option>
</select>
```

**Lookup Field Handler (with search):**
```html
<div class="lookup-filter-input">
    <input type="text"
           id="filter-${filterId}-search"
           placeholder="Search ${entityDisplayName}..."
           class="lookup-search-input"
           oninput="debounceLookupSearch('${filterId}', this.value)" />

    <div id="filter-${filterId}-results" class="lookup-search-results" style="display: none;">
        <!-- Populated dynamically with search results -->
    </div>

    <input type="hidden"
           id="filter-${filterId}-value"
           value="${selectedLookupId || ''}" />

    <div id="filter-${filterId}-selected" class="lookup-selected-value">
        ${selectedLookupName || 'No value selected'}
        ${selectedLookupName ? '<button class="clear-lookup" onclick="clearLookupValue(\\'${filterId}\\')">×</button>' : ''}
    </div>
</div>
```

**Picklist Field Handler:**
```html
<select id="filter-${filterId}-value"
        class="filter-value-input"
        onchange="updateFilterValue('${filterId}', parseInt(this.value))">
    <option value="">Select...</option>
    ${picklistOptions.map(opt => `
        <option value="${opt.value}">${opt.label}</option>
    `).join('')}
</select>
```

---

## Export Implementation

### Export Service

```typescript
export class DataExportService {

    async exportToJson(
        data: any[],
        columns: string[],
        options: ExportOptions
    ): Promise<string> {
        const filteredData = this.filterDataByColumns(data, columns, options);
        const indent = options.prettyPrint ? 2 : 0;
        return JSON.stringify(filteredData, null, indent);
    }

    async exportToCsv(
        data: any[],
        columns: string[],
        options: ExportOptions
    ): Promise<string> {
        if (data.length === 0) return '';

        // Build header row
        const headers = columns.map(col => this.escapeCsvValue(col));
        let csv = headers.join(',') + '\n';

        // Build data rows
        data.forEach(record => {
            const values = columns.map(col => {
                let value = record[col];

                // Handle null/undefined
                if (value === null || value === undefined) {
                    return '';
                }

                // Use formatted value if available (for lookups, picklistsoptions, dates)
                const formattedKey = `${col}@OData.Community.Display.V1.FormattedValue`;
                if (record[formattedKey]) {
                    value = record[formattedKey];
                }

                // Handle objects (convert to JSON string)
                if (typeof value === 'object') {
                    value = JSON.stringify(value);
                }

                return this.escapeCsvValue(value.toString());
            });

            csv += values.join(',') + '\n';
        });

        return csv;
    }

    private filterDataByColumns(
        data: any[],
        columns: string[],
        options: ExportOptions
    ): any[] {
        return data.map(record => {
            const filtered: any = {};

            columns.forEach(col => {
                const value = record[col];

                // Skip null values if option set
                if (!options.includeNulls && (value === null || value === undefined)) {
                    return;
                }

                filtered[col] = value;

                // Include formatted values
                const formattedKey = `${col}@OData.Community.Display.V1.FormattedValue`;
                if (options.includeFormattedValues && record[formattedKey]) {
                    filtered[formattedKey] = record[formattedKey];
                }
            });

            // Include @odata metadata if requested
            if (options.includeMetadata) {
                Object.keys(record).forEach(key => {
                    if (key.startsWith('@odata')) {
                        filtered[key] = record[key];
                    }
                });
            }

            return filtered;
        });
    }

    private escapeCsvValue(value: string): string {
        // If value contains comma, quote, or newline, wrap in quotes and escape quotes
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }

    async saveToFile(content: string, filename: string, format: 'json' | 'csv'): Promise<void> {
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(filename),
            filters: {
                'JSON Files': ['json'],
                'CSV Files': ['csv'],
                'All Files': ['*']
            }
        });

        if (uri) {
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
            vscode.window.showInformationMessage(`Data exported to ${uri.fsPath}`);
        }
    }
}

export interface ExportOptions {
    prettyPrint: boolean;
    includeNulls: boolean;
    includeMetadata: boolean;
    includeFormattedValues: boolean;
}
```

---

## Performance Optimizations

### Pagination Strategy

```typescript
interface PaginationConfig {
    pageSize: number; // 50 default
    currentPage: number;
    totalRecords?: number; // May not be available until all pages loaded
    hasMore: boolean;
    nextLink?: string;
}

// Load with pagination
async loadDataWithPagination(
    environmentId: string,
    fetchXml: string,
    pageSize: number
): Promise<QueryResult> {
    // Add paging info to FetchXML
    const pagedFetchXml = this.addPagingToFetchXml(fetchXml, 1, pageSize);

    const result = await this.queryService.executeFetchXml(environmentId, pagedFetchXml);

    return {
        value: result.value,
        hasMore: result['@odata.nextLink'] !== undefined,
        nextLink: result['@odata.nextLink'],
        pagingCookie: result['@Microsoft.Dynamics.CRM.fetchxmlpagingcookie']
    };
}

private addPagingToFetchXml(fetchXml: string, page: number, pageSize: number, pagingCookie?: string): string {
    // Parse FetchXML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(fetchXml, 'text/xml');
    const fetchNode = xmlDoc.getElementsByTagName('fetch')[0];

    // Add paging attributes
    fetchNode.setAttribute('page', page.toString());
    fetchNode.setAttribute('count', pageSize.toString());

    if (pagingCookie) {
        fetchNode.setAttribute('paging-cookie', pagingCookie);
    }

    // Serialize back to string
    const serializer = new XMLSerializer();
    return serializer.serializeToString(xmlDoc);
}
```

### Large Export Warning

```typescript
async exportWithWarning(recordCount: number): Promise<boolean> {
    if (recordCount > 5000) {
        const result = await vscode.window.showWarningMessage(
            `You are about to export ${recordCount.toLocaleString()} records. This may take several minutes and consume significant memory.`,
            { modal: true },
            'Continue',
            'Cancel'
        );

        return result === 'Continue';
    }
    return true;
}

async exportLargeDataset(
    environmentId: string,
    fetchXml: string,
    format: 'json' | 'csv'
): Promise<void> {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Exporting data...',
        cancellable: true
    }, async (progress, token) => {
        let allRecords: any[] = [];
        let page = 1;
        let hasMore = true;
        let pagingCookie: string | undefined;

        while (hasMore && !token.isCancellationRequested) {
            const result = await this.loadPage(environmentId, fetchXml, page, 5000, pagingCookie);

            allRecords = allRecords.concat(result.value);
            hasMore = result.hasMore;
            pagingCookie = result.pagingCookie;
            page++;

            progress.report({
                message: `Loaded ${allRecords.length} records...`,
                increment: hasMore ? 0 : 100
            });
        }

        if (token.isCancellationRequested) {
            throw new Error('Export cancelled');
        }

        // Export collected records
        const content = format === 'json'
            ? await this.exportService.exportToJson(allRecords, [], { ...defaultOptions })
            : await this.exportService.exportToCsv(allRecords, [], { ...defaultOptions });

        await this.exportService.saveToFile(content, `export-${Date.now()}.${format}`, format);
    });
}
```

---

## State Persistence

### Panel State Structure

```typescript
export interface DataExplorerPanelState {
    selectedEnvironmentId: string;
    selectedEntityName?: string;
    selectedViewId?: string;
    selectedViewType?: 'system' | 'personal' | 'custom';
    customQueryId?: string;

    // Column configuration
    visibleColumns: string[];
    columnOrder: string[];
    columnWidths: Record<string, number>;

    // Pagination
    pageSize: number;
    currentPage: number;

    // Sorting
    sortConfig: SortConfig[];

    // Filters (if custom query)
    filterState?: {
        filters: AdvancedFilterCondition[];
        relatedEntityFilters: RelatedEntityFilter[];
    };

    // Last query timestamp
    lastQueryTimestamp: number;
}

// Save on significant actions
private async savePanelState(): Promise<void> {
    const state: DataExplorerPanelState = {
        selectedEnvironmentId: this._selectedEnvironmentId!,
        selectedEntityName: this.selectedEntityName,
        selectedViewId: this.selectedView?.id,
        selectedViewType: this.getViewType(this.selectedView),
        customQueryId: this.selectedView?.type === 'custom' ? this.selectedView.id : undefined,
        visibleColumns: this.dataTableComponent.getVisibleColumns(),
        columnOrder: this.dataTableComponent.getColumnOrder(),
        columnWidths: this.dataTableComponent.getColumnWidths(),
        pageSize: this.dataTableComponent.getPageSize(),
        currentPage: this.dataTableComponent.getCurrentPage(),
        sortConfig: this.dataTableComponent.getSortConfig(),
        lastQueryTimestamp: Date.now()
    };

    await this._stateService.savePanelState(DataExplorerPanel.viewType, state);
}

// Restore on panel open
private async restorePanelState(): Promise<void> {
    const state = await this._stateService.getPanelState<DataExplorerPanelState>(DataExplorerPanel.viewType);

    if (state) {
        // Restore environment
        if (state.selectedEnvironmentId) {
            this.environmentSelectorComponent.setSelectedEnvironment(state.selectedEnvironmentId);
        }

        // Restore entity and view
        if (state.selectedEntityName) {
            await this.loadEntity(state.selectedEntityName);

            if (state.selectedViewId) {
                await this.loadView(state.selectedViewId, state.selectedViewType);
            }
        }

        // Restore table configuration
        if (this.dataTableComponent) {
            this.dataTableComponent.setVisibleColumns(state.visibleColumns);
            this.dataTableComponent.setColumnOrder(state.columnOrder);
            this.dataTableComponent.setColumnWidths(state.columnWidths);
            this.dataTableComponent.setPageSize(state.pageSize);
            this.dataTableComponent.setSortConfig(state.sortConfig);
        }
    }
}
```

---

## Implementation Phases (Detailed)

### Phase 1: MVP (v0.2.0) - 2-3 weeks

**Week 1:**
- ✅ EntitySelectorComponent implementation
- ✅ ViewSelectorComponent (System Views only)
- ✅ Basic FilterPanel integration
- ✅ DataTable display with existing component

**Week 2:**
- ✅ FetchXML execution from system views
- ✅ Column visibility management
- ✅ Pagination (50 default)
- ✅ Basic export to JSON

**Week 3:**
- ✅ Export to CSV
- ✅ State persistence
- ✅ Error handling & validation
- ✅ Testing & bug fixes

**Deliverables:**
- Data Explorer panel with basic query execution
- System view browsing and execution
- Export to JSON/CSV (visible columns)
- State persistence across sessions

### Phase 2: Advanced Queries (v0.3.0) - 3-4 weeks

**Week 1:**
- ✅ Personal views (UserQuery) support
- ✅ Enhanced FilterPanel for all field types
- ✅ Date operator implementations

**Week 2:**
- ✅ Custom query builder UI
- ✅ Custom query persistence (local storage)
- ✅ Query search and management

**Week 3:**
- ✅ Related entity filtering (1 level)
- ✅ Lookup field search
- ✅ Picklist filtering

**Week 4:**
- ✅ Export all columns option
- ✅ Export all records (with warnings)
- ✅ Testing & refinement

**Deliverables:**
- Personal view support
- Complete custom query builder
- Saved custom queries
- Related entity filtering
- Enhanced export options

### Phase 3: Stretch Goals (v0.4.0+) - Variable timeline

**High Priority:**
- ⭐ Multi-level related entity queries (2-3 levels)
- ⭐ Query sharing (export/import as JSON)
- ⭐ Integration with Plugin Trace Viewer

**Medium Priority:**
- ⭐ Aggregation functions (COUNT, SUM, AVG)
- ⭐ Excel export with formatting
- ⭐ Quick actions on records (copy ID, open in browser)

**Future Enhancements:**
- ⭐ Query performance metrics
- ⭐ Data visualization/charts
- ⭐ Bulk data operations
- ⭐ Cross-environment data comparison

---

## Testing Strategy

### Unit Tests

```typescript
describe('FetchXmlGenerationService', () => {
    it('should generate FetchXML with filters', () => {
        const query: CustomQuery = {
            entityName: 'contact',
            filters: [
                { field: 'firstname', operator: 'contains', value: 'John' }
            ],
            columns: ['firstname', 'lastname', 'emailaddress1']
        };

        const fetchXml = service.generateFromCustomQuery(query);

        expect(fetchXml).toContain('<entity name="contact">');
        expect(fetchXml).toContain('<attribute name="firstname" />');
        expect(fetchXml).toContain('<condition attribute="firstname" operator="like" value="%John%" />');
    });
});

describe('DataExportService', () => {
    it('should export data to CSV with proper escaping', async () => {
        const data = [
            { name: 'Test, Inc.', email: 'test@example.com' },
            { name: 'Quote"Company', email: 'quote@example.com' }
        ];

        const csv = await service.exportToCsv(data, ['name', 'email'], {});

        expect(csv).toContain('"Test, Inc."');
        expect(csv).toContain('"Quote""Company"');
    });
});
```

### Integration Tests

```typescript
describe('DataExplorerPanel Integration', () => {
    it('should load system views and execute query', async () => {
        // Select entity
        await panel.selectEntity('contact');

        // Load views
        const views = await panel.loadViews();
        expect(views.length).toBeGreaterThan(0);

        // Select view
        const activeContactsView = views.find(v => v.name === 'Active Contacts');
        await panel.selectView(activeContactsView!);

        // Execute query
        const results = await panel.executeQuery();
        expect(results.value.length).toBeGreaterThan(0);
    });
});
```

---

## Success Criteria

### MVP Release (Phase 1)
- ✅ 100% of system views executable
- ✅ Export to JSON/CSV functional
- ✅ Pagination working with 50/page default
- ✅ Column show/hide working
- ✅ State persistence across sessions
- ✅ Zero critical bugs

### Full Release (Phase 2)
- ✅ Personal views supported
- ✅ Custom query builder functional
- ✅ All field types supported in filters
- ✅ Related entity filtering (1 level)
- ✅ Export all columns/records
- ✅ Query save/load working
- ✅ Performance: < 2s for queries under 1000 records

### Stretch Goals (Phase 3)
- ⭐ Multi-level related entities (3 levels)
- ⭐ Plugin Trace Viewer integration
- ⭐ Query sharing (import/export)
- ⭐ Aggregation functions
- ⭐ Performance: < 5s for queries under 10,000 records

---

## References

- [Dataverse FetchXML Reference](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/fetchxml/overview)
- [Dataverse Web API Query Data](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api)
- [Advanced Find User Guide](https://learn.microsoft.com/en-us/power-apps/user/advanced-find)
- [QueryExpression Class](https://learn.microsoft.com/en-us/dotnet/api/microsoft.xrm.sdk.query.queryexpression)
- [FetchXML Schema](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/fetchxml/reference/schema)
