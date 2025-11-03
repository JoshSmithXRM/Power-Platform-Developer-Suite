# Plugin Trace Viewer - Requirements Document

## Overview
The Plugin Trace Viewer is a diagnostic and monitoring tool for viewing, filtering, analyzing, and managing Dataverse plugin execution traces. It provides developers with detailed insights into plugin behavior, performance, and errors.

---

## Core Entities

### 1. PluginTrace (Domain Entity)
A record of a single plugin execution captured by Dataverse.

**Properties:**
- `id` (plugintracelogid) - Unique identifier
- `createdOn` - Timestamp when trace was created
- `pluginName` (typename) - Fully qualified plugin class name
- `entityName` (primaryentity) - Entity the plugin operated on
- `messageName` - CRM message that triggered the plugin
- `operationType` - Type of operation (1=Plugin, 2=Workflow)
- `mode` - Execution mode (0=Synchronous, 1=Asynchronous)
- `stage` - Pipeline stage (not available in API, defaults to 0)
- `depth` - Call depth in the execution pipeline
- `duration` (performanceexecutionduration) - Execution time in milliseconds
- `constructorDuration` (performanceconstructorduration) - Constructor time in milliseconds
- `exceptionDetails` - Stack trace and error information (if failed)
- `messageBlock` - Custom trace messages logged by plugin
- `configuration` - Non-secure configuration string
- `secureConfiguration` - Secure configuration string
- `correlationId` - Groups related traces in a transaction
- `requestId` - Unique request identifier
- `pluginStepId` - Reference to the plugin step registration
- `persistenceKey` - Internal Dataverse key

**Computed Properties:**
- `status` - Derived from exceptionDetails (Success/Exception)
- `hasException` - Boolean derived from exceptionDetails
- `performanceDetails` - Formatted string combining execution + constructor duration

**Business Rules:**
- A trace with empty exceptionDetails is considered successful
- Related traces share the same correlationId
- Depth indicates nested plugin calls (depth > 1 means called from another plugin)
- Duration includes total execution time; constructor duration is separate

---

## Core Use Cases

### UC-1: View Plugin Traces
**Actor:** Developer
**Description:** Load and display plugin traces from a Dataverse environment with filtering and sorting.

**Flow:**
1. User selects environment
2. System queries current trace level setting
3. System loads traces (default: last 100, most recent first)
4. System displays traces in sortable table
5. User can apply filters to refine results
6. User can sort by any column
7. User can search within loaded results

**Filters Available:**
- **Quick Filters:**
  - Exception Only (traces with errors)
  - Last Hour
  - Last 24 Hours
  - Today
- **Advanced Filters:**
  - Plugin Name (contains, equals, startsWith, endsWith)
  - Entity Name (contains, equals, startsWith)
  - Message (contains, equals)
  - Duration (>, <, >=, <=, between)
  - Start Time (>, <, >=, <=, between)
  - Depth (equals, >, <)
  - Mode (equals: Sync/Async)
  - Correlation ID (equals, contains)
  - Exception Details (contains, isNotNull, isNull)

**Filter Logic:**
- Quick filters combine with AND
- Advanced filters support AND/OR operators between conditions
- Quick + Advanced combine with AND
- Maximum 10 advanced filter conditions

**Business Rules:**
- Default limit: 100 traces (configurable via top parameter)
- Default sort: created date descending
- Empty results show helpful message
- Filters persist across sessions (saved to preferences)

---

### UC-2: View Trace Details
**Actor:** Developer
**Description:** Inspect detailed information about a specific trace execution.

**Flow:**
1. User clicks a trace row in the table
2. System opens detail panel (split view)
3. System displays trace details in tabbed interface
4. System loads related traces by correlation ID
5. User can switch between tabs to view different aspects

**Detail Tabs:**

#### Configuration Tab
- General Information:
  - System Created (yes/no)
  - Type Name (plugin class)
  - Message Name
  - Primary Entity
  - Configuration (non-secure)
  - Secure Configuration
  - Persistence Key
  - Operation Type
  - Plugin Step ID
- Context Information:
  - Depth
  - Mode (Sync/Async)
  - Correlation ID
  - Request ID

#### Execution Tab
- Performance:
  - Execution Start Time (formatted)
  - Execution Duration (ms)
  - Message Block (custom plugin logs)
- Exception Details (if present):
  - Full stack trace
  - Error messages
  - Formatted as code block

