# Data Panel Suite Requirements

## Overview

Build 4 panels for managing Power Platform data with consistent UX:
1. **Solution Explorer** - View solutions in environment
2. **Import Job Viewer** - Monitor solution imports
3. **Environment Variables** - Manage and export environment variables
4. **Connection References** - Manage and export connection references

---

## Common Requirements (All Panels)

### Standard UI Components
- Environment selector (dropdown) - from environment setup
- "Open in Maker" button (top-level action)
- Data table with:
  - Search box (searches all columns, filters displayed rows)
  - Sortable columns (click header to sort)
  - Loading state
  - Error state
- Refresh button
- Context menu on table rows (right-click for row-specific actions)

### Data Fetching Pattern
1. Fetch ALL data from environment (no server-side filtering)
2. If solution filtering: fetch solution component IDs, filter client-side
3. Client-side search/sort in presentation layer

### Open in Maker URLs
Each panel has a base maker URL constructed from:
- Environment ID (from environment setup)
- Panel-specific path/parameters
- **User will provide URL patterns later**

### Row Actions Pattern
**Context menus (right-click)** are used for row-specific actions across all panels.

**Rationale:**
- Consistent with VS Code UX patterns (file explorer, editor, etc.)
- Target audience (admins, devs, power users) expects right-click for actions
- Clean UI without visual clutter
- Efficient for power users (muscle memory)
- Scales well (can add more actions without UI redesign)

---

## Panel 1: Solution Explorer

### Purpose
View all solutions in the selected environment.

### UI Components
- Environment selector
- "Open in Maker" button (opens solutions list in maker)
- Data table with columns:
  - Solution Name (Friendly Name)
  - Unique Name
  - Version
  - Publisher
  - Managed/Unmanaged
  - Installed Date
  - Description
- **Row actions** (right-click context menu):
  - "Open in Maker" (opens this solution in maker)
  - "Open in Dynamics" (opens this solution in classic UI)
- Refresh button
- Search (all columns)
- Sort (all columns)

### API Endpoints

**Get Solutions:**
```
GET /api/data/v9.2/solutions
?$select=solutionid,uniquename,friendlyname,version,ismanaged,_publisherid_value,installedon,description
&$expand=publisherid($select=friendlyname)
&$orderby=friendlyname
```

**Response Structure:**
```json
{
  "value": [
    {
      "solutionid": "guid",
      "uniquename": "string",
      "friendlyname": "string",
      "version": "1.0.0.0",
      "ismanaged": true,
      "_publisherid_value": "guid",
      "publisherid": {
        "friendlyname": "Publisher Name"
      },
      "installedon": "2023-01-01T00:00:00Z",
      "description": "string"
    }
  ]
}
```

### Domain Model

**Solution Entity:**
- Id (GUID)
- UniqueName (string)
- FriendlyName (string)
- Version (string)
- IsManaged (boolean)
- PublisherId (GUID)
- PublisherName (string)
- InstalledOn (DateTime, nullable)
- Description (string)

**Behavior Methods:**
- `getMakerUrl(environmentId: string): string` - construct maker URL for this solution
- `getDynamicsUrl(environmentId: string): string` - construct classic URL for this solution

### Business Rules
- Solutions should be sorted by friendly name by default
- "Default" solution (if present) should appear first
- Managed/unmanaged should be clearly distinguished

---

## Panel 2: Import Job Viewer

### Purpose
Monitor solution import jobs and view import logs.

### UI Components
- Environment selector
- Solution selector (optional filtering) - filter to imports for specific solution
- "Open in Maker" button (opens solution import history page)
- Data table with columns:
  - Solution Name
  - Progress (percentage)
  - Status (Completed/Failed/In Progress)
  - Started
  - Completed
  - Duration (computed from started/completed)
  - Error Message (if failed, extracted from XML)
- **Row actions** (right-click context menu):
  - "View Import Log" - opens XML in VS Code editor with syntax highlighting
  - "Refresh This Job" (optional) - refresh single row status
