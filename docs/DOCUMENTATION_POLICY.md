# Documentation Retention Policy

**Philosophy:** Minimize documentation, maximize signal. Every document must justify its existence for AI-first workflow.

**Effective:** November 2025

---

## Core Principles

### 1. Tests Over Docs
Tests are executable specifications. They always reflect current behavior. Prefer tests over documentation for behavior specifications.

### 2. Code Over Comments
Self-documenting code (clear names, small functions) beats comments. Comments explain WHY, not WHAT.

### 3. Patterns Over Specifics
Document patterns and principles (how to build features), not specific implementations (Feature X works like this).

### 4. Git History Over Snapshots
Don't preserve outdated versions in docs. Git history is source of truth for evolution.

### 5. AI-Optimized
Every token in context has cost. Every document should maximize signal-to-noise ratio for AI agents.

---

## Document Types & Retention

### KEEP FOREVER (Living Documents)

**✅ CLAUDE.md**
- Quick reference for AI agents
- Update when patterns/rules change
- Delete outdated sections, don't archive them
- Target: <200 lines

**✅ Architecture Guides**
- `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md`
- `docs/architecture/CODE_QUALITY_GUIDE.md`
- `docs/architecture/LOGGING_GUIDE.md`
- `docs/architecture/PANEL_ARCHITECTURE.md`
- Update when architectural patterns change
- Use real code examples from current codebase
- Remove examples when code changes, replace with current

**✅ Workflow Guides**
- `.claude/WORKFLOW.md`
- `.claude/AGENTS.md`
- Update when process improves
- Delete obsolete workflows

**✅ Testing Guides**
- `docs/testing/TESTING_GUIDE.md`
- Update when testing patterns change
- Keep coverage targets current

**✅ Templates**
- `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md`
- `.claude/templates/PANEL_INITIALIZATION_PATTERN.md`
- `.claude/templates/TECHNICAL_DESIGN_TEMPLATE.md`
- Update when patterns evolve
- Delete obsolete templates

---

### DELETE AFTER USE (Temporary Documents)

**❌ Design Documents**
- **Lifecycle:** Design → Implement → Test → **DELETE**
- **Rationale:** Designs drift from implementation immediately. Tests document behavior better.
- **Exception:** If design introduces NEW architectural pattern → extract pattern to architecture guide, DELETE design specifics
- **Location:** `docs/design/*.md`
- **When to delete:** Immediately after feature complete and tested

**Example:**
```
Feature: Import Job Viewer
1. design-architect creates docs/design/IMPORT_JOB_VIEWER_DESIGN.md
2. Implement feature (domain → app → infra → presentation)
3. Write tests (domain 100%, use cases 90%)
4. Feature complete and tested
5. DELETE docs/design/IMPORT_JOB_VIEWER_DESIGN.md
6. If introduced new pattern (e.g., real-time updates): Extract pattern to architecture guide
7. Git history preserves design if needed
```

**❌ Review Results**
- `.review/results/*.md`
- **Lifecycle:** Review → Fix issues → Archive → DELETE old results
- **Retention:** Keep latest review only, archive previous to `.review/archive/YYYY-MM-DD/`
- **Cleanup:** Delete archives >6 months old

**❌ Temporary Analysis**
- `docs/analysis/*.md`
- `docs/technical-debt/*.md` (individual analyses)
- **Lifecycle:** Analyze → Fix → DELETE
- **Exception:** Keep `docs/TECHNICAL_DEBT.md` (consolidated living document)

---

### CONSOLIDATE (Single Source of Truth)

**⚠️ Technical Debt**
- **Keep:** `docs/TECHNICAL_DEBT.md` (single consolidated file)
- **Delete:** Individual debt tracking files (`docs/technical-debt/*.md`, `docs/architecture/TECHNICAL_DEBT.md`)
- **Process:**
  1. Consolidate all debt items into single file
  2. Delete individual files
  3. Update living document when debt resolved

**⚠️ README files**
- **Keep:** Root `README.md` (project overview), `docs/README.md` (documentation index)
- **Delete:** Feature-specific READMEs (code should be self-documenting)

---

## Retention Rules by Folder

