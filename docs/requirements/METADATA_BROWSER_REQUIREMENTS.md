# Metadata Browser Requirements Document

## Overview
The Metadata Browser is a 3-panel tool for exploring Dataverse entity and choice (option set) metadata. Users can browse all tables and choices in an environment, view detailed metadata (attributes, keys, relationships, privileges), and drill down into specific properties.

## User Stories

### US-1: Browse Entity and Choice Tree
**As a** Power Platform developer
**I want to** see a searchable tree of all entities and choices in my environment
**So that** I can quickly find and select tables or choices to explore

**Acceptance Criteria:**
- Tree displays entities (tables) and choices (global option sets) in separate sections
- Search/filter functionality narrows down visible items by display name or logical name
- Custom entities show custom icon (🏷️), system entities show standard icon (📋)
- Choices show choice icon (🔽)
- Selected item is highlighted in the tree
- Tree is collapsible via collapse button

### US-2: View Entity Metadata
**As a** Power Platform developer
**I want to** view comprehensive metadata for a selected entity
**So that** I can understand its structure, attributes, relationships, and security

**Acceptance Criteria:**
- Selecting an entity loads and displays:
  - Attributes (display name, logical name, type, required level, max length)
  - Keys (name, type, key attributes)
  - Relationships (1:N, N:1, N:N with related entities and referencing attributes)
  - Privileges (CRUD permissions with depth levels)
- All metadata sections are collapsible/expandable
- Section headers show count of items
- Attributes section expands by default when entity is selected
- Tables support sorting, searching, and filtering
- Loading states shown during data fetch

### US-3: View Choice Metadata
**As a** Power Platform developer
**I want to** view metadata for global option sets (choices)
**So that** I can see all available values and their configurations

**Acceptance Criteria:**
- Selecting a choice loads and displays:
  - Choice values (label, numeric value, description)
- Choice values table supports sorting, searching, filtering
- Choices section expands by default when choice is selected
- Only relevant sections shown (hide entity-specific sections)

### US-4: Drill Down into Metadata Details
**As a** Power Platform developer
**I want to** view detailed properties of a specific attribute or relationship
**So that** I can see all available metadata fields

**Acceptance Criteria:**
- Right-click context menu on attribute rows offers "View Details"
- Right-click context menu on relationship rows offers "View Details"
- Detail panel opens on the right side (resizable split panel)
- Detail panel has two tabs:
  - Properties: Flat table showing all properties and nested values
  - Raw Data: JSON viewer with collapsible structure
- Detail panel can be closed via close button
- Detail panel supports keyboard shortcuts (Ctrl+A to select all text)
- Switching entities/choices closes detail panel

### US-5: Navigate to Related Entities
**As a** Power Platform developer
**I want to** jump to related entities from relationship metadata
**So that** I can explore entity relationships without manual navigation

**Acceptance Criteria:**
- Context menu on relationship rows offers "Open Related Entity"
- Clicking opens the related entity in the same panel
- For N:N relationships, user can choose which entity to open
- Navigation preserves environment context

### US-6: Open in Power Apps Maker
**As a** Power Platform developer
**I want to** open the current entity in Power Apps Maker
**So that** I can make changes in the web interface

**Acceptance Criteria:**
- "Open in Maker" button in action bar
- Opens entity page in Power Apps Maker portal
- Disabled when no entity selected or for choices (no maker URL)
- Uses environment's environmentId for URL construction

### US-7: Refresh Metadata
**As a** Power Platform developer
**I want to** refresh metadata to see latest changes
**So that** I can view recently made schema changes

**Acceptance Criteria:**
- "Refresh" button in action bar
- Refreshes entity/choice tree and current selection
- Shows loading state during refresh
- Clears cache and fetches fresh data
- Success notification shown after refresh

### US-8: Copy Logical Names
**As a** Power Platform developer
**I want to** copy logical names of attributes to clipboard
**So that** I can use them in code, queries, or formulas

**Acceptance Criteria:**
- Context menu on attribute rows offers "Copy Logical Name"
- Copies attribute's logical name to clipboard
- Success notification confirms copy action

### US-9: Persist Panel Preferences
**As a** Power Platform developer
**I want to** my panel layout preferences to be saved per environment
**So that** my workspace is consistent across sessions

**Acceptance Criteria:**
- Collapsed/expanded section states are persisted per environment
- Split panel ratio (middle/right panel division) is persisted
- Left panel collapse state is persisted
- Preferences load automatically when switching environments
- Detail panel always starts hidden (not persisted)

### US-10: Switch Between Environments
**As a** Power Platform developer
**I want to** switch between environments without losing panel state
**So that** I can work with multiple environments efficiently

**Acceptance Criteria:**
- Environment selector dropdown shows all configured environments
- Switching environments loads entity/choice tree for new environment
- Previous environment's preferences are saved
- New environment's preferences are loaded
- Selection is cleared when switching environments

## Technical Requirements

