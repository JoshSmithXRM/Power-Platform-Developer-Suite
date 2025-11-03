# Vertical Slicing Guide

**Purpose**: Learn how to break features into thin, end-to-end slices that deliver working software quickly, enabling fast feedback and parallel development.

---

## 🚀 Quick Reference

**Problem**: Large features take 5+ hours before anything works. High risk, late feedback, can't parallelize.

**Solution**: Break features into 30-60 minute vertical slices that go through all layers and result in working functionality.

**Benefits**:
- ✅ Working software every hour
- ✅ Get feedback early and often
- ✅ Can stop anytime (have working features)
- ✅ Lower risk per slice
- ✅ Can parallelize multiple features

**Key Insight**: You can't parallelize LAYERS (domain → app → infra → pres is sequential), but you CAN parallelize FEATURES.

---

## 📖 What is Vertical Slicing?

### Horizontal Slicing (❌ BAD - Traditional Approach)

**Cutting by layer:**
```
Week 1: Build ALL domain entities
Week 2: Build ALL use cases
Week 3: Build ALL repositories
Week 4: Build ALL panels
```

**Problems**:
- Nothing works until Week 4
- Can't get feedback until end
- If requirements change, massive rework
- Can't demo progress
- All-or-nothing risk

**Dependency chain blocks parallelization:**
```
Domain (Week 1)
    ↓ Application depends on domain
Application (Week 2)
    ↓ Infrastructure depends on domain
Infrastructure (Week 3)
    ↓ Presentation depends on application
Presentation (Week 4)
```

---

### Vertical Slicing (✅ GOOD - Recommended Approach)

**Cutting by end-to-end functionality:**
```
Week 1, Day 1: Slice 1 - "User can VIEW list" (all layers, working)
Week 1, Day 2: Slice 2 - "User can VIEW details" (all layers, working)
Week 1, Day 3: Slice 3 - "User can SEE progress" (all layers, working)
Week 1, Day 4: Slice 4 - "User can RETRY failed" (all layers, working)
```

**Benefits**:
- ✅ Working software Day 1
- ✅ Can demo Slice 1 immediately
- ✅ Get feedback after each slice
- ✅ Can pivot based on feedback
- ✅ Can stop after any slice (have working feature)

**Each slice goes through all layers:**
```
Slice 1: "View list"
├─ Domain: ImportJob entity (basic fields)
├─ Application: ListImportJobsUseCase
├─ Infrastructure: Repository.findAll()
└─ Presentation: Simple table

Result: USER CAN SEE JOBS ✅ (1 hour)
```

---

## 🎯 How to Identify Good Slices

### Rule 1: Think User Stories (End-to-End)

**Good slices complete a user action:**

✅ **GOOD**:
- "As a user, I can SEE a list of import jobs"
- "As a user, I can VIEW details of a specific job"
- "As a user, I can RETRY a failed job"

❌ **BAD**:
- "Create all domain entities"
- "Implement all use cases"
- "Build the entire UI"

**Why**: User stories force you to think end-to-end, which naturally creates vertical slices.

---

### Rule 2: Aim for 30-60 Minutes Per Slice

**Too small (<30 min)**:
- "Add one field to entity"
- "Change button color"

**Too large (>90 min)**:
- "Build entire import job tracking system"
- "Implement all CRUD operations"

**Just right (30-60 min)**:
- "User can view list of jobs"
- "User can see job progress bar"
- "User can retry failed job"

---

### Rule 3: Each Slice Must Be Deployable

**After implementing a slice, you should be able to**:
- ✅ Compile successfully
- ✅ Run the application (F5)
- ✅ Demonstrate the new functionality
- ✅ Get user feedback
- ✅ Deploy to production (if desired)

**If you can't do all of these, the slice is incomplete or too large.**

---

### Rule 4: MVP First, Then Enhance

**For each capability, build MVP first, then enhance:**

```
Capability: "User can see job status"

Slice 1 (MVP): Show status as text
├─ Domain: status: string
├─ Application: Include status in ViewModel
├─ Infrastructure: Map status from API
└─ Presentation: Display status text
Result: USER SEES STATUS ✅

Slice 2 (Enhancement): Show status with color coding
├─ Domain: status: JobStatus enum
├─ Application: Map enum to ViewModel
├─ Infrastructure: Update mapping
└─ Presentation: Add CSS for status colors
Result: USER SEES COLORED STATUS ✅

Slice 3 (Enhancement): Show status with icon
├─ Domain: (no changes)
├─ Application: (no changes)
├─ Infrastructure: (no changes)
└─ Presentation: Add status icons
Result: USER SEES STATUS WITH ICON ✅
```

