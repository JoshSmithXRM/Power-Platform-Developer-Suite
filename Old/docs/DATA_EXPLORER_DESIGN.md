# Data Explorer Panel - Design Document

## 🎯 Vision Statement

The Data Explorer panel transforms how developers interact with Dataverse data by providing a powerful, modern interface for querying, filtering, and exploring entity records directly within VS Code. Think of it as "Advanced Find on steroids" with developer-focused features and a beautiful, responsive UI.

## 🏗️ Core Concepts

### Primary Goals
1. **Intuitive Query Building** - Visual query builder with intelligent field suggestions
2. **Advanced Filtering** - Replicate and exceed CRM's Advanced Find capabilities  
3. **Related Record Navigation** - Seamless exploration of related data
4. **Saved Views Integration** - Leverage existing CRM views and FetchXML
5. **Developer-Focused Features** - Export queries, generate code snippets, bulk operations

### Design Principles
- **Performance First** - Lazy loading, virtual scrolling, intelligent caching
- **Modern UX** - Clean, responsive interface matching VS Code's aesthetic
- **Power User Features** - Keyboard shortcuts, command palette integration
- **Data Safety** - Read-only by default, explicit confirmation for modifications

---

## 📋 Feature Requirements

### Phase 1: Core Query Functionality

#### Entity Selection
- **Entity Picker**
  - Searchable dropdown with fuzzy matching
  - Recent/favorite entities at top
  - Display logical name, display name, and schema name
  - Show entity metadata (record count estimate, description)
  - Group by solution or category (System, Custom, Virtual)

#### Query Builder
- **Visual Query Interface**
  - Drag-and-drop field selection
  - Column reordering and resizing
  - Quick column actions (sort, filter, hide)
  - Save column configurations as presets

- **Filter Builder**
  - Condition groups (AND/OR logic)
  - Field-type aware operators
  - Date picker with relative date options
  - Lookup field search with type-ahead
  - Option set multi-select
  - Advanced conditions (null checks, in/not in lists)

- **Sorting & Pagination**
  - Multi-column sorting
  - Configurable page sizes (25, 50, 100, 250, 500)
  - Infinite scroll option
  - Total record count with performance warnings

### Phase 2: Saved Views & FetchXML

#### CRM Views Integration
- **View Browser**
  - List all system and personal views
  - View metadata (owner, modified date, description)
  - Quick preview of view filters
  - One-click view execution

- **FetchXML Support**
  - Import/export FetchXML
  - Visual FetchXML editor with syntax highlighting
  - Convert between QueryBuilder and FetchXML
  - FetchXML validation and error reporting
  - Save custom FetchXML queries

### Phase 3: Related Records & Navigation

#### Related Data Explorer
- **Relationship Navigation**
  - Visual relationship map
  - 1:N, N:1, and N:N relationship support
  - Quick expand/collapse related records
  - Inline related record preview

- **Primary UI Pattern: Flyout Panel with Tabs** ✅
  - **Flyout Panel** 
    - Slides in from right (40% default width)
    - Draggable divider for resize (30%-70% range)
    - Maintains context with main query visible
    - Smooth animations with Escape key to close
    - Remembers size preference per session
  - **Tab System within Flyout**
    - Multiple related entities open simultaneously
    - Easy comparison between related data
    - Breadcrumb trail in each tab
    - Close individual tabs or all at once
    - Color-coded tabs by entity type
  
- **Secondary UI Pattern: Inline Expansion** ✅
  - Quick peek at 3-5 related records
  - Expand/collapse with arrow icon
  - "View all X records" link to open flyout
  - Minimal UI disruption for quick checks

- **Smart Loading Strategy**
  - Initial load of 10 records
  - Virtual scrolling for large datasets
  - Progressive loading with "Load more"
  - Cache recently viewed relationships
  - Loading skeletons during fetch

- **Navigation Features**
  - Double-click opens in flyout
  - Shift+click opens in new VS Code tab
  - Right-click context menu for actions
  - Full keyboard navigation support
  - Relationship type badges (1:N, N:1, N:N)

### Phase 4: Advanced Features

#### Developer Tools
- **Query Export Options**
  - Generate C# QueryExpression code
  - Generate JavaScript WebAPI query
  - Export as SQL (for reference)
  - Copy as FetchXML, OData URL

- **Bulk Operations**
  - Multi-select with checkbox column
  - Bulk export (CSV, Excel, JSON)
  - Bulk field updates (with safety confirmations)
  - Bulk delete (with extensive warnings)

#### Data Analysis
- **Aggregations**
  - Count, sum, avg, min, max
  - Group by functionality
  - Pivot table view option

- **Data Visualization**
  - Quick charts (bar, pie, line)
  - Field distribution analysis
  - Duplicate detection

---

