# Documentation Style Guide

**Purpose**: Ensures consistency, maintainability, and quality across all documentation in the Power Platform Developer Suite.

---

## Why This Guide Exists

**Q: Isn't meta-documentation "too much"?**

**A: No - this is a one-time investment that prevents ongoing debates and inconsistency.**

**Evidence of Need** (from current docs):
- ❌ Inconsistent naming: `EXECUTION_CONTEXTS.md` vs `ARCHITECTURE_GUIDE.md` (missing suffix)
- ❌ Date inconsistency: Some docs have "Last Updated", others don't
- ❌ Duplication: BaseBehavior pattern explained in 4+ places
- ❌ Size variance: Some docs 200 lines, others 1600+ lines
- ❌ Structure variance: Some have Quick Reference, others don't

**Without this guide**: Each new doc/contributor introduces more inconsistency, making docs harder to maintain.

**With this guide**: Clear rules prevent debates, make reviews faster, ensure quality.

**Industry Standard**: Microsoft Docs, React, Vue, Kubernetes all have style guides for documentation.

---

## Core Philosophy

### 1. **AI-First Documentation (Context Engineering)**

**Primary Audience**: AI agents (Claude Code) working on the codebase

**Secondary Audience**: Future you (reading docs via AI, not directly)

**Key Principle**: Every token in context has cost. Maximize signal, minimize noise.

