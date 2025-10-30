# TODO - Documentation & Architecture Setup

> **Status:** In Progress - Architecture documentation complete, .claude setup in progress

---

## 🔴 HIGH PRIORITY - Documentation Debt

### 1. Add "See Also" Sections to All Docs
**Required by:** DOCUMENTATION_STYLE_GUIDE.md

All docs MUST have cross-reference section at end:

- [ ] ARCHITECTURE_GUIDE.md - Add "See Also" section
- [ ] CODE_COMMENTING_GUIDE.md - Add "See Also" section
- [ ] COMMUNICATION_PATTERNS.md - Add "See Also" section
- [ ] DIRECTORY_STRUCTURE_GUIDE.md - Add "See Also" section
- [ ] DOCUMENTATION_STYLE_GUIDE.md - Add "See Also" section
- [ ] EXECUTION_PIPELINE_GUIDE.md - Add "See Also" section
- [ ] LAYER_RESPONSIBILITIES_GUIDE.md - Add "See Also" section
- [ ] LOGGING_GUIDE.md - Add "See Also" section
- [ ] QUICK_REFERENCE.md - Add "See Also" section

**Format:**
```markdown
## 🔗 See Also

- [Related Doc 1](./RELATED_DOC.md) - Brief description
- [Related Doc 2](./RELATED_DOC.md) - Brief description
```

**Estimated Time:** 1-2 hours

---

### 2. Add Quick Reference Sections (>400 Lines)
**Required by:** DOCUMENTATION_STYLE_GUIDE.md (soft requirement for >400 lines)

**DECISION:** Deferred until after all documentation is created. This is a cleanup task to be done before final PR review. It's premature to add Quick Reference sections now when docs may change significantly.

**Add to PR Review Checklist:**
- [ ] All docs >400 lines have Quick Reference sections
- [ ] Quick Reference sections are scannable (tables, bullets, no prose)
- [ ] Quick Reference links to detailed sections

**Docs that will need Quick Reference (when ready):**
- COMMUNICATION_PATTERNS.md (705 lines)
- DIRECTORY_STRUCTURE_GUIDE.md (465 lines)
- EXECUTION_PIPELINE_GUIDE.md (737 lines)
- LAYER_RESPONSIBILITIES_GUIDE.md (765 lines)
- LOGGING_GUIDE.md (634 lines)
- CODE_COMMENTING_GUIDE.md (879 lines estimated)

**Estimated Time:** 3-4 hours (when we get to it)

---

## 🟡 MEDIUM PRIORITY - .claude Folder Setup

### 3. Create CLAUDE_SETUP_GUIDE.md
**Location:** `docs/CLAUDE_SETUP_GUIDE.md`

Document Anthropic's best practices for:
- [ ] How to structure .claude folder
- [ ] How to write effective CLAUDE.md files
- [ ] How to design agent prompts
- [ ] Token limits and context management
- [ ] When to split vs combine prompts
- [ ] Best practices from Anthropic docs

**Reference Material:**
- Anthropic Claude Code documentation
- Our existing .claude/AGENT_USAGE.md patterns
- Our existing .claude/WORKFLOW_GUIDE.md patterns

**Estimated Time:** 2-3 hours

---

### 4. Restructure .claude Folder
**Current Structure:**
```
.claude/
├── AGENT_USAGE.md
├── WORKFLOW_GUIDE.md
└── agents/
    ├── architect.md
    ├── code-reviewer.md
    └── docs-generator.md
```

**Proposed Structure:**
```
.claude/
├── README.md (quick start)
├── SETUP_GUIDE.md (Anthropic best practices)
├── AGENT_WORKFLOW.md (how agents work together)
└── agents/
    ├── architect.md
    ├── code-reviewer.md
    └── docs-generator.md
```

**Tasks:**
- [ ] Create .claude/README.md (quick start for Claude Code)
- [ ] Move CLAUDE_SETUP_GUIDE.md content to .claude/SETUP_GUIDE.md
- [ ] Rewrite AGENT_USAGE.md → .claude/AGENT_WORKFLOW.md (Clean Architecture focus)
- [ ] Update WORKFLOW_GUIDE.md for feature-first workflow
- [ ] Delete or archive old versions

**Estimated Time:** 3-4 hours

---

### 5. Update Agent Definitions for Clean Architecture
**Location:** `.claude/agents/*.md`

Agent prompts need updates to reference Clean Architecture patterns:

**architect.md:**
- [ ] Add domain layer design patterns
- [ ] Add use case design patterns
- [ ] Add ViewModel design patterns
- [ ] Remove old refactor-specific instructions
- [ ] Add feature-first structure examples

**code-reviewer.md:**
- [ ] Add domain layer violation checks (anemic models, business logic location)
- [ ] Add application layer violation checks (business logic in use cases)
- [ ] Add presentation layer violation checks (business logic in panels)
- [ ] Update examples to reference new architecture
- [ ] Add Clean Architecture SOLID checks

**docs-generator.md:**
- [ ] Update to follow DOCUMENTATION_STYLE_GUIDE.md
- [ ] Add Quick Reference generation capability
- [ ] Add "See Also" section generation
- [ ] Reference new doc naming conventions
- [ ] Add Clean Architecture doc patterns

**Estimated Time:** 4-5 hours

---

## 🟢 LOW PRIORITY - Architecture Decision Records

### 6. Create ADR Folder and Initial Decisions
**Location:** `docs/adr/`

Document major architectural decisions as ADRs (Architectural Decision Records):

