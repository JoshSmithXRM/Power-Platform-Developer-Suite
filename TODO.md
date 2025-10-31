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

### 3. Create CLAUDE_SETUP_GUIDE.md ✅ COMPLETE
**Location:** `docs/CLAUDE_SETUP_GUIDE.md`

Document Anthropic's best practices for:
- [x] How to structure .claude folder
- [x] How to write effective CLAUDE.md files
- [x] How to design agent prompts
- [x] Token limits and context management
- [x] When to split vs combine prompts
- [x] Best practices from Anthropic docs

**Status:** Complete (~850 lines). Covers:
- CLAUDE.md best practices (20-50 lines, iterate based on effectiveness)
- Agent prompt structure (context files, output format, decision framework)
- Token optimization (reference don't duplicate, use checklists)
- Common mistakes and solutions

**Note:** Doc links in CLAUDE.md don't work - Claude won't proactively read them. Keep CLAUDE.md minimal.

---

### 4. Restructure .claude Folder ✅ COMPLETE

**Final Structure:**
```
.claude/
├── README.md ✅ NEW - Quick start for Claude Code
├── SETUP_GUIDE.md ✅ NEW - Anthropic best practices (from docs/)
├── WORKFLOW_GUIDE.md ✅ UPDATED - Clean Architecture workflow
├── AGENT_USAGE.OLD.md (archived - old world reference)
└── agents/
    ├── architect.md ✅ UPDATED
    ├── code-reviewer.md ✅ UPDATED
    └── docs-generator.md ✅ CURRENT
```

**Completed:**
- [x] Create .claude/README.md - Quick start guide with examples
- [x] Copy CLAUDE_SETUP_GUIDE.md to .claude/SETUP_GUIDE.md
- [x] Archive AGENT_USAGE.md → AGENT_USAGE.OLD.md (old world reference)
- [x] Update WORKFLOW_GUIDE.md for Clean Architecture
- [x] Update all agent definitions (architect, code-reviewer, docs-generator)
- [x] Clean up CLAUDE.md (removed old world, 84 lines of truth)

---

### 5. Update Agent Definitions for Clean Architecture ✅ COMPLETE

**Status:** All agents updated for Clean Architecture

**architect.md:**
- [x] Designs domain layer (entities, value objects, repository interfaces)
- [x] Designs application layer (use cases, ViewModels, mappers)
- [x] Designs infrastructure layer (repositories implementing interfaces)
- [x] Designs presentation layer (panels calling use cases)
- [x] Context files: ARCHITECTURE_GUIDE.md, LAYER_RESPONSIBILITIES_GUIDE.md
- [x] Validates against Clean Architecture principles

**code-reviewer.md:**
- [x] Checks for anemic domain models (entities must have behavior)
- [x] Checks business logic placement (domain only, not use cases/panels)
- [x] Checks dependency direction (inward only)
- [x] Auto-rejects Clean Architecture violations
- [x] Context files: CLAUDE.md, ARCHITECTURE_GUIDE.md, LAYER_RESPONSIBILITIES_GUIDE.md

**docs-generator.md:**
- [x] Already current - references DOCUMENTATION_STYLE_GUIDE.md
- [x] Will document Clean Architecture examples from actual code

**Key Changes:**
- Removed references to old patterns (BasePanel, ComponentFactory, BaseBehavior)
- Added Clean Architecture layer checks
- Updated context files to existing docs only

---

## 🔵 FUTURE - Code Implementation

### 6. Document Testing Strategy (REQUIRED BEFORE IMPLEMENTATION) ✅ DECIDED
**Framework:** Vitest (Jest-compatible API, faster, better TypeScript support)

Document and implement:
- [ ] Create TESTING_GUIDE.md
- [ ] Set up Vitest infrastructure (install, config)
- [ ] Document testing patterns for each layer:
  - Domain layer: Pure logic tests, no mocks (like XUnit)
  - Application layer: Use case tests with mocked repository interfaces (like MSTest with Moq)
  - Infrastructure layer: Deferred (integration tests when needed)
  - Presentation layer: Deferred (VS Code integration tests when needed)
- [ ] Create example tests for each layer pattern
- [ ] Add test scripts to package.json

**Decision Context:**
- User familiar with: XUnit, MSTest (C#)
- Chosen: Vitest over Jest/Mocha
- Reasoning: Faster, better TS support, Jest-compatible API
- Integration tests: Deferred until domain/application layers tested

**Estimated Time:** 3-4 hours

---

### 7. Implement ImportJobViewer (Reference Implementation)
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
- ✅ CLAUDE_SETUP_GUIDE.md created (~850 lines)
- ✅ CLAUDE.md cleaned up (84 lines, Clean Architecture only)
- ✅ WORKFLOW_GUIDE.md updated for Clean Architecture
- ✅ All agent definitions updated (architect, code-reviewer, docs-generator)
- ✅ .claude folder restructured (README.md, SETUP_GUIDE.md, archived old files)

**In Progress:**
- 🔄 Documentation debt cleanup (See Also sections)

**Not Started:**
- ⏸️ Quick Reference sections (deferred)
- ⏸️ Testing strategy documentation
- ⏸️ Code implementation

---

## 🎯 Recommended Order

### Phase 1: Documentation Cleanup ✅ MOSTLY COMPLETE
1. ✅ Create CLAUDE_SETUP_GUIDE.md (complete)
2. ✅ Restructure .claude folder (complete)
3. ✅ Update agent definitions (complete)
4. 🔄 Add "See Also" sections to all docs (1-2 hours remaining)
5. ⏸️ Quick Reference sections (deferred)

### Phase 2: Testing Setup (3-4 hours)
1. Create TESTING_GUIDE.md
2. Set up Vitest (install, config)
3. Document testing patterns for each layer
4. Create example tests

### Phase 3: Code Implementation (10-12 hours)
1. Implement ImportJobs feature as reference (with tests)

**Total Estimated Time:** 14-18 hours remaining

---

## 💡 Notes

- **Quick Reference sections are deferred** - They're valuable but time-consuming. Can be added incrementally.
- ✅ **.claude setup complete** - Agents ready to guide Clean Architecture implementation.
- **YAGNI on ADRs** - Architecture docs are sufficient. Add ADRs later only if needed for controversial decisions.
- **Start small with code** - One feature as reference (ImportJobs), then replicate pattern.

---

## ✅ Decisions Made

1. **Quick Reference priority** - DEFERRED. Add as cleanup task before final PR. Don't add now while docs are still evolving.

2. **Agent prompt token limits** - Claude 4.5 has 200k token context. Current agent prompts are well within limits:
   - architect.md: ~3-4k tokens (estimated)
   - code-reviewer.md: ~5-6k tokens (estimated)
   - docs-generator.md: ~3-4k tokens (estimated)
   - **Status:** Should fit comfortably. Verify after updates.

3. **Test infrastructure** - DECIDED: Vitest
   - User familiar with: XUnit, MSTest (C#)
   - Chosen framework: Vitest
   - Reasoning: Faster than Jest, better TypeScript support, Jest-compatible API
   - Two-tier approach: Vitest for unit tests (domain/application), VS Code test runner for integration tests (deferred)
   - **Action:** Create TESTING_GUIDE.md, set up Vitest, document layer-specific patterns
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