#### Timeline Tab
- Visual timeline showing all traces with same correlation ID
- Traces ordered chronologically
- Each trace shows:
  - Status indicator (success/exception)
  - Plugin name
  - Duration
  - Depth
- Click trace in timeline to switch to that trace
- Empty state if no correlation ID

#### Related Tab
- List of all traces with same correlation ID
- Excludes current trace
- Each item shows:
  - Status indicator
  - Plugin name
  - Message name
  - Duration
  - Depth
- Click to view that trace
- Empty state if no related traces

#### Raw Data Tab
- JSON viewer showing complete trace object
- All Dataverse fields included
- Collapsible/expandable tree view
- **IMPORTANT:** This JSON viewer component must be reusable (needed in 3+ panels)

**Business Rules:**
- Detail panel opens on right side (split layout)
- Split ratio is adjustable and persists
- Detail panel closes when switching environments
- Timeline only renders if correlation ID exists
- Related traces must share exact correlation ID (case-sensitive)

---

### UC-3: Manage Trace Level
**Actor:** Developer
**Description:** Configure the organization-wide plugin trace logging level.

**Trace Levels:**
- **Off (0):** No traces captured
- **Exception (1):** Only traces with exceptions captured
- **All (2):** All plugin executions captured

**Flow:**
1. User opens Plugin Trace Viewer
2. System queries current trace level from Dataverse organization settings
3. System displays current level in action bar dropdown
4. User selects new trace level
5. System updates organization setting via PATCH request
6. System shows confirmation
7. System auto-refreshes traces after 1 second

**Warnings:**
- When switching environments with "All" enabled:
  - Prompt: "Plugin traces are currently set to 'All' in the previous environment. This can impact performance. Turn off traces before switching?"
  - Options: Turn Off & Switch | Keep Enabled & Switch | Cancel
- When closing panel with "All" enabled:
  - Prompt: "Plugin traces were set to 'All' in the environment. This can impact performance. Turn off traces?"
  - Options: Turn Off | Keep Enabled

**Business Rules:**
- Trace level is environment-specific (organization setting)
- "All" level can significantly impact performance in production
- Setting trace level requires appropriate Dataverse permissions
- Changes take effect immediately for new plugin executions

---

### UC-4: Delete Traces
**Actor:** Developer
**Description:** Remove trace records to free up storage and improve query performance.

**Delete Operations:**

#### Delete Single Trace
1. User right-clicks trace row
2. User selects "Delete Trace" from context menu
3. System shows confirmation dialog
4. User confirms
5. System deletes via DELETE request
6. System refreshes trace list

#### Delete All Traces
1. User clicks Delete dropdown in action bar
2. User selects "Delete All Traces..."
3. System shows modal confirmation with count
4. User confirms "Delete All"
5. System:
   - Fetches all trace IDs
   - Deletes in batches of 100 using OData $batch API
   - Shows progress
6. System displays deleted count
7. System refreshes trace list

#### Delete Old Traces
1. User clicks Delete dropdown in action bar
2. User selects "Delete Old Traces..."
3. System prompts for age threshold (default: 30 days)
4. User enters number of days
5. System shows confirmation with threshold
6. User confirms
7. System:
   - Fetches trace IDs older than threshold
   - Deletes in batches of 100 using OData $batch API
   - Shows progress
8. System displays deleted count
9. System refreshes trace list

**Business Rules:**
- All delete operations are irreversible (show warnings)
- Batch deletes use OData $batch API (max 100 per batch for safety)
- Failed batch deletes continue to next batch (resilience)
- Delete operations require appropriate Dataverse permissions
- Deleted traces are permanently removed from Dataverse

---

### UC-5: Export Traces
**Actor:** Developer
**Description:** Export currently loaded/filtered traces to file for external analysis.

**Export Formats:**

#### CSV Export
- Headers: All PluginTraceLog properties
- Column order: Logical grouping (ID, timing, execution, context, details)
- CSV escaping: Proper handling of quotes, commas, newlines
- Filename: `plugin-traces-{environmentId}-{timestamp}.csv`

#### JSON Export
- Format: Pretty-printed JSON array
- Contains: All properties from currently loaded traces
- Filename: `plugin-traces-{environmentId}-{timestamp}.json`

**Flow:**
1. User clicks Export dropdown in action bar
2. User selects format (CSV or JSON)
3. System validates data exists
4. System shows save dialog with default filename
5. User chooses location and filename
6. System writes file
7. System shows confirmation with path