```
docs/
├── README.md                          ✅ KEEP (documentation index, update when adding docs)
├── DOCUMENTATION_POLICY.md            ✅ KEEP (this file, update when policy changes)
├── DOCUMENTATION_STYLE_GUIDE.md       ✅ KEEP (how to write docs)
├── TECHNICAL_DEBT.md                  ✅ KEEP (consolidated living doc)
├── architecture/                      ✅ KEEP (living guides, update when patterns change)
│   ├── CLEAN_ARCHITECTURE_GUIDE.md
│   ├── CODE_QUALITY_GUIDE.md
│   ├── LOGGING_GUIDE.md
│   └── PANEL_ARCHITECTURE.md
├── design/                            ❌ DELETE AFTER USE (designs drift, tests document behavior)
│   ├── *_DESIGN.md                    ❌ Delete after feature complete
│   ├── *_REQUIREMENTS.md              ❌ Delete after feature complete
│   └── old/                           ❌ DELETE ENTIRE FOLDER (outdated, 500KB+ wasted context)
├── testing/                           ✅ KEEP (living guides)
│   └── TESTING_GUIDE.md
├── analysis/                          ❌ DELETE AFTER FIXING (temporary investigations)
└── technical-debt/                    ❌ DELETE FOLDER (consolidate to single TECHNICAL_DEBT.md)

.claude/
├── WORKFLOW.md                        ✅ KEEP (living guide)
├── AGENTS.md                          ✅ KEEP (living guide)
├── SETUP_GUIDE.md                     ✅ KEEP (onboarding)
├── SYSTEM_IMPROVEMENTS.md             ❌ CONSIDER DELETING (merge to TECHNICAL_DEBT.md?)
├── agents/                            ✅ KEEP (agent prompts)
├── commands/                          ✅ KEEP (slash commands)
├── requirements/                      ❌ DELETE AFTER USE (move to design/, delete after feature)
└── templates/                         ✅ KEEP (living patterns)

.review/
├── CODE_REVIEW_GUIDE.md               ✅ KEEP (master guide for agents)
├── README.md                          ✅ KEEP (review process doc)
├── SUMMARY.md                         ✅ KEEP (latest review only)
├── PROGRESS_TRACKER.md                ✅ KEEP (current review progress)
├── IMPLEMENTATION_PLAN.md             ❌ DELETE WHEN COMPLETE
├── results/                           ✅ KEEP (latest review only)
└── archive/                           ❌ DELETE >6 months old
```

---

## Decision Matrix

**Before creating a new document, ask:**

| Question | Yes | No | Action |
|----------|-----|----|----|
| Will this be useful 6 months from now? | Continue | - | **Don't create** |
| Is this a living document (will be updated)? | Continue | - | Consider temporary |
| Does code/tests already document this? | - | Continue | **Don't create** (tests are better) |
| Is this a pattern or specific implementation? | Pattern | Specific | **Pattern:** Keep. **Specific:** Delete after use |
| Will AI agents benefit from this in context? | Continue | - | **Don't create** (wastes tokens) |
| Does this duplicate existing docs? | - | Continue | **Consolidate** or **Don't create** |

**Result:** Create only if ALL "Yes" conditions met

---

## Special Cases

### Design Documents That Introduce New Patterns

**Example:** WEBVIEW_TYPESCRIPT_MIGRATION_DESIGN.md introduced new pattern for TypeScript in webviews

**Process:**
1. Implement feature following design
2. Feature complete and tested
3. Extract **pattern** to architecture guide:
   - Create `docs/architecture/WEBVIEW_TYPESCRIPT_PATTERN.md` OR
   - Add section to existing `PANEL_ARCHITECTURE.md`
4. DELETE design document
5. Architecture guide now documents pattern (living doc)

### Requirements Documents

**Retention:** DELETE after feature complete

**Rationale:**
- Requirements captured in user stories, issues, or conversations
- Tests document acceptance criteria (executable requirements)
- Code documents implementation
- Design doc already deleted
- Keeping requirements creates drift (implementation differs from initial requirements)

**Exception:** If requirements are contractual/compliance (rare for this project)

### Historical Context ("Why did we decide X?")

**Answer:** Git history

**Process:**
1. Important decisions documented in commit messages
2. Design discussions in PR descriptions
3. Architectural Decision Records (ADRs) if needed (create `docs/architecture/decisions/` for major irreversible decisions)

**Don't:** Keep outdated designs as "historical context" - they bloat repo and confuse AI

---

## Cleanup Schedule

### Monthly
- Delete completed `.review/IMPLEMENTATION_PLAN.md`
- Archive old review results to `.review/archive/YYYY-MM-DD/`

### Quarterly
- Delete `.review/archive/` folders >6 months old
- Review `docs/design/` - delete any lingering completed feature designs
- Audit `docs/analysis/` - delete completed investigations
- Review `docs/TECHNICAL_DEBT.md` - delete resolved items

### After Each Feature
- DELETE design documents for completed feature
- DELETE requirements documents
- UPDATE architecture guides if new pattern introduced
- UPDATE `docs/README.md` if new living docs created

### After Major Refactor
- UPDATE all architecture guides with new patterns
- DELETE old pattern docs if superseded
- Consolidate TECHNICAL_DEBT.md (remove resolved items)

---

## Migration Plan (Immediate)

