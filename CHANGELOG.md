# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Data Explorer - Export CSV:** Export query results to CSV file
  - "Export CSV" button in toolbar after query execution
  - Generates filename with entity name and timestamp (e.g., `contact_export_2025-11-27T12-30-00.csv`)
  - RFC 4180 compliant CSV formatting (proper escaping of quotes, commas, newlines)

- **Shared CsvExportService:** Reusable CSV/JSON export utility for all features
  - Generic `toCsv(TabularData)` method for any tabular data
  - `escapeCsvField()` helper for RFC 4180 compliant CSV escaping
  - `saveToFile()` using VS Code save dialog

- **Plugin Trace Viewer E2E Tests:** Playwright integration tests
  - Panel open/close tests
  - Export dropdown visibility tests
  - CSV export flow tests

### Changed

- **Plugin Trace Viewer:** Refactored `FileSystemPluginTraceExporter` to use shared `CsvExportService`
  - Reduced code duplication
  - Consistent CSV formatting across features

### Fixed

- **Data Explorer:** Export CSV button no longer gets stuck in loading state after export completes

## [0.2.2] - 2025-11-26

### Added

- **Data Explorer Panel (MVP):** SQL query execution against Dataverse
  - SQL to FetchXML transpilation with live preview
  - Query results displayed in sortable table
  - Clickable record links - lookup fields and primary keys open records in browser
  - Copy record URL button on hover
  - Syntax highlighting for SQL editor and FetchXML preview
  - Query execution status bar with row count and timing
  - Keyboard shortcut (Ctrl+Enter) for query execution

- **E2E Testing Infrastructure:** Playwright-based E2E testing for VS Code extension
  - `npm run e2e:smoke` - Automated smoke tests (~30s) for VS Code launch and command execution
  - `npm run e2e:integration` - Integration tests (~60s) with real Dataverse connections
  - `VSCodeLauncher` - Launch VS Code via Playwright Electron with extension loaded
  - `CommandPaletteHelper` - Automate Command Palette interactions
  - `WebviewHelper` - Access webview iframe content
  - `ScreenshotHelper` - Capture and annotate screenshots
  - `ClaudeJsonReporter` - AI-optimized JSON output with suggestions
  - Console log capture (`vscode.getLogs()`) - Renderer and webview debug messages
  - Extension Output channel capture (`vscode.getExtensionLogs()`) - Extension logger output
  - Data Explorer integration tests - Query execution, results display, record links
  - Environment Setup integration tests - Form field validation, Service Principal auth
  - Solutions Panel integration tests - Real API calls, 1000+ solutions loading verified
  - Auto-loading credentials via `dotenv` from `.env.e2e.local`

### Changed

- **Dependencies:** Added `dotenv` for automatic credential loading in E2E tests
- **Dependencies:** Upgraded TypeScript from 4.9.5 to 5.9.3
- **Dependencies:** Upgraded @azure/msal-node from 2.x to 3.8.3
- **Dependencies:** Upgraded madge from 7.0.0 to 8.0.0
- **Dependencies:** Upgraded @types/node from 16.x to 24.x
- **Dependencies:** Upgraded @typescript-eslint packages to 8.48.0
- **Dependencies:** Upgraded @vscode/vsce to 3.7.1
- **CI:** Updated GitHub Actions (checkout v6, setup-node v6, codeql-action v4, github-script v8)

## [0.2.1] - 2025-11-25

### Fixed

- **Environment Setup:** Button alignment - toolbar buttons now centered and right-aligned to match form content width
- **Environment Setup:** Interactive auth warning now displays as modal dialog instead of corner notification
- **Environment Setup:** Discover/Test buttons now properly reset text when user cancels operation
- **Environment Setup:** Added separate "Save" and "Save & Close" buttons - users can now save without closing panel
- **Environment Setup:** Deleting an environment no longer deletes credentials shared with other environments (e.g., two environments using the same username/password)
- **Persistence Inspector:** Panel content now scrolls properly when content exceeds viewport height

