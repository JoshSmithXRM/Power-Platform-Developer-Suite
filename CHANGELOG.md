# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Technical
- **Component-Based Architecture** - Complete rewrite of extension architecture from scratch
  - Moved existing code to `src/old/` directory for reference
  - Created new component-based infrastructure with 4-file pattern per component
  - Implemented BaseComponent with EventEmitter for loose coupling
  - Created 80+ TypeScript interfaces for comprehensive type safety
  - Built ComponentUtils.js for webview-side component management
- **Core Components Implemented** - Phase 3 completed with three production-ready components
  - **EnvironmentSelectorComponent** - Multi-instance environment selector with status indicators
  - **ActionBarComponent** - Flexible action bar with buttons, dropdowns, and responsive overflow
  - **SearchFormComponent** - Advanced form component supporting 8 field types with validation
- **Data Components Implemented** - Phase 4 completed with comprehensive table components
  - **DataTableComponent** - Full-featured data table with sorting, filtering, pagination, selection, actions, and export
  - **EmptyTableComponent** - Simplified table component for basic data display scenarios
  - **FilterableTableComponent** - Advanced table extending DataTable with sophisticated filter builder, saved filters, and complex filter expressions
- **VS Code Theme Integration** - All components use VS Code CSS custom properties for native theming
- **Build System** - Clean webpack compilation with zero errors (329 KiB production bundle)
- **Professional Logging System** - Phase 7 logging implementation completed
  - **Centralized LoggerService** - VS Code native LogOutputChannel API with structured JSON metadata
  - **Security-Safe Logging** - Automatic sanitization of tokens, passwords, and sensitive data
  - **Component-Specific Loggers** - Individual logger instances for each component with consistent formatting
  - **Multiple Log Levels** - trace, debug, info, warn, error with proper usage patterns
  - **User-Accessible Logs** - Available via VS Code "Developer: Open Extensions Logs Folder" command
  - **Performance-Conscious** - Minimal overhead structured logging with lazy initialization
- **Phase 7 Panel Implementation** - Component-based architecture successfully applied to production panels
  - **EnvironmentSetupPanel** - Rewritten using EnvironmentSelectorComponent + ActionBarComponent composition
  - **ConnectionReferencesPanel** - Rewritten using EnvironmentSelectorComponent + ActionBarComponent + DataTableComponent composition
  - **Node.js Compatibility** - Fixed DOM API usage in Extension Host context with proper HTML escaping utilities
  - **Complete Initialization Flow** - Proper panel lifecycle with component creation, initialization, and webview updates
  - **Error-Free Startup** - Clean component initialization with comprehensive error handling and logging
  - **Architecture Compliance** - Fixed panels to use proper PanelComposer.composeMultiple() instead of custom HTML generation
  - **Panel Standardization** - All Phase 7 panels now use consistent PanelComposer.createStandardTemplate() pattern with proper header/body/footer sections
  - **Logging Standardization** - All panels now have consistent component logging with trace, debug, info levels
  - **Architecture Alignment** - Implemented simple PanelComposer.compose() method as specified in architecture guide, replacing over-engineered template system
  - **Simplified Composition** - All panels now use direct component composition: `PanelComposer.compose([components], resources, title)` for immediate fix of display issues
  - **Node.js Compatibility Fix** - Fixed remaining DOM API usage in DataTableView and SolutionSelectorView components to use HtmlUtils.escapeHtml() for Extension Host context
  - **Panel-Specific Styling Support** - Enhanced PanelComposer to automatically load optional panel-specific CSS files for customizing component styles per panel

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
