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

### UI Approach
- **Layout**: Main webview panel with sidebar navigation
- **Style**: Clean cards, consistent spacing, professional feel
- **Components**: Reusable Web Components with proper encapsulation
- **Structure**: Service/Repository pattern for business logic

## Feature Scope ✅

### Phase 1 (MVP)
- Environment connection management
- Simple entity browser (list tables, view records)
- Basic data querying interface
- Solution listing and basic info

### Phase 2 (Future)
- Data cloning between environments
- Complex relationship handling
- Model generation
- Solution import history
- Advanced query builder

## Questions Still Needed 🤔

### Authentication & Security
1. **Connection Method**: How should users authenticate?
   - Service Principal (App Registration)
   - Interactive login (OAuth)
   - Connection strings
   - Multiple methods supported?

2. **Credential Storage**: Where to store connection info?
   - VSCode settings (plain text)
   - VSCode SecretStorage API (encrypted)
   - Windows Credential Manager
   - Temporary session only?

### Project Setup
3. **Extension Name**: What should we call this extension?
   - "Dynamics DevTools"
   - "Power Platform DevTools" 
   - "Dataverse Developer Tools"
   - Something else?

4. **Feature Priority**: What should we build first after basic setup?
   - Environment connection UI
   - Entity browser
   - Simple query interface
   - Solution explorer

### Development Preferences
### Authentication State Handling
* If PAC CLI authentication fails, extension features relying on it will be unavailable until resolved.
* Other authentication options (SDK, OData, etc.) may be added later.
* Credentials for multiple environments will be stored (encrypted if possible), allowing users to select environments for operations (including cloning).
5. **Testing**: What testing approach do you prefer?
   - Unit tests (Jest/Mocha)
   - Manual testing only initially
   - Integration tests with test environment

6. **Code Structure**: Any specific patterns you want to enforce?
   - Specific folder structure preferences
   - Naming conventions
   - Interface/abstract class usage

### Distribution
7. **Deployment**: How do you want to distribute this?
   - VSCode Marketplace (public)
   - Private distribution (.vsix files)
   - Internal only for now

## Next Steps
Once these questions are answered, we'll:
1. Create the extension scaffold
2. Set up the webview infrastructure
3. Build the first UI components
4. Implement basic environment connection