## [0.2.0] - 2025-11-24

### 🏗️ Complete Clean Architecture Refactor (Refactor #3)

This release represents a **fundamental architectural transformation** - migrating from component-based patterns to true Clean Architecture with rich domain models, comprehensive testing, and proper separation of concerns.

#### Architecture Transformation

**Clean Architecture Implementation:**
- **Domain Layer** - Rich entities with business logic (not anemic data bags), value objects for validation, domain services for complex operations, zero external dependencies
- **Application Layer** - Use cases for orchestration only, mappers for DTO transformation, ViewModels as simple data structures
- **Infrastructure Layer** - Repository implementations, Dataverse API integration, MSAL authentication
- **Presentation Layer** - VS Code panels and webview behaviors

**Key Patterns Introduced:**
- **Rich Domain Models** - Entities contain business behavior (Environment.requiresClientSecret(), PluginTrace.isSuccess(), ImportJob.getStatusMessage())
- **Value Objects** - Immutable validated primitives (EnvironmentName, DataverseUrl, TenantId, FilterField)
- **Repository Pattern** - Interfaces in domain, implementations in infrastructure
- **Domain Events** - Decoupled side effects (EnvironmentCreated, StorageCleared, SecretRevealed)
- **Domain Services** - Complex business logic (FlowConnectionRelationshipBuilder, ODataQueryBuilder)

**Deleted:** Entire component framework (~5,000 lines) replaced with feature-specific presentation layer

#### Testing Infrastructure

**168 Test Files Added:**
- Domain layer: 95-100% coverage target (entities, value objects, domain services)
- Application layer: 85-95% coverage target (use cases, mappers)
- Infrastructure layer: 70-85% coverage target (repositories, API integration)
- Integration tests: Full panel workflows with webview message passing

**Test Patterns:**
- Test factories for consistent test data (EnvironmentTestFactory, PluginTraceTestFactory)
- Mock repositories for isolation
- Integration tests for critical user workflows

#### Documentation

**16 Architecture Guides Added (8,000+ lines):**
- Clean Architecture Guide, Examples, and Patterns
- Value Object, Domain Service, Repository, and Mapper Patterns
- Code Quality and Logging Guides
- Panel Architecture and UI Patterns

**3 Testing Guides Added (3,373 lines):**
- Unit Testing Patterns and Test Factories
- Integration Testing Guide
- Solution Panel Integration Examples

**Workflow Documentation:**
- Development workflows (.claude/WORKFLOW.md)
- Agent collaboration guides (.claude/AGENTS.md)
- Quick reference for AI assistants (CLAUDE.md)

#### Features Restructured

**8 Features Migrated to Clean Architecture:**
1. Environment Setup (89 files) - Authentication, validation, MSAL integration
2. Metadata Browser (74 files) - Entity metadata with 5-minute caching
3. Plugin Trace Viewer (96 files) - OData query building, CSV export
4. Solution Explorer (43 files) - Solution management, export
5. Import Job Viewer (23 files) - Import monitoring, status computation
6. Environment Variables (25 files) - Variable management, ALM deployment
7. Connection References (27 files) - Flow-connection relationships
8. Plugin Registration (partial) - In progress

**Note:** Persistence Inspector (67 files) migrated but excluded from packaged releases (development/debugging tool only)

#### Breaking Changes

⚠️ **This is a complete architectural rewrite.** While user-facing functionality remains unchanged, the internal structure has been fundamentally redesigned:

- Component framework deleted and replaced with Clean Architecture layers
- All features restructured with domain/application/infrastructure/presentation separation
- New dependency injection patterns for repositories and services
- Stricter TypeScript patterns (no anemic models, explicit return types, value objects)

**User Impact:** None - all features work as before with improved reliability and performance

#### Benefits

