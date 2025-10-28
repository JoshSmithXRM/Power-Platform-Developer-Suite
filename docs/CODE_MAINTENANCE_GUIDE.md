# Code Maintenance Guide

**Last Updated**: 2025-10-28
**Status**: ✅ Active

## Overview

This guide provides comprehensive, scalable strategies for finding and eliminating dead code, technical debt, and maintaining codebase health. Dead code is expensive: it increases cognitive load, hides bugs, slows builds, and compounds over time.

**Philosophy**: Prevention through architecture + detection through tooling + regular maintenance = healthy codebase.

## Related Documentation

- **[ARCHITECTURE_GUIDE.md](ARCHITECTURE_GUIDE.md)** - SOLID principles that prevent dead code
- **[DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)** - Build and test workflows
- **[LINT_RECOMMENDATIONS.md](LINT_RECOMMENDATIONS.md)** - ESLint rules and violations

---

## Why Code Maintenance Matters

### The Cost of Dead Code

Dead code creates **compound technical debt**:

1. **Cognitive Load** - Developers must read and understand code that never executes
2. **False Confidence** - Assumes code works because it "looks fine" (never tested)
3. **Maintenance Burden** - Refactoring updates dead code unnecessarily
4. **Bug Hiding** - Dead code can mask real bugs in similar patterns
5. **Build Bloat** - Larger bundles, slower compilation

### Real Examples from This Codebase

#### Example 1: The `case 'refresh-data':` Incident

**What Happened**: Found 5 panels with identical `case 'refresh-data':` handlers that were never called.

**Files**:
- MetadataBrowserPanel.ts (lines 439-457) - 19 lines of dead code
- EnvironmentVariablesPanel.ts - Dead handler
- ConnectionReferencesPanel.ts - Dead handler
- SolutionExplorerPanel.ts - Dead handler
- ImportJobViewerPanel.ts - Dead handler

**Root Cause**: Refactored refresh logic to use abstraction, forgot to remove old handlers.

**Detection Failure**: No tooling caught it because:
- No unused variable warnings (it's a case statement)
- No code coverage (not running tests on panel message handlers)
- No contract validation (message names not type-checked)

**Solution**: Contract-based validation (see Tier 3 below)

#### Example 2: The ActionBar `initializeState()` Bug

**What Happened**: ActionBar buttons not working because `initializeState()` never called during initialization.

**Root Cause**: Template Method Pattern implemented incorrectly - base class had conditional hook calls.

**Detection Failure**:
- TypeScript didn't catch it (method was optional)
- No runtime error (just silent failure)

**Solution**: Enforce all hooks via abstract methods or always-call pattern (see Preventative Architecture below)

---

## Detection Methods

### Tier 1: Essential (Run Regularly)

These tools should run **every commit** or **daily**. They catch the most common issues with minimal overhead.

#### 1.1 Static Analysis - Unused Exports

**Tool**: `ts-prune`

Finds TypeScript exports that are never imported anywhere.

```bash
# Install
npm install --save-dev ts-prune

# Run
npx ts-prune

# Example output
# src/utils/OldHelper.ts:15 - formatDate (used in module)
# src/utils/DeadHelper.ts:8 - calculateFoo (exported but never used)
```

**What it catches**:
- ✅ Unused exported functions
- ✅ Unused exported classes
- ✅ Unused exported interfaces
- ❌ Unused private methods (use call graph for this)

**Recommended frequency**: Weekly

**Package.json script**:
```json
"dead-code:check": "ts-prune"
```

#### 1.2 Static Analysis - Unused Dependencies

**Tool**: `depcheck`

Finds npm packages installed but never imported.

```bash
# Install
npm install --save-dev depcheck

# Run
npx depcheck

# Example output
# Unused dependencies
# * axios
# * lodash
```

**What it catches**:
- ✅ Dependencies in package.json never imported
- ✅ devDependencies that should be dependencies (and vice versa)

**Recommended frequency**: Monthly

**Package.json script**:
```json
"dead-code:deps": "depcheck"
```

#### 1.3 TypeScript Compiler - Unused Locals

**Tool**: Built into TypeScript (already configured)

```json
// tsconfig.json (already have this)
{
  "compilerOptions": {
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**What it catches**:
- ✅ Variables declared but never read
- ✅ Function parameters never used
- ✅ Imports never referenced

**Recommended frequency**: Every compile (automatic)

#### 1.4 ESLint Rules - Code Quality

**Tool**: ESLint (already configured)

```json
// .eslintrc.json (verify these are enabled)
{
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }],
    "no-unreachable": "error",
    "no-fallthrough": "error"
  }
}
```

**What it catches**:
- ✅ Unused variables (stricter than TypeScript)
- ✅ Unreachable code after return/throw
- ✅ Switch case fallthrough (often a bug)

**Recommended frequency**: Every compile (automatic via `npm run compile`)

#### 1.5 Comment Archaeology - Technical Debt Markers

**Tool**: grep

Finds TODO/FIXME/HACK comments indicating temporary or dead code.

```bash
# Find all technical debt markers
grep -rnw . -e 'TODO\|FIXME\|XXX\|HACK' \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=.git

