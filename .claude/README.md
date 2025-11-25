# Claude Code Setup for Power Platform Developer Suite

Quick start guide for using Claude Code with this project.

---

## 🚀 Quick Start

**This project uses Clean Architecture** with specialized agents to maintain quality.

**Key files:**
- `CLAUDE.md` (root) - Quick reference rules (read on every response)
- `.claude/WORKFLOW.md` - How to use agents when building features
- `.claude/AGENTS.md` - Detailed agent invocation guide
- `.claude/SETUP_GUIDE.md` - Best practices for maintaining this setup

---

## 🤖 Available Agents

### 1. design-architect
**When to use:** Before implementing complex features (3+ files, uncertain patterns)

**What it does:** Designs Clean Architecture solution (domain/application/infrastructure/presentation layers)

**Example:**
```
You: "Design the domain layer for the ImportJob feature"
Claude: "Let me invoke design-architect to design this..."
```

### 2. code-guardian
**When to use:** After implementing a feature (before commit)

**What it does:** Reviews code and catches Clean Architecture violations:
- Anemic domain models
- Business logic in use cases or panels
- Wrong dependency direction

**Example:**
```
Claude: [Implements feature across all layers]
Claude: "Let me invoke code-guardian for review..."
code-guardian: "✅ APPROVED - Rich domain entity with behavior"
```

### 3. docs-generator
**When to use:** After introducing new patterns

**What it does:** Creates/updates documentation following DOCUMENTATION_STYLE_GUIDE.md

**Example:**
```
You: "Document the import job pattern we just built"
Claude: "Let me invoke docs-generator..."
```

---

## 📐 Architecture Overview

**Four layers (dependency rule: inward only):**

```
Infrastructure ──→ Application ──→ Domain
Presentation ──→ Application ──→ Domain
```

**Domain Layer:**
- Entities (rich models with behavior)
- Value objects (immutable)
- Repository interfaces (domain defines contracts)

**Application Layer:**
- Use cases (orchestrate, don't implement)
- ViewModels (DTOs for presentation)
- Mappers (domain ↔ ViewModel)

**Infrastructure Layer:**
- Repositories (implement domain interfaces)
- API clients

**Presentation Layer:**
- Panels (call use cases)
- Components (UI only)

**See:** `docs/ARCHITECTURE_GUIDE.md` for details

---

## 🔄 Development Workflow

### For New Features:
```
1. design-architect designs solution (complex features only)
   ↓
2. Implement layer by layer:
   - Domain first (rich entities, NO dependencies)
   - Application second (use cases orchestrate)
   - Infrastructure third (repositories implement interfaces)
   - Presentation last (panels use use cases)
   ↓
3. npm run compile + npm test after each layer
   ↓
4. code-guardian reviews complete feature (once)
   ↓
5. Commit after approval
   ↓
6. docs-generator documents pattern (if new)
```

### For Bug Fixes:
```
1. Write failing test (reproduces bug)
   ↓
2. Implement fix (test passes)
   ↓
3. code-guardian reviews (if significant)
   ↓
4. Commit
```

**See:** `.claude/WORKFLOW.md` for detailed examples

---

## 🚫 Common Pitfalls

1. **Anemic domain models** - Entities MUST have behavior (methods), not just getters/setters
2. **Business logic in use cases** - Use cases orchestrate, logic belongs in domain
3. **Business logic in panels** - Panels call use cases, NO logic
4. **Wrong dependency direction** - Domain NEVER imports from outer layers

---

## 📖 Key Documentation

**Architecture:**
- `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md` - Core architectural patterns
- `docs/architecture/CODE_QUALITY_GUIDE.md` - Comment & code quality standards

**Workflow:**
- `.claude/WORKFLOW.md` - Multi-agent workflow with examples
- `.claude/AGENTS.md` - Detailed agent invocation guide
- `CLAUDE.md` - Quick reference rules

**Agent maintenance:**
- `.claude/SETUP_GUIDE.md` - How to update agents and CLAUDE.md
- `.claude/TROUBLESHOOTING.md` - Common problems and solutions

---

## 🔧 Development Commands

```bash
# Compile (includes ESLint)
npm run compile

# Test extension
# Press F5 in VS Code to launch extension host
```

---

## ✅ Success Pattern

**Rich Domain Entity Example:**
```typescript
// ✅ GOOD - Entity with behavior
export class ImportJob {
  constructor(
    public readonly id: string,
    private progress: number
  ) {}

  // Business logic in domain!
  isComplete(): boolean {
    return this.progress === 100;
  }

  getStatus(): JobStatus {
    if (this.progress === 100) return JobStatus.Completed;
    return this.progress > 0 ? JobStatus.InProgress : JobStatus.Pending;
  }
}
```

**Use Case Orchestrating:**
```typescript
// ✅ GOOD - Use case orchestrates (no business logic)
export class LoadImportJobsUseCase {
  async execute() {
    const jobs = await this.repository.loadJobs();
    // Use domain behavior (not reimplementing logic)
    const completed = jobs.filter(j => j.isComplete());
    return jobs.map(j => this.mapper.toViewModel(j));
  }
}
```

---

## 💡 Tips

1. **Implement layer by layer** - Don't implement all layers at once
2. **Run compile after each layer** - `npm run compile` catches issues early
3. **Let code-guardian catch violations** - It will auto-reject anemic models
4. **Domain first** - Get the domain right, everything else follows
5. **Use extended thinking** - Say "think hard" for complex decisions

---

**Need more detail?** See `.claude/WORKFLOW.md` for complete examples.
