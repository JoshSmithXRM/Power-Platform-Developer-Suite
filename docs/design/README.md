# Design Documentation

This directory contains approved technical design documents for major features in the Power Platform Developer Suite.

---

## 📁 Directory Structure

### `/docs/design/`
Contains approved design documents for implemented or in-progress features.

### `/docs/design/reviews/`
Temporary directory for architecture and type reviews during design phase. Files are deleted after approval and key decisions are consolidated into the main design doc.

---

## 📄 Current Design Documents

### Active Designs

- **PLUGIN_TRACES_PHASE4_DESIGN.md** - Approved design for Plugin Registration feature (Phase 4)
  - Status: Approved
  - Complexity: Moderate
  - Last updated: 2025-11-04

### Future/Pending Designs

- **metadata-browser-architecture.md** - Original Metadata Browser design (pre-workflow)
  - Status: Needs redesign using new workflow
  - Use **METADATA_BROWSER_REDESIGN_PROMPT.md** to start redesign in fresh session

---

## 📋 Process Documents

- **CLEANUP_GUIDE.md** - Post-approval cleanup process for design documents
- **METADATA_BROWSER_REDESIGN_PROMPT.md** - Complete prompt for redesigning Metadata Browser feature

---

## 🔄 Design Workflow

When creating new design documents:

1. **Start with template**: `.claude/templates/TECHNICAL_DESIGN_TEMPLATE.md`
2. **Follow workflow**: `.claude/workflows/DESIGN_WORKFLOW.md`
3. **Review in separate files**: Place architecture and type reviews in `/reviews/`
4. **After approval**: Run cleanup process documented in `CLEANUP_GUIDE.md`
   - Consolidate key decisions into main design doc
   - Delete review files (archived in git)
   - Remove version numbers from filename
   - Update status to "Approved"

**Key Principles:**
- ✅ Use complexity levels (Simple/Moderate/Complex) + slice count
- ❌ NO time estimates
- ✅ Vertical slicing (MVP + enhancements)
- ✅ Type contracts defined upfront
- ✅ Clean Architecture compliance verified

---

## 🗑️ Deleted Documents

The following old design documents were deleted on 2025-11-04 as they were out-of-spec compared to what was actually implemented:

**Data Panel Suite (not yet implemented):**
- data-panel-suite-requirements.md
- data-panel-suite-design.md

**Plugin Traces (superseded by implementation and Phase 4 design):**
- PLUGIN_TRACES_REQUIREMENTS.md
- PLUGIN_TRACES_ARCHITECTURE_MAPPING.md
- PLUGIN_TRACES_DESIGN_SUMMARY.md
- PLUGIN_TRACES_IMPLEMENTATION_PLAN.md
- PluginTraceImplementationPrompt.md
- PLUGIN_TRACES_PHASE4_DESIGN_V2.md → V5.md (kept final approved version only)

**Metadata Browser (being redesigned):**
- metadata-browser-implementation-prompt.md (old prompt, replaced by METADATA_BROWSER_REDESIGN_PROMPT.md)

These files are preserved in git history if needed for reference.

---

## 🎯 When to Create Design Docs

**Create design document for:**
- ✅ Complex features (4+ vertical slices)
- ✅ New architectural patterns
- ✅ Features requiring multi-layer changes
- ✅ Public APIs or extension points

**Skip design document for:**
- ❌ Simple features (1-2 slices)
- ❌ Bug fixes (use BUG_FIX_WORKFLOW.md)
- ❌ Refactoring (use REFACTORING_WORKFLOW.md)
- ❌ Minor UI changes

---

## 📚 See Also

- `.claude/workflows/DESIGN_WORKFLOW.md` - Complete design process
- `.claude/templates/TECHNICAL_DESIGN_TEMPLATE.md` - Template for new designs
- `.claude/WORKFLOW_GUIDE.md` - All workflows overview
- `CLAUDE.md` - Core rules including design documentation rules