- Refresh button (refreshes all)
- Search (all columns)
- Sort (all columns)

### API Endpoints

**Get Import Jobs:**
```
GET /api/data/v9.2/importjobs
?$select=importjobid,name,progress,data,startedon,completedon
&$expand=createdby($select=fullname)
&$orderby=startedon desc
```

**Response Structure:**
```json
{
  "value": [
    {
      "importjobid": "guid",
      "name": "Solution Name",
      "progress": 100.0,
      "data": "<xml>...</xml>",
      "startedon": "2023-01-01T00:00:00Z",
      "completedon": "2023-01-01T00:05:00Z",
      "createdby": {
        "fullname": "User Name"
      }
    }
  ]
}
```

### Domain Model

**ImportJob Entity:**
- Id (GUID)
- SolutionName (string)
- Progress (number, 0-100)
- Status (enum: Completed, Failed, InProgress) - computed from progress/completion
- StartedOn (DateTime)
- CompletedOn (DateTime, nullable)
- Duration (computed) - formatted duration string
- ErrorMessage (string, nullable) - extracted from XML data field
- ImportLogXml (string) - raw XML from data field
- CreatedBy (string)

**Behavior Methods:**
- `getStatus(): ImportJobStatus` - determines status from progress/data
- `getDuration(): string` - formats duration nicely (e.g., "5m 30s")
- `parseErrorMessage(): string | null` - extracts error message from XML data
- `getMakerUrl(environmentId: string): string` - construct maker URL for import history

**Status Determination Logic:**
- Completed: has completedOn AND progress = 100
- Failed: has completedOn AND progress < 100, OR started but no progress
- In Progress: has startedOn, no completedOn, progress > 0

### XML Viewer Pattern

**Requirement:** Open import log XML in VS Code editor with syntax highlighting

**Implementation Pattern (from old code):**
```typescript
const document = await vscode.workspace.openTextDocument({
    content: xmlData,  // importLogXml from ImportJob
    language: 'xml'
});
await vscode.window.showTextDocument(document);
```

**Notes:**
- XML data is already in memory (from importjob.data field)
- VS Code automatically provides syntax highlighting when language='xml'
- Creates untitled document in editor (not saved to file)
- User can save if they want to keep it

### Business Rules
- Import jobs should be sorted by started date (newest first) by default
- Progress should show up to 4 decimal places (e.g., 99.9999%)
- Duration should only show if job has completed
- Error messages should be parsed from XML for failed jobs

---

## Panel 3: Environment Variables

### Purpose
View environment variables, filter by solution, export deployment settings.

### UI Components
- Environment selector
- Solution selector (optional filtering)
- "Open in Maker" button (opens environment variables page)
- Data table with columns:
  - Schema Name
  - Display Name
  - Type (String/Number/Boolean/JSON/DataSource)
  - Current Value
  - Default Value
  - Is Managed
  - Modified On
  - Modified By
- Action buttons:
  - "Sync Deployment Settings" button - export to JSON file
- **Row actions** (right-click context menu - optional):
  - "Copy Value" - copy effective value to clipboard
  - "View Details" (future) - show full details in side panel
- Refresh button
- Search (all columns)
- Sort (all columns)

### API Endpoints

**Get Environment Variable Definitions:**
```
GET /api/data/v9.2/environmentvariabledefinitions
?$select=environmentvariabledefinitionid,displayname,schemaname,type,ismanaged,modifiedon,defaultvalue
&$expand=modifiedby($select=fullname)
```

**Get Environment Variable Values:**
```
GET /api/data/v9.2/environmentvariablevalues
?$select=environmentvariablevalueid,_environmentvariabledefinitionid_value,value,modifiedon
&$expand=modifiedby($select=fullname)
```

**Get Solution Component IDs (if filtering):**
```
1. GET /api/data/v9.2/EntityDefinitions?$filter=LogicalName eq 'environmentvariabledefinition'&$select=ObjectTypeCode
   - Returns ObjectTypeCode (typically ~380)
2. GET /api/data/v9.2/solutioncomponents?$filter=_solutionid_value eq '<solutionId>' and componenttype eq <objectTypeCode>
   - Returns array of solution components with objectid field (environment variable definition IDs)
```

