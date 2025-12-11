# Retrospective Data

This directory contains outputs from the `/retrospective` command.

## Structure

```
docs/retrospective/
├── README.md              # This file
├── history.json           # Tracks all retrospectives and metrics over time
├── YYYY-MM-DD.md          # Individual retrospective findings documents
└── data/                  # Multi-machine export data
    ├── .gitkeep
    └── [machine-id]-YYYY-MM-DD.json
```

## Files

### history.json
Tracks retrospective history for trend analysis:
- When retrospectives were run
- Actions taken and their outcomes
- Metrics over time (bug ratios, process adherence, etc.)

### YYYY-MM-DD.md
Full findings document for each retrospective:
- Data analyzed (period, commits, PRs, sessions)
- Findings by theme (failures, successes, patterns)
- Decisions made (approved, parked, rejected)
- Metrics snapshot

### data/*.json
Machine-specific exports for multi-machine workflow:
- Conversation insights from that machine
- Git analysis snapshot
- Used for aggregation via `/retrospective --synthesize`

## Multi-Machine Workflow

When working across multiple machines:

1. On each machine: `/retrospective --collect`
2. Sync via git: `git add docs/retrospective/data/ && git commit && git push`
3. On any machine: `/retrospective --synthesize`

## Usage

See `.claude/commands/retrospective.md` for full command documentation.
