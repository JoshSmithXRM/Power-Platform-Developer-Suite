# Documentation Cleanup & Enhancement Plan

**Created**: 2025-10-29
**Status**: 🔵 Planned - To be implemented after feature branch completion

---

## Overview

This document outlines the documentation cleanup and enhancement plan for the Power Platform Developer Suite. This plan will be implemented **after** the current feature branch is complete and all documentation has been updated to reflect the current state of the codebase.

## Guiding Principles

1. **Avoid Redundancy** - One canonical source per topic
2. **Progressive Disclosure** - Quick reference + detailed explanation
3. **Consistent Naming** - `{TOPIC}_{TYPE}.md` pattern
4. **No Dates in Docs** - Rely on git commit history (except CHANGELOG)
5. **Split at 800 Lines** - Soft limit 800, hard limit 1200
6. **Optimize for Both** - AI assistants AND human developers

---

## Phase 1: Cleanup & Consistency (MUST DO)

### 1.1 Remove Dates & Status Badges

**Rationale**: Git commit history is source of truth; dates create maintenance burden

**Action Items:**
- [ ] Remove "Last Updated: YYYY-MM-DD" headers from all docs
- [ ] Remove "Status: ✅ Active" badges (redundant)
- [ ] Exception: Keep dates ONLY in CHANGELOG.md

**Files to Update:**
```
ERROR_HANDLING_PATTERNS.md
MESSAGE_CONVENTIONS.md
CODE_MAINTENANCE_GUIDE.md
(scan all docs/ for "Last Updated")
```

### 1.2 Rename for Consistency

**Rationale**: Adopt consistent `{TOPIC}_{TYPE}.md` naming pattern

**Action Items:**
- [ ] `CLAUDE.md` → `AI_ASSISTANT_REFERENCE.md` (clarifies purpose)
- [ ] `EXECUTION_CONTEXTS.md` → `EXECUTION_CONTEXTS_GUIDE.md` (consistent suffix)
- [ ] `MESSAGE_CONVENTIONS.md` → `MESSAGE_PATTERNS.md` (matches other _PATTERNS docs)

**Update all cross-references in:**
```
README.md
ARCHITECTURE_GUIDE.md
COMPONENT_PATTERNS.md
DEVELOPMENT_GUIDE.md
ERROR_HANDLING_PATTERNS.md
(search for old filenames)
```

### 1.3 Consolidate/Move

**Rationale**: Reduce doc sprawl, consolidate related topics

**Action Items:**
- [ ] `TECHNICAL_DEBT_TYPE_SAFETY.md` → Merge into `CODE_MAINTENANCE_GUIDE.md` as new section
  - Topic fits maintenance theme
  - CODE_MAINTENANCE already 909 lines but cohesive
- [ ] `TEMP_ISSUES.md` → Either resolve issues OR move to `docs/cleanup/archived/`
  - If still relevant, convert to GitHub issues
  - If resolved, delete

---

## Phase 2: Critical Additions (HIGH PRIORITY)

### 2.1 Create LOGGING_GUIDE.md

**Rationale**: Logging guidance currently scattered across 3+ docs; needs dedicated comprehensive guide

**Structure:**
```markdown
LOGGING_GUIDE.md (estimated ~400 lines)
├── 🚀 Quick Reference
│   ├── Log Level Decision Table
│   ├── Extension Host vs Webview Quick Guide
│   └── Common Scenarios
├── 📖 Detailed Guide
│   ├── Log Level Deep Dive
│   │   ├── ERROR: Operation failures requiring user attention
│   │   ├── WARN: Recoverable issues, fallback behaviors
│   │   ├── INFO: Business events, user actions
│   │   ├── DEBUG: Development info, state changes
│   │   └── TRACE: UI lifecycle, very granular
│   ├── Extension Host Logging
│   │   ├── Panel: this.componentLogger
│   │   ├── Component: this.componentLogger
│   │   └── Service: private logger getter pattern
│   ├── Webview Logging
│   │   └── console.log (LoggerService not available)
│   ├── Context Metadata Patterns
│   │   ├── What to include (operation, environmentId, etc.)
│   │   └── Security considerations
│   ├── Security: Credential Sanitization
│   └── Examples by Scenario
└── 🔗 See Also
```

