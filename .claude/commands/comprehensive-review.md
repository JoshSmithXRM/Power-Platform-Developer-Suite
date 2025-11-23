# Comprehensive Code Review - 8 Parallel Specialized Agents

**Purpose:** Production-readiness assessment using 8 specialized agents running in parallel.

**When to use:** Pre-production, post-major-refactor, quarterly health checks, before open-sourcing

**Duration:** ~15 minutes (parallel agent execution)

**Cost:** 8x normal review (expensive, use sparingly)

---

## When to Invoke

**✅ USE FOR:**
- Pre-production gate (final quality check before shipping)
- Post-major-refactor validation (verify architectural changes)
- Quarterly health checks (prevent technical debt accumulation)
- Before open-sourcing (ensure code quality)
- Approaching production milestones

**❌ DON'T USE FOR:**
- Every commit (too expensive, use /code-review instead)
- Small features (use single code-guardian agent)
- Bug fixes (use single agent or skip review)
- Regular feature reviews (code-guardian is sufficient)

**Recommended Frequency:** Quarterly or at major milestones only

---

## Prerequisites

Before invoking, ensure:
1. ✅ All code compiles (`npm run compile`)
2. ✅ All tests pass (`npm test`)
3. ✅ Manual testing complete (F5 testing done)
4. ✅ Ready for honest assessment (willing to fix found issues)

---

## Output Structure

Review creates `.review/` directory with:

```
.review/
├── CODE_REVIEW_GUIDE.md          # Master guide for all agents
├── README.md                      # Review structure documentation
├── SUMMARY.md                     # Aggregated findings across all agents
├── PROGRESS_TRACKER.md            # Fix tracking
└── results/
    ├── 01_ARCHITECTURE_REPORT.md      # SOLID, Clean Architecture, layer boundaries
    ├── 02_DOMAIN_PURITY_REPORT.md     # Domain isolation, business logic location
    ├── 03_TYPE_SAFETY_REPORT.md       # TypeScript strict mode, any usage
    ├── 04_CODE_QUALITY_REPORT.md      # Duplication, dead code, complexity
    ├── 05_SECURITY_REPORT.md          # Vulnerabilities, input validation
    ├── 06_PATTERN_COMPLIANCE_REPORT.md # VS Code patterns, logging
    ├── 07_TEST_COVERAGE_REPORT.md     # Missing tests, coverage gaps
    └── 08_TEST_QUALITY_REPORT.md      # Test quality, assertions, mocking
```

---

## The 8 Specialized Agents

### Code-Focused Agents (6)

**01 - Architecture Agent**
- SOLID principles
- Clean Architecture compliance (layer boundaries, dependency direction)
- Repository pattern usage
- Dependency injection

**02 - Domain Purity Agent**
- Domain layer isolation (zero outer layer dependencies)
- Business logic placement (must be in domain, not use cases/panels)
- Rich vs anemic models (entities must have behavior)
- Domain services vs static utilities

**03 - Type Safety Agent**
- TypeScript strict mode compliance
- `any` type usage (must be justified)
- Explicit return types on public methods
- Null safety (no `!` non-null assertions)
- Type guards and narrowing

**04 - Code Quality Agent**
- Code duplication (Three Strikes Rule enforcement)
- Dead code detection (unused imports, functions, variables)
- Complexity analysis (cyclomatic complexity, nesting depth)
- Comment quality (WHY not WHAT, no placeholders)
- File size (large files needing refactoring)

**05 - Security Agent**
- OWASP Top 10 vulnerabilities
- Input validation
- Secrets management (no hardcoded secrets)
- XSS prevention (HTML escaping)
- Authentication/authorization patterns
- Logging security (no sensitive data in logs)

**06 - Pattern Compliance Agent**
- VS Code extension patterns (singleton panels, message passing)
- Panel initialization pattern (createOrShow)
- Logging architecture (ILogger injection, no console.log, no domain logging)
- HTML separation (view files, not TypeScript)
- Resource cleanup (disposal patterns)

### Test-Focused Agents (2)

**07 - Test Coverage Agent**
- Missing tests for domain entities (target: 100%)
- Missing tests for use cases (target: 90%)
- Missing tests for mappers (critical boundary)
- Coverage gaps in critical paths
- Untested edge cases

**08 - Test Quality Agent**
- Test structure (Arrange-Act-Assert pattern)
- Assertion quality (one logical assertion per test)
- Mocking patterns (proper dependency isolation)
- Test maintainability (descriptive names, no brittle tests)
- NullLogger usage in tests

---

## Agent Invocation

Each agent receives:
- Master review guide (`.review/CODE_REVIEW_GUIDE.md`)
- Codebase scope (all `src/` TypeScript files)
- Standardized reporting format for pattern aggregation
- Severity definitions (Critical/High/Medium/Low)

All agents run in parallel, analyze independently, produce structured reports.

---

## Cross-Agent Pattern Detection

After all agents complete, analyze for patterns:

**Systemic Issues (3+ agents mention):**
- Recurring anti-patterns
- Architectural violations
- Missing abstractions