- [ ] Create docs/adr/ folder
- [ ] Create ADR template (docs/adr/TEMPLATE.md)
- [ ] ADR-001: Why Clean Architecture?
- [ ] ADR-002: Why feature-first structure?
- [ ] ADR-003: Why command pattern over event bridge?
- [ ] ADR-004: Why rich domain models over anemic interfaces?

**ADR Format:**
```markdown
# ADR-XXX: [Title]

**Status:** Accepted | Rejected | Superseded | Deprecated

**Date:** YYYY-MM-DD

**Context:** What's the issue we're facing?

**Decision:** What did we decide?

**Consequences:** What are the tradeoffs?

**Alternatives Considered:** What else did we evaluate?
```

**Estimated Time:** 3-4 hours

---

## 🔵 FUTURE - Code Implementation

### 7. Document Testing Strategy (REQUIRED BEFORE IMPLEMENTATION)
**Prerequisite:** Research TypeScript testing frameworks

Research and document:
- [ ] Research testing frameworks (Jest, Mocha, Vitest, etc.)
- [ ] Recommend framework for VS Code extension context
- [ ] Document testing patterns for each layer:
  - Domain layer testing (pure logic, no mocks)
  - Application layer testing (use cases with mocked repos)
  - Infrastructure layer testing (integration tests)
  - Presentation layer testing (component tests)
- [ ] Create TESTING_GUIDE.md
- [ ] Set up test infrastructure

**User Context:** Familiar with XUnit/MSTest from C#, needs TypeScript equivalent

**Estimated Time:** 4-5 hours

---

### 8. Implement ImportJobViewer (Reference Implementation)
**Prerequisite:** Documentation complete, .claude setup complete, testing strategy documented

**Approach:** Bring over panel, implement architecture from scratch

**Steps:**
- [ ] Copy existing ImportJobViewerPanel.ts to reference location
- [ ] Create feature structure: src/features/importJobs/
- [ ] Domain layer: ImportJob entity (rich model with behavior), Progress value object, JobStatus enum
- [ ] Domain layer: IImportJobRepository interface
- [ ] Infrastructure layer: ImportJobRepository (implements interface), ImportJobDto
- [ ] Application layer: LoadImportJobsUseCase, ViewJobXmlCommand
- [ ] Application layer: ImportJobViewModel, ImportJobViewModelMapper
- [ ] Presentation layer: Rewrite ImportJobViewerPanel to use use cases (NO business logic)
- [ ] Write tests for each layer
- [ ] Document as example in QUICK_REFERENCE.md

**Rules:**
- Use old code as **reference only**
- Implement from scratch following Clean Architecture
- Validate every piece migrated is actually needed
- This becomes the reference for all other features

**Estimated Time:** 10-12 hours for complete reference implementation with tests

---

## 📊 Progress Summary

**Completed:**
- ✅ Core architecture documentation (8 files)
- ✅ Documentation style guide moved
- ✅ Code commenting guide moved
- ✅ All docs renamed to match convention
- ✅ All cross-references updated
- ✅ Dates removed from docs

**In Progress:**
- 🔄 Documentation debt cleanup (See Also sections)
- 🔄 .claude folder setup

**Not Started:**
- ⏸️ Quick Reference sections
- ⏸️ Agent definition updates
- ⏸️ ADR creation
- ⏸️ Code implementation

---

## 🎯 Recommended Order

### Phase 1: Documentation Cleanup (4-6 hours)
1. Add "See Also" sections to all docs (1-2 hours)
2. Create CLAUDE_SETUP_GUIDE.md (2-3 hours)
3. Defer Quick Reference sections for later

### Phase 2: .claude Setup (3-4 hours)
1. Restructure .claude folder (1 hour)
2. Update agent definitions (2-3 hours)

### Phase 3: Architecture Records (3-4 hours)
1. Create ADR folder and template (1 hour)
2. Write initial ADRs (2-3 hours)

### Phase 4: Testing Strategy (4-5 hours)
1. Research TypeScript testing frameworks (2 hours)
2. Document testing strategy (2-3 hours)

### Phase 5: Code Implementation (10-12 hours)
1. Implement ImportJobs feature as reference (10-12 hours)

**Total Estimated Time:** 25-29 hours

---

## 💡 Notes

- **Quick Reference sections are deferred** - They're valuable but time-consuming. Can be added incrementally.
- **.claude setup is critical** - Need this before we start implementing features so agents can guide correctly.
- **ADRs document decisions** - Important for team alignment and future reference.
- **Start small with code** - One feature as reference, then replicate pattern.

---

## ✅ Decisions Made

1. **Quick Reference priority** - DEFERRED. Add as cleanup task before final PR. Don't add now while docs are still evolving.

2. **Agent prompt token limits** - Claude 4.5 has 200k token context. Current agent prompts are well within limits:
   - architect.md: ~3-4k tokens (estimated)
   - code-reviewer.md: ~5-6k tokens (estimated)
   - docs-generator.md: ~3-4k tokens (estimated)
   - **Status:** Should fit comfortably. Verify after updates.

3. **Test infrastructure** - Need to research and document testing strategy:
   - User is familiar with: XUnit, Microsoft Unit Testing (C#)
   - Need recommendations for: TypeScript/JavaScript testing (Jest? Mocha? Vitest?)
   - **Action:** Document testing strategy in new guide
   - **Priority:** Before implementing features

4. **Migration strategy** - START WITH IMPORTJOBVIEWER:
   - Bring over existing ImportJobViewerPanel as reference
   - Implement Clean Architecture from scratch
   - Use old code as reference ONLY
   - Validate every piece we migrate is actually needed
   - This becomes the reference implementation for all other features

---

## 📅 Last Updated

Use `git log TODO.md` to see update history (following our no-dates-in-docs policy).