**Business Rules:**
- Exports only currently loaded data (respects filters)
- Empty results show warning (no export)
- Export is client-side operation (no server upload)
- Timestamp in filename uses ISO format with safe characters
- File encoding: UTF-8

---

### UC-6: Auto-Refresh Traces
**Actor:** Developer
**Description:** Automatically reload traces at regular intervals for live monitoring.

**Refresh Intervals:**
- Paused (0 seconds) - No auto-refresh
- Every 10 seconds
- Every 30 seconds
- Every 60 seconds

**Flow:**
1. User clicks Auto-Refresh dropdown
2. User selects interval
3. System:
   - Saves preference
   - Updates button label
   - Starts/stops interval timer
4. System automatically reloads traces at interval
5. System preserves current filters during refresh

**Business Rules:**
- Auto-refresh setting persists across sessions
- Auto-refresh stops when switching environments
- Auto-refresh respects current filter settings
- Default: Paused
- Only one interval timer active at a time

---

### UC-7: Search Within Loaded Traces
**Actor:** Developer
**Description:** Client-side text search across all loaded trace data.

**Flow:**
1. User enters search term in table search box
2. System filters visible rows client-side
3. System updates row count
4. User clears search to see all rows again

**Search Fields:**
- Plugin Name
- Entity Name
- Message Name
- Exception Details (if present)
- Correlation ID
- All text fields

**Business Rules:**
- Search is case-insensitive
- Search is client-side only (does not re-query Dataverse)
- Search applies after server-side filters
- Empty search shows all loaded rows

---

### UC-8: Context Menu Actions
**Actor:** Developer
**Description:** Quick access to common actions via right-click menu.

**Available Actions:**
1. **View Details** - Opens detail panel for trace
2. **Open in Dynamics** - Opens trace record in Dataverse UI (external browser)
3. **Copy Trace ID** - Copies plugintracelogid to clipboard
4. **Copy Correlation ID** - Copies correlationid to clipboard
5. **Show Related** - Filters table to show only traces with same correlation ID
6. **Show in Timeline** - Opens detail panel and switches to Timeline tab
7. **Delete Trace** - Deletes single trace with confirmation

**Business Rules:**
- Context menu available on all trace rows
- Open in Dynamics constructs URL: `{baseUrl}/main.aspx?pagetype=entityrecord&etn=plugintracelog&id={traceId}`
- Copy actions show toast notification
- Show Related applies advanced filter for correlationid

---

## Data Sources

### Dataverse API Endpoints

#### Get Plugin Traces
```
GET {dataverseUrl}/api/data/v9.2/plugintracelogs
  ?$select=plugintracelogid,createdon,operationtype,...
  &$filter={odataFilter}
  &$orderby=createdon desc
  &$top=100
```

#### Get Organization Trace Level
```
GET {dataverseUrl}/api/data/v9.2/organizations
  ?$select=plugintracelogsetting
```

#### Set Organization Trace Level
```
PATCH {dataverseUrl}/api/data/v9.2/organizations({organizationId})
Content-Type: application/json
{
  "plugintracelogsetting": 2
}
```

#### Delete Single Trace
```
DELETE {dataverseUrl}/api/data/v9.2/plugintracelogs({traceId})
```

#### Delete Multiple Traces (Batch)
```
POST {dataverseUrl}/api/data/v9.2/$batch
Content-Type: multipart/mixed; boundary=batch_{timestamp}

--batch_{timestamp}
Content-Type: multipart/mixed; boundary=changeset_{timestamp}

--changeset_{timestamp}
Content-Type: application/http
Content-ID: 1

DELETE {dataverseUrl}/api/data/v9.2/plugintracelogs({traceId1}) HTTP/1.1

--changeset_{timestamp}
Content-Type: application/http
Content-ID: 2

DELETE {dataverseUrl}/api/data/v9.2/plugintracelogs({traceId2}) HTTP/1.1

--changeset_{timestamp}--
--batch_{timestamp}--
```

---

## UI Components

