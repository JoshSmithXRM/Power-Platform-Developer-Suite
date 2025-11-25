# Design Feature

Invoke design-architect agent to create a technical design for a feature.

## Usage

`/design [feature description or scope]`

If `$ARGUMENTS` not provided, ask: "What feature should I design?"

## Process

1. **Gather Context** (parallel)
   - Read relevant existing code if extending a feature
   - Check for similar patterns in codebase
   - Read CLAUDE.md and relevant architecture docs

2. **Invoke design-architect**

   Use Task tool with `subagent_type: design-architect`:
   ```
   Design: [feature description]

   Context:
   - [Any relevant existing code/patterns found]
   - [Constraints from CLAUDE.md]

   Output a technical design covering:
   - Panel mockup (if UI involved)
   - ViewModels needed
   - Use cases and their responsibilities
   - Domain entities with behavior (rich models)
   - Type contracts between layers
   ```

3. **Save Design**

   Save output to `.claude/designs/[feature-name].md`

## Design Scope Guidelines

| Complexity | Approach |
|------------|----------|
| Simple (1-2 files) | Skip /design, just implement |
| Medium (3-6 files) | Design first slice only |
| Complex (7+ files) | Break into slices, design each |

## Notes

- Design covers WHAT and WHERE, not detailed HOW
- Implementation follows inside-out: Domain → App → Infra → Presentation
- For panels, also reference `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md`