**Content Sources (consolidate from):**
- DEVELOPMENT_GUIDE.md lines 216-268 (log levels, component logging)
- ERROR_HANDLING_PATTERNS.md (error context metadata)
- EXECUTION_CONTEXTS.md lines 441-510 (context-aware logging)

**Action Items:**
- [ ] Create LOGGING_GUIDE.md with structure above
- [ ] Extract and consolidate logging content from source docs
- [ ] Add log level decision tree diagram/table
- [ ] Add credential sanitization examples
- [ ] Update README.md index
- [ ] Add cross-references from DEVELOPMENT_GUIDE, ERROR_HANDLING, EXECUTION_CONTEXTS

### 2.2 Add YAGNI & DRY to ARCHITECTURE_GUIDE.md

**Rationale**: Architectural principles belong together; stated as requirement

**Location**: Add after existing SOLID section (around line 64)

**New Section Structure:**
```markdown
## Development Principles

### SOLID Principles
[Existing content - lines 9-64]

### DRY (Don't Repeat Yourself)
**Principle**: Every piece of knowledge must have a single, unambiguous, authoritative representation.

**Three Strikes Rule**: [Already documented in CODE_MAINTENANCE, reference it]
- Fixing same code in 3+ places? STOP and create abstraction
- Examples from codebase: BasePanel common handlers

**When Duplication is Acceptable**:
- Tests (clarity over DRY)
- Examples in documentation
- Intentional decoupling of modules

**Refactoring Thresholds**:
- 2 instances: Note it, watch for 3rd
- 3 instances: Refactor immediately
- Code review: Reject PRs with obvious duplication

### YAGNI (You Aren't Gonna Need It)
**Principle**: Don't build features until concrete evidence they're needed.

**✅ Apply YAGNI When**:
- User hasn't requested feature
- Building "just in case" for hypothetical future
- Adding abstractions for scenarios that don't exist yet
- Implementing features "because other apps have them"

**❌ Don't Apply YAGNI To**:
- Architectural patterns (SOLID, DRY) - these are foundational
- Type safety and error handling - prevent entire classes of bugs
- Security and validation - can't retrofit easily
- Accessibility (if required by project)

**Examples from This Codebase**:
- ✅ GOOD: Wait for user need
  - Don't add pagination until users have 1000+ row tables
  - Don't add bulk operations until users request them
  - Don't add custom sort until default is insufficient
- ❌ BAD: Premature abstraction
  - Don't create generic "DataService" for single API
  - Don't build plugin system if no one writes plugins
  - Don't add undo/redo if users haven't asked

**Balance with Extensibility**:
YAGNI doesn't mean "write throw-away code". Use SOLID principles to make code easy to extend WHEN needed, but don't build extensions until needed.
```

**Action Items:**
- [ ] Add "Development Principles" section to ARCHITECTURE_GUIDE.md
- [ ] Write DRY section (reference Three Strikes Rule in CODE_MAINTENANCE)
- [ ] Write YAGNI section with concrete examples
- [ ] Update README.md to mention YAGNI/DRY coverage
- [ ] Cross-reference from CODE_MAINTENANCE_GUIDE

### 2.3 Create CODE_COMMENTING_GUIDE.md

**Rationale**: Establishes when/how/why to write code comments; current codebase has inconsistent commenting

**Structure:**
```markdown
CODE_COMMENTING_GUIDE.md (estimated ~500 lines) ✅ CREATED
├── Philosophy: Code as Documentation
│   ├── "Comments are a failure" (Clean Code)
│   ├── "Comment WHY, not WHAT" (Pragmatic Programmer)
│   └── Balance self-documenting code with necessary context
├── When to Comment (8 Valid Reasons)
│   ├── Public API Documentation (JSDoc/TSDoc) - REQUIRED
│   ├── WHY, Not WHAT (Explain rationale)
│   ├── Complex Algorithms (Explain approach)
│   ├── Regular Expressions (ALWAYS explain)
│   ├── Architecture Decisions (Document critical choices)
│   ├── TODOs/FIXMEs/HACKs (Technical debt markers)
│   ├── Non-Obvious Business Logic (Domain knowledge)
│   └── Integration Points (External contracts)
├── When NOT to Comment (Anti-Patterns)
│   ├── Don't comment the obvious
│   ├── Don't band-aid bad code
│   ├── Don't comment out code
│   ├── Don't write changelogs
│   └── Don't document bad names
├── Code Comment Styles
│   ├── TypeScript (TSDoc for public APIs)
│   ├── JavaScript (JSDoc for behaviors)
│   └── Configuration files
├── Special Cases
│   ├── File headers
│   ├── Warning comments
│   └── Debug comments
├── Comment Maintenance Rules
├── Decision Tree: Should I Write a Comment?
└── Examples from Codebase
```