**Each slice adds value incrementally.**

---

## 📋 Slicing Examples from Real Features

### Example 1: Import Job Tracking

**Epic**: User can track import jobs

#### ❌ Horizontal Slicing (BAD - 5.5 hours before anything works)

```
Phase 1: Domain Layer (1.5 hours)
├─ ImportJob entity (full implementation with all methods)
├─ JobStatus value object
├─ ImportProgress value object
├─ JobCollection domain service
└─ IImportJobRepository interface

Phase 2: Application Layer (2 hours)
├─ ListImportJobsUseCase
├─ ViewJobDetailsUseCase
├─ MonitorJobProgressUseCase
├─ RetryFailedJobUseCase
├─ CancelJobUseCase
├─ ExportJobDataUseCase
└─ All ViewModels + Mappers

Phase 3: Infrastructure + Presentation (2 hours)
├─ Repository with all methods
└─ Panel with all features

Total: 5.5 hours
First working demo: 5.5 hours ❌
```

---

#### ✅ Vertical Slicing (GOOD - working software every hour)

```
Slice 1: "View list of import jobs" (1 hour)
├─ Domain: ImportJob entity (id, name, createdOn only)
├─ Application: ListImportJobsUseCase (simple list)
├─ Infrastructure: Repository.findAll() (basic query)
└─ Presentation: Table with 3 columns
Result: USER CAN SEE JOB LIST ✅

Slice 2: "View job details" (45 min)
├─ Domain: Add ImportJob.getDetails() method
├─ Application: ViewJobDetailsUseCase
├─ Infrastructure: Repository.findById()
└─ Presentation: Details panel
Result: USER CAN CLICK JOB, SEE DETAILS ✅

Slice 3: "See job progress" (30 min)
├─ Domain: Add getProgress() method
├─ Application: Add progress to ViewModel
├─ Infrastructure: (already done)
└─ Presentation: Progress bar component
Result: USER SEES PROGRESS BAR ✅

Slice 4: "Retry failed jobs" (45 min)
├─ Domain: Add retry() method with business rules
├─ Application: RetryJobCommand
├─ Infrastructure: Repository.update()
└─ Presentation: Retry button
Result: USER CAN RETRY FAILED JOBS ✅

Slice 5: "Cancel running jobs" (45 min)
├─ Domain: Add cancel() method
├─ Application: CancelJobCommand
├─ Infrastructure: Repository.update()
└─ Presentation: Cancel button
Result: USER CAN CANCEL JOBS ✅

Slice 6: "Export job data" (45 min)
├─ Domain: Add exportData() method
├─ Application: ExportJobDataCommand
├─ Infrastructure: FileSystem writer
└─ Presentation: Export button
Result: USER CAN EXPORT JOB DATA ✅

Total: 4.25 hours
First working demo: 1 hour ✅
Working demos: 6 (one per slice)
```

**Comparison**:
- Horizontal: 5.5 hours, 1 demo
- Vertical: 4.25 hours, 6 demos
- **Result**: Vertical is FASTER and provides MORE feedback opportunities

---

### Example 2: Solution Export Feature

**Epic**: User can export solutions with deployment settings

#### ✅ Vertical Slicing (Recommended)

