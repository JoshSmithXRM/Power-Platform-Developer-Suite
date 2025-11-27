# ALM & Documentation Review TODO

**Branch:** `docs/alm-documentation-review`
**Created:** 2025-11-26
**Status:** In Progress - Phase 5c Documentation Cleanup

---

## Problem Statement

When implementing new features, Claude overlooks existing patterns and functionality, leading to:
- Wasted tokens rebuilding what already exists
- Pattern violations that require reverts
- Need for overly explicit instructions from user

**Goal:** Make Claude organically discover and respect existing patterns before implementing new code.

---

## End Goals (Success Criteria)

| Goal | Description | How to Measure |
|------|-------------|----------------|
| **Pattern Discovery** | Claude explores existing code before writing new code | Reduction in "had to revert and use existing pattern" situations; observe in next 3-5 feature implementations |
| **Doc Discoverability** | Claude finds relevant docs when needed; no redundant/conflicting docs | Manual test: give Claude a problem, see if it finds the right doc |
| **Minimal Effective Guidance** | Every instruction earns its place; no bloat diluting important rules | Track CLAUDE.md size vs. compliance rate; observe rule adherence |
| **Pipeline Reliability** | Automated quality gates catch issues before merge | GitHub Actions history; failed builds caught pre-merge |

---

## Evaluation Gates (All Proposals Must Pass)

Before accepting ANY change, it must pass these gates:

### Gate 1: Problem Evidence
- Is there a documented instance where this was a problem?
- Or is this theoretical/preventative?
- **Reject if:** No concrete example of the problem occurring

### Gate 2: Root Cause
- Does this address root cause or symptom?
- **Reject if:** Band-aid fix that doesn't solve underlying issue

### Gate 3: Claude Behavior Alignment
- Does this align with how Claude actually processes instructions?
- **Anthropic best practices:**
  - Instructions at the top of context are weighted more heavily
  - Specific examples are more effective than abstract rules
  - Shorter, focused guidance outperforms exhaustive lists
  - Repetition of critical rules helps retention
- **Reject if:** Works against Claude's natural behavior

### Gate 4: Maintenance Burden
- Will this need constant updating?
- Does it create documentation that can go stale?
- **Reject if:** Creates more maintenance than value

### Gate 5: Testability
- Can we verify this change has the intended effect?
- How will we know if it's working?
- **Reject if:** No way to validate effectiveness

---

## Review Process

| Phase | Description | Output |
|-------|-------------|--------|
| **1. Inventory** | Document what exists, note purpose of each item. No judgments yet. | Complete inventory list |
| **2. Gap Analysis** | Map each item to goals. Identify missing and redundant items. | Gap report |
| **3. Propose Changes** | Each suggestion includes: problem it solves (with example), which goal it serves, expected outcome, how to measure success. | Proposal list |
| **4. Evaluate Proposals** | Run each proposal through the 5 gates. User approves/declines. Document rationale. | Approved changes |
| **5. Implement & Validate** | Make approved changes. Test in real feature work. Iterate based on results. | Completed changes |

---

## Anthropic Best Practices (Reference)

1. **Front-load critical instructions** - Most important rules at top of CLAUDE.md
2. **Use examples over abstractions** - Show don't tell
3. **Keep context lean** - Claude performs better with focused vs. exhaustive guidance
4. **Explicit workflow triggers** - "Before implementing, ALWAYS..." is clearer than "consider exploring"
5. **Structured decision points** - Checklists Claude can follow mechanically

---

## Recommended Work Order

### 1. Claude Usage Improvements (RECOMMENDED FIRST)

**Rationale:** This directly addresses the core pain point. Improving Claude's discovery workflow will make all subsequent work more effective - including this very audit.

**Scope:**
- [ ] Review current `.claude/` structure and effectiveness
- [ ] Analyze CLAUDE.md for gaps in pattern discovery guidance
- [ ] Review/improve slash commands for pre-implementation discovery
- [ ] Consider adding a mandatory "explore existing patterns" step to workflows
- [ ] Evaluate if agents (design-architect, code-guardian) need pattern-awareness improvements
- [ ] Document existing patterns more explicitly so Claude can find them

### 2. Documentation Audit (SECOND)

**Rationale:** Once Claude workflows are improved, we ensure documentation supports those workflows effectively.