## 🎨 UI/UX Design

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Environment: [Dropdown] | Status: Connected | [Refresh]     │
├─────────────────────────────────────────────────────────────┤
│ Entity: [Search...] | View: [Saved Views] | [New] [Save]    │
├─────────────────────────────────────────────────────────────┤
│ ┌───────────────────┬────────────────────────────────────┐ │
│ │ Fields            │ Filters                            │ │
│ │ □ Name           │ [+ Add Filter Group]               │ │
│ │ □ Created On     │ ┌────────────────────────────────┐ │ │
│ │ □ Status         │ │ Status equals Active AND       │ │ │
│ │ □ Owner          │ │ Created On last 30 days        │ │ │
│ │ [+ Add Field]    │ └────────────────────────────────┘ │ │
│ └───────────────────┴────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Results (1,234 records) | [Export] [Actions] | Page 1 of 50 │
├─────────────────────────────────────────────────────────────┤
│ ┌─┬──────────┬──────────────┬──────────┬────────────────┐ │
│ │□│ Name ▲   │ Created On ▼ │ Status   │ Owner          │ │
│ ├─┼──────────┼──────────────┼──────────┼────────────────┤ │
│ │□│ Contoso  │ 2024-01-15   │ Active   │ John Doe       │ │
│ │□│ Fabrikam │ 2024-01-14   │ Draft    │ Jane Smith     │ │
│ └─┴──────────┴──────────────┴──────────┴────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Visual Design Elements

