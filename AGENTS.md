# Repository Guidelines

## Project Structure & Module Organization
TypeScript extension code stays in `src/` with commands, providers, services, and panels housed in their dedicated folders (`src/commands`, `src/providers`, `src/services`, `src/panels`). Reusable UI components live under `src/components` and are composed through the factories documented in `docs/`. Webview assets (CSS/JS) belong in `resources/webview/**`; treat them as browser-only modules. Generated bundles in `dist/` and `out/` should never be edited directly; regenerate them via npm scripts. Long-form guidance is collected under `docs/`, and release automation sits in `scripts/` (e.g., `scripts/test-release.ps1`).

## Build, Test, and Development Commands
After cloning, run `npm install`. Use `npm run compile` for a development webpack build and `npm run watch` during active work. Quality gates include `npm run lint` / `npm run lint:fix` (ESLint rules in `eslint.config.mjs`) and `npm run test`, which runs the VS Code extension harness (`./out/test/runTest.js`) after `npm run compile-tests`. Production bundles rely on `npm run package` and `npm run vsce-package` to emit `power-platform-developer-suite-<version>.vsix`. For an end-to-end smoke check, prefer `npm run test-release` or `scripts/test-release.ps1 -Clean -Verbose`.

## Coding Style & Naming Conventions
Follow strict TypeScript with 4-space indentation and single quotes, mirroring `src/extension.ts`. Classes, panels, and components use PascalCase; functions, locals, and instances stay camelCase; enums lean toward SCREAMING_SNAKE_CASE. Keep business logic in services, orchestration in panels, and presentation in components created via `ServiceFactory`/`ComponentFactory`. The logging architecture disallows raw `console` in TypeScript; obtain loggers from `ServiceFactory.getLoggerService()` or `this.componentLogger`. Webview scripts remain in `resources/webview/js`, import only browser-safe utilities, and communicate with the extension host through `postMessage`.

## Architecture & Component Patterns
- Always instantiate UI through `ComponentFactory`/`PanelComposer`; avoid ad-hoc HTML strings.
- Maintain Extension Host <-> Webview separation: never import TypeScript classes into browser scripts, and route updates through message bridges.
- Use component event bridges instead of `updateWebview()` to push data; ensure grid rows include stable `id` fields.
- Transform Dataverse responses in panels before handing them to components so services stay data-source agnostic.
- Reuse behavior registration patterns from `docs/COMPONENT_PATTERNS.md` when adding webview logic.

## Testing Guidelines
House extension tests in `src/test/` using filenames such as `EnvironmentCommands.test.ts`. Compile with `npm run compile-tests` before executing `npm run test`. Prioritise service-level unit tests with mocked Dataverse calls and panel integration tests that validate message passing. Document any manual verification steps (e.g., `npm run test-release`) in pull requests.

## Commit & Pull Request Guidelines
Keep commits short and imperative (`update documentation`, `optimize component logging`). Every code change must update the `[Unreleased]` section of `CHANGELOG.md`, which CI enforces. Pull requests should describe the scenario, list validation commands, and attach screenshots or GIFs for UI changes. Link issues and flag configuration or authentication impacts.

## Security & Configuration Tips
Honor the credential flow: secrets belong in `vscode.SecretStorage`, cached tokens in `node-persist`. Never commit credentials, `.env` files, or local caches. Strip hostnames, tenant IDs, and access tokens from logs, and rely on the structured loggers to preserve telemetry consistency.