**Scope:**
- [ ] Inventory all documentation files (docs/, .claude/, root)
- [ ] Check for staleness (outdated information)
- [ ] Identify missing documentation
- [ ] Review cross-references and navigation
- [ ] Consolidate or remove redundant docs
- [ ] Ensure architecture patterns are discoverable
- [ ] Verify CLAUDE.md references are accurate

### 3. Pipeline Review (THIRD)

**Rationale:** Operational improvements after foundational docs/workflows are solid.

**Scope:**
- [ ] Audit GitHub Actions workflows
- [ ] Review release process automation
- [ ] Identify CI/CD gaps
- [ ] Check test automation coverage
- [ ] Review branch protection and merge requirements
- [ ] Document any missing pipeline documentation

---

## Approval Status

- [x] **Work order approved by user** (2025-11-26)
- [x] **Review framework approved by user** (2025-11-26)
- [x] Phase 1: Inventory complete (2025-11-26)
- [x] Phase 2: Gap Analysis complete (2025-11-26)
- [x] Phase 3: Proposals documented (2025-11-26)
- [x] Phase 4: Proposals evaluated & approved (2025-11-26)
- [x] Phase 5: Implementation complete (2025-11-26)

---

## Inventory

### .claude/ Directory (29 files)

#### Core Files
| File | Purpose | Notes |
|------|---------|-------|
| `README.md` | Quick start guide for Claude Code setup | Links to other files, architecture reference |
| `WORKFLOW.md` | Feature dev, bug fix, refactor workflows | Defines when to design vs just implement |
| `TROUBLESHOOTING.md` | Common problems and solutions | Agent issues, build issues, context issues |
| `settings.local.json` | Local Claude settings | Git-ignored |
| `settings.local.example.json` | Template for local settings | Checked in |

#### Agents (2 active, 3 archived)
| File | Purpose | Notes |
|------|---------|-------|
| `agents/code-guardian.md` | Code review & final approval gate | ~1000 lines, comprehensive checklist |
| `agents/design-architect.md` | Outside-in feature design | ~925 lines, panel architecture focus |
| `archive/agents/code-guardian.md` | Old version | Archived |
| `archive/agents/design-architect.md` | Old version | Archived |
| `archive/agents/docs-generator.md` | Deprecated agent | Archived |
| `archive/AGENTS.md` | Old agent documentation | Archived |
| `archive/SETUP_GUIDE.md` | Old setup guide | Archived |

#### Slash Commands (10 commands)
| File | Purpose | Notes |
|------|---------|-------|
| `commands/README.md` | Command index and workflows | Lists all commands with usage |
| `commands/design.md` | `/design` - Invoke design-architect | Scope guidelines by complexity |
| `commands/code-review.md` | `/code-review` - Invoke code-guardian | Prerequisites checklist |
| `commands/new-panel.md` | `/new-panel` - Scaffold panel | References templates |
| `commands/cleanup-code.md` | `/cleanup-code` - Fix violations | Parallel grep searches |
| `commands/comprehensive-review.md` | `/comprehensive-review` - 8-agent review | Quarterly, 15 min, expensive |
| `commands/review-technical-debt.md` | `/review-technical-debt` - Audit debt | Verify, classify, cleanup |
| `commands/fix-technical-debt.md` | `/fix-technical-debt` - Fix debt items | Interactive selection |
| `commands/prepare-release.md` | `/prepare-release` - Release prep | Version bump, changelog, notes |
| `commands/handoff.md` | `/handoff` - Session summary | Context for next session |

#### Templates (3 templates)
| File | Purpose | Notes |
|------|---------|-------|
| `templates/TECHNICAL_DESIGN_TEMPLATE.md` | Design document format | ~700 lines, comprehensive |
| `templates/PANEL_DEVELOPMENT_GUIDE.md` | Panel architecture decisions | Framework vs direct, sections |
| `templates/PANEL_INITIALIZATION_PATTERN.md` | Two-phase init pattern | CRITICAL for race conditions |

#### Skills (2 skills)
| File | Purpose | Notes |
|------|---------|-------|
| `skills/code-cleanup/SKILL.md` | Auto-detected code quality issues | Invokes cleanup-code command |
| `skills/code-review-gateway/SKILL.md` | Auto-detect ready for review | Invokes code-guardian |