### Main Layout
```
┌─────────────────────────────────────────────────────┐
│ Action Bar                                          │
│ [Refresh] [Export ▼] [Delete ▼] [Trace Level ▼]   │
│ [Auto-Refresh ▼]                                    │
├─────────────────────────────────────────────────────┤
│ Environment Selector                                │
│ [Environment Dropdown ▼]                            │
├─────────────────────────────────────────────────────┤
│ Filters                                             │
│ ▼ [Exception Only] [Last Hour] [Last 24h] [Today]  │
│   + Add Condition [Field ▼] [Operator ▼] [Value]   │
│   [Apply Filters] [Clear All]                       │
├─────────────────────────────────────────────────────┤
│ Trace Table                     │ Detail Panel      │
│                                 │                   │
│ [Search...]                     │ [Tabs]            │
│                                 │                   │
│ Status | Started | Duration ... │ [Content]         │
│ ●      | 10:30   | 125ms    ... │                   │
│ ⚠      | 10:25   | 3.2s     ... │                   │
│                                 │                   │
│                                 │                   │
└─────────────────────────────────┴───────────────────┘
```

### Table Columns
1. **Status** - Badge (Success/Exception) with colored indicator
2. **Started** - Formatted date/time
3. **Duration** - Formatted duration (ms, s, or m:s)
4. **Operation** - Plugin/Workflow
5. **Plugin** - Full typename (long, main identifier)
6. **Step** - Plugin step ID
7. **Depth** - Numeric depth indicator
8. **Mode** - Sync/Async
9. **Message** - Message name
10. **Entity** - Primary entity name

### Component Reusability
**JSON Viewer Component** must be abstracted for reuse in:
1. Plugin Trace Viewer (Raw Data tab)
2. Solution Explorer (future)
3. Any panel needing to display structured data

Requirements for abstraction:
- Component: JsonViewerComponent
- Input: JSON object/array
- Features: Collapsible tree, syntax highlighting, copy to clipboard
- Styling: VS Code theme-aware
- No panel-specific dependencies
- Clean interface: `JsonViewerComponent.setData(object)`

---

## State Management

### Instance State (Per Panel Instance)
- `selectedEnvironmentId` - Currently selected environment
- Persisted to: Workspace state
- Restored on: Panel reopen

### Preferences (Per Environment)
- `splitRatio` - Detail panel width percentage (default: 50%)
- `rightPanelVisible` - Detail panel visibility (default: false)
- `filterPanelCollapsed` - Filter panel collapsed state (default: false)
- `filters` - Active quick and advanced filters (default: empty)
- `autoRefreshIntervalSeconds` - Auto-refresh interval (default: 0 = paused)
- Persisted to: Workspace state keyed by environment ID
- Restored on: Environment selection

---

## Performance Considerations

1. **Trace Query Limits**
   - Default: 100 traces per query
   - Prevents overwhelming UI and API
   - User can adjust via top parameter if needed

2. **Batch Delete Safety**
   - Batch size: 100 (Dataverse supports 1000 but 100 is safer)
   - Continue on batch failure (resilience)
   - Show progress for large deletions

3. **Client-Side Search**
   - Search only loaded data (no re-query)
   - Fast for <1000 rows
   - Use virtual scrolling if needed (future enhancement)

4. **Auto-Refresh Impact**
   - Minimum interval: 10 seconds
   - Stop on environment switch
   - User controls interval

5. **Trace Level Warning**
   - "All" level impacts production performance
   - Warn when switching environments
   - Warn when closing panel

---

## Error Handling

### API Errors
- Show user-friendly error messages
- Log technical details to output channel
- Specific messages for:
  - Authentication failures
  - Permission errors
  - Network errors
  - Invalid OData filters

### Validation Errors
- Filter value validation (e.g., dates, numbers)
- Empty result set handling
- Missing required fields

### Graceful Degradation
- Timeline unavailable if no correlation ID
- Related traces empty if no matches
- Export disabled if no data loaded

---

## Accessibility

- Keyboard navigation for all controls
- Screen reader support for table
- Focus management in detail panel
- ARIA labels for icon-only buttons
- Color-blind friendly status indicators (icons + colors)

---

## Future Enhancements (Out of Scope)

- Virtual scrolling for 1000+ traces
- Trace comparison (side-by-side)
- Performance analytics dashboard
- Export to Excel with charts
- Scheduled trace cleanup jobs
- Real-time trace streaming (WebSocket)
- Trace replay/debugging tools

---

## Success Criteria

1. User can view last 100 traces in <2 seconds
2. Filters apply and load results in <3 seconds
3. Detail panel opens instantly (client-side)
4. Export works for up to 10,000 traces
5. Delete all traces completes for 1000+ traces
6. Auto-refresh works reliably for hours
7. UI remains responsive during all operations
8. State persists correctly across sessions
9. No data loss or corruption
10. Clear error messages for all failure scenarios
