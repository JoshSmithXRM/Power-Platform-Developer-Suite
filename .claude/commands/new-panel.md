# New Panel

Design and scaffold a new VS Code panel feature with Clean Architecture.

## Usage

`/new-panel [panel name and purpose]`

If `$ARGUMENTS` not provided, ask: "What panel should I create? (name and purpose)"

## Process

1. **Gather Context** (parallel)
   - Read CLAUDE.md for project rules
   - Read `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md` for panel patterns
   - Read `.claude/templates/PANEL_INITIALIZATION_PATTERN.md` (CRITICAL)
   - Read example panel: `src/features/pluginTraceViewer/` or `src/features/solutionExplorer/`

2. **Invoke design-architect**

   Use Task tool with `subagent_type: design-architect` and this prompt:
   ```
   PROJECT CONTEXT:
   - Read CLAUDE.md for coding rules
   - Read .claude/templates/PANEL_DEVELOPMENT_GUIDE.md
   - Read .claude/templates/PANEL_INITIALIZATION_PATTERN.md (CRITICAL - singleton pattern)

   DESIGN REQUEST:
   New VS Code panel: [name and purpose from $ARGUMENTS]

   PANEL REQUIREMENTS:
   - Singleton pattern: private static currentPanel + createOrShow() factory
   - HTML in presentation/views/, NOT in panel TypeScript
   - Typed message handling (discriminated unions)
   - All dependencies via constructor injection

   STRUCTURE (under src/features/[featureName]/):
   - domain/ - Entities with behavior, repository interfaces
   - application/ - Use cases, ViewModels, mappers
   - infrastructure/ - Repository implementations
   - presentation/ - Panel, views/, message handlers

   OUTPUT:
   - Save design to: docs/design/[FEATURE]_PANEL_DESIGN.md
   - Include: Panel mockup, message types, ViewModels, use cases, domain entities
   - Break into slices (MVP first)
   ```

3. **After Design Approval**
   - Create directory structure
   - Implement inside-out: Domain → App → Infra → Presentation
   - `npm run compile` after each layer

## Key Patterns

- **Singleton**: `private static currentPanel: Panel | undefined`
- **Factory**: `public static createOrShow(context, ...deps)`
- **HTML separation**: All HTML in `presentation/views/`
- **Dependency injection**: Constructor injection, testable

## Reference Panels

- `src/features/pluginTraceViewer/` - Complex panel with filtering
- `src/features/solutionExplorer/` - Panel with tree view
- `src/features/environmentSetup/` - Simpler panel with forms
