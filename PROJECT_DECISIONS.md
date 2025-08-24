# Dynamics DevTools - Project Decisions & Architecture

## Project Overview
Building a VSCode extension that provides an admin interface for Dynamics 365/Dataverse environments, similar to Power Platform maker utility but with enhanced developer tools.

## Technology Decisions ✅

### Core Stack
- **Extension Host**: TypeScript (Node.js environment)
- **UI Framework**: Vanilla TypeScript + Web Components  
- **Architecture**: Clean, SOLID principles (C#-style patterns)
- **External Integrations**: PAC CLI + OData/SDK calls
- **Styling**: Modern CSS (Power Platform + Postman inspired)
- **Credential Storage**: VS Code SecretStorage API (encrypted)

### UI Approach
- **Layout**: Main webview panel with sidebar navigation
- **Style**: Clean cards, consistent spacing, professional feel
- **Components**: Reusable Web Components with proper encapsulation
- **Structure**: Service/Repository pattern for business logic

## Current Implementation Status

### ✅ Completed Infrastructure
- Extension scaffold and activation system
- Command registration framework
- Tree view provider structure with working environment display
- BasePanel foundation class for webviews
- TypeScript build configuration
- **✅ Complete Authentication Service** with credential storage
- **✅ Environment Management** - add/store/display environments
- **✅ VS Code SecretStorage** implementation for secure credentials
- **✅ Token caching** and refresh handling

### ✅ Completed Core Panels
- **✅ Solution Explorer Panel** - Solution listing, details, and management
- **✅ Import Jobs Panel** - Solution import monitoring and history
- **✅ OData Service Layer** - API calls to Dynamics 365 with proper error handling
- **✅ Metadata Browser Panel** - Entity metadata exploration similar to XRM Toolbox

### ❌ Missing UI Panels (Next Phase)
- **Environment Management Panel** - Webview UI for adding environments (currently done via command)
- **Data Querying Panel** - Query builder and results display
- **Main Dashboard Panel** - Central hub with navigation

## Feature Scope ✅

### Phase 1 (Current - MVP Foundation) ✅
- ✅ Environment connection management with SecretStorage
- ✅ Environment persistence and tree view display
- ✅ Authentication service with multiple auth methods
- ✅ Solution exploration and management
- ✅ Import job monitoring and history
- ✅ Metadata browser for entity exploration

### Phase 2 (Next - Data Features)
- Data querying interface with query builder
- Environment management webview panel
- Environment management webview panel

### Phase 3 (Future - Advanced Features)
- Data cloning between environments
- Complex relationship handling
- Model generation
- Advanced query builder
- Solution comparison tools

## Immediate Next Steps (Priority Order)

1. **🟡 High: Create Entity Browser Panel**
   - List tables/entities in environment
   - Basic entity exploration interface
   - Use existing OData service layer

2. **🟡 High: Create Data Querying Panel**
   - Query builder interface
   - Results display with pagination
   - Export functionality

3. **🟡 High: Create Environment Management Panel**
   - Webview UI for adding/editing environments
   - Connection testing interface
   - Alternative to command-based environment creation

4. **🟢 Medium: Main Dashboard Panel**
   - Central navigation hub
   - Environment overview and quick actions
   - Integration with existing panels

5. **🟢 Low: Advanced Solution Features**
   - Solution comparison between environments
   - Solution dependency analysis
   - Bulk solution operations

## Questions Resolved ✅

### Authentication & Security
- **Connection Method**: Multiple methods supported (OAuth, Service Principal)
- **Credential Storage**: VS Code SecretStorage API (encrypted) ✅ IMPLEMENTED
- **Environment Persistence**: VS Code GlobalState ✅ IMPLEMENTED

### Core Features
- **Solution Management**: ✅ IMPLEMENTED (listing, details, import monitoring)
- **Import Job Tracking**: ✅ IMPLEMENTED (history, status, error details)
- **OData Integration**: ✅ IMPLEMENTED (API service with error handling)

### Project Setup  
- **Extension Name**: "Dynamics DevTools"
- **Feature Priority**: Entity browser → Data querying → Environment management panel
- **Current Status**: Core solution features complete, ready for data exploration features

### Development Preferences
- **Testing**: Manual testing initially, unit tests later
- **Code Structure**: Current modular architecture with panels/commands/services
- **Distribution**: Private distribution initially

## Completed User Workflows ✅

### Solution Management Workflow
1. ✅ Browse solutions in environment
2. ✅ View solution details and components
3. ✅ Open solutions in Power Platform Maker
4. ✅ Monitor import jobs and status
5. ✅ View import job details and errors

### Next Target Workflows
1. **Entity Exploration**: Browse tables → View entity details → Explore relationships
2. **Data Querying**: Build queries → Execute against environment → Export results
3. **Environment Setup**: Add environments via UI → Test connections → Manage credentials
