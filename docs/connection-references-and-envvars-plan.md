## Connection References Manager & Environment Variables Manager — Implementation Plan

This document records the agreed scope, phases, data contracts, UI options, parsing approach, and next steps for the
Connection References Manager and the Environment Variables Manager. It's a living document for the current sprint and
will be deleted or moved to a formal doc once the work stabilizes.

## One-line goal
Provide a clear, easy-to-use VS Code panel that visualizes Flow → Connection Reference → Connection relationships and
produces a deployment settings skeleton (connection references + environment variables) for packaging and deployment.

## Checklist (explicit requirements)
- View flows in the default solution or a user-selected solution.
- Show which connection references are linked to those flows.
- Show which connections (runtime connections) are linked to the connection references.
- Provide a clear visual representation of Flow ↔ ConnectionReference ↔ Connection relationships.
- Generate a deployment settings skeleton (Phase 1: generate; Phase 2: preview and apply updates to files).
- Parse flow definitions to correctly map flow → connection reference relationships (approved).
- Reuse/port logic from the existing CLI (`PowerPlatform-ConnectionReferences-BestPractices`) where helpful, but keep the extension
  self-contained (no external CLI dependency).
- Provide shared logic with the Environment Variables Manager to avoid duplication.

## High-level phases and scope

- Phase 1 (MVP - prioritized)
  - Parse flows in a selected environment/solution and map connection references to flows.
  - Show a nested table (Flows → Connection References → Connection) in `ConnectionReferencesPanel`.
  - Provide a right-hand detail pane (metadata + actions: Open in Maker, Copy ID, Export JSON).
  - Export / generate a deployment settings skeleton JSON using `DeploymentSettingsService` (no file writes yet).
  - Add a `Visualize` toggle/button marked "coming soon" (UI placeholder for graph visualization).

- Phase 2 (Apply & EnvVars)
  - Add preview and apply logic to update an existing deploymentsettings.json (backup + diff + apply).
  - Integrate Environment Variables Manager logic and add environment variable handling to skeletons.
  - Add import/export (JSON) and basic conflict handling.

- Phase 3 (Cleanup & Automation)
  - Implement an automated cleanup/repair flow that can create connection references and link flows to them.
  - Optional graph visualization (cytoscape/d3) as a toggle for selected flows.
  - Advanced analysis features and CSV export.

## Data contracts (core shapes)

- FlowItem
  - id: string
  - name: string
  - solutionId?: string
  - definition?: any (raw flow definition used for parsing)

- ConnectionReferenceItem
  - id: string
  - name: string
  - connectorLogicalName?: string
  - referencedConnectionId?: string
  - referencedConnectionName?: string
  - flowIds?: string[]

- ConnectionItem
  - id: string
  - name: string
  - connector?: string
  - environmentId?: string

- DeploymentSettings (skeleton)
  - connectionReferences: Array<{ key: string, value: { connectionReferenceLogicalName: string, connectionId?: string | null } }>
  - environmentVariables?: Array<...> (match the shape used by the Environment Variables Manager)

These shapes will be returned by `ConnectionReferencesService.aggregateRelationships(environmentId)` and consumed by the panel and
`DeploymentSettingsService.createSkeletonFromRelationships()`.

## UI options considered (decision: Hybrid - start with nested table)

- Option A — Nested Table / Tree (chosen for Phase 1)
  - Fast to implement using `ComponentFactory.createDataTable()` and `TableUtils`.
  - Good for bulk actions, filtering, selection, and export.
  - Will show expandable Flow rows listing each Connection Reference used, which in turn shows bound Connection.

- Option B — Graph / Network visualization (Phase 3)
  - Intuitive for many-to-many relationships; highlights shared CRs and orphaned CRs quickly.
  - Heavier implementation and adds a dependency (e.g., cytoscape or d3). Will be implemented later and available behind a toggle.

- Option C — Hybrid (recommended long-term)
  - Default to nested table for discovery and bulk tasks; offer "Visualize selected" to open a graph view for a subset.
  - We'll include a disabled Visualize toggle in Phase 1 as a UX affordance.

## Parsing approach (flow definitions)

- Source of data: Dataverse Web API (workflow/workflows entity for flows), `connectionreferences`, and `connections` entities.
- For each flow, fetch the flow definition (sometimes stored as JSON in a `definition` or similar field, or as XAML).
- Parse the definition to extract connection reference names/keys:
  - Look for `connectionReferences` objects in flow JSON.
  - Traverse the flow definition JSON tree for nodes that include `connectionReferenceId`, `connectorId`, `referencedConnectionId`, or keys containing `connectionReference`.
  - Normalize names (case-insensitive) and match against `connectionreference.name` or logical names.
  - Create placeholder CR entries if a referenced name is present in a flow but not present as a `connectionreference` record.

Edge cases:
  - Flows that embed connection details inline (no CR) — mark as "inline connection" and surfaced in UI.
  - CR names that differ from display name — support matching by logical name and fuzzy fallback.
  - Large solutions — use server-side paging and incremental loading.

## Services and panel wiring

- `src/services/ConnectionReferencesService.ts` — aggregate relationships, parse flow definitions and return normalized model.
- `src/services/DeploymentSettingsService.ts` — create skeleton deployment settings JSON from relationships; later preview/apply functions.
- `src/panels/ConnectionReferencesPanel.ts` — UI webview using `ComponentFactory` + `PanelUtils` + `TableUtils`; sends/receives messages to/from service via `BasePanel` message handlers.
- `src/services/ServiceFactory.ts` — register new services and expose getters (already updated).

Message contract (webview <-> extension)
- 'loadConnectionReferences' { environmentId }
- 'connectionReferencesLoaded' { data: RelationshipResult }
- 'exportDeploymentSkeleton' { relationships }
- 'exportedSkeleton' { data: DeploymentSettings }

## Tests and quality gates

- Unit tests
  - `ConnectionReferencesService` parsing: happy path, missing CR, inline connection, large flow definition.
  - `DeploymentSettingsService`: skeleton creation keeps unknown fields and builds expected map.

- Quality gates
  - Build: `npm run compile` (webpack bundle) — must pass.
  - Lint: `npm run lint` — no new lint errors.
  - Tests: run existing test harness (if present) or add small mocha/jest tests for parsing.
  - Smoke: Start Extension Development Host, open `Connection References Manager`, select environment, and verify relationships table renders and Export returns skeleton.

## Security & data safety

- Never log access tokens or secrets. Use `AuthenticationService.getAccessToken()` and only include non-sensitive fields in webview messages.
- When writing deploymentsettings files (Phase 2), always create a timestamped backup and require explicit user confirmation.

## Timeline estimates (rough)

- Phase 1: 6–10 hours (parsing + nested table UI + export skeleton)
- Phase 2: 4–8 hours (preview + apply + env var integration)
- Phase 3: 6–12 hours (cleanup automation + graph visualization)

## Next immediate actions (short)
1. Finalize parsing rules and add unit tests for `ConnectionReferencesService` (current task).
2. Replace JSON preview with nested table UI and wire Export button (in progress).
3. Add deployment skeleton export handling in the backend and return to webview for preview.

If anything here needs to change, update this file and call out the adjustment.

Files currently involved (working set)
- `src/services/ConnectionReferencesService.ts` — aggregate + parse flows
- `src/services/DeploymentSettingsService.ts` — skeleton generator
- `src/panels/ConnectionReferencesPanel.ts` — panel and webview
- `src/services/ServiceFactory.ts` — service registration
- `src/panels/EnvironmentVariablesPanel.ts` — future integration

---
Last updated: 2025-08-25
