# Design Feature

Invoke design-architect agent to create a technical design for a feature.

## Usage

`/design [feature description or scope]`

If `$ARGUMENTS` not provided, ask: "What feature should I design?"

## Process

1. **Gather Context** (parallel)
   - Read CLAUDE.md for project rules
   - Read `.claude/templates/TECHNICAL_DESIGN_TEMPLATE.md` for format
   - Read relevant existing code if extending a feature

2. **Invoke design-architect**

   Use Task tool with `subagent_type: design-architect` and this prompt:
   ```
   PROJECT CONTEXT:
   - Read CLAUDE.md for coding rules (rich domain models, Clean Architecture)
   - Read .claude/templates/TECHNICAL_DESIGN_TEMPLATE.md for design format
   - For panels: read .claude/templates/PANEL_DEVELOPMENT_GUIDE.md

   DESIGN REQUEST:
   [feature description from $ARGUMENTS]

   OUTPUT:
   - Save design to: docs/design/[FEATURE]_DESIGN.md
   - Use outside-in: Panel → ViewModels → Use Cases → Domain
   - Define type contracts upfront
   - Break into implementable slices (MVP first)
   ```

## Design Scope Guidelines

| Complexity | Approach |
|------------|----------|
| Simple (1-2 files) | Skip /design, just implement |
| Medium (3-6 files) | Design first slice only |
| Complex (7+ files) | Break into slices, design each separately |

## Notes

- Design covers WHAT and WHERE, not detailed HOW
- Implementation follows inside-out: Domain → App → Infra → Presentation
- Delete design doc after feature is implemented (tests are the spec)