**Industry Best Practices**:
- **Clean Code (Robert C. Martin)**: Comments are code smells, prefer self-documenting code
- **Pragmatic Programmer**: Comments explain WHY, not WHAT
- **Google Style Guides**: All public APIs need docs, minimal inline comments
- **Microsoft**: JSDoc/TSDoc for public APIs, explain complex algorithms

**Action Items:**
- [x] Create CODE_COMMENTING_GUIDE.md ✅ DONE
- [ ] Review with team for agreement on philosophy
- [ ] Add ESLint rules to enforce JSDoc requirements (optional)
- [ ] Update README.md index
- [ ] Cross-reference from DEVELOPMENT_GUIDE.md

### 2.4 Create DOCUMENTATION_STYLE_GUIDE.md

**Rationale**: Ensures consistency, captures decisions, prevents future debates

**Structure:**
```markdown
DOCUMENTATION_STYLE_GUIDE.md (estimated ~300 lines)
├── Philosophy
│   ├── Concise, example-driven, practical
│   ├── No dates (use git history)
│   ├── Progressive disclosure (quick ref + detailed)
│   └── Optimize for AI and human readers
├── Document Structure Pattern
│   ├── Required Sections
│   │   ├── 🚀 Quick Reference (scannable, <1 page)
│   │   ├── 📖 Detailed Guide (comprehensive)
│   │   └── 🔗 See Also (cross-references)
│   ├── Optional Sections
│   │   ├── Examples / Anti-Patterns
│   │   ├── Migration Guides
│   │   └── Troubleshooting
│   └── Template
├── Naming Conventions
│   ├── Pattern: {TOPIC}_{TYPE}.md
│   ├── Types: GUIDE, PATTERNS, REFERENCE
│   ├── Examples (good and bad)
│   └── When to use each type
├── When to Create New Doc vs Expand Existing
│   ├── Create new if: Different audience, standalone topic, >800 lines
│   ├── Expand existing if: Related topic, same audience, <800 lines
│   └── Decision tree
├── When to Split Documents
│   ├── Soft limit: 800 lines
│   ├── Hard limit: 1200 lines
│   ├── Split by cohesive topic (not arbitrary)
│   ├── Stand-alone test: Can topic be understood independently?
│   └── Split process (4 steps)
├── Cross-Referencing Patterns
│   ├── Inline links for specific concepts
│   ├── "See Also" section at document end
│   ├── README.md as master index
│   └── Avoid circular references
├── Code Example Standards
│   ├── Use ✅/❌ pattern for good/bad examples
│   ├── Include "Why" explanations
│   ├── Real code from codebase (not toy examples)
│   ├── Show anti-patterns (what NOT to do)
│   └── Add context comments
├── Markdown Conventions
│   ├── Headers: # for title, ## for major sections, ### for subsections
│   ├── Code blocks: Always specify language (```typescript)
│   ├── Tables: Use for comparison, decision matrices
│   ├── Emojis: Sparingly, only for visual scanning (🚀 ✅ ❌)
│   ├── Bold/Italic: **Bold** for emphasis, *italic* for terms
│   └── Lists: Bullets for unordered, numbers for ordered steps
└── Review Checklist
    ├── [ ] No dates in content (except CHANGELOG)
    ├── [ ] Follows naming convention
    ├── [ ] Has Quick Reference section (if >200 lines)
    ├── [ ] Has See Also section
    ├── [ ] Code examples use ✅/❌ pattern
    ├── [ ] Cross-references updated
    ├── [ ] Under 800 lines (or planned split)
    └── [ ] Tested with AI assistant (Claude)