- ✅ **Testability** - Comprehensive test coverage with isolated unit tests
- ✅ **Maintainability** - Clear separation of concerns, business logic in domain
- ✅ **Scalability** - Features isolated with well-defined boundaries
- ✅ **Type Safety** - Value objects prevent invalid state, explicit validation
- ✅ **Documentation** - 13,873 lines of architecture and testing guides

### Technical

- **827 files changed** (173,132 insertions, 52,628 deletions)
- **Net addition**: ~120,500 lines (including tests and documentation)
- **Zero ESLint violations** - Architectural rules enforced
- **Zero TypeScript errors** - Strict type checking throughout

## [0.1.1] - 2025-10-27

### Fixed

#### **All Panels - "Open New" Command Not Working** 🔧
- **Fixed:** "Open New" commands in command palette and right-click context menu always focused existing panel instead of creating new instance
  - **Root Cause:** Panel `createNew()` methods were incorrectly calling `createOrShow()`, which reveals existing panels instead of creating new ones
  - **Affected Panels:** Metadata Browser, Solution Explorer, Plugin Trace Viewer, Import Job Viewer, Connection References, Environment Variables, Data Explorer
  - **Solution:** Fixed `createNew()` to always create new panel instances regardless of existing panels
  - **Results:**
    - ✅ Command palette "Open New" commands now correctly create new panel instances
    - ✅ Right-click "Open New" in Tools panel creates new instances
    - ✅ Left-click in Tools panel still reveals existing panel or creates new if none exists
  - **Files Changed:** All panel implementation files

#### **Metadata Browser - OptionSet Data Missing** 🔧
- **Fixed:** Local optionset values not displayed for picklist, state, status, and boolean attributes
  - **Root Cause:** Dataverse Web API requires type casting to retrieve OptionSet data. Normal attribute queries do not include the `OptionSet` property for picklist-based attribute types.
  - **Solution:** Implemented parallel query strategy with 6 simultaneous API calls:
    1. Normal query - Returns all 460+ attributes (includes Lookup.Targets by default)
    2. PicklistAttributeMetadata - Returns picklist attributes with `$expand=OptionSet,GlobalOptionSet`
    3. StateAttributeMetadata - Returns state attributes (Active/Inactive) with `$expand=OptionSet`
    4. StatusAttributeMetadata - Returns status reason attributes with `$expand=OptionSet`
    5. BooleanAttributeMetadata - Returns boolean/TwoOption attributes with `$expand=OptionSet`
    6. MultiSelectPicklistAttributeMetadata - Returns multi-select picklists with `$expand=OptionSet,GlobalOptionSet`
  - **Results:**
    - ✅ 88 attributes per entity now include complete OptionSet data (for typical entities)
    - ✅ 5 attribute types covered with full option values and multi-language labels
    - ✅ Zero performance impact - all queries execute in parallel (~1 second total)
    - ✅ Graceful degradation if any typed query fails
  - **Files Changed:** `src/services/MetadataService.ts:499-621`

#### **Metadata Browser - Choice Values Not Displayed** 🔧
- **Fixed:** Choice values section remained hidden when selecting a choice from the left sidebar
  - **Root Cause:** Race condition in mode-setting logic. The panel sent two messages when a choice was selected:
    - `set-mode` (mode: 'choice') - correctly set choice-mode
    - `update-selection` (with counts) - overwrote the mode based on data counts
    - When counts.choices === 0, the mode would be removed, hiding the choice values section
  - **Solution:** Removed mode-determination logic from `updateSelection()` method. The `set-mode` message is now the sole authority for setting panel modes. The `updateSelection()` method only:
    - Updates the selection display text
    - Updates section counts
    - Auto-expands appropriate sections based on data availability
    - Does NOT change mode classes
  - **Results:**
    - ✅ Choice values section displays correctly when a choice is selected
    - ✅ Works regardless of whether the choice has 0 or more values
    - ✅ No more race conditions between `set-mode` and `update-selection` messages
    - ✅ Entity mode and choice mode remain stable during navigation
  - **Files Changed:** `resources/webview/js/panels/metadataBrowserBehavior.js:383-415`