**Critical Issues (any agent marks Critical):**
- Production blockers
- Security vulnerabilities
- Data loss risks

**High-Frequency Issues (same issue, multiple locations):**
- Code duplication
- Test coverage gaps
- Type safety violations

---

## Typical Findings Distribution

**Expected Results (based on November 2025 review):**

| Severity | Typical Count | Examples |
|----------|--------------|----------|
| Critical | 2-5 | Security-critical duplication, untested critical paths, architectural violations |
| High | 15-25 | Missing test coverage, large files, business logic in wrong layer |
| Medium | 25-35 | Inconsistent patterns, type assertions, minor security hardening |
| Low | 15-25 | Console.log cleanup, non-null assertions in tests, documentation gaps |
| **TOTAL** | **60-90** | **Comprehensive findings** |

**Quality Score:** 7.5-9.0 / 10 (good to excellent)

---

## After Review - Action Plan

**1. Read SUMMARY.md first**
- Get aggregate scores
- Understand overall assessment
- See critical blockers

**2. Fix Critical issues immediately**
- Production blockers
- Security vulnerabilities
- Architectural violations

**3. Prioritize High issues**
- Test coverage gaps for critical paths
- Large files needing refactoring
- Business logic in wrong layers

**4. Create implementation plan for Medium/Low**
- Batch similar issues
- Fix patterns, not individual instances
- Schedule over 2-4 weeks

**5. Track progress**
- Use `.review/PROGRESS_TRACKER.md`
- Re-run review after fixes
- Verify improvements

---

## File Retention Policy

**After comprehensive review cycle completes (all issues resolved):**

### Keep (Permanent Archive - Committed to Git)

**Archive summary to `docs/quality/`:**
```bash
# 1. Create archive file
cat .review/PROGRESS_TRACKER.md > docs/quality/YYYY-QN-review.md

# 2. Edit to add metadata header (review date, scores, timeline)

# 3. Commit the archive
git add docs/quality/YYYY-QN-review.md
git commit -m "docs(quality): archive QN YYYY comprehensive review results"
```

**What to archive:**
- Overall score (initial → final)
- Issue counts by severity (critical/high/medium/low)
- Resolution timeline (start date → completion date)
- Test suite growth (before → after counts)
- Key improvements and achievements
- Notable patterns or learnings

**Retention period:**
- Keep last 4 quarters (1 year rolling window)
- OR keep all if project < 2 years old
- Delete archives > 2 years old (unless milestone releases)

### Delete (Scratch Work - Not Committed)

**Remove detailed agent reports:**
```bash
# Delete after all issues resolved
rm -rf .review/results/
rm .review/SUMMARY.md
rm .review/CODE_REVIEW_GUIDE.md
rm .review/README.md
```

**What to delete:**
- Detailed agent reports (8 files, ~500KB total)
- Verbose findings and analysis
- Temporary review scaffolding

**Why delete:**
- Too verbose for long-term value (summaries sufficient)
- Bloat prevention (keeps repository lean)
- Summary preserves key insights without detail overload

### Keep (Living Document - Tracked in Git)

**Current tracker during active review:**
- `.review/PROGRESS_TRACKER.md` - stays during active review cycle
- After 100% completion → migrate to `docs/quality/` as archive
- Can reset for next review or keep as template

### Gitignore Configuration

**Add to `.gitignore`:**
```gitignore
# Review working files (scratch work, delete after use)
.review/results/
.review/SUMMARY.md
.review/CODE_REVIEW_GUIDE.md
.review/README.md
```

**DO NOT gitignore:**
- `.review/PROGRESS_TRACKER.md` - living document during active review

**After archiving:**
- Either commit PROGRESS_TRACKER.md as-is (shows active work)
- Or delete and regenerate fresh for next review

---

## Archive Benefits

**Historical tracking:**
- Compare quality scores quarter-over-quarter (8.4/10 → 10/10)
- Track test suite growth (3,033 → 4,929 tests)
- Identify systemic patterns (recurring issue categories)
- Celebrate progress (issue reduction, score improvements)

**Team learning:**
- New team members see quality journey
- Learn from past issues and resolutions
- Understand architectural evolution decisions

**Lightweight approach:**
- Summaries only (5-50KB each, not 500KB of verbose reports)
- No repository bloat
- Git history preserves all context
- Easy to review in pull requests

**Example archive:** See `docs/quality/2025-11-review.md` for reference structure

---

## Scope Options

**Default: Full Codebase**
```
All TypeScript files in src/ directory
Estimated: 400-600 files
Duration: ~15 minutes
```

**Feature-Scoped (for large codebases):**
```
/comprehensive-review feature/metadata-browser
Only reviews files in that feature
Faster, more focused
```

**Incremental (for very large codebases):**
```
Review only files changed since last comprehensive review
Track review coverage
Full review quarterly
```

---

## Scale Considerations

**Codebase Size Guidance:**