```

**Action Items:**
- [ ] Create DOCUMENTATION_STYLE_GUIDE.md with structure above
- [ ] Write each section with examples
- [ ] Include document split process from this plan
- [ ] Add naming convention rules
- [ ] Create review checklist
- [ ] Update README.md to reference style guide

---

## Phase 3: Optional Enhancements (MEDIUM PRIORITY)

### 3.1 Create TROUBLESHOOTING_GUIDE.md

**Rationale**: Captures tribal knowledge, high value for developers

**Structure:**
```markdown
TROUBLESHOOTING_GUIDE.md (estimated ~500 lines)
├── 🚀 Quick Reference
│   ├── Common Issues by Category
│   └── Quick Fixes
├── 📖 Detailed Guide
│   ├── Panel Not Loading
│   ├── Component Not Updating
│   ├── Authentication Failures
│   ├── Environment Selection Issues
│   ├── WebView/Extension Host Communication
│   ├── Build/Compilation Errors
│   ├── Performance Issues
│   └── Known Limitations
├── Debugging Workflows
│   ├── Extension Host Debugging
│   ├── Webview Debugging
│   └── Service Layer Debugging
├── FAQ
└── 🔗 See Also
```

**Action Items:**
- [ ] Create TROUBLESHOOTING_GUIDE.md
- [ ] Collect common issues from git issues, comments, team knowledge
- [ ] Add debugging workflows
- [ ] Add FAQ section
- [ ] Update README.md

### 3.2 Create CONTRIBUTING.md (if open source)

**Rationale**: Standard for open source projects; clarifies contribution process

**Structure:**
```markdown
CONTRIBUTING.md
├── How to Contribute
├── Development Setup
├── Code Review Process
├── Branch Naming
├── Commit Message Format
├── Documentation Requirements
├── Testing Requirements
└── Code of Conduct
```

**Action Items:**
- [ ] Determine if project will be open source
- [ ] If yes, create CONTRIBUTING.md
- [ ] If no, create internal version for team

### 3.3 Add Progressive Disclosure to Major Docs

**Rationale**: Makes long docs scannable for humans while keeping comprehensive for AI

**Docs to Update:**
- [ ] ARCHITECTURE_GUIDE.md (809 lines) - Add Quick Reference at top
- [ ] COMPONENT_PATTERNS.md (1629 lines) - Add Quick Reference at top
- [ ] ERROR_HANDLING_PATTERNS.md (626 lines) - Add Quick Reference at top
- [ ] PANEL_LAYOUT_GUIDE.md (538 lines) - Add Quick Reference at top

**Quick Reference Template:**
```markdown
## 🚀 Quick Reference

### Key Concepts
- [Bullet list of 5-7 core concepts]

### Common Patterns
[Table of patterns with use cases]

### Quick Links
- [Link to each major section]

---

## 📖 Detailed Guide
[Existing content]
```

---

## Phase 4: Optional Splits (LOW PRIORITY)

### 4.1 Split COMPONENT_PATTERNS.md (if needed)

**Current**: 1629 lines
**Threshold**: 800 lines soft limit exceeded

**Only split if**: After Phase 1-3 updates, doc is still >1200 lines AND has clear independent topics

**Proposed Split:**
```
COMPONENT_PATTERNS.md (Core - ~600 lines)
├── Quick Reference
├── Four-File Structure
├── BaseComponent Interface
├── Component Lifecycle
├── Factory Integration
├── Event Bridges
├── Configuration Pattern
└── See Also: COMPONENT_ADVANCED_PATTERNS, COMPONENT_MIGRATION_GUIDE

COMPONENT_ADVANCED_PATTERNS.md (NEW - ~600 lines)
├── Quick Reference
├── View Helpers Pattern
├── SplitPanel Integration
├── Properties/Raw Data Tabs (JSON Renderer)
├── Multi-Instance Support
├── State Management Patterns
└── See Also: COMPONENT_PATTERNS