**Response Structures:**

Definitions:
```json
{
  "value": [
    {
      "environmentvariabledefinitionid": "guid",
      "displayname": "CDR Audience ID",
      "schemaname": "et_CDRAudienceId",
      "type": 100000000,
      "ismanaged": false,
      "modifiedon": "2023-01-01T00:00:00Z",
      "defaultvalue": "default-value",
      "modifiedby": {
        "fullname": "User Name"
      }
    }
  ]
}
```

Values:
```json
{
  "value": [
    {
      "environmentvariablevalueid": "guid",
      "_environmentvariabledefinitionid_value": "guid",
      "value": "actual-value",
      "modifiedon": "2023-01-01T00:00:00Z",
      "modifiedby": {
        "fullname": "User Name"
      }
    }
  ]
}
```

### Domain Model

**EnvironmentVariable Entity:**
- Id (GUID) - environmentvariabledefinitionid
- SchemaName (string, unique identifier)
- DisplayName (string)
- Type (enum: String=100000000, Number=100000001, Boolean=100000002, JSON=100000003, DataSource=100000004)
- CurrentValue (string, nullable) - from value entity
- DefaultValue (string, nullable) - from definition entity
- IsManaged (boolean)
- ModifiedOn (DateTime)
- ModifiedBy (string)

**Behavior Methods:**
- `getEffectiveValue(): string` - returns CurrentValue if set, else DefaultValue
- `getTypeDisplayName(): string` - converts enum to friendly name (String, Number, etc.)
- `isInSolution(solutionComponentIds: Set<string>): boolean` - check if this variable is in solution
- `toDeploymentSettingsEntry(): {SchemaName: string, Value: string}` - convert to deployment settings format

**Type Enum Values:**
- 100000000 = String
- 100000001 = Number
- 100000002 = Boolean
- 100000003 = JSON
- 100000004 = Data Source

### Data Processing Logic

1. Fetch definitions and values in parallel
2. Join on environmentvariabledefinitionid
3. Create EnvironmentVariable entities with both definition and value data
4. If solution filtering:
   - Fetch ObjectTypeCode for 'environmentvariabledefinition'
   - Fetch solution component objectids for that type
   - Filter variables where Id is in the component IDs set
5. Sort by SchemaName (ascending, alphabetical)

### Deployment Settings Export

**Action:** "Sync Deployment Settings" button

**Behavior:**
1. Prompt user to select/create deployment settings file:
   - Suggest filename: `{SolutionUniqueName}.deploymentsettings.json`
   - Allow browsing for existing file or creating new file
2. Read existing file if it exists
3. Sync EnvironmentVariables section:
   - Add entries for variables in filtered view that aren't in file
   - Remove entries in file that aren't in filtered view
   - Preserve existing Value for entries that remain
   - Sort alphabetically by SchemaName
4. Write updated JSON to file
5. Show success message with counts: "Synced deployment settings: 5 added, 2 removed, 10 updated"

### Business Rules
- Effective value = CurrentValue ?? DefaultValue
- Display "Type" as friendly name, not enum value
- Solution filtering is optional (null = show all)
- Deployment settings MUST be sorted alphabetically for source control diffs

---

## Panel 4: Connection References

### Purpose
View flows and connection references, understand relationships, export deployment settings.

### UI Components
- Environment selector
- Solution selector (optional filtering)
- "Open in Maker" button (opens flows page)
- Data table with columns:
  - Flow Name
  - Connection Reference Name
  - Connector Type
  - Connection ID
  - Is Managed
  - Modified On
  - Modified By
  - Relationship Type (flow-to-cr / orphaned-flow / orphaned-cr)
- Action buttons:
  - "Sync Deployment Settings" button - export to JSON file
- **Row actions** (right-click context menu - optional):
  - "View Details" (future) - show full details in side panel