## [0.1.0] - 2025-10-27

### 🎉 Major Architectural Refactor

This release represents a **complete architectural rewrite** of the Power Platform Developer Suite. The extension has been rebuilt from the ground up using modern component-based architecture, comprehensive linting, and SOLID design principles.

### Added

#### **Component-Based Architecture** 🏗️
- **Reusable Component System** - Built 10+ production-ready components following a consistent 4-file pattern (Component, Config, View, Behavior)
  - `EnvironmentSelectorComponent` - Multi-instance environment selector with connection status
  - `ActionBarComponent` - Flexible action bars with buttons, dropdowns, and search
  - `DataTableComponent` - Full-featured tables with sorting, filtering, pagination, row actions, and context menus
  - `FilterPanelComponent` - Advanced filtering with quick filters and complex condition builder
  - `SplitPanelComponent` - Responsive split-view layouts with adjustable dividers
  - `JsonViewerComponent` - Syntax-highlighted JSON with expand/collapse
  - `SolutionSelectorComponent` - Solution picker with search and filtering
- **Event Bridge Pattern** - Components communicate via event bridges instead of direct webview updates (eliminates UI flash)
- **ComponentFactory** - Centralized factory for creating all UI components with consistent configuration
- **PanelComposer** - Unified panel composition system for standard and custom layouts

#### **Professional Tooling & Quality** ✨
- **Comprehensive ESLint Rules** - Custom architectural linting with 40+ rules enforcing:
  - Message naming conventions (kebab-case enforcement)
  - No data transformation in panels (SOLID violations)
  - Proper error handling patterns (type-safe catch blocks)
  - Security patterns (no console.log in Extension Host)
  - Architecture compliance (ComponentFactory usage, event bridges)
- **Structured Logging System** - Professional logging with VS Code native APIs
  - Component-specific loggers with structured metadata
  - Automatic credential sanitization for security
  - Multiple log levels (trace, debug, info, warn, error)
  - User-accessible via VS Code output channels
- **Comprehensive Documentation** - 8 detailed architecture guides (2,000+ lines)
  - `ARCHITECTURE_GUIDE.md` - SOLID principles and system design
  - `EXECUTION_CONTEXTS.md` - Extension Host vs Webview separation
  - `PANEL_LAYOUT_GUIDE.md` - Mandatory panel structure patterns
  - `COMPONENT_PATTERNS.md` - Component lifecycle and design
  - `MESSAGE_CONVENTIONS.md` - Kebab-case messaging standards
  - `ERROR_HANDLING_PATTERNS.md` - Type-safe error handling
  - `STYLING_PATTERNS.md` - Semantic CSS tokens and theming
  - `DEVELOPMENT_GUIDE.md` - Practical development workflows

#### **Enhanced Features** 🚀
- **Environment Setup Panel** - Complete rewrite with improved UX
  - Clean form interface with dynamic page titles
  - Conditional field visibility based on authentication method
  - Test connection functionality with validation
  - Secure credential preservation when editing environments
  - Support for all 4 authentication methods
- **Metadata Browser** - Split-panel interface with enhanced navigation
  - Three-panel layout: Entities → Attributes/Keys/Relationships → Details
  - Smart caching for instant tab switching
  - Right-click context menu for opening in new panels
  - Export metadata to JSON
- **Plugin Trace Viewer** - Advanced filtering and analysis
  - Quick filters (Today, Last Hour, Exception Only) with auto-apply
  - Environment trace level management (Off/Exception/All)
  - Detailed trace views with syntax-highlighted stack traces
  - Export to CSV, copy trace data
  - Search across all trace data
- **Import Job Viewer** - Solution import monitoring
  - Real-time import status tracking
  - Detailed import logs and XML configurations
  - Historical job analysis

