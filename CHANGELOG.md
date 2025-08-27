# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **MAJOR**: Rebranded from "Dynamics DevTools" to "Power Platform Developer Suite" to better reflect the comprehensive Power Platform development toolkit vision and avoid naming conflicts in the marketplace
- Updated all development scripts and package references to use new branding
- Added explicit `bugs` and `homepage` fields to package.json for proper VS Code Marketplace integration
- Added extension icon for professional marketplace appearance
- Created custom Power Platform-themed SVG icon for VS Code activity bar (replaces generic wrench icon)
- **PERFORMANCE**: Metadata Browser now loads all entity metadata (columns, keys, relationships, privileges) when a table is selected instead of lazy loading each tab - provides instant tab switching with better user experience
- Metadata Browser uses intelligent caching system with parallel API calls for optimal performance when loading complete entity metadata
- **UI/UX**: Improved Metadata Browser layout and space utilization with larger fonts (13-14px), better grid proportions, and enhanced property display sections
- **UI/UX**: Enhanced main panel property display with organized sections (Basic Information, Entity Attributes, Capabilities) and improved spacing
- **UI/UX**: Expanded right panel property grid with wider label columns (180px) and better readability
- **UI/UX**: Improved responsive design with better breakpoints for different screen sizes
- **UI/UX**: Enhanced tab switching in Metadata Browser - maintains per-tab selected row context and properties panel state, allowing users to return to previously selected items in each tab
- **UI/UX**: Fixed left panel overflow scrollbar issue in Metadata Browser - adjusted main container height calculation and added proper overflow constraints
- **UI/UX**: Fixed table footer overlap by adopting shared component structure (table-scroll-wrapper) while maintaining client-side compatibility
- **UI/UX**: Enabled column sorting on all metadata browser tables - users can click column headers to sort data ascending/descending with visual indicators
- **UI/UX**: Enhanced left panel display format to show 'Display Name (logical name)' for easier browsing and identification
- **UI/UX**: Fixed choices not loading - added complete choice selection functionality with options display and properties panel
- **UI/UX**: Added close button (×) to properties panel header and click-to-deselect functionality - users can close properties panel by clicking the close button or clicking an already selected row

### Added
- **NEW FEATURE**: Comprehensive Metadata Browser with modern three-panel layout for browsing Dataverse entity metadata
- Metadata Browser features complete entity exploration: Tables and Global Choices with hierarchical navigation
- Interactive metadata browsing: entity selection → tabbed details (Table, Columns, Keys, Relationships, Privileges) → detailed properties
- Smart metadata caching system with 5-minute TTL for optimal performance across large environments
- Advanced metadata search and filtering capabilities within the browser interface
- Complete entity attribute metadata display with proper type handling, required levels, and capability flags
- Entity relationship browsing (1:N, N:1, N:N) with full cascade configuration and navigation property details
- Entity key metadata viewing including alternate keys and index status information
- Entity privilege analysis showing security permissions and access levels
- Export functionality for metadata objects to JSON format
- MetadataService with full Dataverse metadata API integration and intelligent caching
- Three-panel responsive layout: Entity tree (left) → Metadata details (center) → Properties (right)
- Plugin Trace Viewer with comprehensive trace log analysis and environment trace level management
- Plugin trace setting selector (Off/Exception/All) that synchronizes with environment configuration
- Advanced filtering system for plugin traces: date ranges, plugin names, entity names, exception-only mode
- Real-time trace data table with sortable columns: Start Time, Duration, Plugin, Step, Depth, Mode, Stage, Entity, Message, Exception
- Plugin trace export functionality to CSV format with all trace details
- PluginTraceService for efficient API queries with OData filtering and optimization
- Enhanced plugin trace detail viewer with tabbed interface matching Dynamics 365 structure (Configuration and Execution tabs)
- Plugin trace detail modal now displays Plugin Trace Log ID at the top and additional fields (Operation Type, Performance Details)
- Reusable modal dialog system (ModalUtils) for displaying detailed information across all panels
- Stack trace syntax highlighting in exception details for better readability
- Connection References panel with full API integration - browse flows and their connection references relationships
- Connection References panel fetches data using proper Dataverse field names (`connectionreferencelogicalname`, `connectionreferencedisplayname`, `connectionid`)
- Connection References panel extracts relationships from flow `clientdata` field for accurate flow-to-connection-reference mapping
- Connection References panel displays all flows, including those with direct connections (no connection references)
- Connection References panel now includes table sorting, filtering, and row actions using TableUtils and ComponentFactory
- SolutionComponentService for proper Dynamics solution membership queries via EntityDefinitions and solutioncomponents tables
- Solution selector functionality on Connection References and Environment Variables panels with Default solution auto-selection
- "Open in Maker" button functionality for connection references and environment variables with correct Power Platform URLs
- Table footer with record count display - shows filtered count and total when applicable (always visible at bottom)
- ComponentFactory now supports table footers with customizable text and record count placeholders
- Deployment Settings sync functionality - create or update deployment settings JSON files from solution data
- "Sync Deployment Settings" button in Connection References and Environment Variables panels
- Enhanced DeploymentSettingsService with file operations, user file selection, and smart sync logic
- Automatic deployment settings file naming pattern: `{SolutionUniqueName}.deploymentsettings.json`
- Intelligent sync behavior: adds new items, removes orphaned items, preserves existing values
- Consistent deployment settings file sorting: Connection References by LogicalName, Environment Variables by SchemaName (prevents source control noise)
- Text selection enabled in table cells - users can now highlight and copy text from any table cell
- Normalized footer messages across all panels with consistent format: "Showing X of Y items"
- Generic SolutionComponentService.getEntityIdsInSolution method for flexible entity type filtering
- Environment Variables panel with full API integration and solution filtering support