# Filter by age (comments added >6 months ago often indicate forgotten code)
git log --all --since="6 months ago" -G"TODO|FIXME" --oneline
```

**What it catches**:
- ✅ Temporary workarounds that became permanent
- ✅ "Remove after migration" comments from 2 years ago
- ✅ Dead code marked for deletion

**Recommended frequency**: Weekly audit, quarterly cleanup

**Package.json script**:
```json
"comment-audit": "grep -rnw . -e 'TODO\\|FIXME\\|XXX\\|HACK' --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git"
```

#### 1.6 Dead CSS Detection

**Tool**: PurgeCSS, uncss, or Chrome DevTools Coverage

**This codebase has extensive CSS** in `resources/webview/css/`. Dead CSS is common after refactoring.

```bash
# Install
npm install --save-dev purgecss

# Create purgecss.config.js
module.exports = {
  content: [
    './resources/webview/**/*.html',
    './resources/webview/js/**/*.js',
    './src/**/*.ts'  // For generateHTML() calls
  ],
  css: ['./resources/webview/css/**/*.css']
};

# Run
npx purgecss --config purgecss.config.js --output dist/purged-css/
```

**What it catches**:
- ✅ CSS classes never referenced in HTML/JS
- ✅ Obsolete component styles after refactoring
- ✅ Vendor CSS you're not using

**Manual alternative**: Chrome DevTools > Coverage tab (shows unused CSS/JS in running extension)

**Recommended frequency**: Monthly or after major refactors

**Package.json script**:
```json
"dead-css": "purgecss --config purgecss.config.js"
```

---

### Tier 2: Recommended (Run Periodically)

These tools provide **deeper analysis** but take longer to run or require setup. Run **weekly or monthly**.

#### 2.1 Code Coverage Analysis

**Tool**: Jest with coverage reporting (or nyc/c8)

**The Gold Standard**: Code with 0% coverage is either dead or untested.

```bash
# Install (if not already)
npm install --save-dev jest ts-jest @types/jest

# Run tests with coverage
npm test -- --coverage

# Generates report showing:
# - Lines never executed (0% coverage)
# - Functions never called
# - Branches never taken
```

**What it catches**:
- ✅ Functions never called during tests (likely dead)
- ✅ Code paths never executed (unreachable)
- ✅ Case handlers never triggered (like `case 'refresh-data':`)

**Critical for catching**: Message handlers, switch cases, conditional branches

**Recommended frequency**: Every pull request (CI/CD)

**Package.json script**:
```json
"test:coverage": "jest --coverage --coverageThreshold='{\"global\":{\"statements\":80,\"branches\":75,\"functions\":80,\"lines\":80}}'"
```

#### 2.2 Call Graph Analysis

**Tool**: madge, dependency-cruiser

**Maps entire codebase** to find orphaned functions and circular dependencies.

```bash
# Install
npm install --save-dev madge

# Generate call graph
npx madge --circular --extensions ts src/

