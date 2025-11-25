# Claude Setup Guide

Best practices for maintaining CLAUDE.md and agent definitions in the Power Platform Developer Suite. Reference this guide when updating .claude configuration files.

---

## 🚀 Quick Reference

### What This Guide Covers

- **CLAUDE.md best practices** - How to write effective project instructions
- **Agent prompt structure** - Required sections and patterns
- **Token optimization** - Keeping prompts concise and effective
- **Common mistakes** - What to avoid when writing .claude files

### Key Principles

| Principle | Guideline |
|-----------|-----------|
| **Conciseness** | Start with 20-50 lines, grow only if needed |
| **No doc links** | Claude won't read them proactively |
| **Iterate** | Refine based on what works in practice |
| **Context files** | Agents must specify what to read |
| **Output format** | Always define structured output |

---

## 📖 Detailed Guide

## Purpose of .claude Configuration

The `.claude` folder contains instructions for Claude Code that define:
- Project-specific rules and patterns (CLAUDE.md)
- Specialized agent behaviors (.claude/agents/*.md)
- How Claude should assist with this specific codebase

**Key Difference from docs/:**
- `.claude/` = Instructions **for Claude** (how to help)
- `docs/` = Documentation **for developers** (how to build)

---

## CLAUDE.md: Project Instructions

### What is CLAUDE.md?

The `CLAUDE.md` file (in your repository root) contains project-specific rules and patterns that Claude Code reads **before every response**.

**Location:** Repository root (not in .claude/)
**Purpose:** Quick reference card for architectural rules
**Audience:** Claude Code (optimized for AI comprehension)

### Recommended Structure

```markdown
# CLAUDE.md - Quick Reference

## 🚫 NEVER (Non-Negotiable)
[Critical violations that should never happen]

## ✅ ALWAYS (Required Patterns)
[Mandatory patterns that must be followed]

## 💬 [Other Brief Guidelines]
[Keep additional sections minimal]

**Development:** [Key commands]
```

### Best Practices

#### 1. Keep It Concise and Human-Readable

**Anthropic's Guidance:** "There's no required format for CLAUDE.md files. Keep them concise and human-readable."

**Why:** CLAUDE.md is read on **every** response. The shorter and clearer, the better.

**Start small** (20-50 lines) and grow only if needed. Iterate like any frequently-used prompt.

✅ **GOOD** - Concise rules with doc references:
```markdown
## 🚫 NEVER

1. **`any` without explicit type** - Use proper interfaces or `unknown` with narrowing
   📖 Full: `docs/TYPE_SAFETY_GUIDE.md`
```

❌ **BAD** - Duplicating full documentation:
```markdown
## Type Safety

TypeScript's type system is designed to catch bugs at compile time.
When you use `any`, you're telling TypeScript "I don't care about type safety here"...
[50 more lines explaining why any is bad]
```

**Rule:** Reference detailed docs, don't duplicate them.

---

#### 2. Use Hierarchy: NEVER → ALWAYS → Guidelines

**NEVER** = Auto-reject violations
- `any` without justification
- `eslint-disable` without permission
- Direct `updateWebview()` calls
- Code duplication (3+ occurrences)

**ALWAYS** = Required patterns
- TypeScript strict mode
- Explicit return types on services
- ComponentFactory for component creation
- Event bridges for updates

**Guidelines** = Best practices (context-dependent)
- Prefer composition over inheritance
- Keep methods under 50 lines
- Use semantic naming

**Example from our CLAUDE.md:**
```markdown
## 🚫 NEVER (Non-Negotiable)
1. **`any` without explicit type** - Use proper interfaces

## ✅ ALWAYS (Required Patterns)
1. **TypeScript strict mode** - Type safety catches bugs

## 🎯 Top Violations
1. `any` instead of Interface Segregation → Use `IRenderable[]`
```

---

#### 3. Don't Bother Linking to Docs

**Reality Check:** Claude doesn't proactively read links from CLAUDE.md.

❌ **DOESN'T WORK:**
```markdown
## 📚 Documentation

- **Architecture:** `docs/ARCHITECTURE_GUIDE.md`
- **Components:** `docs/COMPONENT_PATTERNS.md`

[Claude will never read these just because they're linked here]
```

✅ **INSTEAD:** Include only rules Claude needs on every response.

**When Claude needs docs:** It will search/ask when it encounters a problem that requires deeper knowledge.

**Why list links?** They don't help. Save the tokens.

---

#### 4. Include Brief Context, Not Full Explanations

**CLAUDE.md should be actionable**, not educational.

✅ **GOOD:**
```markdown
**`onChange` for EnvironmentSelector** - Without it, panel won't load data
```

❌ **TOO MUCH:**
```markdown
**EnvironmentSelector onChange Pattern**

All EnvironmentSelector components must have onChange handler because panels need to refresh data when environment changes. Without onChange, user selects environment but nothing happens, creating a confusing user experience where the UI appears broken.

[Continues for 10 more lines...]
```

**Rule:** Brief context (one line) is helpful. Full explanations belong in docs (which Claude will find when needed).

---

#### 5. Iterate Based on Effectiveness

**Anthropic's advice:** "Refine like any frequently used prompt."

**Process:**
1. Start minimal (20-50 lines)
2. Use Claude for real work
3. Notice where Claude makes mistakes
4. Add rules to prevent those mistakes
5. Remove rules that Claude never violates

**Don't pre-optimize:** Add rules as you discover they're needed, not speculatively.

---

#### 6. Use Real Examples from Codebase

✅ **GOOD:**
```markdown
## Top Violations
1. Missing onChange in EnvironmentSelector → Panel won't load data
```

❌ **BAD:**
```markdown
## Top Violations
1. Not handling user input correctly → Application won't work
```

**Why:** Specific examples are memorable and actionable.

---

### Token Optimization for CLAUDE.md

**Target:** As concise as possible while remaining effective

**Anthropic's Example** (20-30 lines):
```markdown
# Bash commands
- npm run build: Build the project
- npm run typecheck: Run the typechecker

# Code style
- Use ES modules syntax
- Destructure imports when possible

# Workflow
- Typecheck after code changes
- Prefer running single tests
```

**Our CLAUDE.md** (55 lines):
```markdown
# CLAUDE.md - Quick Reference

## 🚫 NEVER (Non-Negotiable)
1. `any` without explicit type
2. `eslint-disable` without permission
[8 more rules...]

## ✅ ALWAYS (Required Patterns)
1. TypeScript strict mode
2. Service → Model mapping
[9 more rules...]

## 💬 Commenting Rules
[Brief guidelines]

**Development:** `npm run compile`
```

**Strategies to Keep It Concise:**

1. **Use bullet points, not prose**
   - ✅ `Use kebab-case: 'environment-changed' not 'environmentChanged'`
   - ❌ "Message names should always use kebab-case naming convention. For example, instead of using camelCase like 'environmentChanged', you should use 'environment-changed'."

2. **Abbreviate where clear**
   - ✅ `📖 Full: docs/GUIDE.md`
   - ❌ `For the complete guide, please see docs/GUIDE.md`

3. **Group related rules**
   - ✅ One "Type Safety" section with 5 rules
   - ❌ Five separate sections each explaining one type rule

4. **Remove redundancy**
   - If rule is obvious from pattern name, don't repeat
   - Example: "ComponentFactory for creation" is clear without "Use ComponentFactory to create components"

5. **Don't link to docs**
   - Claude won't proactively read them
   - Save the tokens


---

## Agent Prompt Structure

### Required Sections

Every agent definition MUST have:

```markdown
---
name: agent-name
description: When this agent should be invoked (with examples)
model: sonnet
color: blue
---

[System prompt for the agent]

## Context Files - Read Before EVERY Task

[Files the agent must read first]

## Your Core Responsibilities

[What the agent does]

## Your Process

[Step-by-step instructions]

## Output Format

[Expected output structure]

## Your Mindset

[Guardrails and philosophy]
```

**Example from our architect agent:**

```yaml
---
name: architect
description: Use this agent to design solutions for new features or major refactors...
model: sonnet
color: blue
---

You are an elite software architect for the Power Platform Developer Suite...

## Context Files - Read Before EVERY Design

- `CLAUDE.md` - Architectural rules (non-negotiable)
- `docs/ARCHITECTURE_GUIDE.md` - System architecture
...
```

---

## Agent Design Best Practices

### 1. Make Agent Purpose Crystal Clear

**Good description includes:**
- WHEN to invoke the agent
- WHAT the agent does
- Examples of invocation scenarios

✅ **GOOD:**
```yaml
description: Use this agent to design solutions for new features or major refactors. Takes requirements and produces detailed implementation designs following SOLID, DRY, and YAGNI principles. Should be invoked before starting significant implementation work.

Examples:

<example>
Context: User wants to add a new feature.
user: "I need to add a bulk export feature to the solution explorer."
assistant: "Let me use the architect agent to design this feature properly before we start implementing."
<Task tool invocation to architect agent>
</example>
```

❌ **BAD:**
```yaml
description: Designs things

Examples: None
```

**Why:** Claude needs to know when to invoke the agent proactively.

---

### 2. Specify Context Files to Read

**Pattern:** Tell agent exactly what to read before starting work.

✅ **GOOD:**
```markdown
## Context Files - Read Before EVERY Design

Before designing ANY solution, read these files to understand current architecture:
- `CLAUDE.md` - Architectural rules and patterns (non-negotiable)
- `docs/ARCHITECTURE_GUIDE.md` - System architecture overview
- `docs/COMPONENT_PATTERNS.md` - Component design patterns

These are your source of truth.
```

❌ **BAD:**
```markdown
Read the documentation if needed.
```

**Why:**
- Ensures consistency across agent invocations
- Reduces hallucination (agent uses actual project patterns)
- Makes agent output predictable

---

### 3. Define Clear Output Format

**Agents return ONE message** to the main session. Specify exact format.

✅ **GOOD:**
```markdown
## Your Output Format

```markdown
## REVIEW: APPROVED ✅

**Changes Reviewed:** [Brief description]

**SOLID Compliance:**
- ✅ Type Safety: [What was checked]
- ✅ SRP: [Verified]
...

**Recommendation:** APPROVE - Ready to commit.
```
```

❌ **BAD:**
```markdown
Just tell the user if the code is good or not.
```

**Why:** Structured output is easier to parse and act upon.

---

### 4. Include Decision Framework

**Help agent make consistent decisions.**

✅ **GOOD:**
```markdown
## Your Decision Framework

**APPROVE** only when:
- ✅ All architectural principles are followed
- ✅ No violations of mandatory patterns
- ✅ Code is consistent with existing patterns

**REJECT** immediately if:
- ❌ Any use of `any` without explicit justification
- ❌ Missing BaseBehavior extension for webview behaviors
- ❌ Code duplication (Three Strikes Rule)
```

❌ **BAD:**
```markdown
Use your judgment to decide if code is good.
```

**Why:** Consistent decisions across different sessions.

---

### 5. Embed the Agent's Mindset

**Last section sets guardrails and philosophy.**

✅ **GOOD:**
```markdown
## Your Mindset

**You are the guardian of code quality.** Your job is to:
- ✅ Catch violations BEFORE they merge
- ✅ Enforce patterns consistently
- ❌ Don't accept "it works" as justification for violations

**When in doubt:** Ask "Will this make the codebase easier or harder to maintain?"
```

**Why:** Reinforces the agent's role and prevents scope creep.

---

## Token Management Strategies

Agent invocations share the 200k token budget (Claude 4.5 Sonnet).

### 1. Reference, Don't Duplicate

✅ **GOOD:**
```markdown
Before reviewing ANY code, read these files:
- `CLAUDE.md` - Rules Card
- `docs/ARCHITECTURE_GUIDE.md` - Architecture overview
```

❌ **BAD:**
```markdown
Here are all the architectural rules:
[Paste entire contents of CLAUDE.md and ARCHITECTURE_GUIDE.md]
```

**Why:** Agent reads files when needed. Duplicating wastes tokens.

---

### 2. Scope Agent Tightly

**Each agent should do ONE thing well.**

✅ **GOOD:**
- `architect.md` - Designs solutions (doesn't implement)
- `code-reviewer.md` - Reviews code (doesn't fix it)
- `docs-generator.md` - Creates docs (doesn't write code)

❌ **BAD:**
- `super-agent.md` - Designs, implements, reviews, documents, tests everything

**Why:** Tight scope = shorter prompts, clearer output, better results.

---

### 3. Use Checklists, Not Prose

✅ **GOOD:**
```markdown
### Type Safety
- [ ] No `any` without explicit justification
- [ ] Services return typed models
- [ ] Explicit return types on public methods
```

❌ **BAD:**
```markdown
### Type Safety
You should check that the code doesn't use `any` without a good reason.
Also make sure that services return typed models instead of returning `any`.
All public methods should have explicit return types...
```

**Why:** Checklists are concise and actionable. Save ~50% tokens.

---

## When to Specialize Agents

### Principles for Agent Specialization

**Create specialized agent when:**
- Task is repeatable with consistent checklist
- Task requires different context than main session
- Task should enforce consistent rules every time

**Don't create specialized agent when:**
- Task is one-off or rare
- Task is simple and quick
- Task requires back-and-forth discussion (agents return ONE message)

**Current agents:**
- `architect.md` - Designs solutions before implementation
- `code-reviewer.md` - Reviews code against architectural principles
- `docs-generator.md` - Creates/updates documentation following style guide

---

## Common Mistakes and Solutions

### ❌ Mistake 1: Linking to Docs That Claude Won't Read

**Problem:**
```markdown
CLAUDE.md:
## 📚 Documentation
- Architecture: `docs/ARCHITECTURE_GUIDE.md`
- Components: `docs/COMPONENT_PATTERNS.md`
[Claude never reads these links]
```

**Fix:**
```markdown
CLAUDE.md:
## 🚫 NEVER
1. `any` without explicit type
[Just the rules Claude needs on every response]
```

**Why:** Claude doesn't proactively read links. Include only what it needs immediately.

---

### ❌ Mistake 2: Agent Without Context Files

**Problem:**
```markdown
---
name: code-reviewer
---

Review the code and tell me if it's good.
```

**Fix:**
```markdown
---
name: code-reviewer
---

## Context Files - Read Before EVERY Review

Before reviewing ANY code, read:
- `CLAUDE.md` - Rules Card (non-negotiable)
- `docs/ARCHITECTURE_GUIDE.md` - Architecture principles

[Rest of prompt...]
```

**Why:** Agents need context to make consistent decisions.

---

### ❌ Mistake 3: No Output Format Specification

**Problem:**
```markdown
Tell the user what you found.
```

**Result:** Inconsistent output every time.

**Fix:**
```markdown
## Your Output Format

**For APPROVED code**:
```
## REVIEW: APPROVED ✅
[Structured format]
```

**For REJECTED code**:
```
## REVIEW: REJECTED ❌
[Structured format]
```
```

**Why:** Structured output is predictable and actionable.

---

### ❌ Mistake 4: Agent Too Broad

**Problem:**
```markdown
---
name: super-agent
description: Does everything (design, implement, review, document, test)
---
```

**Result:** Inconsistent results, hard to predict behavior.

**Fix:** Create specialized agents
```
architect.md - Designs only
code-reviewer.md - Reviews only
docs-generator.md - Documents only
```

**Why:** Specialized agents are more consistent and effective.


---

## 🔗 See Also

- [DOCUMENTATION_STYLE_GUIDE.md](DOCUMENTATION_STYLE_GUIDE.md) - How to write documentation
- [ARCHITECTURE_GUIDE.md](ARCHITECTURE_GUIDE.md) - System architecture and Clean Architecture principles
- [CODE_COMMENTING_GUIDE.md](CODE_COMMENTING_GUIDE.md) - When and how to comment code
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Quick lookup for common patterns
- `.claude/AGENT_USAGE.md` - How to use agents in this project
- `.claude/WORKFLOW_GUIDE.md` - Multi-agent workflow examples