**DO**:
- Delete outdated documentation (don't archive)
- Use real code references (`Environment.ts:45-67`) not toy examples
- Document patterns, not specific implementations
- Prefer tests over docs for behavior specification
- Write for "future Claude" understanding codebase

**DON'T**:
- Keep historical documentation "just in case" (git history preserves it)
- Create documentation for simple features (code should be self-documenting)
- Duplicate information across files (one canonical source, link to it)
- Write documentation that will drift from code (tests stay current, docs don't)

**Rationale**:
- AI context window is limited (every outdated doc reduces space for actual code)
- Anthropic research: Effective context engineering = minimal tokens, maximum signal
- Tests are executable specifications (always current, always accurate)
- Design docs drift within days of implementation (tests don't)

**See**: `docs/DOCUMENTATION_POLICY.md` for retention rules

---

### 2. **Concise, Example-Driven, Practical**

**DO**:
- Show working code from the actual codebase (real file paths)
- Use ✅/❌ pattern for good/bad examples
- Include "Why" explanations for non-obvious choices
- Keep explanations brief, examples detailed

**DON'T**:
- Write long prose when a code example suffices
- Use toy/hypothetical examples ("foo", "bar")
- Explain obvious things ("This is a class")
- Duplicate content across multiple docs

---

### 3. **No Dates (Use Git History)**

**Rule**: NO "Last Updated: YYYY-MM-DD" in documentation content

**Rationale**:
- Git commit history is source of truth: `git log -p docs/FILE.md`
- Dates create maintenance burden (update on every change?)
- Dates give false sense of freshness (updated yesterday, but only typo fix)
- Industry standard: React, Vue, VS Code, MDN docs have no dates

**Exception**: Keep dates ONLY in `CHANGELOG.md` (release history needs timestamps)

**Action**: Remove all "Last Updated" headers from docs

---

### 4. **Progressive Disclosure**

**Rule**: Major docs (>400 lines) MUST have Quick Reference section

**Structure**:
```markdown
# Document Title

## 🚀 Quick Reference
[Scannable bullets, tables, key concepts - <1 page]

## 📖 Detailed Guide
[Comprehensive explanations, examples, edge cases]

## 🔗 See Also
[Cross-references to related docs]
```

**Why**:
- Human developers need quick scanning
- AI assistants benefit from comprehensive context
- Progressive disclosure serves both audiences

---

### 5. **Optimize for AI and Human Readers**

**For AI Assistants (Primary)**:
- Real code references with file paths (`src/domain/Environment.ts:45-67`)
- Structured information (tables, decision trees, decision matrices)
- Clear anti-patterns with ✅/❌ examples
- Extended thinking triggers ("Think hard about..." when appropriate)
- Links to canonical sources (no duplication)
- Patterns over specifics (document HOW to build features, not Feature X implementation)

**For Humans (Secondary)**:
- Scannable structure (bullets, headers, tables)
- Visual cues (✅/❌, 🚨, ⚡ emojis sparingly)
- Quick Reference sections for rapid lookup
- Task-based navigation ("I want to...")

**Context Engineering**:
- Every document competes for Claude's context window
- Outdated docs waste tokens on wrong information
- Prefer deleting to updating (tests document behavior, code is truth)
- One canonical source > multiple docs with same info

**Balance**: Quick Reference (human scan) + Detailed Guide (AI deep context) + Delete when outdated (preserve tokens)

---

## Documentation Lifecycle

**Philosophy**: Documentation has a lifecycle. Most documentation should be deleted, not preserved.

### When to CREATE Documentation

**✅ CREATE for:**
- **Architecture patterns** (CLEAN_ARCHITECTURE_GUIDE.md, PANEL_ARCHITECTURE.md)
  - Living documents, updated when patterns evolve
  - Document HOW to architect features, not specific feature implementations

- **Workflow guides** (WORKFLOW.md, AGENTS.md)
  - How to build features, run reviews, design slices
  - Process documentation for AI-first development

- **Testing guides** (TESTING_GUIDE.md)
  - Coverage expectations, patterns, how to write tests

- **Code quality standards** (CODE_QUALITY_GUIDE.md, LOGGING_GUIDE.md)
  - Rules for comments, logging, type safety
  - Enforced by code-guardian agent

**❌ DON'T CREATE for:**
- Simple features (1-2 files) - Code is self-documenting
- Feature-specific implementation details - Tests document behavior
- Historical context ("why we made decision X") - Git history preserves this
- Temporary investigations - Delete after fixing issue

### When to UPDATE Documentation

**✅ UPDATE when:**
- Architecture pattern changes (e.g., new panel initialization pattern)
- Code examples in docs no longer match current code
- Workflow improves (e.g., slice-based design introduced)
- New best practice discovered

**❌ DON'T UPDATE:**
- Design docs (delete them, don't try to keep them current)
- Historical documentation (delete it, git preserves history)
- Examples for deprecated patterns (delete the section entirely)

### When to DELETE Documentation

**✅ DELETE immediately when:**
- **Design docs** after feature implementation complete + tested
  - Tests document behavior (executable, always current)
  - Design drifts from implementation within days
  - Keeping designs wastes AI context on outdated info

- **Analysis docs** after issue resolved
  - docs/analysis/*.md, docs/technical-debt/*.md (individual investigations)
  - Consolidate findings to TECHNICAL_DEBT.md, delete investigation

- **Requirements docs** after feature complete
  - Tests are executable requirements (more reliable than docs)

- **Outdated examples** when code changes
  - Don't show old + new approach (confuses AI)
  - Replace old example with current code reference

**⚠️ CONSIDER DELETING when:**
- Architecture guide section describes deprecated pattern
  - Extract any still-relevant pattern wisdom
  - Delete deprecated approach entirely
  - Don't keep "historical" sections

**Exception: Extract Pattern First**
If design doc introduced NEW architectural pattern:
1. Extract pattern to architecture guide (e.g., PANEL_ARCHITECTURE.md)
2. Delete design doc specifics
3. Architecture guide documents pattern (living doc)

**See**: `docs/DOCUMENTATION_POLICY.md` for complete retention rules

---

### Documentation Decision Tree

**Use this flowchart to decide whether to create documentation:**

```
┌─────────────────────────────────────┐
│ I need to document something...     │
└───────────────┬─────────────────────┘
                │
                ▼
    ┌───────────────────────────┐
    │ Is it an ARCHITECTURAL    │ YES → CREATE living doc
    │ PATTERN used across       │       (CLEAN_ARCHITECTURE_GUIDE.md,
    │ multiple features?        │        PANEL_ARCHITECTURE.md)
    └────────┬──────────────────┘       Document HOW, not WHAT
             │ NO
             ▼
    ┌───────────────────────────┐
    │ Is it a WORKFLOW/PROCESS  │ YES → CREATE/UPDATE workflow doc
    │ for building features?    │       (WORKFLOW.md, AGENTS.md)
    └────────┬──────────────────┘
             │ NO
             ▼
    ┌───────────────────────────┐
    │ Is it CODE QUALITY rules  │ YES → CREATE/UPDATE standards doc
    │ enforced across codebase? │       (CODE_QUALITY_GUIDE.md,
    └────────┬──────────────────┘        LOGGING_GUIDE.md)
             │ NO
             ▼
    ┌───────────────────────────┐
    │ Is it a DESIGN for a      │ YES → Create small slice design
    │ complex feature (7+ files)│       DELETE after implementation
    └────────┬──────────────────┘       Lifespan: 0-2 weeks
             │ NO
             ▼
    ┌───────────────────────────┐
    │ Is it TESTING guidance?   │ YES → UPDATE TESTING_GUIDE.md
    │                           │       Don't create separate test docs
    └────────┬──────────────────┘
             │ NO
             ▼
    ┌───────────────────────────┐
    │ Is it a temporary         │ YES → Create in docs/technical-debt/
    │ INVESTIGATION/ANALYSIS?   │       DELETE after issue resolved
    └────────┬──────────────────┘       Consolidate findings to
             │ NO                        TECHNICAL_DEBT.md
             ▼
    ┌───────────────────────────┐
    │ Is it a simple feature    │ YES → DON'T CREATE
    │ (1-2 files)?              │       Code is self-documenting
    └────────┬──────────────────┘       Tests document behavior
             │ NO
             ▼
    ┌───────────────────────────┐
    │ Is it implementation      │ YES → DON'T CREATE
    │ details for Feature X?    │       Tests document behavior
    └────────┬──────────────────┘       Code is truth
             │ NO
             ▼
    ┌───────────────────────────┐
    │ DON'T CREATE              │
    │ Ask: "Will this be useful │
    │ in 6 months?"             │
    │ If NO → Don't create      │
    └───────────────────────────┘
```

**Key Questions Before Creating Docs:**

1. **Will this be useful 6 months from now?** (If NO → Don't create)
2. **Will this be updated regularly?** (If NO → Consider temporary)
3. **Do tests/code already document this?** (If YES → Don't create)
4. **Is this a pattern or a specific implementation?** (Pattern → CREATE, Implementation → DON'T)

**See**: `docs/DOCUMENTATION_POLICY.md` for detailed retention rules

---

## Design Documentation Strategy

**Problem**: Large designs (12+ files, 100KB+) overwhelm Claude and cause implementation failure.

**Solution**: Slice-based design + extended thinking

### When to Use Formal Design Docs

| Complexity | Approach | Design Output |
|-----------|----------|---------------|
| **Simple (1-2 files)** | Extended thinking only | No design doc (mental model) |
| **Medium (3-6 files)** | Slice-based design | Small design per slice (<30KB) |
| **Complex (7+ files)** | Extended thinking + slices | Architectural decision + slice designs |
| **Uncertain approach** | Extended thinking first | Evaluation, then design |

### Extended Thinking Integration

**When documenting features that require extended thinking:**

```markdown
## Implementing Feature X

**Complexity**: Complex (10+ files, new architectural pattern)

**Recommended Approach**:
1. Think harder about architecture options:
   - Option A: Single panel with tabs
   - Option B: Multiple coordinated panels
   - Option C: Tree view + detail panel

2. Evaluate trade-offs (maintainability, UX, testability, extensibility)

3. Design Slice 1 only (MVP with 3-4 files)

4. Implement → Test → Ship Slice 1

5. Repeat for subsequent slices
```

**Document the PROCESS, not the specific design.**

### Slice-Based Design Documentation

**Wrong (Monolithic)**:
```
Design entire Import Job Viewer (12 files):
- List jobs
- Filter by status
- Real-time updates
- Export to CSV
- View XML configuration
→ Creates 100KB design doc
→ Claude fails to implement
→ Design document becomes waste
```

**Right (Slice-Based)**:
```
Design Slice 1: List jobs for environment (3 files)
→ Small 20KB design
→ Claude implements successfully
→ DELETE design after Slice 1 complete

Design Slice 2: Add filtering (2 files)
→ Small 15KB design
→ Implement
→ DELETE design after Slice 2 complete

Design Slice 3: Real-time updates (2 files)
→ etc.
```

**Each slice:**
- Small design (<30KB) = Claude can implement
- Shippable = production-ready + tested
- Delete design immediately after complete

### Design Doc Deletion Workflow

```
1. design-architect creates docs/design/FEATURE_DESIGN.md
2. Implement feature (domain → app → infra → presentation)
3. Write tests (domain 100%, use cases 90%)
4. Feature complete + tests pass + manual testing done
5. code-guardian approves
6. DELETE docs/design/FEATURE_DESIGN.md immediately
7. If introduced new pattern:
   - Extract to docs/architecture/*.md
   - Delete design specifics
```

**Retention**: Zero. Design docs have 0-2 week lifespan (design → implement → delete).

---

## Document Structure Pattern

### Required Sections

**All documents MUST have:**

```markdown
# Document Title

[Brief 1-2 sentence overview of what this doc covers]

## 🚀 Quick Reference (if >400 lines)
[Key concepts, common patterns, quick lookups]

## 📖 Detailed Guide
[Main content sections]

## 🔗 See Also
- [Related Doc 1](link)
- [Related Doc 2](link)
```

### Optional Sections

**Include if applicable:**

```markdown
## Common Mistakes / Anti-Patterns
[What NOT to do, with explanations]

## Examples
[Real-world examples from the codebase]

## Migration Guide
[If patterns have changed over time]

## Troubleshooting
[Common issues and solutions]

## FAQ
[Frequently asked questions]
```

### Section Order

1. Title + Overview
2. Quick Reference (if >400 lines)
3. Main content (Detailed Guide)
4. Common Mistakes / Anti-Patterns
5. Examples
6. Troubleshooting / FAQ
7. See Also (always last)

---

## Naming Conventions

### Pattern: `{TOPIC}_{TYPE}.md`

**Types**:
- `_GUIDE.md` = How-to, workflow, step-by-step instructions, practical guide
- `_PATTERNS.md` = Reusable solutions, design patterns, best practices, anti-patterns
- `_REFERENCE.md` = Quick lookup, API reference, cheat sheet, specifications

**Rules**:
- TOPIC: Singular noun, capitalized (ARCHITECTURE, COMPONENT, MESSAGE, LOGGING)
- TYPE: Always use suffix (GUIDE, PATTERNS, or REFERENCE)
- Use underscores between words: `CODE_MAINTENANCE_GUIDE.md` not `CodeMaintenanceGuide.md`

### Examples

**✅ GOOD:**
```
ARCHITECTURE_GUIDE.md           # How architecture works (GUIDE)
COMPONENT_PATTERNS.md           # Component design patterns (PATTERNS)
ERROR_HANDLING_PATTERNS.md      # Error handling best practices (PATTERNS)
AI_ASSISTANT_REFERENCE.md       # Quick lookup for AI (REFERENCE)
LOGGING_GUIDE.md                # How to log correctly (GUIDE)
PANEL_LAYOUT_GUIDE.md           # How to structure panels (GUIDE)
```

**❌ BAD:**
```
EXECUTION_CONTEXTS.md           # Missing _GUIDE suffix (inconsistent)
MESSAGE_CONVENTIONS.md          # Should be MESSAGE_PATTERNS.md
CLAUDE.md                       # Not descriptive (audience, not topic)
architecture.md                 # Not capitalized
Component-Patterns.md           # Hyphens instead of underscores
```

### When to Use Each Type

**Use _GUIDE when**:
- Teaching how to DO something
- Step-by-step workflows
- Development practices
- Tool usage

**Use _PATTERNS when**:
- Documenting reusable solutions
- Design patterns and anti-patterns
- Best practices with examples
- "How we do X" conventions

**Use _REFERENCE when**:
- Quick lookup / cheat sheet
- API documentation
- Specifications
- Decision tables

---

## When to Create vs Expand

### Create New Document When:

✅ **Different audience** (developers vs AI assistants)
✅ **Standalone topic** (can be understood independently)
✅ **Existing doc >800 lines** AND cohesive topics can be separated
✅ **New major feature** with significant patterns/guidance

### Expand Existing Document When:

✅ **Same audience** and topic
✅ **Related subtopic** that fits current doc's scope
✅ **Current doc <800 lines** (soft limit)
✅ **Adding examples/clarifications** to existing content

### Decision Tree

```
Need to document something?
│
├─ Fits into existing doc?
│  ├─ Yes → Would push doc >800 lines?
│  │  ├─ Yes → Consider splitting (see "When to Split")
│  │  └─ No → Add to existing doc
│  └─ No → Create new doc
│     └─ Use proper naming convention ({TOPIC}_{TYPE}.md)
```

---

## When to Split Documents

### Soft Limit: 800 Lines

**Guideline**: If doc exceeds 800 lines, consider splitting by cohesive topic

**Why 800**:
- GitHub markdown rendering degrades >1500 lines
- Human readability suffers >1000 lines
- 800 line docs are comprehensive but digestible
- Not arbitrary - ARCHITECTURE_GUIDE.md (809 lines) feels right

### Hard Limit: 1200 Lines

**Rule**: If doc exceeds 1200 lines, MUST split (except README.md)

**Why**:
- 1200+ lines very difficult to navigate even with good structure
- Likely indicates multiple cohesive topics that can be separated

### How to Split (4-Step Process)

**Step 1: Identify Cohesive Topics**

Example: `COMPONENT_PATTERNS.md` (1629 lines)
```
Core Lifecycle (~400 lines):
- Four-file structure, BaseComponent, Factory integration, Event bridges

Advanced Patterns (~600 lines):
- View helpers, SplitPanel, JSON renderer, Multi-instance

Migration Guide (~400 lines):
- Legacy patterns, BaseBehavior migration steps, Common issues
```

**Step 2: Stand-Alone Test**

Ask: "Can developer understand this topic WITHOUT reading other split docs?"
- If NO → Too coupled, not ready to split
- If YES → Good candidate for extraction

**Step 3: Extract with Minimal Duplication**

- Move entire cohesive sections (don't break mid-concept)
- Keep ONE canonical example (link to it, don't duplicate)
- Add "See Also" links between related docs
- Update README.md index

**Step 4: Update Cross-References**

- Find all docs linking to old structure
- Update references to point to new doc locations
- Add breadcrumb navigation if needed
- Test all links still work

### Split Checklist

- [ ] Each split doc is 400-800 lines
- [ ] Each has clear purpose stated in first paragraph
- [ ] Each can be understood independently (stand-alone test passes)
- [ ] "See Also" cross-references added to all split docs
- [ ] README.md index updated with new docs
- [ ] All docs referencing old structure updated
- [ ] No duplication of examples (one canonical, others link)

---

## Cross-Referencing Patterns

### Inline Links

Use for **specific concepts** mentioned in text:

```markdown
Components use the [event bridge pattern](COMPONENT_PATTERNS.md#event-communication-pattern)
to communicate with panels without tight coupling.
```

### "See Also" Section

Use for **related documents** at end of doc:

```markdown
## 🔗 See Also

- [ARCHITECTURE_GUIDE.md](ARCHITECTURE_GUIDE.md) - SOLID principles and design patterns
- [COMPONENT_PATTERNS.md](COMPONENT_PATTERNS.md) - Component lifecycle and patterns
- [ERROR_HANDLING_PATTERNS.md](ERROR_HANDLING_PATTERNS.md) - Error handling standards
```

### README.md as Master Index

**All major docs MUST be listed in `README.md`** with:
- Category (Getting Started, Core Architecture, Implementation Guides)
- Brief description
- Link to file

### Avoid Circular References

**❌ BAD:**
```
Doc A: "See complete guide in Doc B"
Doc B: "For basics, see Doc A"
[Reader bounces between docs forever]
```

**✅ GOOD:**
```
Doc A (Basic): "See complete guide in Doc B"
Doc B (Complete): [Standalone, no reference back to A]
```

**Rule**: References should flow from simple → complex, not circular

---

## Code Example Standards

### Use ✅/❌ Pattern

**Always show BOTH good and bad examples:**

```markdown
## Component Updates

✅ **CORRECT** - Use event bridges:
\`\`\`typescript
this.dataTable.setData(newData);  // Triggers event bridge automatically
\`\`\`

❌ **WRONG** - Direct updateWebview():
\`\`\`typescript
this.updateWebview();  // Causes full HTML regeneration, UI flash
\`\`\`

**Why**: Event bridges update DOM efficiently without regenerating entire HTML.
```

### Include "Why" Explanations

**Every pattern MUST explain rationale:**

```markdown
## Type Safety First

**Rule**: NEVER use `any` type

**Why**:
- Type safety catches bugs at compile time, not runtime
- Each `any` creates a blind spot where bugs hide
- `any` defeats the purpose of using TypeScript

**Instead**: Use proper types or `unknown` with type guards
```

### Real Code from Codebase

**✅ GOOD** - Actual code:
```typescript
// From MetadataBrowserPanel.ts
private initializeComponents(): void {
    this.environmentSelector = ComponentFactory.createEnvironmentSelector({
        id: 'metadataBrowser-envSelector',
        label: 'Environment',
        onChange: (envId: string) => this.handleEnvironmentSelection(envId)
    });
}
```

**❌ BAD** - Toy example:
```typescript
// Generic example
const selector = createSelector({ id: 'foo' });
```

### Show Anti-Patterns

**Document what NOT to do:**

```markdown
## Anti-Patterns to Avoid

❌ **Don't skip panel-content wrapper**
\`\`\`html
<div class="panel-container">
    <div class="panel-controls">...</div>
    <!-- ❌ Missing panel-content wrapper -->
    <div class="my-custom-container">...</div>
</div>
\`\`\`

**Impact**: Content starts at wrong vertical position, breaks layout
```

### Add Context Comments

```typescript
// ✅ GOOD - Context comments
constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    super(panel, extensionUri);

    // 1. Initialize component factory
    this.componentFactory = new ComponentFactory();

    // 2. Create component instances
    this.initializeComponents();

    // 3. Set up event bridges
    this.setupComponentEventBridges([...]);

    // 4. Initialize panel (renders initial HTML)
    this.initialize();  // ← Calls updateWebview() internally
}
```

---

## Markdown Conventions

### Headers

```markdown
# Document Title               (# - Title only, one per doc)
## Major Section              (## - Major sections)
### Subsection                (### - Subsections)
#### Detail                   (#### - Fine detail, avoid if possible)
```

**Rule**: Don't exceed #### (four levels). If you need more, content is too nested.

### Code Blocks

**Always specify language** for syntax highlighting:

```markdown
\`\`\`typescript
// TypeScript code
\`\`\`

\`\`\`javascript
// JavaScript code
\`\`\`

\`\`\`bash
# Shell commands
\`\`\`

\`\`\`json
{
  "config": "value"
}
\`\`\`
```

### Tables

Use for **comparison, decision matrices, specifications**:

```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Value 1  | Value 2  | Value 3  |
```

**Alignment**:
- Left-align text: `|----------|`
- Right-align numbers: `|---------:|`
- Center-align: `|:--------:|`

### Emojis

**Use sparingly** for visual scanning:

```markdown
🚀 Quick Reference       (start of quick ref section)
📖 Detailed Guide        (start of detailed section)
🔗 See Also              (cross-references)
✅ Correct pattern       (good examples)
❌ Wrong pattern         (bad examples)
⚠️ Warning              (important cautions)
🚨 Critical             (must-follow rules)
⚡ Essential            (important but not critical)
```

**Don't overuse**: If every bullet has an emoji, none stand out.

### Bold and Italic

- **Bold** for emphasis and key terms: `**important**`
- *Italic* for introducing terms: `*event bridge*`
- `Code` for technical terms: `` `ComponentFactory` ``

**Don't use bold for entire paragraphs** - it loses impact.

### Lists

**Unordered** (bullets):
```markdown
- First item
- Second item
- Third item
```

**Ordered** (numbered steps):
```markdown
1. First step
2. Second step
3. Third step
```

**Rule**: Use ordered lists for sequential steps, unordered for non-sequential items.

### Links

**Relative links** for internal docs:
```markdown
[COMPONENT_PATTERNS.md](COMPONENT_PATTERNS.md)
[Architecture Guide](ARCHITECTURE_GUIDE.md#solid-principles)
```

**Absolute links** for external resources:
```markdown
[TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
```

---

## Review Checklist

Before merging new/updated documentation, verify:

### Content Quality
- [ ] No dates in content (except CHANGELOG.md)
- [ ] Follows naming convention: `{TOPIC}_{TYPE}.md`
- [ ] Brief overview in first paragraph
- [ ] Has Quick Reference section (if >400 lines)
- [ ] Has "See Also" section with cross-references
- [ ] Code examples use ✅/❌ pattern
- [ ] Examples are from actual codebase with file paths (not toy code)
- [ ] "Why" explanations provided for non-obvious patterns
- [ ] Anti-patterns documented (what NOT to do)
- [ ] Real code references (`Environment.ts:45-67`) not abstractions

### Structure
- [ ] Under 800 lines (soft limit) or planned for split
- [ ] Sections in logical order (Quick Ref → Detailed → See Also)
- [ ] Headers don't exceed 4 levels (####)
- [ ] No duplication with other docs (links instead)
- [ ] Stand-alone test passes (can be understood independently)

### AI-First Optimization
- [ ] **Lifecycle check**: Will this be useful 6 months from now?
- [ ] **Redundancy check**: Does code/tests already document this?
- [ ] **Pattern check**: Documents HOW (pattern), not WHAT (specific implementation)?
- [ ] **Context check**: Minimizes tokens, maximizes signal?
- [ ] **Extended thinking**: Includes "think hard" triggers where appropriate?
- [ ] **Slice-based**: If design doc, is it small (<30KB) for single slice?

### Technical Accuracy
- [ ] Code examples compile/work
- [ ] Examples reflect current patterns (not deprecated)
- [ ] Cross-references point to correct locations with line numbers
- [ ] All links work (no 404s)
- [ ] Terminology consistent with codebase
- [ ] File paths accurate (`src/domain/Environment.ts:45-67`)

### Markdown Quality
- [ ] Code blocks specify language (```typescript)
- [ ] Tables formatted properly
- [ ] Emojis used sparingly for visual scanning
- [ ] Bold/italic used appropriately
- [ ] Lists use correct type (ordered vs unordered)

### Integration
- [ ] README.md index updated with new doc
- [ ] Cross-references updated in related docs
- [ ] DOCUMENTATION_POLICY.md consulted for retention
- [ ] CHANGELOG.md updated with significant documentation changes

### Validation
- [ ] Reviewed by human (readability check)
- [ ] Tested with AI assistant (Claude can find/apply patterns)
- [ ] Examples validated against actual code
- [ ] Links tested (all work, no broken references)
- [ ] **Deletion plan**: If temporary doc, when will it be deleted?

---

## Common Mistakes to Avoid

### ❌ AI-First Mistake 1: Keeping Outdated Documentation

```markdown
# Design doc from 3 months ago
Feature was implemented and shipped but design doc still exists
→ AI reads outdated design, suggests wrong patterns
→ Wastes tokens on obsolete information
```

**Fix**: DELETE design docs immediately after feature complete

**Rationale**: Tests document behavior (executable, always current). Design docs drift within days.

---

### ❌ AI-First Mistake 2: Documenting Simple Features

```markdown
# NEW_BUTTON_FEATURE.md

## Overview
This feature adds a "Clear All" button to the Persistence Inspector.

## Implementation
1. Add button to FilterPanelSection.ts
2. Wire up click handler
3. Call ClearAllStorageUseCase

[50 more lines explaining 2-file change]
```

**Fix**: Don't create doc. Code is self-documenting for simple changes.

**Rule**: Only document if >3 files OR introduces new pattern.

---

### ❌ AI-First Mistake 3: Toy Examples

```typescript
// Bad - abstract example
const service = new MyService();
service.doThing();
```

**Fix**: Real code with file paths

```typescript
// Good - from src/domain/Environment.ts:45-67
export class Environment {
    public activate(): void {
        if (this.isActive) {
            throw new DomainError('Environment is already active');
        }
        this.isActive = true;
    }
}
```

**Rationale**: AI learns from real patterns in codebase, not abstractions.

---

### ❌ AI-First Mistake 4: Updating Outdated Design Docs

```markdown
# METADATA_BROWSER_DESIGN.md (created 2 months ago)

[User notices implementation diverged from design]
[Spends 2 hours updating design doc to match current code]
```

**Fix**: DELETE the design doc. Tests already document current behavior.

**Rationale**: Design docs have 0-2 week lifespan (design → implement → delete). Don't waste time keeping them current.

---

### ❌ AI-First Mistake 5: Large Monolithic Designs

```
Design entire feature (12 files, 100KB)
→ Claude fails to implement
→ Design becomes technical debt
```

**Fix**: Slice-based design (design Slice 1 only, <30KB)

**See**: Design Documentation Strategy section above

---

### ❌ Traditional Mistake 1: Adding Dates

```markdown
# Document Title
Last Updated: 2025-10-29  ← DON'T DO THIS
```

**Fix**: Remove dates, rely on git history

---

### ❌ Traditional Mistake 2: Inconsistent Naming

```markdown
component-patterns.md           ← Wrong (lowercase)
ComponentPatterns.md            ← Wrong (camelCase)
Component-Patterns.md           ← Wrong (hyphens)
COMPONENT_PATTERNS.md           ✅ Correct (SCREAMING_SNAKE_CASE)
```

---

### ❌ Traditional Mistake 3: Duplicating Content

```markdown
# Doc A
[50 lines explaining BaseBehavior pattern]

# Doc B
[Same 50 lines explaining BaseBehavior pattern]
```

**Fix**: One canonical source (COMPONENT_PATTERNS.md), others link to it

---

### ❌ Traditional Mistake 4: No Quick Reference (>400 lines)

```markdown
# Very Long Document (800 lines)

[Immediately dives into detailed content with no scannable overview]
```

**Fix**: Add Quick Reference section at top for scanning

---

### ❌ Traditional Mistake 5: Only Showing Good Examples

```markdown
Use event bridges to update components:
\`\`\`typescript
this.dataTable.setData(newData);
\`\`\`
```

**Fix**: Show both ✅ correct AND ❌ wrong patterns

---

### ❌ Traditional Mistake 6: Missing "Why"

```markdown
Never use `any` type. Use `unknown` instead.
```

**Fix**: Explain rationale

```markdown
**Never use `any` type**

**Why**: Type safety catches bugs at compile time. Each `any` creates a blind spot.

**Instead**: Use `unknown` with type guards
```

---

## Document Templates

### Template: GUIDE

```markdown
# {TOPIC}_GUIDE.md

[Brief 1-2 sentence overview]

## 🚀 Quick Reference (if >400 lines)
- Key concepts
- Common patterns
- Quick decisions

## 📖 Detailed Guide

### Section 1
[How-to content]

### Section 2
[Step-by-step instructions]

## Common Mistakes
[Anti-patterns with ✅/❌ examples]

## 🔗 See Also
- [Related Doc 1](link)
- [Related Doc 2](link)
```

### Template: PATTERNS

```markdown
# {TOPIC}_PATTERNS.md

[Brief overview of what patterns this doc covers]

## 🚀 Quick Reference (if >400 lines)
[Pattern summary table or list]

## 📖 Detailed Guide

### Pattern 1: {Pattern Name}
**When to use**: [Context]
**Why it works**: [Rationale]
**Example**:
\`\`\`typescript
[Real code from codebase]
\`\`\`

### Anti-Pattern: {What NOT to do}
❌ **Wrong**:
\`\`\`typescript
[Bad example]
\`\`\`
**Why this is wrong**: [Explanation]

## 🔗 See Also
- [Related patterns](link)
```

### Template: REFERENCE

```markdown
# {TOPIC}_REFERENCE.md

[Brief overview of what this reference covers]

## Quick Lookup Tables
[Decision tables, API reference, cheat sheets]

## Detailed Reference
[Comprehensive specifications]

## Examples
[Real-world usage examples]

## 🔗 See Also
- [Related docs](link)
```

---

## Maintenance Schedule

### Per Feature Completion
- [ ] **DELETE design docs** after feature complete + tested (most important!)
- [ ] Extract pattern to architecture guide (if new pattern introduced)
- [ ] Update architecture guides with real code examples (if pattern changed)
- [ ] Delete temporary analysis docs after issue resolved

### Per Pull Request
- [ ] Update docs for new patterns introduced
- [ ] Add examples for new components (with file paths)
- [ ] Follow this style guide for all additions
- [ ] Run review checklist before merging
- [ ] **Delete completed design docs** (don't let them accumulate)

### Monthly
- [ ] Delete `.review/archive/` folders >6 months old
- [ ] Review `docs/design/` - delete any lingering design docs
- [ ] Review `docs/analysis/` - delete completed investigations
- [ ] Consolidate findings to TECHNICAL_DEBT.md

### Quarterly Review
- [ ] **Run `/comprehensive-review`** (8-agent production readiness check)
- [ ] Check for docs >800 lines (consider splitting)
- [ ] Update examples to match current code (or delete if outdated)
- [ ] Remove outdated troubleshooting entries
- [ ] Verify all cross-references still valid
- [ ] Review TECHNICAL_DEBT.md - delete resolved items
- [ ] Update style guide based on lessons learned

### Annual Review
- [ ] Full documentation audit against codebase
- [ ] Reorganize if doc structure no longer fits project
- [ ] Update Quick Reference sections
- [ ] Review and update this style guide
- [ ] **Aggressive pruning**: Delete any docs not referenced in 6+ months

---

## Getting Help

**Questions about documentation style?**
1. Check this style guide first
2. Look at exemplar docs: ARCHITECTURE_GUIDE.md, ERROR_HANDLING_PATTERNS.md
3. Ask in code review
4. Propose changes to this guide if something is unclear

**Found inconsistency in existing docs?**
1. Create issue or PR to fix
2. Reference this style guide in explanation
3. Update all instances of the inconsistency

---

## 🔗 See Also

**Documentation Philosophy:**
- [DOCUMENTATION_POLICY.md](DOCUMENTATION_POLICY.md) - Retention rules (when to create/update/delete)
- [CLAUDE.md](../CLAUDE.md) - Quick reference for AI agents (coding rules, workflow)
- [README.md](README.md) - Master index of all documentation

**Workflow & Process:**
- [.claude/WORKFLOW.md](../.claude/WORKFLOW.md) - Feature development workflow (slice-based design)
- [.claude/AGENTS.md](../.claude/AGENTS.md) - When to invoke specialized agents
- [.claude/commands/comprehensive-review.md](../.claude/commands/comprehensive-review.md) - 8-agent review process

**AI-First Resources:**
- [Anthropic: Effective Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Anthropic: Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