# Find orphaned files (no imports)
npx madge --orphans --extensions ts src/

# Visualize (creates image)
npx madge --image graph.svg --extensions ts src/
```

**What it catches**:
- ✅ Private methods never called by their class
- ✅ Modules with no incoming imports (orphans)
- ✅ Circular dependencies (code smell)

**Example output**:
```
✖ Found circular dependency!
src/panels/BasePanel.ts > src/components/ComponentFactory.ts > src/panels/BasePanel.ts
```

**Recommended frequency**: Monthly or after major refactors

**Package.json script**:
```json
"call-graph": "madge --circular --extensions ts src/",
"call-graph:orphans": "madge --orphans --extensions ts src/"
```

#### 2.3 Type Coverage Analysis

**Tool**: type-coverage

**Measures `any` usage** - high `any` usage correlates with code smells and dead code.

```bash
# Install
npm install --save-dev type-coverage

# Run (set threshold to 95%+)
npx type-coverage --at-least 95

# Example output
# 2345 / 2400 95.12%
# type-coverage success
```

**What it catches**:
- ✅ `any` types indicating rushed/forgotten code
- ✅ Untyped parameters (often in dead code)
- ✅ Loss of type safety over time

**Recommended frequency**: Monthly, track trend

**Package.json script**:
```json
"type-coverage": "type-coverage --at-least 95 --ignore-files 'src/**/*.spec.ts'"
```

#### 2.4 Bundle Analysis

**Tool**: webpack-bundle-analyzer

**Shows what's in production bundle** - large modules may contain dead code.

```bash
# Install
npm install --save-dev webpack-bundle-analyzer

# Add to webpack.config.js
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html'
    })
  ]
};

# Run production build
npm run package

# Open bundle-report.html
```

**What it catches**:
- ✅ Unexpectedly large modules
- ✅ Dependencies bundled but rarely used
- ✅ Duplicate code across chunks

**Recommended frequency**: Quarterly or before releases

**Package.json script**:
```json
"analyze:bundle": "webpack --mode production --profile --json > stats.json && webpack-bundle-analyzer stats.json"
```

#### 2.5 Dead Documentation Links

**Tool**: markdown-link-check

**Finds broken links in documentation** - often indicates dead features.

```bash
# Install
npm install --save-dev markdown-link-check

# Check all markdown files
find docs -name '*.md' -exec markdown-link-check {} \;

# Example output
# ✖ [404] docs/OLD_FEATURE.md
```

**What it catches**:
- ✅ Links to deleted files
- ✅ References to removed features
- ✅ Outdated external links

**Recommended frequency**: Monthly

**Package.json script**:
```json
"check:docs": "find docs -name '*.md' -exec markdown-link-check {} \\;"
```

---

### Tier 3: Advanced (Strategic Use)

These techniques require **custom implementation** or are **project-specific**. Use for high-value scenarios.

#### 3.1 Runtime Telemetry (Production)

**Tool**: Application Insights, custom telemetry

**Shows what ACTUALLY runs in production** - the ultimate dead code detector.

```typescript
// Example: Track feature usage in VS Code extension
import * as vscode from 'vscode';

export class TelemetryService {
    private static reporter: vscode.TelemetryReporter;

    static trackEvent(eventName: string, properties?: Record<string, string>): void {
        this.reporter?.sendTelemetryEvent(eventName, properties);
    }
}

// Usage in panels
TelemetryService.trackEvent('metadataBrowser.opened');
TelemetryService.trackEvent('actionBar.refresh.clicked');
```

**What it catches**:
- ✅ Features never used by anyone
- ✅ Buttons never clicked
- ✅ Code paths never executed in production

**Analysis**: After 3-6 months, features with 0 usage are candidates for removal.

**Privacy note**: VS Code extensions must respect user telemetry settings. Always use `vscode.TelemetryReporter` API.

**Recommended frequency**: Continuous (analyze quarterly)

#### 3.2 Contract-Based Validation (Message Handlers)

**Tool**: Custom TypeScript implementation

**Prevents the `case 'refresh-data':` problem** - exhaustive message type checking.

```typescript
// src/types/MessageContracts.ts
export const VALID_PANEL_MESSAGES = {
  'component-event': true,
  'environment-selected': true,
  'environment-changed': true,
  'panel-ready': true,
  'table-search': true,
  // ... exhaustive list
} as const;

