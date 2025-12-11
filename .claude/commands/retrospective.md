# Retrospective - Continuous Workflow Improvement

Systematic process for analyzing development patterns and improving workflow.

---

## PURPOSE

This command facilitates a **continuous improvement loop** by analyzing:
- Conversation history (patterns, corrections, decisions)
- Git history (commits, refactoring, bug patterns)
- PR/CI feedback (external tool findings, failures)
- Process effectiveness (what's working, what isn't)

The goal is **actionable improvements** to documentation, commands, agents, and practices.

---

## MODES

- `/retrospective` - Full retrospective (all phases)
- `/retrospective --collect` - Export data only (for multi-machine sync)
- `/retrospective --synthesize` - Combine exports and run full analysis

---

## CRITICAL BEHAVIORS

### Be Direct
- Give honest feedback, including on user prompting patterns
- Don't soften criticism - the user wants to improve
- "Your prompt was unclear here, which caused X" is appropriate

### Maintain Technical Positions
- Have opinions based on best practice
- When user disagrees, evaluate but don't immediately capitulate
- Technical disagreement is healthy - engage with it
- Avoid "You're absolutely right!" unless genuinely convinced

### This Is a Discussion, Not a Report
- Present findings, then discuss implications together
- User provides context you don't have
- Rabbit hole on interesting topics
- Track insights that emerge
- Decide together what matters

---

## PHASE 1: DATA COLLECTION (Automated)

**IMPORTANT: --collect is SHALLOW by design.**

The goal of --collect is to gather metrics and FLAG files for later review - NOT to deeply analyze conversation content. Deep analysis happens in the discussion phase (Phase 2) where you and the user review flagged items together.

| --collect Does | --collect Does NOT Do |
|----------------|----------------------|
| Count files, commits, PRs | Parse JSONL content deeply |
| Grep for keyword patterns | Interpret what patterns mean |
| Flag sessions for review | Explain "why" something happened |
| Export raw metrics | Make judgments about quality |

### 1.1 Conversation History Detection

**Location:** `~/.claude/projects/` - find directories matching this project.

```bash
# Find project history directories (main + worktrees)
ls ~/.claude/projects/ | grep "Power-Platform-Developer-Suite"

# On Windows with Git Bash:
ls /c/Users/$USER/.claude/projects/ | grep "Power-Platform-Developer-Suite"
```

**Note:** Worktree directories may have few/no JSONL files if most sessions were run from the main repo directory. This is expected - only collect from directories that have content.

---

**IMPORTANT: Sampling Strategy**

Conversation files can be huge (200+ MB total). Do NOT attempt to parse everything.

**Step 1: Inventory**
```bash
# List session files (exclude agent-* which are subagent logs)
ls -lt ~/.claude/projects/[PROJECT]/*.jsonl 2>/dev/null | grep -v "agent-" | head -20

# Get total size
du -sh ~/.claude/projects/[PROJECT]/
```

**Step 2: Pattern Detection via Grep (Fast)**

Search ALL files for patterns, but don't parse them:

```bash
# Correction patterns - Claude asking without recommending
grep -l "I'll decide\|let me decide\|I will decide" *.jsonl 2>/dev/null

# Correction patterns - Claude making unauthorized decisions
grep -l "don't assume\|ask me first\|should have asked" *.jsonl 2>/dev/null

# Frustration indicators
grep -l "STOP\|NO NO\|wrong" *.jsonl 2>/dev/null

# Yes-man behavior
grep -l "You're absolutely right\|you're absolutely right" *.jsonl 2>/dev/null

# Extended thinking usage
grep -l "think hard\|think harder\|ultrathink" *.jsonl 2>/dev/null

# Slash command usage
grep -o '"/[a-z-]*"' *.jsonl 2>/dev/null | sort | uniq -c | sort -rn | head -20
```

**Step 3: Sample Deep Analysis (2-3 sessions)**

Pick 2-3 of the **largest recent sessions** for deeper analysis:
- Read the actual JSONL content
- Extract specific exchanges where corrections happened
- Note decision points and pivots

**What to Extract:**

| Category | Method | What to Find |
|----------|--------|--------------|
| Correction patterns (Claude) | grep | Files with "I'll decide", "don't assume", etc. |
| Correction patterns (User) | sample read | Prompts that caused confusion |
| Decision points | sample read | Major technical decisions, pivots |
| Command usage | grep | Which slash commands were invoked |
| Tool usage | grep count | `"tool_use"` occurrences per session |
| Extended thinking | grep | When think/think harder was used |

### 1.2 Git Analysis

