# Power Platform Developer Suite - Documentation

**Master index for all project documentation. Navigate by category to find guides, architecture documentation, and design specifications.**

---

## 🚀 Getting Started

### For Developers
- [CLAUDE.md](../CLAUDE.md) - Quick reference for AI assistants (essential rules and patterns)
- [DOCUMENTATION_STYLE_GUIDE.md](DOCUMENTATION_STYLE_GUIDE.md) - How to write and maintain documentation

### For Contributors
Start with CLAUDE.md to understand the project's core principles, then refer to the Clean Architecture Guide for implementation patterns.

---

## 📐 Core Architecture

### Architecture Guides
- [CLEAN_ARCHITECTURE_GUIDE.md](architecture/CLEAN_ARCHITECTURE_GUIDE.md) - Clean Architecture implementation patterns in this codebase
  - Rich domain models with behavior (not anemic entities)
  - Use cases that orchestrate (no business logic)
  - Dependency inversion and repository pattern
  - Real examples from Environment and Persistence Inspector features

### Infrastructure Documentation
- [LOGGING_GUIDE.md](architecture/LOGGING_GUIDE.md) - Logging architecture and patterns
  - Layer boundaries for logging (domain has zero logging)
  - OutputChannel vs console.log usage
  - Webview logging with message bridge pattern
  - Dependency injection for ILogger

---

## 🏗️ Design Documents

### Feature Designs
- [data-panel-suite-requirements.md](design/data-panel-suite-requirements.md) - Requirements for Data Panel Suite
  - 4 panels: Solution Explorer, Import Job Viewer, Environment Variables, Connection References
  - API endpoints, domain models, and business rules
  - Deployment settings export functionality

- [data-panel-suite-design.md](design/data-panel-suite-design.md) - Clean Architecture design for Data Panel Suite
  - Domain entities with rich behavior (Solution, ImportJob, EnvironmentVariable, etc.)
  - Use case orchestration patterns
  - Repository implementations and panel structure
  - Implementation order and testing strategy

---

## 🔧 Meta Documentation

### Documentation Maintenance
- [DOCUMENTATION_STYLE_GUIDE.md](DOCUMENTATION_STYLE_GUIDE.md) - Style guide for all documentation
  - Naming conventions: `{TOPIC}_{TYPE}.md`
  - No dates in content (use git history)
  - Quick Reference pattern for docs >400 lines
  - Examples with ✅/❌ pattern

### Technical Debt
- [technical-debt/](technical-debt/) - Categorized technical debt tracking (7 items)
  - **Accepted Tradeoffs** (3 items) - Keep indefinitely (0 bugs, high cost)
  - **Will Not Implement** (1 item) - Rejected suggestions
  - **Scheduled** (2 items) - Fix in 1-2 sprints
  - **Low Priority** (1 item) - Fix opportunistically
  - See [technical-debt/README.md](technical-debt/README.md) for full index

---

## 📋 Document Categories

### By Type

**Guides** (`*_GUIDE.md`) - How-to, step-by-step instructions, practical workflows
- CLEAN_ARCHITECTURE_GUIDE.md
- LOGGING_GUIDE.md

**Requirements** (`*-requirements.md`) - Feature requirements and specifications
- data-panel-suite-requirements.md

**Design** (`*-design.md`) - Architecture and design decisions
- data-panel-suite-design.md

**Reference** (`*_REFERENCE.md`) - Quick lookup, specifications, cheat sheets
- CLAUDE.md (AI assistant reference)

**Meta** - Documentation about documentation
- DOCUMENTATION_STYLE_GUIDE.md
- technical-debt/ (categorized debt tracking)
- README.md (this file)

---

## 🗂️ Document Organization

```
docs/
├── README.md                          (this file - master index)
├── DOCUMENTATION_STYLE_GUIDE.md       (how to write docs)
├── technical-debt/                    (categorized debt tracking)
├── architecture/
│   ├── CLEAN_ARCHITECTURE_GUIDE.md    (implementation patterns)
│   └── LOGGING_GUIDE.md               (logging architecture)
└── design/
    ├── data-panel-suite-requirements.md
    └── data-panel-suite-design.md
```

---