export type ValidPanelMessage = keyof typeof VALID_PANEL_MESSAGES;

// BasePanel.ts
protected async handleMessage(message: any): Promise<void> {
    const command = message.command as string;

    // Runtime validation
    if (!(command in VALID_PANEL_MESSAGES)) {
        this.componentLogger.warn(`Unknown message: ${command}`);
        // Catches typos AND dead handlers
    }

    // Type-safe switch
    switch (command as ValidPanelMessage) {
        case 'component-event':
            // ...
    }
}
```

**Combine with static analysis**:

```bash
# Find all case statements
grep -r "case '" src/panels/*.ts | sed "s/.*case '\(.*\)':.*/\1/" | sort -u > cases.txt

# Find all postMessage commands
grep -r "command:" src/ resources/webview/ | sed "s/.*command: *['\"]\\(.*\\)['\"].*/\1/" | sort -u > commands.txt

# Compare - anything in cases.txt but not in commands.txt = dead handler
comm -23 cases.txt commands.txt
```

**What it catches**:
- ✅ Case handlers never sent from webview
- ✅ Typos in message names (compile error)
- ✅ Forgotten handlers after refactoring

**Recommended frequency**: Implement once, runs automatically

#### 3.3 AST-Based Custom Analysis

**Tool**: TypeScript Compiler API or jscodeshift

**Write one-off scripts** for project-specific patterns.

```typescript
// scripts/find-unused-private-methods.ts
import * as ts from 'typescript';

// Parse AST, find all private methods, check if called within class
// Custom logic for your specific patterns
```

**Use cases**:
- Find private methods never called
- Find classes never instantiated
- Find interfaces only used in one file (should be local)

**Recommended frequency**: As needed for specific audits

---

### Tier 4: Experimental (Consider for Critical Paths)

These are **expensive or complex** but provide the **highest confidence**. Use for mission-critical code.

#### 4.1 Mutation Testing

**Tool**: Stryker

**Deliberately breaks code** to see if tests catch it. If not, either code is dead or tests are bad.

```bash
# Install
npm install --save-dev @stryker-mutator/core @stryker-mutator/typescript-checker

# Run (slow - can take hours)
npx stryker run

# Example output
# ✓ 145 mutants killed (tests caught the bug)
# ✗ 12 mutants survived (code changes didn't break tests - suspicious!)
```

**What it catches**:
- ✅ Code that doesn't matter (changing it doesn't break anything)
- ✅ Insufficient test coverage
- ✅ Dead conditional branches

**Warning**: Very slow. Only run on critical modules.

**Recommended frequency**: Quarterly for high-risk code paths

#### 4.2 Feature Flags + Usage Tracking

**Tool**: Custom feature flag system + telemetry

**Gradual code removal** - turn off features, measure impact, then delete.

```typescript
// Feature flag example
const FEATURES = {
  oldImportFlow: false,  // Disabled, monitor for issues
  newImportFlow: true
};

if (FEATURES.oldImportFlow) {
  // Mark as deprecated, remove after 2 releases
  await oldImportLogic();
} else {
  await newImportLogic();
}
```

**Process**:
1. Wrap suspected dead code in feature flag (default: on)
2. Turn flag off in canary release
3. Monitor errors/complaints for 1-2 releases
4. Delete code if no issues

**Recommended frequency**: For major refactors or risky deletions

---

## Preventative Architecture

**Better than detection: prevent dead code from being created.**

### Pattern 1: Template Method Pattern

**Prevents**: Missing implementations (like `initializeState()` bug)

```typescript
// BaseBehavior.js
static initialize(componentId, config, element) {
    const instance = this.createInstance(componentId, config, element);

    // ALWAYS call ALL hooks (no if checks)
    this.findDOMElements(instance);
    this.setupEventListeners(instance);
    this.initializeState(instance);  // Always exists (default no-op)

    this.instances.set(componentId, instance);
}

