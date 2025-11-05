# Design Workflow

**Purpose**: Complete process for creating technical design documents for complex features.

---

## 🚀 Quick Reference

**When to use this workflow:**
- ✅ Complex features (4+ vertical slices)
- ✅ New architectural patterns
- ✅ Features affecting multiple domains

**When to skip:**
- ❌ Simple features (1-2 slices)
- ❌ Bug fixes (use BUG_FIX_WORKFLOW.md)
- ❌ Small refactorings (use REFACTORING_WORKFLOW.md)

**Key Outputs:**
1. Technical design document (using template)
2. Type contract review (from typescript-pro)
3. Architecture review (from clean-architecture-guardian)
4. Implementation-ready specification

---

## 📖 Complete Design Workflow

### Phase 1: Create Design Document

**Step 1.1: Copy Template**
```bash
# Create design document from template
cp .claude/templates/TECHNICAL_DESIGN_TEMPLATE.md docs/design/[FEATURE_NAME]_DESIGN.md
```

**Step 1.2: Fill Out Sections 1-2**
- [ ] Overview (Problem → Solution → Value in 3-4 sentences)
- [ ] Requirements (Functional, Non-Functional, Success Criteria)
- [ ] Set Status: Draft
- [ ] Set Complexity: Simple | Moderate | Complex (NO time estimates!)

**Output:** Design document with clear problem statement and requirements

---

### Phase 2: Design with clean-architecture-guardian

**Step 2.1: Invoke clean-architecture-guardian for Architecture Design**

```
@agent-clean-architecture-guardian - Design a new feature: [FEATURE_NAME]

Context:
[Paste sections 1-2 from your design doc - Overview & Requirements]

Design all four layers following Clean Architecture:

1. Domain Layer:
   - Rich entities with behavior (NOT anemic)
   - Value objects (immutable)
   - Domain services (complex business logic)
   - Repository interfaces (domain defines contracts)
   - ZERO external dependencies

2. Application Layer:
   - Use cases that orchestrate (NO business logic)
   - ViewModels (DTOs for presentation)
   - Mappers (domain → ViewModel transformation only)

3. Infrastructure Layer:
   - Repositories implementing domain interfaces
   - External API integration
   - Dependencies point INWARD

4. Presentation Layer:
   - Panels using use cases (NO business logic)
   - HTML extracted to separate view files
   - Mappers injected via constructor

Also design:
- Implementation slices (vertical slicing - identify MVP slice + enhancements)
- File structure (exact file paths)
- Type contracts (entity interfaces, use case signatures)

Output format: Fill sections 3-9 of the design template
- Section 3: Implementation Slices (identify MVP first!)
- Section 4: Architecture Design
- Section 5: Type Contracts
- Section 6-9: File Structure

Follow: CLAUDE.md, CLEAN_ARCHITECTURE_GUIDE.md, VERTICAL_SLICING_GUIDE.md
```

**Step 2.2: Review clean-architecture-guardian Output**
- [ ] MVP slice identified and makes sense
- [ ] All layers designed with proper separation
- [ ] Type contracts look complete
- [ ] File structure is clear

**Step 2.3: Update Design Document**
- [ ] Copy clean-architecture-guardian output into design doc sections 3-9
- [ ] Adjust if needed based on your domain knowledge
- [ ] Ensure vertical slicing is clear (MVP + enhancements)

**Output:** Design document with complete architecture specification

---

### Phase 3: Type Contract Review

**Step 3.1: Invoke typescript-pro for Type Contract Review**

```
@agent-typescript-pro - Review TYPE CONTRACTS for [FEATURE_NAME]

Review Section 5 (Type Contracts) from this design document:
[Paste Section 5: Type Contracts]

Focus on (BEFORE implementation):
1. Entity interfaces and return types
   - Are return types explicit?
   - Are generics properly constrained?
   - Is null vs undefined handled consistently?

2. Type Safety
   - Any `any` types that should be avoided?
   - Missing discriminated unions for type narrowing?
   - Need type guards for runtime safety?

3. Advanced TypeScript
   - Opportunities for better type inference?
   - Generic patterns that could simplify code?
   - Readonly modifiers where appropriate?

Provide recommendations for improvement BEFORE implementation begins.

Output: Create a brief review with specific recommendations
```

**Step 3.2: Review typescript-pro Findings**
- [ ] All critical type safety issues addressed
- [ ] Generic constraints added where needed
- [ ] Type guards identified for runtime safety

**Step 3.3: Update Type Contracts in Design Doc**
- [ ] Incorporate typescript-pro recommendations into Section 5
- [ ] Add type guards to file structure if recommended
- [ ] Update entity/use case signatures with better types

**Output:** Type-safe design with explicit contracts

---