### Fixed
- Table UX improvements: enabled text selection (`user-select: text`) and text cursor (`cursor: text`) for all table cells
- Footer message consistency: all panels now use standardized "Showing {filteredCount} of {totalCount} items" format
- Activity bar icon theming: replaced complex graphics with simple "PP" text-based 24x24 SVG using `currentColor` to ensure proper VS Code theme integration, hover states, and selection highlighting
- Metadata Browser webview disposal error when clicking choice option rows - created separate choice display logic to avoid entity-specific message handling conflicts

### Changed
- Nothing yet

### Deprecated
- Nothing yet

### Removed
- Nothing yet

### Fixed
- Nothing yet

### Security
- Nothing yet

### Known Issues
- Deployment settings sync includes secret environment variable values in plain text - requires research into secret detection/masking

## [0.0.1] - 2025-08-25

### Added
- Initial release of Dynamics DevTools extension
- Environment Management with 4 authentication methods (Service Principal, Interactive, Username/Password, Device Code)
- Solution Explorer with full API integration - browse, filter, export, and manage solutions
- Import Job Viewer with real-time status monitoring and XML viewing capabilities
- Environment Setup wizard with connection testing and validation
- Left-click focus/reuse behavior for tools in sidebar
- Right-click context menu with "Open New Window" option for tools
- Query Data panel framework with environment selector (API integration pending)
- Metadata Browser panel framework with environment selector (API integration pending)
- Connection References Manager panel framework with environment selector (API integration pending)
- Environment Variables Manager panel framework with environment selector (API integration pending)
- Plugin Trace Viewer panel framework with environment selector (API integration pending)

### Technical
- Added `CompleteEntityMetadata` interface and `getCompleteEntityMetadata()` method to MetadataService for bulk metadata loading
- Enhanced MetadataBrowserPanel with client-side metadata caching for instant tab switching
- Improved MetadataService with parallel Promise.all() API calls for better performance when loading complete entity metadata
- Updated metadata browser UI to show loading state during initial metadata fetch while maintaining instant tab switching afterward
- Modular architecture with BasePanel foundation and dependency injection via ServiceFactory
- Shared UI utilities (TableUtils, PanelUtils, EnvironmentSelectorUtils, ValidationUtils)
- Complete solution management API integration via SolutionService
- Import job monitoring API integration with real-time status updates
- VS Code theme integration with CSS variables for consistent theming
- State persistence across VS Code sessions via StateService
- Webpack bundling configuration for optimized production builds
- Comprehensive error handling and user feedback systems
- Static panel tracking system in BasePanel for efficient window management
- createNew methods for all panels to support new window creation
- Panel focus logic to bring existing panels to foreground
- Enhanced ToolsProvider with contextValue support for menu targeting
- Proper disposal patterns for memory leak prevention