#### Color Scheme
- **Primary Actions** - VS Code blue (#007ACC)
- **Success States** - Soft green badges
- **Warning States** - Amber highlights
- **Error States** - Red with clear messaging
- **Related Records** - Subtle purple accent

#### Interactive Elements
- **Hover Effects** - Row highlighting, action buttons appear
- **Loading States** - Skeleton screens, progress indicators
- **Empty States** - Helpful illustrations and quick actions
- **Tooltips** - Rich tooltips with field metadata

### Keyboard Shortcuts
- `Ctrl+Shift+F` - Focus filter builder
- `Ctrl+E` - Execute query
- `Ctrl+S` - Save current query
- `Ctrl+N` - New query
- `Arrow Keys` - Navigate results
- `Enter` - Open record details
- `Ctrl+Click` - Multi-select rows

---

## 🏛️ Technical Architecture

### Data Flow

```
User Input → Query Builder → Query Translator → API Service
    ↓                            ↓                  ↓
UI State ← Result Formatter ← Response Handler ← Dataverse
```

### Service Layer Extensions

```typescript
// New services needed
class QueryBuilderService {
  - Build QueryExpression from UI
  - Validate query syntax
  - Optimize query performance
}

class FetchXmlService {
  - Parse/generate FetchXML
  - Convert to/from QueryExpression
  - Validate against schema
}

class ViewService {
  - Retrieve saved views
  - Execute view queries
  - Cache view definitions
}

class RelatedDataService {
  - Navigate relationships
  - Fetch related records
  - Build relationship maps
}
```

### State Management

```typescript
interface DataExplorerState {
  selectedEntity: string;
  currentQuery: QueryDefinition;
  results: QueryResults;
  viewConfig: ViewConfiguration;
  filters: FilterGroup[];
  sort: SortDefinition[];
  pagination: PaginationState;
  relatedRecordState: RelatedRecordState;
}
```

### Performance Optimizations

1. **Virtual Scrolling** - Render only visible rows
2. **Query Caching** - Cache recent queries with TTL
3. **Lazy Loading** - Load related data on demand
4. **Debounced Search** - Reduce API calls during typing
5. **Field Metadata Cache** - Cache entity metadata locally
6. **Progressive Loading** - Stream large result sets

---

## 🚀 Implementation Phases

### MVP (Phase 1) - 2-3 weeks
- ✅ Basic entity selection
- ✅ Simple filter builder (equals, contains)
- ✅ Table view with sorting
- ✅ Basic pagination (200 records default)
- ✅ Export to CSV

### Enhanced (Phase 2) - 3-4 weeks
- ✅ Advanced filter conditions
- ✅ Saved views integration (Dataverse storage)
- ✅ FetchXML support
- ✅ Column customization
- ✅ Export to multiple formats

### Advanced (Phase 3) - 4-5 weeks
- ✅ Related records navigation (flyout + tabs)
- ✅ Bulk operations (with safety)
- ✅ Query code generation
- ✅ Keyboard navigation
- ✅ Performance optimizations

### Professional (Phase 4) - 2-3 weeks
- ✅ Field-level security handling
- ✅ Virtual entity support
- ✅ Advanced aggregations
- ✅ Query performance metrics
- ✅ Team query sharing

### Phase 5: Cross-Environment Data Cloning

#### Architecture Approach
- **Separate Panel with Context Transfer**
  - "Clone to Environment" button in Data Explorer
  - Opens new dedicated panel (DataClonePanel)
  - Passes query context via message/state
  - Clean separation of connections

#### Connection Management
- **Dual Environment Connections**
  - Source environment (read-only)
  - Target environment (write)
  - Independent auth tokens
  - No dormant connections in background
  - Clear visual distinction between source/target

#### Core Features
- **Query Context Transfer**
  ```typescript
  interface CloneContext {
    sourceEnvironmentId: string;
    entityName: string;
    fetchXml: string;
    selectedRecordIds: string[];
    recordCount: number;
  }
  ```

- **Cloning Workflow**
  1. Execute query in Data Explorer
  2. Select records to clone
  3. Click "Clone to Environment"
  4. New panel opens with context
  5. Connect to target environment
  6. Field mapping & validation
  7. Execute with progress tracking

- **Safety Features**
  - Duplicate detection strategies
  - Dry run preview mode
  - Rollback capability
  - Detailed operation log
  - Field-level conflict resolution

#### UI Design
```
┌─────────────────────────────────────────────────────────┐
│ Data Clone Operation                                    │
├─────────────────────────────────────────────────────────┤
│ Source: [DEV - Connected ✓]    Records: 45 Accounts    │
│ Target: [Select Environment ▼]                          │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────┬────────────────────────────────────┐   │
│ │ Source Data │ Mapping & Options                  │   │
│ │ (Read-only) │                                    │   │
│ │             │ Duplicate Handling:                │   │
│ │ ✓ Contoso   │ ◉ Skip existing                   │   │
│ │ ✓ Fabrikam  │ ○ Update if newer                 │   │
│ │ ✓ Alpine    │ ○ Always create new               │   │
│ │             │                                    │   │
│ │             │ Field Mappings: [Configure]        │   │
│ └─────────────┴────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│ [Validate] [Preview Impact] [← Back] [Execute Clone →] │
└─────────────────────────────────────────────────────────┘
```

#### Implementation Phases
1. **Basic Clone** - Single entity, simple duplicates
2. **Smart Mapping** - Field mapping, owner resolution
3. **Related Records** - N:1 lookups, 1:N children
4. **Advanced** - N:N relationships, attachments
5. **Enterprise** - Bulk operations, scheduling

### Future Enhancements
- Data visualization/charts
- Query performance analytics
- Collaborative query sharing
- Query scheduling/automation
- AI-powered query suggestions
- Cross-environment data comparison

---

## 🎯 Success Metrics

1. **Performance**
   - Query execution < 2 seconds for standard queries
   - UI responsive during large data operations
   - Memory usage < 100MB for 10,000 records

2. **Usability**
   - 80% of queries buildable without FetchXML
   - Average 3 clicks to execute saved view
   - Keyboard-only navigation possible

3. **Developer Satisfaction**
   - Reduce context switching to browser
   - Faster data exploration than Advanced Find
   - Code generation saves 10+ minutes per query

---

## 🤔 Design Decisions & Considerations

### ✅ Decided
1. **Panel Name** - "Data Explorer" (modern, conveys exploratory nature)
2. **Related Records UI** - Hybrid: Flyout panel with tabs (primary) + inline expansion (secondary)
3. **Performance Strategy** - Virtual scrolling + lazy loading + caching
4. **Developer Focus** - Code generation, keyboard shortcuts, bulk operations

### ✅ Additional Decisions Finalized
1. **Saved Queries Storage** - Dataverse sync from day 1
   - Custom entity `devtools_savedquery` in Dataverse
   - Personal and shared query support
   - Version history for team queries
   - No local-only option - do it right from the start

2. **Data Set Limits** - Sensible memory management
   - **Default**: 200 records per page
   - **Maximum in memory**: 5,000 records
   - **Pagination**: Always for results > 200
   - **Export only**: For larger datasets (with streaming)
   - **Use case**: In-memory viewing is for analysis, not bulk processing

3. **Field-Level Security** - "[Secured]" placeholder
   - Clear visual indicator
   - Tooltip explains security restriction
   - No attempt to retrieve secured values

4. **Offline Support** - 15-minute cache
   - Optional caching with clear "cached" badge
   - Timestamp showing data freshness
   - Manual refresh always available

5. **Virtual Entities** - Performance badge
   - Yellow warning badge for virtual entities
   - Tooltip about potential performance impact
   - Same features but with expectations set

---

## 💡 Innovation Opportunities

### AI Integration
- Natural language to query conversion
- Intelligent filter suggestions based on data patterns
- Anomaly detection in query results

### Collaboration Features
- Share queries via links
- Query commenting and documentation
- Team query libraries

### Advanced Analytics
- Query performance profiling
- Index recommendations
- Data quality scoring

---

## 🎨 Mockup References

Consider these modern data table implementations for inspiration:
- **Airtable** - Clean, colorful, highly interactive
- **Retool** - Developer-focused with excellent keyboard support
- **Linear** - Beautiful animations and transitions
- **Notion** - Flexible views and inline editing
- **Supabase** - Modern database explorer UI

---

## 📝 Next Steps

1. **Gather Feedback** - Review with stakeholders
2. **Technical Spike** - Prototype query builder UI
3. **API Research** - Investigate Dataverse query limits
4. **Design Mockups** - Create high-fidelity designs
5. **User Testing** - Validate with target users

---

*This is a living document and will be updated as we refine requirements and gather feedback.*