```bash
# Get date of last retrospective (or default to 30 days)
# Check docs/retrospective/history.json for lastRunDate

# Main branch commits
git log main --since="<last-retro-date>" --oneline

# Feature branches - identify active ones
git branch -a | grep -E "feature/|fix/"

# For each feature branch, analyze:
git log main..<branch> --oneline
git diff main..<branch> --stat

# Commit categorization
git log --since="<date>" --oneline | grep -E "^[a-f0-9]+ (feat|fix|refactor|test|docs|chore):"
```

**Extract:**
- Commit type distribution (feat vs fix vs refactor)
- Bug fix patterns - what caused them?
- Refactoring on feature branches - how much? why?
- File churn - files changed repeatedly
- Late discoveries - refactors late in branch lifecycle

### 1.3 PR/CI Analysis

```bash
# Recent PRs
gh pr list --state all --limit 20

# PR comments (external tool feedback)
gh api repos/{owner}/{repo}/pulls/{number}/comments

# CI failures
gh run list --limit 20
```

**Extract:**
- What did Gemini/Copilot/reviewers catch?
- Which findings should have been caught earlier?
- CI failure patterns
- Post-PR-creation commits (indicates gaps in local checks)

### 1.4 Process Audit

**Command/Agent Usage:**
- Which slash commands were used? (search conversation history)
- Which agents were invoked?
- What manual processes happened repeatedly?

**Tool Inventory:**
- What commands exist? (`.claude/commands/`)
- What agents exist? (`.claude/agents/`)
- What's documented but not used?
- What's used but could be improved?

**New Features Check:**
- What version of Claude Code is installed?
- Are there new features we're not using?
- New MCP servers relevant to this project?

```bash
# Claude Code version
claude --version

# Check for updates (web search)
# Search: "Claude Code changelog" or "Claude Code new features 2025"
```

### 1.5 Previous Retrospective Follow-up

If `docs/retrospective/history.json` exists:
- Load actions from last retrospective
- For each action: Was it implemented? Did it help?
- Note items that were "parked for later"

---

## PHASE 2: DISCUSSION SESSION (Interactive)

**This is the core of the retrospective. Not a report dump - a facilitated discussion.**

### Base Structure (Expand as Needed)

#### 2.1 Findings Presentation
Present findings grouped by theme:
1. **Process Failures** - Things that went wrong
2. **Process Successes** - Things that worked well
3. **Prompting Patterns** - Both Claude and user patterns
4. **Bug/Refactor Analysis** - What the git history reveals
5. **Tool/Command Gaps** - What's missing or underused
6. **New Opportunities** - Features we could adopt

For each theme:
- Share the data/evidence
- Give your analysis and opinion
- Ask for user's context and thoughts
- Discuss implications
- Track insights that emerge

#### 2.2 PR Comment Deep Dive
Present external tool findings:
- Group by source (Gemini, Copilot, human)
- For each significant finding, ask:
  - "Should Code Guardian have caught this?"
  - "Is this signal or noise?"
- Categorize for agent improvement

#### 2.3 Agent Performance Review
- Which agents were used?
- What did they catch vs miss?
- Are their "stances" appropriate?
- Propose updates based on PR findings

#### 2.4 User Pattern Feedback
Be direct:
- "I noticed you often prompt without X, which leads to Y"
- "When you did X, it worked well because Y"
- "Suggestion: Try X when starting complex tasks"

The user wants this feedback. Don't soften it.

#### 2.5 Effectiveness Discussion
Use quantitative signals to prompt qualitative discussion:
- "You used /prepare-release 3x, but there were commits after each PR. What happened?"
- "Feature branch X had 40% refactor commits. Was that preventable or healthy iteration?"
- "This bug type appeared 3 times. Is there a pattern?"

The numbers prompt the conversation; the discussion determines meaning.

#### 2.6 Decision Tracking
For each discussed item, decide:
- **Act:** Will address now, becomes a proposal
- **Park:** Interesting but not now, track for later
- **Discard:** Not worth pursuing

Use TodoWrite to track decisions during discussion.

---

## PHASE 3: SYNTHESIS

After discussion, consolidate into specific proposals.

### Proposal Categories