### Architecture
- Follow Clean Architecture principles (Domain → Application → Infrastructure → Presentation)
- Use existing panel framework (BasePanel, component system)
- Reuse existing components where possible (EnvironmentSelector, ActionBar, DataTable, JsonViewer, SplitPanel)
- Apply DRY principles (no code duplication)

### Domain Layer
- Rich domain entities for:
  - EntityMetadata (with behavior methods, not anemic)
  - AttributeMetadata
  - RelationshipMetadata
  - KeyMetadata
  - ChoiceMetadata
  - PrivilegeMetadata
- Repository interfaces (IMetadataRepository)
- Domain services for complex operations

### Application Layer
- Use cases for each user action (orchestration only, no business logic):
  - LoadEntityTreeUseCase
  - LoadEntityMetadataUseCase
  - LoadChoiceMetadataUseCase
  - NavigateToRelatedEntityUseCase
  - RefreshMetadataUseCase
- Use cases inject repositories and domain services
- Use cases return ViewModels (DTOs)

### Infrastructure Layer
- MetadataRepository implementation
- Dataverse API client integration
- Caching strategy (5-minute cache timeout)
- API calls:
  - GET EntityDefinitions
  - GET EntityDefinitions(LogicalName)/Attributes
  - GET EntityDefinitions(LogicalName)/Keys
  - GET EntityDefinitions(LogicalName)/OneToManyRelationships
  - GET EntityDefinitions(LogicalName)/ManyToOneRelationships
  - GET EntityDefinitions(LogicalName)/ManyToManyRelationships
  - GET EntityDefinitions(LogicalName)/Privileges
  - GET GlobalOptionSetDefinitions

### Presentation Layer
- MetadataBrowserPanel extending BasePanel
- ViewModels (simple DTOs, no logic):
  - EntityTreeItemViewModel
  - ChoiceTreeItemViewModel
  - AttributeTableRowViewModel
  - KeyTableRowViewModel
  - RelationshipTableRowViewModel
  - PrivilegeTableRowViewModel
  - ChoiceValueTableRowViewModel
- Mappers to transform domain entities to ViewModels
- HTML view with 3-panel layout
- JavaScript behavior for tree interactions
- CSS styling for custom layout

### Data Flow
1. User selects environment → LoadEntityTreeUseCase → Display tree
2. User clicks entity → LoadEntityMetadataUseCase → Transform to ViewModels → Update tables
3. User right-clicks attribute → Show detail panel with attribute data
4. User clicks related entity → NavigateToRelatedEntityUseCase → Load new entity

### Components to Reuse
- EnvironmentSelector (existing)
- ActionBar (existing)
- DataTable (existing, 5 instances for different metadata types)
- JsonViewer (existing, for detail panel JSON tab)
- SplitPanel (existing, for middle/right panel split)

### New Components Needed
- Entity/Choice Tree (custom implementation in panel behavior)
- Detail Panel Tabs (Properties vs Raw Data)
- Left Panel Collapse Button

### State Management
- Panel instance state:
  - selectedEnvironmentId
  - selectedEntityLogicalName
  - selectedEntityMetadataId
  - selectedChoiceName
  - currentMetadata (cached domain entity)
- Panel preferences (per environment):
  - collapsedSections (array of section IDs)
  - splitRatio (middle/right panel division percentage)
  - leftPanelCollapsed (boolean)

### Context Menu Actions
- Attributes table:
  - View Details
  - Copy Logical Name
  - Open Attribute in Maker
- Relationships table:
  - View Details
  - Open Related Entity

### Performance Considerations
- Parallel data fetching (Promise.all for entity metadata load)
- Client-side caching with 5-minute timeout
- Lazy loading (only fetch metadata for selected entity/choice)
- Optimistic UI updates (toggle sections immediately, persist in background)

### Accessibility
- Keyboard navigation support
- ARIA labels on interactive elements
- Screen reader friendly table structures
- Keyboard shortcuts (Ctrl+A for select all in detail panel)

### Error Handling
- API errors show user-friendly messages
- Graceful degradation when optional metadata unavailable
- Loading states prevent user confusion
- Cache invalidation on errors

## Out of Scope (Future Enhancements)
- Inline editing of metadata
- Creating new entities/attributes
- Deleting entities/attributes
- Solution-aware filtering (show only solution components)
- Metadata export to JSON/CSV
- Metadata comparison between environments
- Quick search across all entities (global search)
- Bookmarking favorite entities

## Dependencies
- Existing panel framework (BasePanel, ComponentFactory, PanelComposer)
- Existing components (EnvironmentSelector, ActionBar, DataTable, JsonViewer, SplitPanel)
- MetadataService (to be refactored into Clean Architecture)
- StateManager (for preferences persistence)
- Logger (for diagnostics)

## Success Metrics
- Panel loads entity tree in <2 seconds
- Entity metadata loads in <3 seconds
- UI remains responsive during data fetch (loading states)
- No TypeScript compilation errors
- All use case tests pass (90%+ coverage target)
- Domain entity tests pass (100% coverage target)
- Manual testing confirms all user stories work as expected