### Changed

#### **Architecture Transformation** 🔄
- **Complete Codebase Refactor** - All 8 panels rewritten using component architecture
  - Eliminated 2,000+ lines of duplicate code
  - Reduced code complexity by 40% through shared components
  - Unified panel structure with mandatory `panel-container → panel-controls → panel-content` layout
  - Consistent message handling with kebab-case naming
- **Execution Context Separation** - Strict separation of Extension Host (TypeScript) and Webview (JavaScript)
  - ComponentFactory runs in Extension Host (generates HTML)
  - Behavior scripts run in Webview (handle user interaction)
  - No DOM manipulation in Extension Host, no TypeScript classes in Webview
- **Event-Driven Communication** - Replaced direct `postMessage()` with event bridges
  - Components emit events when state changes
  - Panels listen and update via event handlers
  - Eliminates full webview regeneration and UI flashing
- **Service Layer Refinement** - Enhanced service architecture
  - ServiceFactory for dependency injection
  - Consistent error handling across all services
  - Comprehensive logging with timing metrics
  - Token caching and credential management improvements

#### **Performance Improvements** ⚡
- **Panel Load Times** - Significant speed improvements through parallelization
  - Connection References: 7.4s → 3.3s (55% faster)
  - Environment Variables: Client-side filtering for instant results
  - Metadata Browser: Smart caching eliminates redundant API calls
- **Bundle Optimization** - Webpack production build
  - 92% size reduction (1.45 MiB → 329 KiB production bundle)
  - Code splitting and tree shaking
  - Source maps for debugging

#### **User Experience Refinements** 💅
- **Simplified Search** - Global search box replaces per-column filters
  - Single search box filters across all columns
  - Debounced input (300ms) for smooth experience
  - Cleaner, more intuitive interface
- **Improved Visual Design** - Consistent styling across all panels
  - VS Code theme integration with semantic CSS tokens
  - Proper dark/light mode support
  - Responsive layouts that adapt to screen size
  - Loading spinners and error states

### Fixed

#### **Critical Fixes** 🔧
- **Security Vulnerability** - Updated axios to >=1.12.0 (HIGH severity DoS fix)
- **Credential Management** - Fixed credential preservation when editing environments
  - Editing environments no longer wipes stored secrets
  - Test connections use temporary environments to avoid deleting production secrets
- **Panel Lifecycle** - Fixed multiple panel management issues
  - Component ID collision when reopening panels
  - Tab switching causing panel reload
  - Singleton patterns preventing multiple panel instances
- **Message Handling** - Fixed kebab-case message naming issues
  - Standardized all messages to use kebab-case (environment-changed, filters-applied)
  - Added ESLint rules to enforce naming convention
  - Fixed missing message handlers causing warnings
- **OData Filter Encoding** - Fixed filter strings not being URL-encoded
  - Special characters in filters now properly encoded
  - Exception filters now work correctly (was sending `ne null` instead of `ne ''`)
- **Search Persistence** - Fixed search queries not reapplying after table refresh
  - Search input text preserved and filter reapplied to new data
  - Works across all data tables

#### **UI/UX Fixes** 🎨
- **Environment Setup Panel**
  - Added proper VS Code button styling
  - Hidden loading/error containers showing incorrectly
  - Removed "Set as active environment" checkbox (per-panel selection)
  - Improved button styling with hover states
  - Dynamic panel titles showing environment name
- **Environment Variables Panel**
  - Fixed data not displaying after successful service load
  - Switched from old postMessage to direct component updates
- **Panel Layouts**
  - Fixed mandatory panel structure compliance across all panels
  - Fixed custom layouts breaking standard CSS
  - Fixed missing `panel-content` wrapper causing misalignment

### Technical