// Default implementations prevent silent failures
static initializeState(instance) {
    // Override in subclass if needed
}
```

**Why it works**: Base class enforces lifecycle, missing overrides are intentional defaults.

### Pattern 2: Message Contract System

**Prevents**: Dead message handlers (like `case 'refresh-data':`)

```typescript
// Define all valid messages in one place
export const PANEL_MESSAGES = {
  'component-event': z.object({ componentId: z.string() }),
  'environment-selected': z.object({ environmentId: z.string() }),
  // ...
} as const;

// Type-safe and runtime-validated
type PanelMessage = keyof typeof PANEL_MESSAGES;
```

**Why it works**: Single source of truth, TypeScript enforces exhaustiveness.

### Pattern 3: Interface Segregation Principle (ISP)

**Prevents**: `any` types that hide dead code

```typescript
// ❌ Bad - defeats type safety
compose(components: BaseComponent<any>[]) { }

// ✅ Good - segregated interface
interface IRenderable {
    generateHTML(): string;
    getCSSFile(): string;
}
compose(components: IRenderable[]) { }
```

**Why it works**: Narrow interfaces mean unused methods are obvious.

### Pattern 4: Fail Fast

**Prevents**: Silent failures (graceful degradation that hides bugs)

```typescript
// ❌ Bad - fails silently
const data = instance.getData?.() || null;

// ✅ Good - throws if method missing
if (!instance.getData) {
    throw new Error(`${instance.constructor.name} must implement getData()`);
}
const data = instance.getData();
```

**Why it works**: Loud failures surface problems during development.

---

## CI/CD Integration

**Automate detection** so humans don't have to remember.

### Pre-commit Hooks

```bash
# .husky/pre-commit
#!/bin/sh
npm run lint
npm run compile