- Refresh button
- Search (all columns)
- Sort (all columns)

### API Endpoints

**Get Cloud Flows:**
```
GET /api/data/v9.2/workflows
?$filter=category eq 5
&$select=workflowid,name,clientdata,modifiedon,ismanaged
&$expand=modifiedby($select=fullname)
```

**Get Connection References:**
```
GET /api/data/v9.2/connectionreferences
?$select=connectionreferenceid,connectionreferencelogicalname,connectionreferencedisplayname,connectorid,connectionid,modifiedon,ismanaged
&$expand=modifiedby($select=fullname)
```

**Get Solution Component IDs (if filtering):**
```
1. Get ObjectTypeCode for 'connectionreference' (typically ~10161)
2. Get ObjectTypeCode for 'subscription' (cloud flows, typically ~29)
3. Fetch solution components for both types
```

**Response Structures:**

Flows:
```json
{
  "value": [
    {
      "workflowid": "guid",
      "name": "Flow Name",
      "clientdata": "{\"properties\":{\"connectionReferences\":{...}}}",
      "modifiedon": "2023-01-01T00:00:00Z",
      "ismanaged": false,
      "modifiedby": {
        "fullname": "User Name"
      }
    }
  ]
}
```

Connection References:
```json
{
  "value": [
    {
      "connectionreferenceid": "guid",
      "connectionreferencelogicalname": "et_shared_azuread_abc123",
      "connectionreferencedisplayname": "Azure AD Connection",
      "connectorid": "/providers/Microsoft.PowerApps/apis/shared_azuread",
      "connectionid": "4e7c481d43ff440682130dfad5ba9497",
      "modifiedon": "2023-01-01T00:00:00Z",
      "ismanaged": false,
      "modifiedby": {
        "fullname": "User Name"
      }
    }
  ]
}
```

### Domain Model

**CloudFlow Entity:**
- Id (GUID) - workflowid
- Name (string)
- ClientData (string, JSON blob)
- IsManaged (boolean)
- ModifiedOn (DateTime)
- ModifiedBy (string)

**Behavior Methods:**
- `extractConnectionReferenceNames(): string[]` - parse clientdata JSON to extract connection reference logical names
- `isInSolution(solutionComponentIds: Set<string>): boolean` - check if flow is in solution

**ClientData JSON Structure (for parsing):**
```json
{
  "properties": {
    "connectionReferences": {
      "shared_azuread": {
        "connection": {
          "connectionReferenceLogicalName": "et_shared_azuread_abc123"
        }
      }
    }
  }
}
```

**ConnectionReference Entity:**
- Id (GUID) - connectionreferenceid
- LogicalName (string, unique identifier) - connectionreferencelogicalname
- DisplayName (string) - connectionreferencedisplayname
- ConnectorId (string) - e.g., "/providers/Microsoft.PowerApps/apis/shared_commondataservice"
- ConnectionId (string, nullable) - actual connection GUID
- IsManaged (boolean)
- ModifiedOn (DateTime)
- ModifiedBy (string)
- FlowIds (string[]) - array of flow IDs that use this connection reference

**Behavior Methods:**
- `isInSolution(solutionComponentIds: Set<string>): boolean` - check if connection reference is in solution
- `toDeploymentSettingsEntry(): {LogicalName: string, ConnectionId: string, ConnectorId: string}` - convert to deployment settings format

**FlowConnectionRelationship Value Object:**
Represents the relationship between a flow and connection reference for display in table.

- FlowId (GUID, nullable)
- FlowName (string, nullable)
- ConnectionReferenceId (GUID, nullable)
- ConnectionReferenceLogicalName (string, nullable)
- ConnectorType (string, nullable)
- ConnectionId (string, nullable)
- RelationshipType (enum: 'flow-to-cr' | 'orphaned-flow' | 'orphaned-cr')
- IsManaged (boolean)
- ModifiedOn (DateTime)
- ModifiedBy (string)