#### **Build System** 🛠️
- **Enhanced TypeScript Configuration** - Strict type checking with comprehensive interfaces (80+)
- **Webpack Production Build** - Optimized bundling with code splitting
- **ESLint Integration** - Custom architectural rules with detailed error messages
- **Build Commands**
  - `npm run compile` - Development build with linting
  - `npm run watch` - Watch mode for active development
  - `npm run package` - Production build with webpack
  - `npm run test-release` - Build, package, and install locally
- **Quality Assurance**
  - Zero TypeScript compilation errors
  - Zero ESLint violations
  - All panels tested and functional
  - Documentation up-to-date and accurate

#### **Architecture Patterns** 📐
- **SOLID Principles** - Enforced throughout codebase
  - Single Responsibility: Components do one thing well
  - Open/Closed: Components extensible via configuration
  - Liskov Substitution: All components implement BaseComponent
  - Interface Segregation: Config interfaces are specific and focused
  - Dependency Inversion: Services injected via ServiceFactory
- **Factory Pattern** - ComponentFactory and ServiceFactory for object creation
- **Observer Pattern** - Event bridges for loose coupling
- **Composition Over Inheritance** - Panels compose components rather than subclass

### Documentation

- **Architecture Guides** - Comprehensive documentation in `docs/` folder
- **CLAUDE.md** - AI assistant guidelines synchronized with architecture
- **README.md** - Updated with current feature set and architecture
- **Feature Design Docs** - Technical specifications for upcoming features
  - `PLUGIN_REGISTRATION_DESIGN.md` - Complete plugin registration system design
  - `DATA_EXPLORER_DESIGN.md` - Vision document for advanced data explorer
  - `DATA_EXPLORER_TECHNICAL_SPEC.md` - Implementation specification

### Breaking Changes

⚠️ **This is a major refactor release.** While functionality remains the same, internal architecture has completely changed:

- Panel HTML structure now requires mandatory layout (`panel-container → panel-controls → panel-content`)
- Message names must use kebab-case (enforced by ESLint)
- Components must follow 4-file pattern (Component, Config, View, Behavior)
- No direct webview updates - must use event bridges
- Execution context separation strictly enforced

**Migration:** No user-facing breaking changes. All features work as before with improved performance and reliability.

### Upgrade Notes

This release includes significant architectural improvements with no required user action. Simply update and enjoy:
- ✅ Faster panel load times
- ✅ More responsive UI
- ✅ Better error messages and logging
- ✅ Consistent experience across all panels
- ✅ Foundation for rapid feature development

---

### Coming Soon 🔮

**Next Release (v0.2.0):**
- Plugin Registration Tool (full Plugin Registration Tool parity)
- Data Explorer (Advanced Find with improvements)

## [0.0.2] - 2025-09-09

### Added
- **Multi-instance Panel Support** - Environment panels now support multiple simultaneous tabs
- **Automatic Form State Persistence** - Form data is automatically saved and restored when switching between tabs
- **Secure Credential Preservation** - Editing environments preserves existing stored credentials when not explicitly changed
- **WebView State Manager** - Reusable utility for form state persistence across all panels
- **Data Explorer Panel** - Comprehensive data browsing and querying interface for Dataverse entities
  - **Entity Browser** - Browse all entities with type indicators (System/Custom/Virtual)
  - **View Selector** - Select from predefined system views with automatic default view detection
  - **Direct FetchXML Execution** - Views execute FetchXML directly against Web API for full compatibility
  - **Layout-aware Display** - Uses LayoutXML to determine column order and visibility
  - **Developer-friendly Headers** - Shows exact logical names for copy-paste into code
  - **Smart Pagination** - 200-record default with "Load More" functionality

### Changed
- **Activity Bar Icon** - Updated SVG icon for improved visual clarity
- **Query Data to Data Explorer** - Renamed panel for better clarity and modern feel
- **OData Pagination Implementation** - Fixed DataExplorerPanel and DataverseQueryService to use proper Microsoft OData pagination with Prefer header instead of $top/$skip parameters

