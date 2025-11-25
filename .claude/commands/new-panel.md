# New Panel

Scaffold a new VS Code panel feature with proper Clean Architecture structure.

## Usage

`/new-panel [panel name and purpose]`

If `$ARGUMENTS` not provided, ask: "What panel should I create? (name and purpose)"

## Process

1. **Read Templates** (parallel)
   - `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md`
   - `.claude/templates/PANEL_INITIALIZATION_PATTERN.md`
   - Example panel structure from existing feature (e.g., `src/features/pluginTraceViewer/`)

2. **Invoke design-architect**

   Use Task tool with `subagent_type: design-architect`:
   ```
   Design a new VS Code panel: [name and purpose]

   CRITICAL: Follow PANEL_INITIALIZATION_PATTERN.md exactly:
   - Singleton pattern with static currentPanel
   - createOrShow() factory method
   - Proper dispose() cleanup

   Structure (under src/features/[featureName]/):
   - domain/ - Entities with behavior, repository interfaces, domain services
   - application/ - Use cases, ViewModels (DTOs), mappers
   - infrastructure/ - Repository implementations, external APIs
   - presentation/ - Panel class, views/, message handlers

   Include:
   - Panel mockup (webview HTML structure)
   - Message types (panel ↔ extension communication)
   - ViewModels for each data display
   - Use cases for each user action
   - Domain entities with rich behavior
   ```

3. **Create Directory Structure**

   After design approval, create:
   ```
   src/features/[featureName]/
   ├── domain/
   │   ├── entities/
   │   ├── repositories/
   │   └── services/
   ├── application/
   │   ├── useCases/
   │   ├── viewModels/
   │   └── mappers/
   ├── infrastructure/
   │   └── repositories/
   └── presentation/
       ├── panels/
       └── views/
   ```

4. **Implement Inside-Out**

   Domain → Application → Infrastructure → Presentation

   Run `npm run compile` after each layer.

## Key Patterns

- **Singleton panel**: `private static currentPanel: Panel | undefined`
- **Factory method**: `public static createOrShow(context, ...deps)`
- **HTML in views/**: Never inline HTML in panel TypeScript
- **Message handling**: Typed message discriminated unions
- **Dependency injection**: All dependencies via constructor

## Reference

See existing panels for patterns:
- `src/features/pluginTraceViewer/` - Complex panel with filtering
- `src/features/environmentSetup/` - Simpler panel with forms