### Phase 4: Human Review & Iteration

**Step 4.1: Review Complete Design**
- [ ] Does MVP slice make sense? Is it appropriately small?
- [ ] Are enhancement slices well-defined?
- [ ] Do type contracts match our coding standards?
- [ ] Is architecture compliant with Clean Architecture?
- [ ] Are dependencies pointing inward?

**Step 4.2: Iterate if Needed**

**If minor changes:**
- Update design doc directly
- No need to re-invoke agents

**If major changes:**
- Update requirements (Section 2)
- Re-invoke clean-architecture-guardian for affected layers
- Re-invoke typescript-pro if type contracts changed
- This is normal! Iteration is expected.

**Step 4.3: Update Status**
- [ ] Change Status from "Draft" to "In Review"
- [ ] Document any open questions in Section "Open Questions"

**Output:** Design ready for final architecture approval

---

### Phase 5: Final Architecture Approval

**Step 5.1: Request Architecture Review**

```
@agent-clean-architecture-guardian - Review complete design for [FEATURE_NAME]

Design document: docs/design/[FEATURE_NAME]_DESIGN.md

Provide comprehensive review covering:

1. Clean Architecture Compliance
   - Domain layer purity (zero dependencies)
   - Rich domain models (not anemic)
   - Use cases orchestrate only
   - Dependency direction (all point inward)

2. SOLID Principles
   - Single Responsibility
   - Dependency Inversion
   - Interface Segregation

3. Vertical Slicing
   - MVP slice well-defined
   - Enhancement slices logical
   - Each slice delivers working software

4. Implementation Readiness
   - Type contracts complete
   - File structure clear
   - Testing strategy defined

Create review file: docs/design/reviews/[FEATURE_NAME]_ARCH_REVIEW_[DATE].md

Provide: APPROVE / CHANGES REQUESTED / REJECT

If CHANGES REQUESTED:
- List specific issues by priority (Critical / Moderate / Minor)
- Provide recommendations for fixes
- Explain WHY each change is needed
```

**Step 5.2: Address Review Findings**

**If APPROVED:**
- [ ] Update Status: "Approved"
- [ ] Add approval date
- [ ] Move to implementation (see NEW_FEATURE_WORKFLOW.md)

**If CHANGES REQUESTED:**
- [ ] Review findings by priority
- [ ] Make required changes to design doc
- [ ] Re-invoke clean-architecture-guardian for final approval
- [ ] Iterate until APPROVED

**Output:** Approved design ready for implementation

---

### Phase 6: Post-Approval Cleanup

**Step 6.1: Consolidate Review Findings**

After final approval, update design document:

```markdown
## Key Architectural Decisions

### Decision 1: [Topic from review]
**Considered:** [Alternatives discussed]
**Chosen:** [Final decision]
**Rationale:** [Why from architect review]
**Tradeoffs:** [What we gave up / gained]
```

