# Metadata Browser - Presentation Requirements (MVP)

## Overview
The Metadata Browser provides a focused, power-user interface for exploring Dataverse metadata including entities (tables), attributes, relationships, keys, privileges, and global choice sets (option sets).

**Target Audience:** Developers, administrators, and power users who are comfortable with keyboard shortcuts, text selection, and technical workflows.

---

## UI Layout

### Three-Panel Responsive Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Open in Maker] [Refresh]     [Environment Selector ▾]              │
├──────────┬──────────────────────────────────┬───────────────────────┤
│ TREE     │ CENTER PANEL                     │ DETAIL PANEL          │
│          │                                  │ (hidden by default)   │
│ Search   │ [Attributes][Keys][Rels][Privs]  │                       │
│ ┌──────┐ │                                  │ Attribute: name  [×]  │
│ │📋 acc│ │ ATTRIBUTES TABLE                 │                       │
│ │🏷️ cus│ │ ┌──────────────────────────┐    │ [Properties][Raw Data]│
│ │📋 con│ │ │Display Name | Logical... │    │                       │
│ └──────┘ │ │Account Name | name       │    │ Shows full metadata   │
│          │ │Click=select, DblClick=...│    │ for selected item     │
│ [◀]      │ └──────────────────────────┘    │                       │
└──────────┴──────────────────────────────────┴───────────────────────┘
```

**Panel Sizes:**
- Left: 280px (collapsible to 0px)
- Center: Flexible width
- Right: Resizable split panel (default 30%, min 400px, hidden by default)

---

## Top Controls

### Action Bar
Two buttons positioned on the left:

**Open in Maker**
- **When nothing selected:** Opens `/environments/{envId}/entities` (tables list page)
- **When entity selected:** Opens `/environments/{envId}/entities/{metadataId}` (specific entity page)
- **When choice selected:** Disabled (no Maker page for global choices)

**Refresh**
- **When nothing selected:** Disabled
- **When entity/choice selected:** Enabled
  - Refreshes environment list
  - Reloads current entity/choice metadata
  - Shows loading spinner on button
  - Shows "Refreshing metadata..." in tables
  - Success feedback: Toast notification "Entity metadata refreshed" or "Choice metadata refreshed"

### Environment Selector
- Dropdown showing list of configured environments
- Auto-selects last used environment on panel open
- Includes refresh button for environment list
- Positioned on the right side of action bar

---

## Left Sidebar (Entity/Choice Tree)

### Search/Filter
- Text input placeholder: "Search tables and choices..."
- Filters tree items by display name or logical name (case-insensitive)
- Real-time filtering as user types
- Shows/hides tree items with CSS (no reload)

### Tree Structure
Two sections with headers:
- **TABLES** - All Dataverse entities
- **CHOICES** - All global option sets

**Tree Item Format:**
```
[Icon] Display Name (logical_name)
```

**Icons:**
- 🏷️ Custom entity/choice
- 📋 System entity
- 🔽 Global choice

**Interaction:**
- Click item → Loads metadata in center panel
- Selected item → Highlighted background
- Hover → Hover background

### Collapse Button
- Positioned at left edge, vertically centered
- Toggles sidebar visibility
- Icon: ◀ (expanded) / ▶ (collapsed)
- Accessible (aria-label)

---

## Center Panel

### Tab Bar (Entity Mode)
When entity is selected, shows four tabs:
```
[Attributes] [Keys] [Relationships] [Privileges]
```

**Behavior:**
- Attributes tab selected by default on first load
- Tab selection persists when switching entities via tree
- Tab selection resets to Attributes when navigating via related entity link
- Selected tab saved to workspace state (persists across sessions)

### Tab Bar (Choice Mode)
When choice is selected, shows single tab:
```
[Choice Values]
```

### Selection Header
Above the tab bar:
```
Selected: Account (account)
```
- Shows display name and logical name
- Updates when selection changes
- Default: "None selected"

### Data Tables

Each tab contains a DataTable component showing metadata for the selected entity/choice.

**Common Table Features:**
- Sortable columns (click header)
- Searchable (search box above table)
- Footer with row count
- Loading states ("Loading..." spinner)
- Empty state ("No data available")

**Row Interaction:**
- **Single-click** → Selects row (enables copy/paste of any cell)
- **Double-click** → Opens detail panel on right
- **Enter key** (row focused) → Opens detail panel
- **Display Name hyperlink** → Opens detail panel (quick single-click option)

---

### Tab: Attributes

**Columns:**
| Column | Description | Sortable | Filterable | Notes |
|--------|-------------|----------|------------|-------|
| Display Name | Attribute display name | ✓ | ✓ | Hyperlink to open detail |
| Logical Name | Attribute logical name | ✓ | ✓ | Plain text, selectable |
| Type | Attribute type | ✓ | ✓ | String, Integer, Lookup, etc. |
| Required | Required level | ✓ | ✓ | None, ApplicationRequired, SystemRequired |
| Max Length | Maximum length | ✓ | ✗ | Number or "-" if N/A |

**Default Sort:** Display Name ascending

**Data Source:** `EntityMetadata.attributes[]`

**Transformation:**
```typescript
{
  id: string;              // LogicalName
  displayName: string;     // DisplayName.UserLocalizedLabel.Label || LogicalName
  logicalName: string;     // LogicalName
  type: string;            // AttributeType || AttributeTypeName.Value
  required: string;        // RequiredLevel.Value || "None"
  maxLength: string;       // MaxLength.toString() || "-"
}
```

---

### Tab: Keys

**Columns:**
| Column | Description | Sortable | Filterable | Notes |
|--------|-------------|----------|------------|-------|
| Name | Key logical name | ✓ | ✓ | Hyperlink to open detail |
| Type | Key type | ✓ | ✓ | Primary or Alternate |
| Key Attributes | Attributes in key | ✗ | ✓ | Comma-separated list |

**Default Sort:** Name ascending

**Data Source:** `EntityMetadata.keys[]`

**Transformation:**
```typescript
{
  id: string;              // LogicalName
  name: string;            // LogicalName
  type: string;            // "Primary" if single attribute, else "Alternate"
  keyAttributes: string;   // KeyAttributes.join(", ")
}
```

---

### Tab: Relationships

**Columns:**
| Column | Description | Sortable | Filterable | Notes |
|--------|-------------|----------|------------|-------|
| Name | Relationship schema name | ✓ | ✓ | Hyperlink to open detail |
| Type | Relationship type | ✓ | ✓ | 1:N, N:1, or N:N |
| Related Entity | Related entity name | ✓ | ✓ | Hyperlink to navigate |
| Referencing Attribute | Lookup or intersect entity | ✓ | ✓ | Plain text |

**Default Sort:** Name ascending

**Data Source:** `EntityMetadata.oneToManyRelationships[]`, `manyToOneRelationships[]`, `manyToManyRelationships[]`

**Transformation:**
```typescript
{
  id: string;              // SchemaName
  name: string;            // SchemaName
  type: string;            // "1:N" | "N:1" | "N:N"
  relatedEntity: string;   // ReferencedEntity || "entity1 ↔ entity2" for N:N
  referencingAttribute: string; // ReferencingAttribute || IntersectEntityName
}
```

**Related Entity Interaction:**
- **1:N and N:1 relationships:** Clicking related entity hyperlink loads that entity (switches to Attributes tab)
- **N:N relationships:** Shows format "entity1 ↔ entity2"
  - Clicking opens VS Code quick pick: "Select which entity to open"
  - Options: entity1, entity2
  - Selection loads chosen entity (switches to Attributes tab)

---

### Tab: Privileges

**Columns:**
| Column | Description | Sortable | Filterable | Notes |
|--------|-------------|----------|------------|-------|
| Name | Privilege name | ✓ | ✓ | Hyperlink to open detail |
| Privilege Type | Type of privilege | ✓ | ✓ | Plain text |
| Depth | Privilege depth levels | ✓ | ✓ | Comma-separated |

**Default Sort:** Name ascending

**Data Source:** `EntityMetadata.privileges[]`

**Transformation:**
```typescript
{
  id: string;              // PrivilegeId
  name: string;            // Name
  privilegeType: string;   // PrivilegeType.toString() || "Unknown"
  depth: string;           // Comma-separated: "Basic", "Local", "Deep", "Global"
}
```

**Depth Calculation:**
- Checks `CanBeBasic`, `CanBeLocal`, `CanBeDeep`, `CanBeGlobal` flags
- Joins enabled depths with ", "
- Returns "None" if no depths enabled

---

### Tab: Choice Values (Choice Mode Only)

**Columns:**
| Column | Description | Sortable | Filterable | Notes |
|--------|-------------|----------|------------|-------|
| Label | Option label text | ✓ | ✓ | Hyperlink to open detail |
| Value | Numeric option value | ✓ | ✗ | Plain text |
| Description | Option description | ✗ | ✓ | Plain text, may be empty |

**Default Sort:** Label ascending

**Data Source:** `OptionSetMetadata.Options[]`

**Transformation:**
```typescript
{
  id: string;              // Value.toString()
  label: string;           // Label.UserLocalizedLabel.Label
  value: string;           // Value.toString()
  description: string;     // Description.UserLocalizedLabel.Label || ""
}
```

---

## Right Panel (Detail View)

### Visibility
- **Hidden by default** when panel first loads
- **Opens when:**
  - User double-clicks table row
  - User presses Enter key on focused row
  - User clicks Display Name/Name hyperlink
- **Closes when:**
  - User clicks close button (×)
  - User presses ESC key
- **Persists state:**
  - Open/closed state saved to workspace
  - Split panel width saved to workspace
  - Next session restores previous state

### Header
```
[Title]                                              [×]
```

**Title Format:**
- Attributes: "Attribute: {DisplayName}"
- Keys: "Key: {Name}"
- Relationships: "Relationship: {Name}"
- Privileges: "Privilege: {Name}"
- Choice Values: "Choice Value: {Label}"

**Close Button:**
- Icon: ×
- Action: Closes detail panel
- Keyboard: ESC also closes

### Tabs
```
[Properties] [Raw Data]
```

**Properties Tab (default):**
- Formatted table view of all metadata properties
- Two columns: Property | Value
- Nested objects flattened with dot notation
  - Example: `DisplayName.UserLocalizedLabel.Label`
- Arrays shown with index notation
  - Example: `Targets[0]`, `Targets[1]`
- Filters out empty/null values
- Booleans shown as "Yes"/"No"
- Selectable text (Ctrl+A/Cmd+A supported)

**Raw Data Tab:**
- JSON view of complete raw metadata object
- Properly formatted and indented
- Selectable text (Ctrl+A/Cmd+A supported)
- No syntax highlighting required (VS Code theme handles it)

### Resizing
- Drag divider between center and right panels
- Minimum width: 400px
- Default split: 70% center / 30% right
- Split ratio saved to workspace state

---

## Loading States

### Initial Panel Load
1. Panel opens
2. Environment selector loads environments
3. Auto-selects last used environment (if saved to state)
4. Tree shows: "Loading tables..." / "Loading choices..."
5. Tree populates when data arrives

### Entity/Choice Selection
1. User clicks entity/choice in tree
2. Tables clear previous data
3. Tables show loading spinners: "Loading entity metadata..."
4. Tables populate when data arrives
5. Selected tab auto-expands (or restores previous tab)

### Refresh Action
1. User clicks Refresh button
2. Button shows loading spinner
3. Tables clear and show: "Refreshing metadata..."
4. Data reloads
5. Tables repopulate
6. Button spinner clears
7. Toast notification appears

### Empty States
- Empty table: "No data available"
- Empty detail panel: "No properties to display"

---

## State Persistence (Workspace)

### Saved State
Persisted to workspace state service:

```typescript
{
  selectedEnvironmentId: string;           // Last selected environment
  metadataBrowser: {
    detailPanelOpen: boolean;              // Detail panel open/closed
    detailPanelWidth: number;              // Split panel ratio (e.g., 70)
    selectedTab: string;                   // Last selected tab ("Attributes", "Keys", etc.)
    leftSidebarCollapsed: boolean;         // Sidebar collapsed state
  }
}
```

### Session State (Lost on Panel Close)
Not persisted:
- Selected entity/choice
- Detail panel active tab (Properties vs Raw Data)
- Table sort order
- Table search queries
- Scroll positions

---

## Error Handling

### Error Scenarios & Messages

| Scenario | Error Type | Message |
|----------|------------|---------|
| No environments configured | Error | "Please add an environment first." |
| Failed to load environments | Error | "Failed to load environment configuration" |
| Failed to load tree | Error | "Failed to load tables and choices: {error.message}" |
| Failed to load entity metadata | Error | "Failed to load entity metadata: {error.message}" |
| Failed to load choice metadata | Error | "Failed to load choice metadata: {error.message}" |
| Missing environment ID for Maker | Error | "Environment ID not found. Please configure the Environment ID in environment settings." |
| Failed to open in Maker | Error | "Failed to open in Maker: {error.message}" |
| Related entity not found | Warning | "Entity {name} not found" |

**Display Method:** VS Code notification API (`showErrorMessage`, `showWarningMessage`, `showInformationMessage`)

---

## Visual Design

### Theme Variables
All colors use VS Code theme variables for consistency:

- Background: `--vscode-editor-background`
- Sidebar: `--vscode-sideBar-background`
- Borders: `--vscode-panel-border`
- Text: `--vscode-foreground`
- Secondary text: `--vscode-descriptionForeground`
- Selected item: `--vscode-list-activeSelectionBackground`
- Hover: `--vscode-list-hoverBackground`
- Headers: `--vscode-tab-activeBackground`
- Hyperlinks: `--vscode-textLink-foreground`
- Hyperlinks hover: `--vscode-textLink-activeForeground`

### Icons
- 🏷️ Custom entity/choice
- 📋 System entity
- 🔽 Global choice
- ▶/▼ Expand/collapse section arrows
- ◀/▶ Sidebar collapse arrows

### Accessibility
- Keyboard navigation support (Tab, Enter, ESC)
- ARIA labels for buttons and controls
- Focus indicators on interactive elements
- Screen reader friendly
- Semantic HTML structure

---

## Component Dependencies

### VS Code Panel Components
- `EnvironmentSelectorComponent` - Environment dropdown
- `ActionBarComponent` - Action buttons (Open in Maker, Refresh)
- `DataTableComponent` (5 instances) - One for each metadata type
- `SplitPanelBehavior` - Resizable detail panel

### Services
- `MetadataService` - Fetch entity and choice metadata via Dataverse Web API
- `AuthService` - Get configured environments
- `StateService` - Save/restore workspace state

### Webview Resources
- `metadata-browser.css` - Panel-specific styles
- `split-panel.css` - Split panel styles
- `metadataBrowserBehavior.js` - Panel behavior script
- `SplitPanelBehavior.js` - Split panel behavior script

---

## Technical Implementation Notes

### Message Passing (Extension ↔ Webview)

**Extension → Webview:**
- `populate-tree` - Send entities and choices list
- `update-selection` - Update selection display and counts
- `set-mode` - Switch entity/choice mode
- `show-detail` - Open detail panel with metadata
- `tree-loading` - Show/hide tree loading state

**Webview → Extension:**
- `select-entity` - User selected entity from tree
- `select-choice` - User selected choice from tree
- `toggle-section` - User toggled tab (for state tracking)
- `refresh-data` - User clicked refresh button
- `component-event` - Component-specific events (action clicks, etc.)

### Performance Considerations
- Lazy load metadata only when entity/choice selected (not pre-cached)
- Cache metadata during session (cleared on refresh)
- Virtualized tables handled by DataTable component
- Client-side tree filtering (CSS hide/show, no re-render)

---

## Future Enhancements (Out of Scope for MVP)

### Navigation & History
- **Back/Forward buttons** with navigation history (last 10 items)
- **Breadcrumbs** showing path: Environment > Entity > Attribute
- **Recently Viewed** section in tree (collapsible, top 5 items)
- Smart back navigation (restores exact tab and scroll position)

### Advanced Filtering
- **Filter by managed/unmanaged** (chips above tree)
- **Filter by custom/system** (chips above tree)
- **Filter by entity type** (Table, Activity, Virtual, etc.)
- **Search across all metadata** (global search beyond tree)

### Customization
- **Column customization** (show/hide, reorder, resize)
- **Save column preferences** per table type
- **Custom table views** (e.g., "My Attributes" with only favorite columns)

### Data Actions
- **Export to CSV/JSON/Excel** (button in action bar)
- **Copy entire table** to clipboard
- **Multi-select rows** for batch copy

### Comparison & Analysis
- **Multi-select entities** in tree for side-by-side comparison
- **Diff view** showing metadata differences between entities
- **Relationship diagram** visualization (graph view)
- **Entity diagram** showing all relationships visually

### Deep Linking
- **URL parameters** to open specific entity/attribute
  - Example: `vscode://metadata-browser?env=prod&entity=account&attr=name`
