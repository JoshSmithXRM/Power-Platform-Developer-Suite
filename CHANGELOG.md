# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