```
Slice 1: "Export solution without settings" (1 hour)
├─ Domain: Solution entity (basic fields)
├─ Application: ExportSolutionUseCase (no settings)
├─ Infrastructure: PowerPlatform API (basic export)
└─ Presentation: Export button on solution list
Result: USER CAN EXPORT SOLUTION ✅

Slice 2: "Export with environment variables" (1 hour)
├─ Domain: Add EnvironmentVariable to Solution
├─ Application: Include env vars in export
├─ Infrastructure: Fetch env vars from API
└─ Presentation: Show env var count in export dialog
Result: USER SEES ENV VARS IN EXPORT ✅

Slice 3: "Export with connection references" (1 hour)
├─ Domain: Add ConnectionReference to Solution
├─ Application: Include conn refs in export
├─ Infrastructure: Fetch conn refs from API
└─ Presentation: Show conn ref count in export dialog
Result: USER SEES CONN REFS IN EXPORT ✅

Slice 4: "Preview deployment settings before export" (45 min)
├─ Domain: Add previewSettings() method
├─ Application: PreviewDeploymentSettingsQuery
├─ Infrastructure: (already done)
└─ Presentation: Preview dialog
Result: USER CAN PREVIEW BEFORE EXPORT ✅

Slice 5: "Save export template for reuse" (45 min)
├─ Domain: Add ExportTemplate entity
├─ Application: SaveExportTemplateCommand
├─ Infrastructure: Template storage
└─ Presentation: Save template button
Result: USER CAN SAVE EXPORT TEMPLATES ✅
```

**Total**: 4.5 hours, 5 working demos

---

## 🔄 How to Parallelize Features (Not Layers)

### You CAN'T Parallelize Layers (Sequential Dependency)

```
❌ WRONG (Domain → Application → Infrastructure → Presentation is sequential)

Agent A: Domain layer    (45 min) \
Agent B: Application     (45 min)  } Can't parallelize - dependency chain!
Agent C: Infrastructure  (45 min) /
```

**Why**: Application depends on domain, infrastructure depends on domain, presentation depends on application.

---

### You CAN Parallelize Features (Independent)

```
✅ CORRECT (Different features are independent)

Monday 9am: Feature A, Slice 1 (Import Jobs - View list) (1 hour)
├─ Domain → Application → Infrastructure → Presentation
└─ Result: Working feature ✅

Monday 10am: Feature B, Slice 1 (Solution Export - Basic export) (1 hour)
├─ Domain → Application → Infrastructure → Presentation
└─ Result: Working feature ✅

Monday 11am: Feature C, Slice 1 (Environment Sync - Manual sync) (1 hour)
├─ Domain → Application → Infrastructure → Presentation
└─ Result: Working feature ✅
```

**Result**: 3 working features in 3 hours

---

### Batching Strategy for Speed

**Morning Session (3 hours):**
```
9am-10am:  Feature A, Slice 1 ✅
10am-11am: Feature B, Slice 1 ✅
11am-12pm: Feature C, Slice 1 ✅
```

**Afternoon Session (3 hours):**
```
1pm-2pm:   Feature A, Slice 2 ✅
2pm-3pm:   Feature B, Slice 2 ✅
3pm-4pm:   Feature C, Slice 2 ✅
```

**End of Day**:
- 3 features, each with 2 slices
- 6 working demos total
- Can prioritize next slices based on feedback

---

## 📊 Comparison: Horizontal vs Vertical

| Aspect | Horizontal Slicing | Vertical Slicing |
|--------|-------------------|------------------|
| **Time to first working software** | 5+ hours | 30-60 min |
| **Feedback opportunities** | 1 (at end) | Every slice (5-10x more) |
| **Risk per slice** | High (all-or-nothing) | Low (small increments) |
| **Can pivot based on feedback** | No (already built everything) | Yes (after each slice) |
| **Can parallelize** | No (layers are sequential) | Yes (features are independent) |
| **Demo count (same feature)** | 1 demo (at end) | 5-10 demos (per slice) |
| **Ability to stop mid-feature** | No (nothing works) | Yes (each slice works) |

---

## 🎯 Slicing Checklist

Before committing to a slice, verify:

### Slice Definition
- [ ] Slice completes an end-to-end user action
- [ ] Slice can be completed in 30-60 minutes
- [ ] Slice includes all 4 layers (domain, application, infrastructure, presentation)
- [ ] Slice results in working, testable functionality
- [ ] Slice can be demoed to users

### Slice Independence
- [ ] Slice doesn't depend on other slices (except previous slices in same feature)
- [ ] Slice can be deployed independently
- [ ] Slice provides user value on its own

### Slice Scope
- [ ] Slice is not too small (<30 min)
- [ ] Slice is not too large (>90 min)
- [ ] Slice follows MVP-first principle (simplest working version)

---

## 🚨 Common Slicing Mistakes

### ❌ Mistake 1: Building Complete CRUD at Once

**Wrong**:
```
Slice 1: "Implement full CRUD for import jobs"
├─ Create, Read, Update, Delete all at once
└─ 4+ hours, nothing works until all done
```

