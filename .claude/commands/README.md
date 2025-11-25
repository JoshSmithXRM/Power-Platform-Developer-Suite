# Claude Code Commands

This directory contains custom slash commands for Claude Code.

## Available Commands

### Code Quality
- `/cleanup-code` - Systematic code quality cleanup (comments, logging, placeholders)
- `/code-review` - Invoke code-guardian agent for feature review
- `/comprehensive-review` - Full 8-agent codebase review (quarterly/pre-production)

### Technical Debt Management
- `/review-technical-debt` - Audit all technical debt items, clean up resolved issues
- `/fix-technical-debt` - Interactively fix technical debt items (verify → plan → implement → review)

## Usage

Type `/` in Claude Code to see all available commands.

## Command Descriptions

### `/cleanup-code`
**Purpose:** Find and fix code quality violations (console.log, placeholder comments, logging violations)
**Frequency:** Before code review
**Duration:** 10-20 minutes

### `/code-review`
**Purpose:** Invoke code-guardian agent to review completed feature
**Frequency:** After each feature complete (all 4 layers + tests)
**Duration:** 5-15 minutes

### `/comprehensive-review`
**Purpose:** Full 8-agent parallel codebase review
**Frequency:** Quarterly or pre-production only (expensive - 8x token cost)
**Duration:** ~15 minutes

### `/review-technical-debt`
**Purpose:** Audit categorized technical debt items, verify issues still exist, clean up resolved items
**Frequency:** Quarterly or before major releases
**Duration:** 5-10 minutes

### `/fix-technical-debt`
**Purpose:** Interactively fix technical debt items - select item → verify → plan → implement → review
**Frequency:** As needed per sprint planning
**Duration:** 2-6 hours (depends on item complexity)

---

## Best Practices

**Before Feature Complete:**
1. `/cleanup-code` - Fix code quality issues
2. `/code-review` - Get code-guardian approval

**Quarterly Maintenance:**
1. `/review-technical-debt` - Clean up resolved issues
2. `/comprehensive-review` - Full codebase audit (if needed)

**Sprint Planning:**
1. `/fix-technical-debt` - Address priority debt items
