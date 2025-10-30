# Claude Code Setup for Power Platform Developer Suite

Quick start guide for using Claude Code with this project.

---

## 🚀 Quick Start

**This project uses Clean Architecture** with specialized agents to maintain quality.

**Key files:**
- `CLAUDE.md` (root) - Quick reference rules (read on every response)
- `.claude/WORKFLOW_GUIDE.md` - How to use agents when building features
- `.claude/SETUP_GUIDE.md` - Anthropic best practices for maintaining this setup

---

## 🤖 Available Agents

### 1. architect
**When to use:** Before implementing new features

**What it does:** Designs Clean Architecture solution (domain/application/infrastructure/presentation layers)

**Example:**
```
You: "Design the domain layer for the ImportJob feature"
Claude: "Let me invoke the architect agent to design this..."
```

### 2. code-reviewer
**When to use:** Automatically after every code change (before commit)

**What it does:** Catches Clean Architecture violations:
- Anemic domain models
- Business logic in use cases or panels
- Wrong dependency direction

**Example:**
```
Claude: [Implements domain layer]
Claude: "Let me invoke code-reviewer..."
code-reviewer: "✅ APPROVED - Rich domain entity with behavior"
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
1. architect designs solution (~30 min)
   ↓
2. Implement layer by layer:
   - Domain first (rich entities, NO dependencies)
   - Application second (use cases orchestrate)
   - Infrastructure third (repositories implement interfaces)
   - Presentation last (panels use use cases)
   ↓
3. code-reviewer checks each layer (~2 min)
   ↓
4. Commit each layer separately
   ↓
5. docs-generator documents pattern (if new)
```

### For Bug Fixes:
```
1. Implement fix
   ↓
2. code-reviewer checks
   ↓
3. Commit
```

**See:** `.claude/WORKFLOW_GUIDE.md` for detailed examples

---

## 🚫 Common Pitfalls

1. **Anemic domain models** - Entities MUST have behavior (methods), not just getters/setters
2. **Business logic in use cases** - Use cases orchestrate, logic belongs in domain
3. **Business logic in panels** - Panels call use cases, NO logic
4. **Wrong dependency direction** - Domain NEVER imports from outer layers

---

## 📖 Key Documentation

**Architecture:**
- `docs/ARCHITECTURE_GUIDE.md` - Clean Architecture with C# analogies
- `docs/LAYER_RESPONSIBILITIES_GUIDE.md` - What goes in each layer

**Workflow:**
- `.claude/WORKFLOW_GUIDE.md` - Multi-agent workflow with examples
- `CLAUDE.md` - Quick reference (84 lines of truth)

**Agent maintenance:**
- `.claude/SETUP_GUIDE.md` - How to update agents and CLAUDE.md

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
2. **Commit each layer** - Makes reviews easier, easier to rollback
3. **Let code-reviewer catch violations** - It will auto-reject anemic models
4. **Domain first** - Get the domain right, everything else follows

---

**Need more detail?** See `.claude/WORKFLOW_GUIDE.md` for complete examples.