### Fixed
- **Environment Setup Panels** - Multiple "Add Environment" tabs now maintain independent form state
- **Credential Management** - Editing environment settings no longer overwrites stored secrets when unchanged
- **Panel State Management** - Enhanced BasePanel class with proper multi-instance lifecycle management
- **Environment Edit Validation** - Fixed validation error requiring credentials when editing environments with existing stored secrets

### Technical
- Enhanced BasePanel with multi-instance tracking and unique panel IDs
- Added WebviewStateManager utility for automatic form state persistence
- Improved AuthenticationService with credential preservation logic
- Updated EnvironmentSetupPanel to support multiple concurrent instances
- **Data Explorer Architecture** - Dual-engine query system with FetchXML and OData approaches
- **FetchXmlParser Service** - Custom XML parser compatible with Node.js Extension Host environment
- **DataverseMetadataService** - Comprehensive metadata caching and OData value formatting
- **Direct FetchXML Execution** - `executeFetchXml()` method bypasses complex OData conversion
- **Entity Metadata Loading** - Support for System/Custom/Virtual entity type detection
- **Layout-aware Rendering** - LayoutXML parsing for view-specific column configuration

## [0.0.1] - 2025-08-28

### Added
- **Power Platform Developer Suite** - comprehensive VS Code extension for Power Platform development
- **Environment Management** - connect to multiple environments using 4 authentication methods:
  - Service Principal (Client ID/Secret)
  - Interactive Browser Authentication
  - Username/Password
  - Device Code Flow
- **Solution Explorer** - browse, filter, export, and manage Dynamics 365/Dataverse solutions
  - Real-time solution browsing with search and filtering
  - Export solutions directly from VS Code
  - Solution metadata and component analysis
- **Metadata Browser** - comprehensive three-panel interface for exploring Dataverse entity metadata
  - Browse tables and global choice sets with hierarchical navigation
  - Interactive metadata exploration: Tables → Columns, Keys, Relationships, Privileges
  - Detailed property panels showing complete entity, attribute, and relationship metadata
  - Smart caching system for instant tab switching and optimal performance
  - Export metadata objects to JSON format
  - Advanced search and filtering within metadata
- **Plugin Trace Viewer** - analyze and manage plugin execution traces
  - View plugin traces with advanced filtering (date ranges, plugin names, entities, exceptions)
  - Environment trace level management (Off/Exception/All) with live synchronization
  - Detailed trace analysis with Configuration and Execution tabs
  - Export trace data to CSV format
  - Stack trace syntax highlighting for debugging
- **Connection References Manager** - manage Power Automate flow connections
  - Browse flows and their connection reference relationships
  - View connection details and mapping to flows
  - Solution-based filtering with automatic Default solution selection
  - "Open in Maker" functionality to jump directly to Power Platform Maker portal
  - Sync deployment settings to JSON files for ALM workflows
- **Environment Variables Manager** - manage environment-specific configuration
  - Browse environment variables with solution filtering
  - View variable definitions, current values, and default values
  - "Open in Maker" functionality for direct editing
  - Sync deployment settings for automated deployment scenarios
- **Import Job Viewer** - monitor solution import operations
  - Real-time import status monitoring and progress tracking
  - View detailed import logs and XML configurations
  - Historical import job analysis
- **Professional UI/UX Features**:
  - VS Code theme integration with proper dark/light mode support
  - Sortable columns with visual indicators across all data tables
  - Text selection enabled in all table cells for easy copying
  - Responsive three-panel layouts that adapt to different screen sizes
  - Consistent "Open New Window" support via right-click context menus
  - Smart panel management - left-click focuses existing panels, right-click opens new instances

### Technical
- Modern TypeScript architecture with dependency injection via ServiceFactory
- Webpack bundling for optimized extension performance (92% size reduction)
- Comprehensive error handling and user feedback systems
- State persistence across VS Code sessions
- Smart caching systems with TTL for optimal API performance
- Proper disposal patterns for memory leak prevention