**Relationship Types:**
- `flow-to-cr` - Normal relationship: flow exists, connection reference exists, flow uses the connection reference
- `orphaned-flow` - Flow exists but has no connection references
- `orphaned-cr` - Connection reference exists but no flows use it

### Data Processing Logic

**Complex Multi-Step Process:**

1. **Fetch data in parallel:**
   - All cloud flows
   - All connection references

2. **Parse flow clientdata:**
   - For each flow, parse the clientdata JSON
   - Extract array of connection reference logical names
   - Handle parsing errors gracefully (log, skip invalid JSON)

3. **Build flow-to-connection-reference mapping:**
   - For each flow, match extracted connection reference names to actual connection reference entities (case-insensitive)
   - Store flow IDs on matched connection reference entities

4. **If solution filtering:**
   - Fetch ObjectTypeCode for 'subscription' (flows)
   - Fetch ObjectTypeCode for 'connectionreference'
   - Fetch solution component objectids for both types
   - Filter flows where Id is in flow component IDs
   - Filter connection references where Id is in connection reference component IDs

5. **Build relationships array:**
   - For each flow with connection references: create 'flow-to-cr' relationships
   - For each flow without connection references: create 'orphaned-flow' relationship
   - For each connection reference with no flows: create 'orphaned-cr' relationship

6. **Sort:**
   - Primary: FlowName (alphabetical, nulls last)
   - Secondary: ConnectionReferenceLogicalName (alphabetical)

### Deployment Settings Export

**Action:** "Sync Deployment Settings" button

**Behavior:**
1. Prompt user to select/create deployment settings file:
   - Suggest filename: `{SolutionUniqueName}.deploymentsettings.json`
   - Allow browsing for existing file or creating new file
2. Read existing file if it exists
3. Sync ConnectionReferences section:
   - Extract unique connection references from relationships (ignore flows)
   - Add entries for connection references in filtered view that aren't in file
   - Remove entries in file that aren't in filtered view
   - Preserve existing ConnectionId for entries that remain
   - Sort alphabetically by LogicalName
4. Write updated JSON to file
5. Show success message with counts: "Synced deployment settings: 3 added, 1 removed, 8 updated"

### Business Rules
- Connection reference matching is case-insensitive
- Orphaned items should still be displayed (helps identify cleanup opportunities)
- Solution filtering filters both flows AND connection references independently
- Deployment settings MUST be sorted alphabetically for source control diffs

---

## Deployment Settings File Format

**File Naming Convention:** `{SolutionUniqueName}.deploymentsettings.json`

**JSON Schema:**
```json
{
  "EnvironmentVariables": [
    {
      "SchemaName": "prefix_VariableName",
      "Value": "value"
    }
  ],
  "ConnectionReferences": [
    {
      "LogicalName": "prefix_ConnectionRefName",
      "ConnectionId": "guid",
      "ConnectorId": "/providers/Microsoft.PowerApps/apis/shared_connector"
    }
  ]
}
```

**Requirements:**
- Arrays MUST be sorted alphabetically (SchemaName for EnvVars, LogicalName for ConnRefs)
- JSON should be formatted with 4-space indentation
- Both sections must exist (empty arrays if no items)