**Phase 1: Immediate Cleanup (Today)**
1. ✅ Delete `docs/design/old/` folder (14 files, 500KB+)
2. ✅ Create this policy file
3. ⚠️ Delete completed design docs in `docs/design/`:
   - DATETIME_FILTER_ARCHITECTURE.md (if complete)
   - FILTER_PANEL_IMPROVEMENTS_DESIGN.md (if complete)
   - METADATA_BROWSER_PRESENTATION_DESIGN.md (if complete)
   - METADATA_BROWSER_PRESENTATION_REQUIREMENTS.md (if complete)
   - WEBVIEW_TYPESCRIPT_MIGRATION_DESIGN.md (extract pattern first)

**Phase 2: Consolidation (This Week)**
4. ⚠️ Consolidate TECHNICAL_DEBT files:
   - Merge `docs/architecture/TECHNICAL_DEBT.md` → `docs/TECHNICAL_DEBT.md`
   - Merge `docs/technical-debt/*.md` → `docs/TECHNICAL_DEBT.md`
   - Delete individual files
   - Delete `docs/technical-debt/` folder

5. ⚠️ Review `.claude/SYSTEM_IMPROVEMENTS.md`:
   - Merge to `docs/TECHNICAL_DEBT.md` if still relevant
   - Delete file

6. ⚠️ Review `.claude/requirements/`:
   - Delete if feature complete
   - Move to `docs/design/` if still active
   - Delete after feature complete

**Phase 3: Establish Habits (Ongoing)**
7. ✅ DELETE design docs immediately after feature complete
8. ✅ ARCHIVE review results monthly
9. ✅ UPDATE architecture guides when patterns change
10. ✅ CONSOLIDATE technical debt quarterly

---

## AI-First Optimization

### Why This Matters for AI Agents

**Problem:** Claude has limited context window. Every token counts.

**Impact of bloat:**
- 14 outdated design docs (500KB) = wasted context
- Outdated examples in guides = AI suggests obsolete patterns
- Duplicate information across files = AI confused about source of truth
- Historical documents = AI thinks old code still exists

**Benefits of minimalism:**
- More room for actual code in context
- AI reads only current, accurate information
- Clear patterns without noise
- Faster analysis (less to read)

### Optimization Strategies

**1. Prefer References Over Duplication**
```markdown
❌ BAD: Copy entire CLAUDE.md into WORKFLOW.md
✅ GOOD: "See CLAUDE.md for coding rules"
```

**2. Delete Examples When Code Changes**
```markdown
❌ BAD: Keep old example + new example (shows evolution)
✅ GOOD: Replace old example with current code reference
```

**3. Use Real Code References**
```markdown
❌ BAD: "Here's a toy example of a repository..."
✅ GOOD: "See EnvironmentRepository.ts:45-67 for real example"
```

**4. Quick Reference Sections**
```markdown
✅ GOOD: Add "Quick Reference" to long docs (>400 lines)
Allows AI to scan without reading entire doc
```

---

## Enforcement

**Who Enforces:** AI agents (design-architect, code-guardian, docs-generator)

**When:**
- `design-architect`: After creating design, reminds to delete after implementation
- `code-guardian`: During review, checks for outdated docs
- `docs-generator`: When updating docs, removes outdated sections

**Human Override:** User can keep documents for compliance/contractual reasons, but must document why in doc header

---

## Questions & Answers

**Q: What if I need historical context 6 months from now?**
A: Git history. Use `git log`, `git blame`, or `git show` to see design decisions.

**Q: What if future contributor needs to understand feature design?**
A: Tests document behavior. Architecture guides document patterns. Code is self-documenting.

**Q: What if design changes during implementation?**
A: That's exactly why we delete designs - they drift. Tests reflect actual behavior.

**Q: What if we need to audit decisions for compliance?**
A: Use ADRs (Architecture Decision Records) for irreversible decisions. Create `docs/architecture/decisions/` if needed.

**Q: What if I'm unsure if doc is still useful?**
A: Delete it. If needed later, restore from git history. Bias toward deletion.

**Q: What about user-facing documentation (not developer docs)?**
A: Out of scope for this policy. User docs (README.md, installation guides) are KEEP FOREVER.

---

## Success Metrics

**Good:**
- `docs/` folder <2MB (currently ~3MB with /old folder)
- No design docs >3 months old
- Architecture guides have current code examples
- Technical debt in single file
- No duplicate information across files

**Great:**
- `docs/` folder <1MB
- Design docs deleted within 1 week of feature completion
- All architecture guides updated in last 6 months
- Zero outdated code examples

---

## References

- [Anthropic: Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Anthropic: Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- DOCUMENTATION_STYLE_GUIDE.md (how to write docs that survive retention policy)

---

**Adopted:** November 2025

**Next Review:** February 2026 (quarterly)