#### Requirements (1 file)
| File | Purpose | Notes |
|------|---------|-------|
| `requirements/METADATA_BROWSER_REQUIREMENTS.md` | Feature requirements doc | User stories, technical reqs |

#### Examples (1 file)
| File | Purpose | Notes |
|------|---------|-------|
| `examples/ExampleBehavior.js` | Example webview behavior | Reference implementation |

---

### docs/ Directory (53 files)

#### Root docs/
| File | Purpose | Notes |
|------|---------|-------|
| `README.md` | Documentation index | Links to all doc sections |
| `GETTING_STARTED.md` | User getting started guide | Setup, authentication |
| `RELEASE_GUIDE.md` | Release process documentation | Detailed release workflow |
| `DOCUMENTATION_STYLE_GUIDE.md` | Doc writing standards | Formatting rules |
| `DATA_EXPLORER_TODO.md` | Data Explorer feature tracking | Active work |
| `ALM_DOCUMENTATION_REVIEW_TODO.md` | This document | Active work |

#### Architecture (17 files)
| File | Purpose | Notes |
|------|---------|-------|
| `architecture/CLEAN_ARCHITECTURE_GUIDE.md` | Core architecture patterns | Main reference |
| `architecture/CLEAN_ARCHITECTURE_EXAMPLES.md` | Code examples | Supports guide |
| `architecture/CLEAN_ARCHITECTURE_PATTERNS.md` | Pattern catalog | Supports guide |
| `architecture/CODE_QUALITY_GUIDE.md` | Comment & code standards | CLAUDE.md references |
| `architecture/LOGGING_GUIDE.md` | Logging by layer | CLAUDE.md references |
| `architecture/DOMAIN_SERVICE_PATTERNS.md` | Domain service patterns | Collection services |
| `architecture/MAPPER_PATTERNS.md` | Mapper implementation | Sorting rules |
| `architecture/REPOSITORY_PATTERNS.md` | Repository patterns | Interface in domain |
| `architecture/VALUE_OBJECT_PATTERNS.md` | Value object patterns | Immutability |
| `architecture/ODATA_DOMAIN_PATTERN.md` | OData query pattern | Infrastructure concern |
| `architecture/PANEL_ARCHITECTURE.md` | Panel composition | PanelCoordinator, sections |
| `architecture/WEBVIEW_PATTERNS.md` | Webview message contracts | CSS, behaviors |
| `architecture/STATIC_FACTORY_PATTERN.md` | Static factory pattern | createOrShow |
| `architecture/RENDERING_PATTERN_DECISION.md` | HTML vs data-driven | Decision doc |
| `architecture/RESIZABLE_DETAIL_PANEL_*.md` | Detail panel pattern (3 files) | Pattern documentation |

#### Design (9 files)
| File | Purpose | Notes |
|------|---------|-------|
| `design/DATA_EXPLORER_DESIGN.md` | Data Explorer design | Active feature |
| `design/DATA_EXPLORER_INTELLISENSE_*.md` | IntelliSense designs (2) | Enhancement |
| `design/DATETIME_FILTER_ARCHITECTURE.md` | Filter architecture | Component design |
| `design/FILTER_PANEL_IMPROVEMENTS_DESIGN.md` | Filter improvements | Enhancement |
| `design/METADATA_BROWSER_*.md` | Metadata browser (2) | Feature design |
| `design/WEBVIEW_TYPESCRIPT_MIGRATION_DESIGN.md` | TS migration | Future work |
| `design/CLEANUP_GUIDE.md` | Design doc cleanup | Process doc |
| `design/reviews/README.md` | Review folder readme | Empty placeholder |

#### Designs (1 file - note: separate from design/)
| File | Purpose | Notes |
|------|---------|-------|
| `designs/PLAYWRIGHT_E2E_DESIGN.md` | E2E testing design | Infrastructure |

#### Testing (3 files)
| File | Purpose | Notes |
|------|---------|-------|
| `testing/TESTING_GUIDE.md` | Unit testing patterns | Test factories |
| `testing/INTEGRATION_TESTING_GUIDE.md` | Panel integration tests | Webview testing |
| `testing/SOLUTION_PANEL_INTEGRATION_TESTS.md` | Specific panel tests | Example tests |