# Fast checks only (< 30 seconds)
```

### Pull Request CI

```yaml
# .github/workflows/pr-checks.yml
name: PR Quality Checks
on: [pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci

      # Tier 1 checks (essential)
      - run: npm run lint
      - run: npm run compile
      - run: npm run dead-code:check
      - run: npm run comment-audit

      # Tier 2 checks (recommended)
      - run: npm run test:coverage
      - run: npm run type-coverage

      # Fail PR if violations found
```

### Weekly Scheduled Audits

```yaml
# .github/workflows/weekly-audit.yml
name: Weekly Code Health Audit
on:
  schedule:
    - cron: '0 0 * * 1'  # Every Monday

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - run: npm run maintenance:full
      - run: npm run analyze:bundle

      # Post results to Slack/Teams
```

---

## Maintenance Schedule

| Frequency | Tools | Time Cost | Value |
|-----------|-------|-----------|-------|
| **Every Commit** | ESLint, TypeScript | 0 sec (auto) | High |
| **Daily** | CI/CD checks | 2-5 min | High |
| **Weekly** | ts-prune, comment-audit, call-graph | 10-15 min | High |
| **Monthly** | Coverage, type-coverage, depcheck, dead-css | 30-45 min | Medium |
| **Quarterly** | Bundle analysis, full audit, mutation testing | 2-3 hours | Medium |
| **Ad-hoc** | AST scripts, manual review | Variable | High |

### Recommended Workflow

**Every Sprint**:
1. Run `npm run maintenance:weekly` at start of sprint
2. Create backlog tickets for issues found
3. Allocate 10-20% of sprint to tech debt cleanup

**Every Release**:
1. Run `npm run maintenance:full`
2. Run `npm run analyze:bundle`
3. Document any skipped issues (with justification)

**Quarterly Tech Debt Sprint**:
1. Run all Tier 1-3 tools
2. Audit results from production telemetry
3. Prioritize and eliminate dead code
4. Update this guide with new patterns

---

## Package.json Scripts Reference

Add these to your `package.json`:

```json
{
  "scripts": {
    "dead-code:check": "ts-prune",
    "dead-code:deps": "depcheck",
    "type-coverage": "type-coverage --at-least 95 --ignore-files 'src/**/*.spec.ts'",
    "dead-css": "purgecss --config purgecss.config.js",
    "comment-audit": "grep -rnw . -e 'TODO\\|FIXME\\|XXX\\|HACK' --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git",
    "call-graph": "madge --circular --extensions ts src/",
    "call-graph:orphans": "madge --orphans --extensions ts src/",
    "check:docs": "find docs -name '*.md' -exec markdown-link-check {} \\;",
    "test:coverage": "jest --coverage",
    "analyze:bundle": "webpack --mode production --profile --json > stats.json && webpack-bundle-analyzer stats.json",

    "maintenance:weekly": "npm run dead-code:check && npm run comment-audit && npm run call-graph",
    "maintenance:monthly": "npm run maintenance:weekly && npm run dead-code:deps && npm run type-coverage",
    "maintenance:full": "npm run maintenance:monthly && npm run test:coverage && npm run analyze:bundle"
  }
}
```

---

## War Stories: Lessons from This Codebase

### The Three Strikes Rule

**Pattern discovered**: When fixing same code in N≥3 files, stop and create abstraction.

**Example**: Refresh button added manually to 7 panels → Should have created `BasePanel.getStandardRefreshAction()` after panel #3.

**Lesson**: Duplication is a code smell that leads to dead code after refactoring.

### The Silent Failure

**Pattern discovered**: Methods with default no-ops hide missing implementations.

**Example**: `BaseBehavior.initializeState()` was never called → ActionBar buttons didn't work, no error thrown.

**Lesson**: Use Template Method Pattern + abstract methods to enforce implementations.

### The Message Handler Graveyard

**Pattern discovered**: Case handlers outlive the messages that trigger them.

**Example**: 5 panels with `case 'refresh-data':` handlers after refactoring to abstraction.

**Lesson**: Message contracts + static analysis prevent orphaned handlers.

---

## Quick Reference Checklist

**Before every commit**:
- [ ] `npm run compile` passes (includes lint)
- [ ] No new `any` types added
- [ ] No new `eslint-disable` comments

**Before every PR**:
- [ ] Tests pass with coverage
- [ ] No new unused exports (`npm run dead-code:check`)
- [ ] Resolved any TODO comments you added

**Monthly maintenance**:
- [ ] Run `npm run maintenance:monthly`
- [ ] Review bundle size trends
- [ ] Audit comment archaeology results
- [ ] Check type coverage hasn't dropped

**Quarterly deep dive**:
- [ ] Run `npm run maintenance:full`
- [ ] Review production telemetry (if enabled)
- [ ] Mutation testing on critical paths
- [ ] Update this guide with new patterns

---

## Tools Installation

**Essential** (Tier 1):
```bash
npm install --save-dev ts-prune depcheck
```

**Recommended** (Tier 2):
```bash
npm install --save-dev madge type-coverage webpack-bundle-analyzer markdown-link-check
npm install --save-dev jest ts-jest @types/jest  # If not already installed
```

**Advanced** (Tier 3+):
```bash
npm install --save-dev @stryker-mutator/core @stryker-mutator/typescript-checker
npm install --save-dev purgecss
```

---

## References

- **Internal**:
  - [ARCHITECTURE_GUIDE.md](ARCHITECTURE_GUIDE.md) - SOLID principles
  - [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) - Build workflow
  - [LINT_RECOMMENDATIONS.md](LINT_RECOMMENDATIONS.md) - ESLint rules

- **External**:
  - [ts-prune](https://github.com/nadeesha/ts-prune) - Find unused exports
  - [depcheck](https://github.com/depcheck/depcheck) - Find unused dependencies
  - [madge](https://github.com/pahen/madge) - Call graph analysis
  - [type-coverage](https://github.com/plantain-00/type-coverage) - Type safety metrics
  - [Stryker](https://stryker-mutator.io/) - Mutation testing
  - [PurgeCSS](https://purgecss.com/) - Dead CSS elimination

---

**Last Updated**: 2025-10-28

**Status**: ✅ Active - Review quarterly, update with new patterns discovered