**Right**:
```
Slice 1: "VIEW list" (Read - list) (1 hour) ✅
Slice 2: "VIEW details" (Read - single) (45 min) ✅
Slice 3: "CREATE new job" (Create) (1 hour) ✅
Slice 4: "UPDATE job settings" (Update) (45 min) ✅
Slice 5: "DELETE job" (Delete) (30 min) ✅
```

---

### ❌ Mistake 2: Perfect Before Progress

**Wrong**:
```
Slice 1: "View list with sorting, filtering, pagination, search, export"
└─ Trying to build everything perfect first
```

**Right**:
```
Slice 1: "View list (basic table)" (1 hour) ✅
Slice 2: "Add sorting" (30 min) ✅
Slice 3: "Add filtering" (45 min) ✅
Slice 4: "Add pagination" (30 min) ✅
Slice 5: "Add search" (30 min) ✅
Slice 6: "Add export" (45 min) ✅
```

---

### ❌ Mistake 3: Technical Tasks as Slices

**Wrong**:
```
Slice 1: "Set up database schema"
Slice 2: "Create API endpoints"
Slice 3: "Build UI components"
```

**Right**:
```
Slice 1: "User can view list" (includes DB, API, UI)
Slice 2: "User can view details" (includes DB, API, UI)
Slice 3: "User can create new" (includes DB, API, UI)
```

---

### ❌ Mistake 4: Slicing by Layer

**Wrong**:
```
Slice 1: "Domain layer for import jobs"
Slice 2: "Application layer for import jobs"
Slice 3: "Infrastructure layer for import jobs"
```

**Right**:
```
Slice 1: "View list" (all layers, working)
Slice 2: "View details" (all layers, working)
Slice 3: "Retry failed" (all layers, working)
```

---

## 💡 Pro Tips

### Tip 1: Name Slices by User Action

Good slice names start with user action verbs:
- ✅ "User can VIEW list"
- ✅ "User can SEE progress"
- ✅ "User can RETRY failed job"

Bad slice names are technical:
- ❌ "Implement repository"
- ❌ "Build domain model"
- ❌ "Create UI components"

---

### Tip 2: Start with "Walking Skeleton"

First slice should be the simplest possible end-to-end flow:

```
Slice 1: "View list (walking skeleton)"
├─ Domain: Entity with 2-3 fields only
├─ Application: Simple use case, basic ViewModel
├─ Infrastructure: Basic repository.findAll()
└─ Presentation: Simple HTML table, 2-3 columns

Result: ENTIRE STACK PROVEN ✅
```

Then enhance:
```
Slice 2: Add more fields
Slice 3: Add sorting
Slice 4: Add filtering
```

---

### Tip 3: Get Feedback After Each Slice

**After completing a slice**:
1. Demo to users/stakeholders
2. Get feedback
3. Prioritize next slices based on feedback

**Example**:
```
Slice 1 completed: "View list"
Demo to users → "Great! But we REALLY need retry functionality"
→ Reprioritize: Slice 2 becomes "Retry failed" instead of "View details"
```

**This is only possible with vertical slicing.**

---

### Tip 4: Track Slices in TODO.md

```markdown
## Feature: Import Job Tracking

**Slices**:
- [x] Slice 1: View list (1 hour) - commit: abc123 ✅
- [x] Slice 2: Retry failed (45 min) - commit: def456 ✅
- [x] Slice 3: View details (45 min) - commit: ghi789 ✅
- [ ] Slice 4: Show progress (30 min) - NEXT
- [ ] Slice 5: Export data (45 min)
- [ ] Slice 6: Cancel running (30 min)

**Current Status**: 3/6 slices complete, feature is working and usable
```

---

## 🔗 See Also

- [NEW_FEATURE_WORKFLOW.md](NEW_FEATURE_WORKFLOW.md) - Step-by-step workflow for implementing features
- [WORKFLOW_GUIDE.md](../WORKFLOW_GUIDE.md) - General workflow guide
- [AGENT_ROLES.md](../AGENT_ROLES.md) - Understanding agent roles
- [BUG_FIX_WORKFLOW.md](BUG_FIX_WORKFLOW.md) - Quick bug fixes
- [REFACTORING_WORKFLOW.md](REFACTORING_WORKFLOW.md) - Safe refactoring