- **Share links** with team members

### Productivity Features
- **Favorites/Bookmarks** for frequently used entities
- **Pin entities** to top of tree
- **Keyboard shortcuts** for common actions (e.g., Ctrl+E open in Maker)
- **Search history** (remember recent searches)

### Metadata Insights
- **Dependency analysis** (what uses this attribute?)
- **Impact analysis** (what breaks if I delete this?)
- **Unused metadata** detection
- **Metadata health check** (find issues, recommendations)

---

## Open Questions for Design Phase

1. Should we show row count badges on tabs? Example: `[Attributes (127)]`
2. Should detail panel remember last active tab (Properties vs Raw Data) per session?
3. Should we add a "Copy Logical Name" tooltip/button on hover for Logical Name cells?
4. Should tree search support wildcards or regex patterns?
5. Should we add loading skeleton UI instead of spinners?
6. Should we support dark/light/high-contrast themes explicitly or rely on VS Code theme variables?

---

## Success Criteria

**MVP is successful when:**
1. ✅ Users can browse all entities and choices for an environment
2. ✅ Users can view all metadata types (Attributes, Keys, Relationships, Privileges, Choice Values)
3. ✅ Users can view detailed metadata for any item via detail panel
4. ✅ Users can copy/paste any data easily (select text + Ctrl+C)
5. ✅ Users can navigate to related entities via hyperlinks
6. ✅ Users can open entities in Power Apps Maker portal
7. ✅ Users can search/filter tree efficiently
8. ✅ Panel state persists across sessions (environment, tab, detail panel state)
9. ✅ Loading states and errors are clear and actionable
10. ✅ Performance is responsive (no lag when switching entities/tabs)