COMPONENT_MIGRATION_GUIDE.md (NEW - ~400 lines)
├── Quick Reference
├── Identifying Legacy Behaviors
├── BaseBehavior Migration Steps
├── Complete Migration Examples
├── Common Migration Issues
└── See Also: COMPONENT_PATTERNS
```

**Action Items:**
- [ ] Assess COMPONENT_PATTERNS length after Phase 1-3
- [ ] If >1200 lines, perform split using process in DOCUMENTATION_STYLE_GUIDE
- [ ] Update all cross-references
- [ ] Update README.md index

### 4.2 Create TESTING_GUIDE.md Stub

**Rationale**: Establish structure now, fill comprehensively later as tests mature

**Structure:**
```markdown
TESTING_GUIDE.md (stub - ~200 lines, expand to ~600 later)
├── Overview
│   └── Testing Philosophy
├── Unit Testing
│   ├── Component Tests (extract from DEVELOPMENT_GUIDE)
│   ├── Service Tests (extract from DEVELOPMENT_GUIDE)
│   └── Mocking Patterns
├── [TODO] Integration Testing
│   └── Panel Integration Tests
├── [TODO] E2E Testing
│   └── (Evaluate if needed)
├── [TODO] Test Coverage Requirements
│   └── Thresholds per layer
├── [TODO] Mocking Strategies
│   └── VS Code API mocks, Service mocks
└── [TODO] CI/CD Integration
```

**Action Items:**
- [ ] Create TESTING_GUIDE.md stub with TODO sections
- [ ] Extract existing testing content from DEVELOPMENT_GUIDE.md
- [ ] Mark sections as TODO for future expansion
- [ ] Update README.md

---

## Phase 5: Visual Enhancements (NICE TO HAVE)

### 5.1 Add Architecture Diagrams

**Rationale**: Visual learners benefit, complex flows easier to understand

**Diagrams Needed:**
1. **Architecture Overview**
   - Extension Host ↔ Webview ↔ Services ↔ Dataverse API
   - Show separation of concerns

2. **Message Flow**
   - User action → Webview → postMessage → Extension Host → Service → Component → Event Bridge → Webview
   - Show bidirectional communication

3. **Panel Layout Structure**
   - Visual representation of panel-container/controls/content/table-section
   - Show flexbox relationships

4. **Component Lifecycle**
   - Creation → HTML Generation → Webview Rendering → Initialization → Updates → Cleanup

**Tools:**
- Mermaid diagrams (GitHub renders natively)
- Draw.io (export as SVG)
- Excalidraw (simple hand-drawn style)

**Action Items:**
- [ ] Create architecture diagram
- [ ] Create message flow diagram
- [ ] Create panel layout diagram
- [ ] Create component lifecycle diagram
- [ ] Add to appropriate docs (ARCHITECTURE_GUIDE, EXECUTION_CONTEXTS_GUIDE, PANEL_LAYOUT_GUIDE, COMPONENT_PATTERNS)

---

## Implementation Timeline

### Before Implementation
1. **Complete feature branch work**
2. **Update all docs to reflect current codebase state**
3. **Review and approve this plan**

### Implementation Order
1. **Phase 1** (1-2 days) - Cleanup & consistency
2. **Phase 2** (3-4 days) - Critical additions (LOGGING_GUIDE, CODE_COMMENTING_GUIDE ✅, YAGNI/DRY, DOCUMENTATION_STYLE_GUIDE ✅)
3. **Phase 3** (2-3 days) - Optional enhancements (TROUBLESHOOTING, CONTRIBUTING, Quick References)
4. **Phase 4** (1-2 days) - Optional splits (only if needed after Phase 1-3)
5. **Phase 5** (2-3 days) - Visual enhancements (diagrams)

**Total Estimated Effort**: 9-14 days (full-time equivalent)
**Progress**: 2/4 Phase 2 documents created (CODE_COMMENTING_GUIDE, DOCUMENTATION_STYLE_GUIDE)

---

## Success Criteria

### Quantitative Metrics
- [ ] Zero duplicate information across docs (same concept explained once)
- [ ] All doc names follow `{TOPIC}_{TYPE}.md` pattern
- [ ] All docs ≤800 lines (except README, or explicitly split)
- [ ] Zero docs with "Last Updated" dates (except CHANGELOG)
- [ ] 100% of major docs (>400 lines) have Quick Reference section

### Qualitative Metrics
- [ ] Log level guidance is clear and discoverable (can find in <30 seconds)
- [ ] Code commenting guidance is clear and discoverable (when/how/why to comment)
- [ ] YAGNI/DRY principles documented and linked from architecture
- [ ] Documentation style guide exists and is followed
- [ ] New developer can onboard using docs alone (validated with new hire if available)
- [ ] AI assistant (Claude) can correctly reference and apply patterns from docs

### Validation Tests
- [ ] New developer onboarding test (if available)
- [ ] AI assistant test: Ask Claude to implement common patterns from docs
- [ ] Cross-reference integrity check: All links work, no 404s
- [ ] Consistency check: All docs follow style guide
- [ ] Completeness check: All stated principles (SOLID, DRY, YAGNI) documented

---

## Post-Implementation Maintenance

### Quarterly Review
- [ ] Check for docs >800 lines (consider splitting)
- [ ] Update examples to match current code patterns
- [ ] Remove outdated troubleshooting entries
- [ ] Add new patterns discovered during development

### Per Feature Branch
- [ ] Update relevant docs for new patterns
- [ ] Add examples for new components
- [ ] Update architecture diagrams if structure changes
- [ ] Follow DOCUMENTATION_STYLE_GUIDE for all additions

### Annual Review
- [ ] Full doc audit against codebase
- [ ] Reorganize if doc structure no longer fits project
- [ ] Update style guide based on lessons learned
- [ ] Review and update this cleanup plan

---

## Notes & Decisions

### Key Decisions Made
1. **No dates in docs** - Git commit history is source of truth
2. **Progressive disclosure** - Quick Reference + Detailed sections for major docs
3. **800 line soft limit** - Split at 800 lines if cohesive topics can be separated
4. **YAGNI/DRY in ARCHITECTURE_GUIDE** - Keep principles together, not separate
5. **LOGGING_GUIDE dedicated** - Cross-cutting concern deserves focused treatment
6. **CODE_COMMENTING_GUIDE dedicated** - Code commenting fundamental to quality, needs focused guidance
7. **Testing stub now, comprehensive later** - Match docs to reality, expand as tests mature

### Open Questions
- [ ] Will project be open source? (determines CONTRIBUTING.md scope)
- [ ] Do we need SECURITY.md? (vulnerability reporting process)
- [ ] Do we need CODE_OF_CONDUCT.md? (if open source)
- [ ] Should we add LICENSE.md to docs/? (legal clarity)

### Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing links during renames | High | Medium | Script to find/replace all references |
| Splitting creates circular dependencies | Medium | High | Use "See Also" pattern, avoid inline circular refs |
| Style guide ignored by contributors | Medium | Medium | Add to PR checklist, enforce in code review |
| Docs become outdated after initial cleanup | High | High | Add to quarterly review, per-feature updates |

---

## Appendix: File Changes Summary

### Files to Rename
```bash
# Phase 1.2
docs/CLAUDE.md → docs/AI_ASSISTANT_REFERENCE.md
docs/EXECUTION_CONTEXTS.md → docs/EXECUTION_CONTEXTS_GUIDE.md
docs/MESSAGE_CONVENTIONS.md → docs/MESSAGE_PATTERNS.md
```

### Files to Merge/Move
```bash
# Phase 1.3
docs/TECHNICAL_DEBT_TYPE_SAFETY.md → merge into docs/CODE_MAINTENANCE_GUIDE.md
docs/TEMP_ISSUES.md → resolve or move to docs/cleanup/archived/
```

### Files to Create
```bash
# Phase 2
docs/LOGGING_GUIDE.md
docs/CODE_COMMENTING_GUIDE.md ✅ CREATED
docs/DOCUMENTATION_STYLE_GUIDE.md ✅ CREATED
# (YAGNI/DRY added to existing ARCHITECTURE_GUIDE.md)

# Phase 3
docs/TROUBLESHOOTING_GUIDE.md
docs/CONTRIBUTING.md (if needed)

# Phase 4
docs/TESTING_GUIDE.md (stub)
docs/COMPONENT_ADVANCED_PATTERNS.md (if split needed)
docs/COMPONENT_MIGRATION_GUIDE.md (if split needed)
```

### Files to Modify (Add Quick Reference)
```bash
# Phase 3.3
docs/ARCHITECTURE_GUIDE.md
docs/COMPONENT_PATTERNS.md
docs/ERROR_HANDLING_PATTERNS.md
docs/PANEL_LAYOUT_GUIDE.md
```

### Files to Update (Remove Dates)
```bash
# Phase 1.1 (scan for all instances)
docs/ERROR_HANDLING_PATTERNS.md
docs/MESSAGE_CONVENTIONS.md
docs/CODE_MAINTENANCE_GUIDE.md
# ... others found by search
```

---

**End of Documentation Cleanup Plan**
