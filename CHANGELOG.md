# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Connection References panel with full API integration - browse flows and their connection references relationships
- Connection References panel fetches data using proper Dataverse field names (`connectionreferencelogicalname`, `connectionreferencedisplayname`, `connectionid`)
- Connection References panel extracts relationships from flow `clientdata` field for accurate flow-to-connection-reference mapping
- Connection References panel displays all flows, including those with direct connections (no connection references)
- Connection References panel now includes table sorting, filtering, and row actions using TableUtils and ComponentFactory

### Fixed
- Nothing yet

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

## [0.1.4] - 2025-08-25

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
