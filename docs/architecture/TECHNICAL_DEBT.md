# Technical Debt Registry

**Purpose:** Track known technical debt items with impact assessment and refactoring plans.

---

## Extension.ts Duplication

**Status:** Documented | **Priority:** P2

**Issue:** 6 feature initializers with ~80% similar code (violates CLAUDE.md Three Strikes Rule)

**Location:** `src/extension.ts`

**Affected Functions:**
- `initializeSolutionExplorer()`
- `initializeImportJobViewer()`
- `initializeConnectionReferences()`
- `initializeEnvironmentVariables()`
- `initializePluginTraceViewer()`
- `initializePluginRegistration()` (future)

**Impact:** Medium
- **Maintenance cost:** 6× changes required for pattern updates
- **Bug risk:** Medium (could forget to update all 6 initializers)
- **Size:** ~600 lines of ~80% duplicated code
- **Current consequences:** None (pattern works correctly, just repetitive)

**Why It Exists:**
- Pattern evolved organically as features were added
- Each feature needed similar initialization boilerplate
- No abstraction existed when pattern emerged

**Proposed Solution:** Generic FeatureInitializer abstraction

**Example Refactoring:**
```typescript
interface FeatureConfig<TPanel, TUseCases, TDeps> {
  imports: () => Promise<{
    Panel: new (...args: any[]) => TPanel;
    useCases: TUseCases;
    dependencies: TDeps;
  }>;
  createPanel: (
    context: vscode.ExtensionContext,
    useCases: TUseCases,
    deps: TDeps,
    initialEnvironmentId?: string
  ) => Promise<void>;
}

async function initializeFeature<TPanel, TUseCases, TDeps>(
  config: FeatureConfig<TPanel, TUseCases, TDeps>,
  context: vscode.ExtensionContext,
  commonDeps: CommonDependencies,
  initialEnvironmentId?: string
): Promise<void> {
  const { Panel, useCases, dependencies } = await config.imports();
  await config.createPanel(context, useCases, dependencies, initialEnvironmentId);
}
```

**Refactoring Plan:**
1. Implement 2-3 more features using current pattern
2. Validate pattern stability (current features + new features have same structure)
3. Design generic abstraction based on stabilized pattern
4. Refactor all feature initializers to use abstraction
5. Update NEW_FEATURE_WORKFLOW.md with new pattern

**Timeline:** After 2-3 more features implemented (validates pattern stability)

**Decision:** Defer refactoring until pattern stabilizes
- **Rationale:** Current pattern may evolve with next features
- **Risk if refactored now:** Premature abstraction could require re-refactoring
- **Risk if deferred:** Moderate - duplication increases maintenance burden, but not blocking

**Mitigations:**
- ✅ Process documentation updated (Priority 1 - COMPLETED)
- ✅ Workflow makes registration explicit (prevents missing registration)
- ✅ Design template includes integration checklist
- ✅ Architect reviews verify registration during final approval

---

## Template for Future Debt

**Status:** [Documented | In Progress | Resolved]

**Issue:** [Description of technical debt]

**Location:** [File paths or components affected]

**Impact:** [Low | Medium | High]
- **Maintenance cost:** [Description]
- **Bug risk:** [Description]
- **Size:** [Lines of code or scope]

**Why It Exists:** [Historical context]

**Proposed Solution:** [Brief description of fix]

**Refactoring Plan:** [Steps to resolve]

**Timeline:** [When to address this]

**Decision:** [Why we're keeping this debt for now]

**Mitigations:** [What we're doing to minimize impact]

---

## Guidelines for Adding Technical Debt

**When to document:**
- ✅ Code violates CLAUDE.md principles (e.g., Three Strikes Rule)
- ✅ Architect identifies architectural concerns during review
- ✅ Duplication reaches 3+ instances
- ✅ Known performance issues deferred for later optimization
- ✅ Temporary workarounds for external API limitations

**When NOT to document:**
- ❌ Simple refactoring opportunities (just do them)
- ❌ Minor code style improvements
- ❌ Personal preferences without architectural impact

**Required fields:**
- Status, Priority, Issue, Location, Impact, Proposed Solution
- Why It Exists (context for future developers)
- Decision (why we're deferring)

**Review cycle:**
- Review quarterly during maintenance windows
- Re-prioritize based on feature roadmap
- Close items after refactoring