**Sync Behavior:**
- **Add:** Items in filtered view but not in file
- **Remove:** Items in file but not in filtered view
- **Preserve:** Items in both file and filtered view keep their existing values (don't overwrite with current environment values)
- **Sort:** Always sort alphabetically after sync

**Example:**
```json
{
  "EnvironmentVariables": [
    {
      "SchemaName": "et_CDRAudienceId",
      "Value": "0305c9a5-741d-4a78-bb65-5d620a0866e9"
    },
    {
      "SchemaName": "et_EnvironmentAPIRoleURL",
      "Value": "https://etsfssbx.crm.dynamics.com/api/data/v9.1/roles"
    }
  ],
  "ConnectionReferences": [
    {
      "LogicalName": "et_shared_azuread_eccc3f3e8663ee11be6e00224823fb46",
      "ConnectionId": "4e7c481d43ff440682130dfad5ba9497",
      "ConnectorId": "/providers/Microsoft.PowerApps/apis/shared_azuread"
    },
    {
      "LogicalName": "et_shared_commondataservice_8ad6ee901544ed11bba200224823fb46",
      "ConnectionId": "a792290b5b65423cb40541cd13fd1578",
      "ConnectorId": "/providers/Microsoft.PowerApps/apis/shared_commondataservice"
    }
  ]
}
```

---

## Repository Interfaces (Domain Layer Contracts)

These interfaces define the contracts that infrastructure implementations must fulfill.

### ISolutionRepository
```typescript
interface ISolutionRepository {
  findAll(environmentId: string): Promise<Solution[]>;
}
```

### IImportJobRepository
```typescript
interface IImportJobRepository {
  findAll(environmentId: string): Promise<ImportJob[]>;
}
```

### IEnvironmentVariableRepository
```typescript
interface IEnvironmentVariableRepository {
  findAllDefinitions(environmentId: string): Promise<EnvironmentVariableDefinition[]>;
  findAllValues(environmentId: string): Promise<EnvironmentVariableValue[]>;
}
```

### IConnectionReferenceRepository
```typescript
interface IConnectionReferenceRepository {
  findAll(environmentId: string): Promise<ConnectionReference[]>;
}
```

### ICloudFlowRepository
```typescript
interface ICloudFlowRepository {
  findAll(environmentId: string): Promise<CloudFlow[]>;
}
```

### ISolutionComponentRepository
```typescript
interface ISolutionComponentRepository {
  // Get ObjectTypeCode for an entity logical name
  getObjectTypeCode(environmentId: string, entityLogicalName: string): Promise<number | null>;

  // Get object IDs for components of a specific type in a solution
  findComponentIdsBySolution(
    environmentId: string,
    solutionId: string,
    entityLogicalName: string
  ): Promise<string[]>;
}
```

### IDeploymentSettingsRepository
```typescript
interface IDeploymentSettingsRepository {
  read(filePath: string): Promise<DeploymentSettings>;
  write(filePath: string, settings: DeploymentSettings): Promise<void>;
  promptForFilePath(suggestedName?: string): Promise<string | undefined>;
}
```

### IEditorService (Infrastructure)
```typescript
interface IEditorService {
  // Open XML content in VS Code editor with syntax highlighting
  openXmlInNewTab(content: string, title?: string): Promise<void>;
}
```

---

## Use Case Requirements (Application Layer Orchestration)

Use cases orchestrate domain entities and repositories. They contain NO business logic - only coordination.

### ListSolutionsUseCase
**Input:** environmentId (string)
**Process:** Fetch all solutions, ensure Default is first
**Output:** Solution[]

### ListImportJobsUseCase
**Input:** environmentId (string), solutionId (string | null)
**Process:**
1. Fetch all import jobs
2. Parse XML to extract error messages (entity method)
3. Calculate status (entity method)
4. If solutionId: filter to jobs for that solution (match by name)
5. Sort by started date (newest first)
**Output:** ImportJob[]

### OpenImportLogInEditorUseCase
**Input:** importJob (ImportJob)
**Process:**
1. Get XML from importJob.ImportLogXml
2. Use IEditorService to open in VS Code with syntax highlighting
**Output:** void (side effect: opens editor)

### ListEnvironmentVariablesUseCase
**Input:** environmentId (string), solutionId (string | null)
**Process:**
1. Fetch definitions and values in parallel
2. Join on environmentvariabledefinitionid
3. Create EnvironmentVariable entities
4. If solutionId:
   - Fetch solution component IDs for 'environmentvariabledefinition'
   - Filter variables using entity.isInSolution() method
5. Sort by SchemaName
**Output:** EnvironmentVariable[]

### ExportEnvironmentVariablesToDeploymentSettingsUseCase
**Input:** environmentVariables (EnvironmentVariable[]), solutionUniqueName (string)
**Process:**
1. Prompt user for file path (suggest `${solutionUniqueName}.deploymentsettings.json`)
2. Read existing deployment settings
3. Convert environment variables to deployment settings entries (entity method)
4. Sync EnvironmentVariables section (add/remove/preserve)
5. Sort alphabetically by SchemaName
6. Write to file
7. Return sync result
**Output:** SyncResult {added: number, removed: number, updated: number, filePath: string}

### ListConnectionReferencesUseCase
**Input:** environmentId (string), solutionId (string | null)
**Process:**
1. Fetch flows and connection references in parallel
2. Parse flow clientdata to extract connection reference names (entity method)
3. Match flows to connection references (case-insensitive)
4. Build relationship records
5. If solutionId:
   - Fetch solution component IDs for 'subscription' and 'connectionreference'
   - Filter flows and connection references using entity.isInSolution() methods
6. Sort by FlowName then ConnectionReferenceLogicalName
**Output:** FlowConnectionRelationship[]

### ExportConnectionReferencesToDeploymentSettingsUseCase
**Input:** relationships (FlowConnectionRelationship[]), solutionUniqueName (string)
**Process:**
1. Prompt user for file path (suggest `${solutionUniqueName}.deploymentsettings.json`)
2. Read existing deployment settings
3. Extract unique connection references from relationships
4. Convert connection references to deployment settings entries (entity method)
5. Sync ConnectionReferences section (add/remove/preserve)
6. Sort alphabetically by LogicalName
7. Write to file
8. Return sync result
**Output:** SyncResult {added: number, removed: number, updated: number, filePath: string}

---

## Shared Infrastructure Requirements

### BaseDataPanel (Abstract Base Class)

**Purpose:** Common functionality for all data panels

**Provides:**
- Environment selector component management
- Loading state management
- Error handling and display
- Refresh functionality
- "Open in Maker" button (calls abstract getMakerUrl())
- State management (selected environment)

**Abstract Methods:**
- `loadData(): Promise<void>` - subclass implements data loading
- `getMakerUrl(): string` - subclass implements maker URL construction

### BaseTablePanel extends BaseDataPanel (Abstract Base Class)

**Purpose:** Common functionality for panels with data tables

**Provides:**
- Everything from BaseDataPanel
- Optional solution selector component
- Data table component with search/sort
- Table action button area
- Context menu handling

**Abstract Methods:**
- `loadData(): Promise<void>` - subclass implements data loading
- `filterBySolution(solutionId: string | null): void` - subclass implements solution filtering
- `getMakerUrl(): string` - subclass implements maker URL construction

### Data Table Minimum Requirements

**Search:**
- Search box above table
- Searches ALL columns (convert values to strings, case-insensitive contains)
- Filters displayed rows (no backend call)
- Clear button to reset search

**Sort:**
- Click column header to sort by that column
- Toggle: first click = ascending, second click = descending, third click = back to default
- Show sort indicator (arrow icon) on active column
- Sorts currently filtered/searched data

**Row Actions:**
- Context menu on right-click
- Menu items configurable per panel
- Pass row data to action handlers
- Consistent with VS Code patterns (file explorer, editor)

**Not Required for v1:**
- Multi-column sort
- Column visibility toggle
- Column reordering
- Export to CSV
- Pagination (load all data, handle client-side)
- Inline editing

---

## Business Rules and Validation

### General Rules
- All timestamps should be displayed in user's local time zone
- Empty/null values should display as empty string or "N/A" as appropriate
- Long text fields should truncate with ellipsis in table view
- Loading states should show immediately on user action
- Errors should show user-friendly messages (not raw API errors)

### Solution Explorer
- Default solution must appear first in list
- Version should display full 4-part version (1.0.0.0)

### Import Job Viewer
- Jobs should default sort by started date (newest first)
- Progress should show max 4 decimal places
- Duration should only show for completed jobs
- Failed jobs should clearly indicate failure

### Environment Variables
- Effective value = CurrentValue ?? DefaultValue
- Type display names must be human-readable
- Schema names are unique identifiers (use these for deployment settings)

### Connection References
- Logical names are unique identifiers (use these for deployment settings)
- Connector IDs should display full path
- Orphaned items should be visible (not hidden)

### Deployment Settings
- MUST sort alphabetically for consistent source control diffs
- Preserve existing values during sync (don't overwrite with environment values)
- Show clear feedback: "5 added, 2 removed, 10 preserved"

---

## Error Handling Requirements

### API Errors
- Network failures: "Unable to connect to environment. Check your connection."
- Authentication failures: "Authentication failed. Please reconnect."
- Authorization failures: "You don't have permission to view this data."
- 404 errors: "Resource not found."
- 500 errors: "Server error. Please try again later."

### Data Processing Errors
- JSON parsing failures: Log error, skip item, continue processing
- Missing required fields: Use safe defaults, log warning
- Invalid data types: Validate and handle gracefully

### User Action Errors
- No environment selected: "Please select an environment first."
- No solution selected (when required): "Please select a solution first."
- File operation failures: "Unable to save file: {error message}"

---

## Performance Considerations

### Data Fetching
- Use parallel API calls wherever possible (Promise.all)
- Fetch ALL data once, filter client-side (don't refetch on filter change)
- Cache solution component IDs per solution (don't refetch on each panel load)

### UI Responsiveness
- Show loading states immediately on user action
- Use debouncing for search input (300ms)
- Virtualize table rows if row count > 1000 (optional enhancement)

### Memory
- Don't keep duplicate copies of data
- Clean up component references on dispose
- Use Set for O(1) lookups in filtering

---

## Testing Considerations

### Unit Testing
- Domain entity behavior (especially clientdata parsing, status calculation)
- Use case orchestration logic (mocked repositories)
- Deployment settings sync logic (file operations)

### Integration Testing
- API repository implementations (against test environment)
- File system operations (temp directory)
- VS Code editor integration (open XML)

### End-to-End Testing
- Full panel workflows with real environment
- Solution filtering accuracy
- Export functionality with various data sets

---

## Questions for User (To Be Answered Later)

1. **Maker URL patterns** - Provide URL templates for:
   - Solution Explorer → Maker solutions page: `https://{environment}/...`
   - Import Job Viewer → Maker import history page: `https://{environment}/...`
   - Environment Variables → Maker env vars page: `https://{environment}/...`
   - Connection References → Maker flows page: `https://{environment}/...`
   - Per-solution "Open in Maker": `https://{environment}/.../{solutionId}`
   - Per-solution "Open in Dynamics": `https://{environment}/.../{solutionId}`

2. **Import job error parsing** - If error messages need special parsing logic beyond simple XML extraction

---

## Success Criteria

### Functional Requirements
- All 4 panels display correct data from selected environment
- Search filters all columns correctly
- Sort works on all columns
- Solution filtering works correctly (EnvVars, ConnRefs, Import Jobs)
- Deployment settings export works correctly (add/remove/preserve)
- Import log opens in VS Code with XML syntax highlighting
- "Open in Maker" buttons work for all panels
- Row actions (context menu or buttons) work correctly

### Non-Functional Requirements
- Clean architecture maintained (domain has zero dependencies)
- Business logic in domain entities, not use cases or panels
- Error handling for all API calls
- Loading states for all async operations
- User feedback for all actions
- Performance: data loads in < 5 seconds for typical environment
- Memory: handles environments with 1000+ items without issues

### Documentation Requirements
- API endpoints documented
- Domain model documented
- Repository interfaces documented
- Use cases documented
- Deployment settings format documented

---

## Out of Scope (Future Enhancements)

These are explicitly NOT required for initial release:

- Edit environment variable values
- Create new environment variables or connection references
- Delete items
- Bulk operations
- Advanced table features (multi-column sort, pagination, column config)
- Compare deployment settings across environments
- Deploy settings to target environment (apply deployment settings)
- Validation beyond basic type checking
- Offline mode / caching
- Real-time updates / polling
- Export to CSV
- Import from CSV