#### Releases (5 files)
| File | Purpose | Notes |
|------|---------|-------|
| `releases/README.md` | Release folder readme | Format guide |
| `releases/RELEASE_NOTES_GUIDE.md` | Release notes format | Writing guide |
| `releases/v0.2.0.md` | v0.2.0 release notes | Historical |
| `releases/v0.2.1.md` | v0.2.1 release notes | Historical |
| `releases/v0.2.2.md` | v0.2.2 release notes | Current |

#### Technical Debt (7 files)
| File | Purpose | Notes |
|------|---------|-------|
| `technical-debt/README.md` | Debt tracking index | Categories, counts |
| `technical-debt/TEMPLATE.md` | New debt item template | Standardized format |
| `technical-debt/accepted-tradeoffs/*.md` | Accepted tradeoffs (4) | Documented decisions |
| `technical-debt/low-priority/*.md` | Low priority items (1) | notification-service |
| `technical-debt/will-not-implement/*.md` | Won't fix (1) | xml-formatter |

#### Quality (2 files)
| File | Purpose | Notes |
|------|---------|-------|
| `quality/README.md` | Quality folder readme | Review process |
| `quality/2025-11-review.md` | November 2025 review | Historical |

---

### GitHub Actions (7 workflows)

| Workflow | Trigger | Purpose | Notes |
|----------|---------|---------|-------|
| `pr-validation.yml` | PR to main/feature/* | Lint, compile, test, type-coverage, circular deps, architecture | Full validation |
| `publish.yml` | Release published | Build & publish to marketplace | Requires ADO_MARKETPLACE_PAT |
| `codeql.yml` | Push to main, PR to main, weekly | Security scanning | CodeQL analysis |
| `ensure-changelog.yml` | PR events | Require CHANGELOG update | Blocks PR if missing |
| `bundle-size.yml` | PR to main (src changes) | Check VSIX size < 10MB | Comments on PR |
| `version-bump.yml` | Manual dispatch | Bump version, tag, release | Requires WORKFLOW_PAT |
| `dependabot.yml` | Weekly/Monthly | Dependency updates | NPM + GH Actions |

---

### Root Config Files

| File | Purpose | Notes |
|------|---------|-------|
| `CLAUDE.md` | Project rules for Claude | ~17KB, auto-loaded |
| `README.md` | Project readme | User-facing |
| `CHANGELOG.md` | Version history | ~29KB, detailed |
| `CONTRIBUTING.md` | Contribution guide | PR process |
| `SECURITY.md` | Security policy | Vulnerability reporting |
| `FUTURE_ENHANCEMENTS.md` | Planned features | ~24KB, deferred work |
| `package.json` | NPM config | Dependencies, scripts |
| `tsconfig.json` | TypeScript config | Strict mode |
| `tsconfig.build.json` | Build-specific TS config | Production settings |

---

## Gap Analysis

### What's Working Well (Don't Change)

| Element | Why It Works | Evidence |
|---------|--------------|----------|
| NEVER/ALWAYS rules | Clear, unambiguous boundaries | Consistent enforcement of `any`, layer violations |
| Agents (code-guardian, design-architect) | Specialized deep work | Comprehensive reviews, structured designs |
| Slash commands | Explicit invocation points | `/design`, `/code-review` are clear triggers |
| Inside-out implementation | Prevents architecture drift | Domain-first catches issues early |
| References to external docs | Keeps CLAUDE.md lean | Doesn't duplicate pattern guides |
| PR validation pipeline | Automated safety net | Catches compile/test/lint failures |
| Technical debt tracking | Documented tradeoffs | Prevents re-litigation of decisions |

### Critical Gaps Identified

| Gap | Type | Location | Impact | Root Cause |
|-----|------|----------|--------|------------|
| **No discovery step** | Structural | WORKFLOW.md, CLAUDE.md | HIGH | Workflow goes straight from request to design/implement without exploring existing patterns |
| **No work persistence rule** | Structural | CLAUDE.md | HIGH | Claude does work but doesn't document/commit incrementally |
| **Defensive commit rules** | Guidance | CLAUDE.md | MEDIUM | "Only commit when requested" causes unnecessary friction |
| **design-architect doesn't explore first** | Agent behavior | agents/design-architect.md | MEDIUM | Focuses on creating new designs, not discovering existing patterns |
| **No session context awareness** | Behavioral | CLAUDE.md | LOW | Rules are absolute, not situational |
| **design/ vs designs/ folders** | Organizational | docs/ | LOW | Minor naming inconsistency |

### Gap-to-Goal Mapping

| Goal | Status | Gaps Affecting It |
|------|--------|-------------------|
| **Pattern Discovery** | CRITICAL GAP | No discovery step, design-architect doesn't explore first |
| **Doc Discoverability** | Minor gaps | design/ vs designs/ confusion |
| **Minimal Effective Guidance** | Minor gaps | Potential CLAUDE.md/WORKFLOW.md overlap |
| **Pipeline Reliability** | Good | None identified |

### Root Cause Analysis

The core problem - "Claude overlooks existing patterns" - traces to:

1. **No explicit discovery step** - Workflows go straight from "understand request" to "design" or "implement"
2. **design-architect focuses on creation** - It designs new things, doesn't first check what exists
3. **Review happens too late** - code-guardian catches violations after implementation
4. **Work isn't persisted** - Progress isn't documented in files or committed incrementally

### Recommendation: Iterate, Don't Rewrite

**Why iterate:**
- Most of the workflow IS working (agents, commands, pipeline)
- Rewrite risks breaking what works
- Pain points are specific: discovery + persistence + context-awareness
- Anthropic best practice: focused changes outperform exhaustive rewrites

**Core fixes needed:**
1. Add "Explore Before Create" phase to workflow
2. Add "Persist Work Incrementally" rule
3. Adjust context-aware guidance for situational decisions

---

## Proposals

### Proposal 1: Add "Explore Before Create" Workflow Step

**Problem:** Claude implements new code without checking if similar patterns exist, leading to wasted tokens and reverts.

**Concrete Example:** Web resource editing feature - rebuilt a pattern that already existed in the codebase, had to revert and use existing approach.

**Proposal:** Add explicit discovery step to CLAUDE.md and WORKFLOW.md:
- Before implementing ANY new feature, explore existing codebase for similar patterns
- Check: similar entities, similar panels, similar use cases
- Document what was found before proceeding

**Goal Served:** Pattern Discovery

**Expected Outcome:** Claude asks "what exists?" before "what should I build?"

**How to Measure:** Observe next 3-5 feature implementations - does Claude explore first?

**Gates Evaluation:**
- Gate 1 (Problem Evidence): ✅ Concrete example provided (web resource editing)
- Gate 2 (Root Cause): ✅ Addresses missing workflow step
- Gate 3 (Claude Behavior): ✅ "Before X, ALWAYS Y" aligns with Anthropic best practices
- Gate 4 (Maintenance): ✅ Simple rule, doesn't go stale
- Gate 5 (Testability): ✅ Observable in next implementations

**Status:** Pending user approval

---

### Proposal 2: Add "Persist Work Incrementally" Rule

**Problem:** Claude does work (analysis, planning, implementation) but doesn't document it in files or commit at logical checkpoints.

**Concrete Example:** Gap analysis was done but not written to the TODO file until user pointed it out.

**Proposal:** Add to CLAUDE.md:
- When working on multi-phase tasks, create/update a tracking file
- Document progress in the file as work proceeds
- Commit after each completed phase/slice
- For code: commit per layer, get review before final commit
- For documentation/planning: commit at logical checkpoints without asking

**Goal Served:** Pattern Discovery (documentation), Minimal Effective Guidance (context-aware commits)

**Expected Outcome:** Work is persisted incrementally, no lost progress, clear audit trail

**How to Measure:** Observe if Claude updates files and commits without prompting

**Gates Evaluation:**
- Gate 1 (Problem Evidence): ✅ This session - gap analysis not documented until prompted
- Gate 2 (Root Cause): ✅ Addresses missing persistence rule
- Gate 3 (Claude Behavior): ✅ Explicit triggers work well with Claude
- Gate 4 (Maintenance): ✅ Simple behavioral rule
- Gate 5 (Testability): ✅ Observable immediately

**Status:** Pending user approval

---

### Proposal 3: Context-Aware Commit Guidance

**Problem:** Current rule "Only commit when requested" is too defensive for documentation/planning work.

**Concrete Example:** Asked "should I commit?" during documentation phase when the answer was obviously yes.

**Proposal:** Replace blanket commit rule with context-aware guidance:
- **Code changes:** Follow user preference established in session, or ask if unclear
- **Documentation/planning:** Commit at logical checkpoints without asking
- **If session pattern established:** Follow it (e.g., user said "commit and proceed" once = do it going forward)

**Goal Served:** Minimal Effective Guidance

**Expected Outcome:** Less friction, fewer unnecessary questions

**How to Measure:** Reduction in "should I commit?" questions during appropriate contexts

**Gates Evaluation:**
- Gate 1 (Problem Evidence): ✅ This session - unnecessary question
- Gate 2 (Root Cause): ✅ Addresses overly defensive rule
- Gate 3 (Claude Behavior): ✅ Context-awareness aligns with natural language understanding
- Gate 4 (Maintenance): ✅ Replaces rigid rule with judgment
- Gate 5 (Testability): ✅ Observable in sessions

**Status:** Pending user approval

---

### Proposal 4: Consolidate design/ and designs/ Folders

**Problem:** Two similarly named folders create confusion.

**Concrete Example:** `docs/design/` has 9 files, `docs/designs/` has 1 file (PLAYWRIGHT_E2E_DESIGN.md)

**Proposal:** Move `docs/designs/PLAYWRIGHT_E2E_DESIGN.md` to `docs/design/` and delete empty `designs/` folder.

**Goal Served:** Doc Discoverability

**Expected Outcome:** Single location for design documents

**How to Measure:** No confusion about where designs go

**Gates Evaluation:**
- Gate 1 (Problem Evidence): ✅ Two folders exist with overlapping purpose
- Gate 2 (Root Cause): ✅ Directly fixes organizational issue
- Gate 3 (Claude Behavior): N/A - not a Claude behavior change
- Gate 4 (Maintenance): ✅ One-time cleanup
- Gate 5 (Testability): ✅ Verifiable - one folder exists after

**Status:** Pending user approval

---

## Decision Log

| Date | Proposal | Decision | Rationale |
|------|----------|----------|-----------|
| 2025-11-26 | Proposal 1: Explore Before Create | ✅ APPROVED | Core pain point, concrete evidence |
| 2025-11-26 | Proposal 2: Persist Work Incrementally | ✅ APPROVED | Demonstrated in this session |
| 2025-11-26 | Proposal 3: Context-Aware Commits | ✅ APPROVED | Reduces friction |
| 2025-11-26 | Proposal 4: Consolidate design/ folders | ✅ APPROVED | Simple cleanup |
| 2025-11-26 | Comprehensive 9-Phase Workflow | ✅ APPROVED | Replaces individual proposals with unified approach |

---

## Final Approved Changes

### 1. Comprehensive 9-Phase Development Workflow

Rewrite `.claude/WORKFLOW.md` with complete flow:

1. **Discovery** - Explore existing patterns before implementation
2. **Requirements** - Define success criteria (checklist or separate doc)
3. **Design** - Architecture decisions (if 3+ files)
4. **Task Tracking** - Create `docs/work/[FEATURE]_TODO.md`
5. **Implementation** - Inside-out, commit per layer
6. **Testing** - Unit tests always, E2E for UI/workflow bugs
7. **Code Review** - `/code-review` before PR (mandatory)
8. **Final Commit & PR** - Via `gh` CLI
9. **Cleanup** - Delete tracking doc, extract patterns from design doc

### 2. Documentation Organization

| Location | Purpose |
|----------|---------|
| `.claude/` | Claude-specific guidance (workflows, agents, commands, templates) |
| `docs/` | Project documentation (architecture, testing, guides) |
| `docs/work/` | Active work tracking (transient, deleted after merge) |
| Root | High-level project files (CLAUDE.md, README, CHANGELOG) |

### 3. Hotfix Fast Path

Streamlined 5-step process for urgent bugs:
1. Discovery (what's broken?)
2. Create test to prove bug
3. Fix bug
4. Quick review
5. Commit + PR

### 4. E2E Test Guidance

Add to workflow/CLAUDE.md:
- Unit tests: Always for bugs
- E2E tests: Only for UI/workflow/timing bugs (not every bug)

### 5. Bug Tracking During Manual Testing

Bugs found during F5 testing tracked in TODO doc, fixed before commit.

### 6. Folder Consolidation

Move `docs/designs/PLAYWRIGHT_E2E_DESIGN.md` → `docs/design/`, delete `designs/` folder.

### 7. Parallel Work Documentation

Document git worktrees + symlinks pattern for parallel feature work.

---

## Implementation Checklist

### Phase 5a: Documentation & Workflow
- [x] Create `docs/work/` directory
- [x] Rewrite `.claude/WORKFLOW.md` with 9-phase workflow
- [x] Create `.claude/templates/TASK_TRACKING_TEMPLATE.md`
- [x] Update `CLAUDE.md` with E2E test guidance
- [x] Update `CLAUDE.md` with context-aware commit rules
- [x] Move `docs/designs/PLAYWRIGHT_E2E_DESIGN.md` to `docs/design/`
- [x] Delete `docs/designs/` folder
- [x] Update references to moved file (CHANGELOG.md, FUTURE_ENHANCEMENTS.md, CLAUDE.md)

### Phase 5b: Branch Strategy & GitHub Configuration
- [x] Create `docs/BRANCH_STRATEGY.md`
- [x] Configure GitHub repo merge settings (enable merge commits, auto-delete branches)
- [x] Update main branch protection ruleset:
  - [x] Remove `required_linear_history` (allows merge commits)
  - [x] Add `merge` to allowed merge methods (alongside squash)
  - [x] Add `validate` status check requirement
- [x] Add gh CLI permissions to `.claude/settings.local.example.json`
- [x] Add E2E smoke tests to `.github/workflows/pr-validation.yml`

### Phase 5c: Documentation Cleanup & Organization

#### Structural Changes
- [x] Delete `.claude/archive/` folder (git history is archive)
- [x] Create `docs/requirements/` folder
- [x] Move `.claude/requirements/METADATA_BROWSER_REQUIREMENTS.md` → `docs/requirements/`
- [x] Create `docs/future/` folder structure
- [x] Create `docs/future/README.md` (index + lifecycle rules)
- [x] Migrate `FUTURE_ENHANCEMENTS.md` into per-feature files in `docs/future/`
- [x] Delete root `FUTURE_ENHANCEMENTS.md`
- [x] Update references to FUTURE_ENHANCEMENTS.md in CLAUDE.md, RELEASE_GUIDE.md, DATA_EXPLORER_DESIGN.md

#### Workflow Updates
- [x] Update `.claude/WORKFLOW.md` with design doc lifecycle:
  - Design docs scope MVP only
  - Extract patterns to `docs/architecture/` during implementation
  - Migrate future enhancements to `docs/future/[FEATURE].md` before deletion
  - Delete design doc before PR

#### Documentation Audit
- [ ] Audit `docs/architecture/` (17 files) - staleness, duplication, consolidation opportunities
- [ ] Audit `docs/design/` (9 files) - identify completed features, apply lifecycle
- [ ] Audit `docs/testing/` (3 files) - verify accuracy
- [ ] Verify all CLAUDE.md references point to valid files
- [ ] Check cross-references between docs
- [ ] Remove any unhelpful or confusing content

#### Formalize Standards
- [ ] Document naming convention (SCREAMING_SNAKE_CASE.md) in docs/README.md
- [ ] Update docs/README.md with clear navigation/index
- [ ] Document `.claude/` vs `docs/` purpose distinction

---

## Documentation Decisions (2025-11-26)

| Decision | Rule |
|----------|------|
| **Archive policy** | No archive folders - git history is the archive |
| **Naming convention** | SCREAMING_SNAKE_CASE.md for all documentation files |
| **Design doc lifecycle** | Delete before PR; extract patterns during implementation; migrate future items to `docs/future/` |
| **Requirements location** | `docs/requirements/` (near design docs, not in .claude/) |
| **Future enhancements** | `docs/future/` folder with per-feature files for scalability |
| **Claude vs docs** | `.claude/` = Claude-only guidance; `docs/` = project docs (human + AI readable) |

---

## Notes

### Session Observations (2025-11-26)

1. **Gap analysis done but not documented** - Illustrates need for persistence rule
2. **Asked about committing** - Illustrates need for context-aware commits
3. **Web resource editing revert** - Illustrates need for discovery step
4. **Workflow mostly solid** - Iteration recommended over rewrite
5. **Unclear .claude/ vs docs/ purpose** - Now documented
6. **Need hotfix fast path** - Added for urgent bugs
7. **E2E tests not for every bug** - Only UI/workflow/timing bugs