1. **CLAUDE.md Rules**
   - New rules based on patterns identified
   - Rules to remove (didn't help)
   - Rules to modify

2. **Command Updates**
   - Existing commands to improve
   - New commands needed
   - Commands to deprecate

3. **Agent Updates**
   - Stance clarifications
   - Focus area additions (from PR feedback)
   - Prompt improvements

4. **Documentation**
   - Gaps to fill
   - Outdated docs to update
   - New guides needed

5. **Process Changes**
   - Workflow modifications
   - New practices to adopt
   - Practices to stop

### Proposal Format

For each proposal:
```markdown
### [Category] Proposal: [Title]

**Problem:** What issue this addresses
**Evidence:** Data/examples that support this
**Proposal:** Specific change to make
**Priority:** P0 (do now) / P1 (this sprint) / P2 (backlog)
**Effort:** Low / Medium / High
```

---

## PHASE 4: APPROVAL & IMPLEMENTATION

### 4.1 Present Proposals
Show all proposals with context.

### 4.2 User Decision
For each proposal, user decides:
- **Approve:** Implement as proposed
- **Modify:** Implement with changes
- **Reject:** Don't implement (note why)
- **Defer:** Revisit next retrospective

### 4.3 Implementation
For approved proposals:
- Make the actual changes to files
- CLAUDE.md rules → edit CLAUDE.md
- Command updates → edit command files
- Agent updates → edit agent files
- Commit changes with message: `chore(retro): [summary of changes]`

### 4.4 Update History
Create/update `docs/retrospective/history.json`:
```json
{
  "lastRunDate": "2025-12-11",
  "retrospectives": [
    {
      "date": "2025-12-11",
      "actions": [
        {
          "type": "claude-md-rule",
          "description": "Added technical discourse rule",
          "status": "implemented"
        }
      ],
      "parkedItems": [
        "SQL TDS vs FetchXML architecture decision"
      ],
      "metrics": {
        "bugFixRatio": 0.30,
        "refactorRatio": 0.15,
        "ciFailureRate": 0.10
      }
    }
  ]
}
```

---

## OUTPUTS

### Primary Output: Findings Document
`docs/retrospective/YYYY-MM-DD.md`

Structure:
```markdown
# Retrospective: YYYY-MM-DD

## Summary
[High-level summary of findings and decisions]

## Data Analyzed
- Period: [date range]
- Commits analyzed: [count]
- PRs reviewed: [count]
- Conversation sessions: [count]

## Findings

### Process Failures
[What went wrong and why]

### Process Successes
[What worked well]

### Patterns Identified
[Both Claude and user patterns]

### Agent Performance
[What agents caught vs missed]

### Tool/Command Analysis
[Usage patterns, gaps, opportunities]

## Decisions Made

### Approved Actions
[List with status]

### Parked for Later
[Items to revisit]

### Rejected
[What we decided not to do and why]

## Metrics
[Quantitative measures for trend tracking]

## Next Retrospective
- Scheduled: [date or "on-demand"]
- Follow-up items: [what to check]
```

### Multi-Machine Export
`docs/retrospective/data/[machine-id]-YYYY-MM-DD.json`

When running `--collect`, create this file with the following schema:

```json
{
  "machineId": "DESKTOP-ABC",
  "exportDate": "2025-12-11",
  "period": {
    "start": "2025-11-11",
    "end": "2025-12-11",
    "source": "last 30 days (default)"
  },

  "conversationInsights": {
    "sessionCount": 15,
    "totalSizeMB": 207,
    "projectDirectories": [
      "C--VS-Power-Platform-Developer-Suite",
      "C--VS-Power-Platform-Developer-Suite-data-explorer"
    ],

    "correctionPatterns": {
      "claudeAskingWithoutRecommending": {
        "filesFound": 3,
        "examples": ["Session X: User said 'I'll decide'"]
      },
      "claudeMakingUnauthorizedDecisions": {
        "filesFound": 2,
        "examples": ["Session Y: User said 'don't assume'"]
      },
      "frustrationIndicators": {
        "filesFound": 1,
        "examples": ["Session Z: User used caps 'STOP'"]
      },
      "yesManBehavior": {
        "filesFound": 0,
        "examples": []
      }
    },

    "commandUsage": {
      "/design": 5,
      "/code-review": 3,
      "/handoff": 2
    },

    "extendedThinkingUsage": {
      "thinkHard": 2,
      "thinkHarder": 1,
      "ultrathink": 0
    },

    "observations": [
      "Pattern: Most sessions don't use slash commands",
      "Pattern: Extended thinking rarely used"
    ],

    "flaggedForReview": [
      {
        "file": "fc0b1764-c960-42d8-9592-952e0a160a41.jsonl",
        "reason": "Contains 'I'll decide' - possible missing recommendation",
        "sizeMB": 8.5
      },
      {
        "file": "cf6f36db-eb33-420b-a8e9-e8d781c01f80.jsonl",
        "reason": "Contains 'STOP' - possible frustration",
        "sizeMB": 2.8
      }
    ]
  },

  "gitSummary": {
    "totalCommits": 158,
    "commitsByType": {
      "feat": 45,
      "fix": 17,
      "refactor": 8,
      "test": 12,
      "docs": 15,
      "chore": 10,
      "other": 51
    },
    "mostChangedFiles": [
      {"file": "src/features/X/Panel.ts", "changes": 15},
      {"file": "CHANGELOG.md", "changes": 12}
    ],
    "activeBranches": [
      "feature/deployment-settings-promotion",
      "fix/notebook-no-data-race-condition"
    ],
    "observations": [
      "11% of commits are bug fixes",
      "High churn in Panel.ts files"
    ]
  },

  "prSummary": {
    "recentPRs": 20,
    "externalReviewFindings": [
      {
        "pr": "#43",
        "source": "Gemini",
        "finding": "Unused import",
        "shouldCatchEarlier": true
      }
    ],
    "ciFailures": 2,
    "postPRCommits": {
      "pr43": 4,
      "pr42": 1
    }
  },

  "toolInventory": {
    "commands": ["/design", "/code-review", "/prepare-release", "..."],
    "agents": ["code-guardian", "design-architect"],
    "observations": [
      "/prepare-pr exists but wasn't used in this period"
    ]
  },

  "highLevelObservations": {
    "successes": [
      "Design-first approach working for complex features"
    ],
    "failures": [
      "CHANGELOG verification skipped in v0.3.3 release"
    ],
    "improvements": [
      "Need to use /prepare-pr before PRs"
    ]
  }
}
```

**Required fields:** machineId, exportDate, period, conversationInsights, gitSummary
**Optional fields:** prSummary (if gh CLI available), toolInventory, highLevelObservations

### History Tracking
`docs/retrospective/history.json` - Tracks all retrospectives for trend analysis.

---

## MULTI-MACHINE WORKFLOW

When working across multiple machines:

1. **On each machine:**
   ```
   /retrospective --collect
   ```
   This exports conversation insights to `docs/retrospective/data/`

2. **Sync via git:**
   ```bash
   git add docs/retrospective/data/
   git commit -m "chore: retrospective data export"
   git push
   ```

3. **On any machine (after sync):**
   ```
   /retrospective --synthesize
   ```
   This combines all exports and runs the full retrospective.

---

## FREQUENCY

- **Recommended:** Bi-weekly
- **On-demand:** After incidents, failed releases, or significant issues
- **Prompt to consider:** After any significant fuck-up, Claude may suggest running a retrospective

---

## EXAMPLE FLOW

```
User: /retrospective

Claude: Starting retrospective...

[Phase 1: Automated data collection - 2-3 minutes]

Claude: Data collection complete. Here's what I found:

**Period:** Dec 1-11, 2025 (10 days)
**Commits:** 47 (32 feat, 10 fix, 5 refactor)
**PRs:** 3 created, 2 merged
**Sessions:** 8 conversation sessions analyzed

Let's discuss the findings. I'll start with what stands out most.

---

**Process Failures:**

1. The v0.3.3 release had CHANGELOG issues - it was created from memory,
   not from git log. There were also 4 commits after the PR was created.

   My take: The /prepare-release command existed but the steps weren't
   followed strictly. We've since added /prepare-pr with explicit
   verification, but I'm curious - what happened in that session?

User: [Provides context about rushing, not following steps]

Claude: That tracks. The pattern I see in conversations is [X].
One thing that might help: [suggestion]. What do you think?

[... continued discussion ...]

---

[After discussion]

Claude: Based on our discussion, here are the proposals:

### P0: Add technical discourse rule to CLAUDE.md
**Problem:** Yes-man behavior in technical discussions
**Proposal:** [specific rule text]
Approve / Modify / Reject?

User: Approve

[Claude implements the change]

---

Retrospective complete.
- 5 actions approved and implemented
- 2 items parked for later
- Findings saved to docs/retrospective/2025-12-11.md
```

---

## RELATED COMMANDS

- `/prepare-pr` - Pre-PR validation (informed by retrospective findings)
- `/prepare-release` - Release preparation
- `/code-review` - Code review (agent may be updated by retrospective)
- `/design` - Feature design (process may be informed by retrospective)

---

## REFERENCES

- `CLAUDE.md` - Project rules (may be updated)
- `.claude/agents/` - Agent definitions (may be updated)
- `docs/retrospective/` - Retrospective history and exports
