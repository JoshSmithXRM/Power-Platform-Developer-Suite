# Case Study: Building the /retrospective Process

**Date:** December 11, 2025
**Trigger:** v0.3.3 release had preventable issues
**Outcome:** Created systematic workflow improvement process

---

## The Problem

During the v0.3.3 release preparation, two issues occurred:

1. **CHANGELOG not verified against commits** - Created from memory, not from `git log`
2. **Test coverage not checked** - `npm run compile` ran tests, but coverage thresholds weren't explicitly verified

Both issues were caught by CI after the PR was created - they should have been caught locally.

**Root cause:** The release process documentation existed, but there was no forcing function to ensure steps were followed.

---

## Initial Response

Created two new commands to prevent immediate recurrence:

| Command | Purpose |
|---------|---------|
| `/prepare-pr` | Full PR validation (compile, tests, coverage, CHANGELOG verification, code review) |
| `/prepare-release` | Enhanced with explicit CHANGELOG↔git log cross-reference |

**Key improvement:** CHANGELOG verification now requires running `git log main..HEAD` and explicitly confirming entries match commits.

---

## The Deeper Problem

The immediate fix addressed the symptom, but a larger pattern emerged:

> "I'm saying this shit all the time: provide your recommendation and rationale and I will decide. HEY STOP DOING THAT SHIT YOU ARE MAKING EXECUTIVE DECISIONS"

The user identified recurring correction patterns that weren't being captured or addressed systematically. This led to designing a **continuous improvement process** - the `/retrospective` command.

---

## Requirements Discovery

### Key Requirements Identified

1. **Analyze multiple data sources:**
   - Conversation history (correction patterns, decisions)
   - Git history (commits, refactoring, bug patterns)
   - PR/CI feedback (external tool findings)
   - Process effectiveness

2. **Support multi-machine development:**
   - User works on multiple machines with separate conversation histories
   - Need export/sync/aggregate workflow

3. **Two-way feedback loop:**
   - Not just "Claude needs to improve"
   - Also "how can user prompting improve?"

4. **Discussion, not just reporting:**
   - Retrospective should be interactive brainstorming
   - Not a report dump with checkboxes

5. **Claude should have opinions:**
   - Technical disagreement is healthy
   - Avoid "yes-man" behavior
   - Maintain positions until genuinely convinced

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| Bi-weekly + on-demand | Regular cadence ensures it happens; on-demand for incidents |
| Export/sync/synthesize for multi-machine | Uses git for sync, no cloud dependency |
| Discussion phase is core | Numbers prompt conversation; discussion determines meaning |
| Include agent improvement | PR comments from Gemini/Copilot should feed back to code-guardian |

---

## Iteration Cycle

### Iteration 1: Initial Design (This Session)

Created `/retrospective` command with:
- Phase 1: Data Collection
- Phase 2: Discussion Session
- Phase 3: Synthesis
- Phase 4: Approval & Implementation

### Iteration 2: First --collect Run (Machine: SKYNET)

**Feedback received:**

| Issue | Severity |
|-------|----------|
| No JSONL sampling strategy (207MB too large) | High |
| Export schema too vague | High |
| "Analyze" is ambiguous | High |
| Worktree directories empty (undocumented) | Medium |
| Windows bash issues | Low |

**Changes made:**
- Added concrete sampling strategy
- Specified grep-based pattern detection
- Expanded export schema with all fields
- Documented expected empty worktree behavior
- Added Windows Git Bash path examples

### Iteration 3: Second --collect Run (Machine: Josh-PC)

**Feedback received:**

| Issue | Finding |
|-------|---------|
| Sampling strategy still unclear | "Analyze" vs "detect" confusion |
| Deep JSONL parsing not feasible | 72MB+ can't be parsed in one invocation |
| Export schemas inconsistent | Different fields between machines |

**Key insight:** We were asking --collect to do semantic analysis that can't be automated.

**Changes made:**
- Made --collect **explicitly shallow**
- Renamed "analyze" to "detect/flag"
- Added `flaggedForReview` section to export
- Clarified: deep analysis happens in discussion phase, not --collect

---

## Final Design

### --collect (Shallow, Mechanical)

```
Purpose: Gather metrics and FLAG files for review
Does: Count, grep, export raw data
Does NOT: Parse JSONL deeply, interpret patterns, explain "why"
```

### --synthesize (Interactive, Interpretive)

```
Purpose: Combine exports and facilitate discussion
Does: Present findings, ask questions, track decisions
Key: Discussion determines meaning, not automated analysis
```

### The Split

| Mechanical (--collect) | Interpretive (Discussion) |
|------------------------|---------------------------|
| File counts | "What decisions were made?" |
| Grep patterns | "Why did this happen?" |
| Git stats | "Should we have caught this?" |
| Flag files | "Is this signal or noise?" |

---

## Key Learnings

### 1. Shallow Collect + Deep Discussion

Trying to automate semantic analysis of conversations doesn't work. Better to:
- Collect metrics quickly (grep, counts)
- Flag files for human review
- Discuss flagged items interactively

### 2. Test the Process Before Finalizing

Running --collect on the first machine revealed gaps that weren't obvious in design. The iteration cycle:

```
Design → Test → Feedback → Improve → Test → Feedback → Improve
```

### 3. Multi-Machine is a Real Constraint

Conversation history is local. The export/sync/synthesize pattern handles this without requiring cloud sync:

```
Machine A: --collect → export JSON
Machine B: --collect → export JSON
Git sync
Any machine: --synthesize → discussion
```

### 4. Be Explicit About Limitations

The original command implied deep analysis that wasn't feasible. Being explicit about what --collect DOESN'T do prevents confusion:

> "The goal of --collect is to gather metrics and FLAG files for later review - NOT to deeply analyze conversation content."

### 5. Iterate with Real Feedback

Each run produced specific, actionable feedback:
- "The export schema was vague" → Added concrete schema
- "Sampling strategy unclear" → Added explicit steps
- "Can't parse 207MB" → Made collection explicitly shallow

---

## Artifacts Produced

| Artifact | Location |
|----------|----------|
| `/retrospective` command | `.claude/commands/retrospective.md` |
| `/prepare-pr` command | `.claude/commands/prepare-pr.md` |
| Updated `/prepare-release` | `.claude/commands/prepare-release.md` |
| Retrospective data directory | `docs/retrospective/` |
| This case study | `docs/architecture/RETROSPECTIVE_CASE_STUDY.md` |

---

## Process for Future Refinement

When iterating on workflow processes:

1. **Identify the trigger** - What went wrong? What pattern emerged?
2. **Design with recommendations** - Claude proposes, user decides
3. **Test in fresh session** - Does the command work without design context?
4. **Collect specific feedback** - What worked? What was confusing?
5. **Iterate quickly** - Fix issues before next test
6. **Document the journey** - Case study for future reference

---

## Open Items for Future Retrospectives

1. **Agent stances** - Define explicit advocacy positions for code-guardian, design-architect
2. **PR comment feedback loop** - Systematically feed external tool findings back to agents
3. **Metrics tracking** - Build history.json over time to see improvement trends
4. **JSONL parser** - If deep conversation analysis is needed, build dedicated tooling

---

## Summary

What started as fixing a release process issue evolved into designing a systematic workflow improvement process. Key insight: **continuous improvement requires both automation (metrics) and discussion (interpretation)**. Neither alone is sufficient.

The retrospective process now supports:
- Multi-machine development workflows
- Two-way feedback (Claude and user)
- Iterative improvement based on real usage
- Discussion-driven analysis, not just reporting