**Step 6.2: Archive Review Files**
- [ ] Review files in `docs/design/reviews/` are archived in git
- [ ] Delete review files (they're in git history if needed)
- [ ] Keep only final design doc

**Step 6.3: Final Status Update**
- [ ] Status: "Approved" → ready for implementation
- [ ] Link to implementation workflow: `.claude/workflows/NEW_FEATURE_WORKFLOW.md`

**Output:** Clean, approved design ready to guide implementation

---

## 🎯 Design Document Lifecycle

```
┌──────────────┐
│ 1. Create    │  Copy template, fill overview & requirements
│   │  Status: Draft
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 2. Design    │  clean-architecture-guardian designs all layers
│   │  Fill sections 3-9 (slices, architecture, types, files)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 3. Type      │  typescript-pro reviews type contracts
│    Review    │  Update Section 5 with recommendations
│   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 4. Human     │  Review, iterate if needed
│    Review    │  Status: Draft → In Review
│   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 5. Arch      │  clean-architecture-guardian final review
│    Approval  │  Creates review file in docs/design/reviews/
│    │  APPROVE / CHANGES REQUESTED / REJECT
└──────┬───────┘
       │
       ▼ (if APPROVE)
┌──────────────┐
│ 6. Cleanup   │  Consolidate findings, archive review files
│       │  Status: Approved
└──────────────┘
       │
       ▼
   IMPLEMENT (see NEW_FEATURE_WORKFLOW.md)
```

---

## 📋 Checklist: Design Complete

Before starting implementation, verify:

**Design Document:**
- [ ] All sections filled out (no "[TODO]" placeholders)
- [ ] MVP slice clearly identified
- [ ] Enhancement slices well-defined
- [ ] Type contracts complete and explicit
- [ ] File structure shows exact paths
- [ ] Testing strategy defined
- [ ] Status: "Approved"

**Reviews:**
- [ ] typescript-pro reviewed type contracts
- [ ] clean-architecture-guardian approved design
- [ ] All critical findings addressed
- [ ] Key decisions documented

**Readiness:**
- [ ] Requirements are clear
- [ ] Dependencies identified
- [ ] Breaking changes noted (if any)
- [ ] Open questions resolved

**If all checked:** Proceed to implementation (NEW_FEATURE_WORKFLOW.md, starting with Slice 1)

---

## 🚨 Common Design Mistakes

### ❌ Mistake 1: Skipping Vertical Slicing

**Wrong:**
```markdown
## Implementation Plan
Phase 1: Domain Layer (2 hours)
Phase 2: Application Layer (2 hours)
Phase 3: Infrastructure + Presentation (2 hours)
```

**Right:**
```markdown
## Implementation Slices
Slice 1 (MVP): User can view list - all layers ✅
Slice 2: User can view details - all layers ✅
Slice 3: User can filter - all layers ✅
```

---

### ❌ Mistake 2: Adding Time Estimates

**Wrong:**
```markdown
**Estimated Effort:** 6 hours
- Domain: 2 hours
- Application: 2 hours
```

**Right:**
```markdown
**Complexity:** Moderate
**Slices:** 4-6 vertical slices
(Let the developer estimate their own time)
```

---

### ❌ Mistake 3: Anemic Domain Models in Design

**Wrong:**
```typescript
// Anemic - just data, no behavior
export class ImportJob {
  id: string;
  status: string;
  createdOn: Date;
}
```

**Right:**
```typescript
// Rich - has behavior
export class ImportJob {
  constructor(
    private readonly id: string,
    private status: JobStatus,
    private readonly createdOn: Date
  ) {}

  public canRetry(): boolean {
    return this.status.isFailed();
  }

  public retry(): void {
    if (!this.canRetry()) {
      throw new Error('Cannot retry non-failed job');
    }
    this.status = JobStatus.Pending;
  }
}
```

---

### ❌ Mistake 4: Business Logic in Use Cases

**Wrong:**
```typescript
// Use case has business logic (violation!)
export class RetryJobUseCase {
  async execute(jobId: string): Promise<void> {
    const job = await this.repo.findById(jobId);

    // ❌ Business logic in use case
    if (job.status !== 'Failed') {
      throw new Error('Cannot retry');
    }
    job.status = 'Pending';

    await this.repo.save(job);
  }
}
```

**Right:**
```typescript
// Use case orchestrates, logic in domain
export class RetryJobUseCase {
  async execute(jobId: string): Promise<void> {
    const job = await this.repo.findById(jobId);

    // ✅ Business logic in domain entity
    job.retry(); // throws if can't retry

    await this.repo.save(job);
  }
}
```

---

## 💡 Pro Tips

### Tip 1: Design MVP First, Always

Start with the simplest possible working software:
- Minimal fields (2-3 only)
- Basic functionality
- Simple UI
- **Goal:** Prove the entire stack works

Then enhance incrementally.

---

### Tip 2: Use Git Branches for Design Iteration

Instead of version numbers in filenames:

```bash
# Create design branch
git checkout -b design/metadata-browser

# Create design doc (no version number)
# docs/design/METADATA_BROWSER_DESIGN.md

# Iterate in same file
# Get feedback, make changes, commit

# Merge when approved
git checkout main
git merge design/metadata-browser

# Git history shows evolution, no V1/V2/V3 needed
```

---

### Tip 3: Keep Business Value Short

3-4 sentences maximum:
- **Problem:** What user pain point?
- **Solution:** What are we building?
- **Value:** Why does it matter?

No fluff, no buzzwords, just facts.

---

### Tip 4: Define "Done" for Each Slice

For every slice, specify the result:

```markdown
### Slice 1: User can view list

**Result:** USER CAN SEE JOBS IN TABLE ✅

**Definition of Done:**
- [ ] User opens panel
- [ ] Table shows job list
- [ ] Can click refresh
- [ ] All tests pass
- [ ] `npm run compile` succeeds
```

---

## 🔗 See Also

- [TECHNICAL_DESIGN_TEMPLATE.md](../templates/TECHNICAL_DESIGN_TEMPLATE.md) - Design template
- [NEW_FEATURE_WORKFLOW.md](NEW_FEATURE_WORKFLOW.md) - Implementation workflow
- [VERTICAL_SLICING_GUIDE.md](VERTICAL_SLICING_GUIDE.md) - How to slice features
- [AGENT_ROLES.md](../AGENT_ROLES.md) - Agent responsibilities
- [WORKFLOW_GUIDE.md](../WORKFLOW_GUIDE.md) - Master workflow guide
- [CLAUDE.md](../../CLAUDE.md) - Coding rules and principles