## 🔍 Finding What You Need

### I want to...

**Understand the codebase architecture**
→ Start with [CLEAN_ARCHITECTURE_GUIDE.md](architecture/CLEAN_ARCHITECTURE_GUIDE.md)

**Learn coding standards and rules**
→ Read [CLAUDE.md](../CLAUDE.md) in the project root

**Add logging to my feature**
→ Follow [LOGGING_GUIDE.md](architecture/LOGGING_GUIDE.md)

**Implement a new data panel**
→ Reference [data-panel-suite-design.md](design/data-panel-suite-design.md)

**Write new documentation**
→ Follow [DOCUMENTATION_STYLE_GUIDE.md](DOCUMENTATION_STYLE_GUIDE.md)

**Understand why something was deferred**
→ Check [technical-debt/README.md](technical-debt/README.md)

---

## 📌 Quick Links

### Essential Reading (Start Here)
1. [CLAUDE.md](../CLAUDE.md) - Core principles (NEVER/ALWAYS rules)
2. [CLEAN_ARCHITECTURE_GUIDE.md](architecture/CLEAN_ARCHITECTURE_GUIDE.md) - How we structure code
3. [LOGGING_GUIDE.md](architecture/LOGGING_GUIDE.md) - How we log

### For AI Assistants
- [CLAUDE.md](../CLAUDE.md) - Quick reference with essential rules
- [CLEAN_ARCHITECTURE_GUIDE.md](architecture/CLEAN_ARCHITECTURE_GUIDE.md) - Detailed architectural patterns
- [DOCUMENTATION_STYLE_GUIDE.md](DOCUMENTATION_STYLE_GUIDE.md) - How to maintain/improve docs

### For Feature Development
- [data-panel-suite-requirements.md](design/data-panel-suite-requirements.md) - Current feature requirements
- [data-panel-suite-design.md](design/data-panel-suite-design.md) - Implementation approach

---

## 🔄 Maintenance

### Adding New Documentation

**Before creating a new document:**
1. Check if content fits into existing document (<800 lines soft limit)
2. Follow naming convention: `{TOPIC}_{TYPE}.md` (GUIDE, PATTERNS, or REFERENCE)
3. Include Quick Reference section if >400 lines
4. Use real code examples from this codebase (not toy examples)
5. Follow ✅/❌ pattern for good/bad examples
6. Add entry to this README.md under appropriate category

**Review checklist:** See [DOCUMENTATION_STYLE_GUIDE.md - Review Checklist](DOCUMENTATION_STYLE_GUIDE.md#review-checklist)

### Updating Existing Documentation

**When to update:**
- Code patterns change (architectural refactoring)
- New features added that demonstrate patterns
- Errors or outdated information discovered
- Examples become stale or deprecated

**When updating:**
- Don't add dates to content (git history is source of truth)
- Maintain consistency with style guide
- Update cross-references if structure changes
- Keep Quick Reference sections current

---

## 📚 Documentation Principles

### Core Philosophy
1. **Concise, Example-Driven, Practical** - Show working code from actual codebase
2. **No Dates** - Use git history for tracking changes
3. **Progressive Disclosure** - Quick Reference for scanning, detailed content for depth
4. **Optimized for AI and Humans** - Both audiences benefit from structured information

### Quality Standards
- Real code examples (from `src/features/`)
- ✅/❌ pattern showing correct and incorrect approaches
- "Why" explanations for non-obvious decisions
- No duplication across documents (link to canonical source)
- Stand-alone test: each doc understandable independently

---

## 🆘 Getting Help

**Questions about documentation?**
1. Check [DOCUMENTATION_STYLE_GUIDE.md](DOCUMENTATION_STYLE_GUIDE.md)
2. Look at exemplar docs (CLEAN_ARCHITECTURE_GUIDE.md, LOGGING_GUIDE.md)
3. Ask in code review or create an issue

**Found inconsistency or error?**
1. Create issue or PR to fix
2. Reference style guide in explanation
3. Update all instances of the inconsistency

**Want to propose documentation changes?**
1. Follow style guide for new content
2. Update this README.md if adding new documents
3. Include rationale in PR description

---

**Last major reorganization:** Check git history for this file
