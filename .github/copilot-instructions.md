# GitHub Copilot Instructions for Dynamics DevTools

## Project Overview
This is a comprehensive VS Code extension for Microsoft Dynamics 365 / Power Platform development and administration. The extension provides a unified toolkit with modern UI components for managing environments, browsing metadata, monitoring solutions, and performing common development tasks.

**📚 For complete project information, see:**
- **[README.md](../README.md)** - Installation, usage, and getting started guide
- **[docs/ARCHITECTURE_GUIDE.md](../docs/ARCHITECTURE_GUIDE.md)** - Comprehensive architecture patterns and development guidelines

## Current Implementation Status
For the authoritative, versioned implementation status and release history see `CHANGELOG.md`.

Use this file for short, actionable developer hints and Copilot-specific instructions (e.g., which APIs are safe to call, which panels are scaffold-only, and where to find mocks/stubs).

## Release Notes & Change Management

Following industry best practices based on [Keep a Changelog](https://keepachangelog.com/) and [Semantic Versioning](https://semver.org/) standards.

### Documentation Hierarchy
- **[CHANGELOG.md](../CHANGELOG.md)** - Authoritative technical record following Keep a Changelog format
- **GitHub Releases** - User-focused release announcements generated from changelog
-- **README.md** - Current stable feature status and getting started guide

### Standard Release Process
1. **During Development**: Track all changes in `[Unreleased]` section of CHANGELOG.md
2. **Pre-Release**: Move unreleased changes to new versioned section with ISO date (YYYY-MM-DD)
3. **Release**: Create GitHub Release referencing changelog with user-focused highlights
4. **Post-Release**: Update README.md feature status if significant changes occurred

### Keep a Changelog Categories
Use semantic categories in CHANGELOG.md entries:
- **Added** - New features and capabilities
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Features removed in this release
- **Fixed** - Bug fixes and corrections
- **Security** - Security vulnerability fixes
- **Technical** - Internal changes, architecture improvements, build system updates

### Content Strategy Guidelines
- **CHANGELOG.md**: Technical accuracy, comprehensive change tracking, developer-focused
- **GitHub Releases**: User impact, benefits, breaking changes, migration guidance
- **README.md**: Honest feature status, clear capability descriptions
- **Version Numbers**: Follow semantic versioning (MAJOR.MINOR.PATCH)

## Core Development Principles

### 1. File Organization & Architecture
- **Follow the established modular architecture** documented in [ARCHITECTURE_GUIDE.md](../docs/ARCHITECTURE_GUIDE.md)
- **Split files logically** following the patterns in `/src` directory:
  - `panels/` - UI components extending `BasePanel` (7 panels implemented)
  - `commands/` - Command handlers organized by domain
  - `providers/` - Tree view data providers
  - `services/` - Business logic and API interactions with dependency injection
  - `webview/components/` - Shared utilities (TableUtils, PanelUtils, etc.)
  - `types/` - Shared TypeScript types and interfaces
- **Single Responsibility**: Each file should have one clear purpose
- **Consistent Structure**: New panels should extend `BasePanel` class
- **Dependency Injection**: Use ServiceFactory for all service dependencies

### 2. Code Style Guidelines
- **Prefer self-documenting code** - use clear, descriptive naming over excessive commenting
- **Strategic comments are welcome** for:
  - Complex algorithms or business logic that isn't immediately obvious
# GitHub Copilot Instructions for Dynamics DevTools

## Quick start (authority and hard rules)
- Authoritative changelog: see `CHANGELOG.md` for the canonical, versioned implementation status and release history.
- Hard rules (non-negotiable):
    - Never exfiltrate secrets, credentials, or sensitive data.
    - Do not perform external network calls except when explicitly requested and permitted by the user/repo owner.
    - Never paste raw patch diffs or terminal commands into chat output; use the repository edit and terminal workflows instead.
    - Ask a clarifying question when requirements are ambiguous.

## How to edit files (short checklist)
- Use the project's edit APIs/workflow: prefer `apply_patch` / `insert_edit_into_file` for edits.
- Make minimal, well-scoped changes that preserve coding style and public APIs.
- For runnable code: include a tiny test or runner and update manifests (`package.json` etc.) when required.
- Run the build (or the project's `Build Extension` task) and typecheck locally after substantive edits and report the results.

## Verification required before marking a change done
1. Build or compile step completed (or you ran the `Build Extension` task).
2. Type checks and unit tests (if present) pass.
3. `CHANGELOG.md` updated in `[Unreleased]` (or a release section added when releasing).

## Purpose of this file
Short, actionable guidance for automated editing agents and contributors (APIs safe to call, which panels are scaffold-only, where mocks/stubs live). For full release history and user-facing notes, consult `CHANGELOG.md` and GitHub Releases.

## Core development principles (concise)
- Follow the modular architecture in `docs/ARCHITECTURE_GUIDE.md`.
- Keep files small and single-purpose. Prefer composition over heavy inheritance.
- Use `ServiceFactory` for dependency injection and shared services.

## API & Dynamics guidelines (high level)
- Use `$select`, `$top`, `$orderby`, and `$expand` appropriately for OData queries.
- Prefer server-side pagination; be aware some entities (e.g., `importjobs`) have quirks.
- Use `AuthenticationService` for token management; do not create alternate auth patterns.

## UI & panel guidelines
- Extend `BasePanel` for webview panels and follow the established message-passing pattern.
- Ensure proper disposal of panels and listeners to avoid memory leaks.

## Security & privacy (reminder)
- Never log tokens or secrets. Use VS Code `SecretStorage` for sensitive data.

## Quick reference — Do / Don't
- Do: reuse existing utilities (`TableUtils`, `PanelUtils`), add tests for new behavior, and update `CHANGELOG.md`.
- Don't: invent new authentication patterns, hardcode URLs, or modify large unrelated files.

## Communication & response style
- Provide a one-line plan, a short checklist of steps, then perform edits. Keep messages concise.
- When editing code, report build/typecheck status and list the files changed.

## Change tracking
- Always update `CHANGELOG.md` under `[Unreleased]` for development changes. Move entries to a versioned section when releasing.

## Example patterns (unchanged)
...existing code...