| Files | Approach | Notes |
|-------|----------|-------|
| <500 | ✅ Full review | Perfect sweet spot, works great |
| 500-1000 | ⚠️ Feature-scoped | Break into feature areas |
| 1000-2000 | ⚠️ Incremental | Review changes since last full review |
| 2000+ | ❌ Too broad | Must use feature-scoped or incremental |

---

## Cost-Benefit Analysis

**Costs:**
- 8x token cost vs single agent review
- ~15 minutes execution time
- 1-2 hours reviewing results
- 1-4 weeks fixing issues

**Benefits:**
- Production confidence (know exactly what needs fixing)
- Cross-agent pattern detection (issues single agent misses)
- Comprehensive coverage (8 specialized perspectives)
- Prioritized action plan (Critical → High → Medium → Low)
- Prevents costly post-production bugs

**ROI:** Excellent for pre-production gates, poor for regular feature reviews

---

## How to Invoke

**Step 1: Check Prerequisites**
```bash
npm run compile  # Must pass
npm test         # Must pass
# F5 manual testing must be complete
```

**Step 2: Invoke Comprehensive Review**
```
I need a comprehensive code review using the 8-agent parallel review process.

Prerequisites:
- ✅ Compilation: Passed
- ✅ Tests: Passed
- ✅ Manual Testing: Complete

Scope: [Full codebase | feature/NAME | incremental]

Please invoke all 8 specialized agents in parallel and aggregate results.
```

**Step 3: Review Results**
- Read `.review/SUMMARY.md` for overview
- Read individual agent reports for details
- Create action plan from prioritized findings

**Step 4: Track Fixes**
- Use `.review/PROGRESS_TRACKER.md`
- Mark issues as fixed
- Re-run review to verify improvements

---

## Example Invocation

**User:**
```
We just finished a major refactoring and are approaching production.
I need the comprehensive 8-agent review.

Prerequisites:
- ✅ npm run compile passes
- ✅ npm test passes (all tests green)
- ✅ Manual testing complete (all features tested with F5)

Please run the full codebase review.
```

**Expected:**
- 8 agents launch in parallel
- ~15 minutes execution
- `.review/` directory created with all reports
- SUMMARY.md aggregates findings
- 60-90 prioritized issues with action plan

---

## Success Metrics

**Good Review:**
- Finds 60-90 real issues (not noise)
- Critical issues are production blockers
- High issues are meaningful improvements
- Medium/Low issues are quality polish
- Cross-agent patterns reveal systemic issues

**Poor Review (Red Flags):**
- <20 total issues (agents not thorough enough)
- >200 issues (agents being pedantic, too much noise)
- All issues from single agent (agents not independent)
- No Critical or High issues (codebase perfect, or agents not critical enough)

---

## When NOT to Use This

**Use single code-guardian instead when:**
- Regular feature review (after implementing feature)
- Small changes (<10 files)
- Bug fixes
- Quick refactoring
- Uncertain if code is ready (get feedback first, comprehensive review when confident)

**Skip review entirely when:**
- Trivial changes (typo fixes, comment updates)
- Experimental code (not going to production)
- Prototype/spike code

---

## Alternatives

**For Regular Reviews:** Use `/code-review` (single code-guardian agent)
**For Quick Checks:** Use `/cleanup-code` (comment/logging standards)
**For Design Validation:** Invoke `design-architect` before implementation
**For Continuous Quality:** Run `/cleanup-code` after each feature

---

## Template for `.review/CODE_REVIEW_GUIDE.md`

The master guide is already in your `.review/` folder and defines:
- Severity definitions (Critical/High/Medium/Low)
- Clean Architecture checklist
- SOLID principles review
- TypeScript & type safety standards
- Code quality standards (duplication, complexity, comments, logging)
- Testing review (coverage expectations, test quality)
- Bug detection patterns
- Security review (OWASP Top 10)
- VS Code pattern compliance
- Report structure (standardized format for cross-agent aggregation)

---

## Important Notes

1. **This is expensive** - Use quarterly or at milestones, not every commit
2. **Requires mental bandwidth** - You'll get 60-90 issues to review and prioritize
3. **Results are actionable** - Every issue should have clear fix recommendation
4. **Cross-agent validation** - Issues mentioned by 3+ agents are systemic problems
5. **Production confidence** - After fixing Critical/High, you'll know code is ready

---

## Reference

**Previous Review Results (November 2025):**
- Files Analyzed: 456 TypeScript files
- Total Issues: 70 (3 Critical, 20 High, 29 Medium, 18 Low)
- Overall Score: 8.4/10 (Good)
- Production Ready: After fixing 3 critical + 5 high priority (2 weeks)

**Effectiveness:** Found security-critical duplication (escapeHtml), untested mappers (0% coverage), and missing tests for critical domain entities - all would have caused production issues.

---

**Expected Duration:** 15 min execution + 1-2 hours review + 1-4 weeks fixes

**Recommended Frequency:** Quarterly or at major milestones (pre-production, post-major-refactor)

**Worth It?** Absolutely for production gates. Too expensive for regular feature reviews.
