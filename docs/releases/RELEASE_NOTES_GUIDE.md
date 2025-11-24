# Release Notes Writing Guide

Guidelines for creating comprehensive release notes that supplement CHANGELOG.md.

---

## When to Create Release Notes

**Create release notes for:**
- ✅ **Major releases** (1.0.0, 2.0.0) - Always create detailed notes
- ✅ **Minor releases** (0.2.0, 0.3.0) - Create for significant features or architectural changes
- ✅ **Significant refactors** - Even if version is minor, document major internal changes

**Do NOT create release notes for:**
- ❌ **Patch releases** (0.1.1, 0.1.2) - CHANGELOG.md entry is sufficient
- ❌ **Bug-fix-only releases** - Unless the bugs are critical or interesting
- ❌ **Dependency updates** - Routine maintenance doesn't need deep-dive

**Rule of Thumb:** If you need more than 50 lines in CHANGELOG.md to explain the release, create separate release notes.

---

## CHANGELOG.md vs Release Notes

### CHANGELOG.md
- **Audience**: End users and developers (general audience)
- **Style**: Concise bullet points
- **Content**: What changed (user-facing)
- **Format**: Keep a Changelog standard
- **Coverage**: ALL releases (including patches)

**Example:**
```markdown
## [0.2.0] - 2025-11-24

### Added
- Clean Architecture implementation with rich domain models
- 168 test files with comprehensive coverage
- 16 architecture guides (8,000+ lines)
```

### Release Notes (this folder)
- **Audience**: Developers and contributors (technical audience)
- **Style**: Narrative explanations with examples
- **Content**: Why it changed + how to migrate
- **Format**: Free-form technical documentation
- **Coverage**: Major/minor releases only

**Example:**
```markdown
## Clean Architecture Transformation

We migrated from component-based architecture to Clean Architecture
because the old approach had tight coupling between UI and business logic.

### Before (Old Component Framework):
```typescript
// Tight coupling - business logic in UI component
class EnvironmentSelector {
  validate() { /* logic here */ }
}
```

### After (Clean Architecture):
```typescript
// Separation - logic in domain entity
class Environment {
  validate(): ValidationResult { /* domain logic */ }
}
```

### Migration Guide:
No user action required - this is an internal refactor...
```

---

## Release Notes Template

Use this template for new releases:

```markdown
# Release v{VERSION} - {TITLE}

**Release Date:** {YYYY-MM-DD}
**Version:** {MAJOR.MINOR.PATCH}
**Type:** {Major Feature | Refactor | Breaking Change}

---

## Overview

[1-2 paragraphs explaining the release at a high level]

**Key Changes:**
- {Change 1}
- {Change 2}
- {Change 3}

---

## Background

### Why This Change?

[Explain the motivation - what problem were we solving?]

### What Was the Old Approach?

[Briefly describe the previous implementation, if applicable]

---

## Technical Changes

### Architecture

[Describe architectural changes with code examples]

**Before:**
```typescript
// Old code example
```

**After:**
```typescript
// New code example
```

### New Patterns Introduced

1. **{Pattern Name}**
   - **Purpose**: {Why this pattern?}
   - **Implementation**: {How it works}
   - **Example**: {Code snippet}

2. **{Pattern Name}**
   - ...

### Files Changed

**Added:**
- {List of significant new files/folders}

**Modified:**
- {List of significantly changed files}

**Deleted:**
- {List of removed files/folders}

---

## Testing Changes

[If testing was added/changed, describe it]

**Coverage:**
- Domain: {XX}%
- Application: {XX}%
- Infrastructure: {XX}%

**New Test Patterns:**
- {Pattern 1}
- {Pattern 2}

---

## Documentation

**New Guides:**
- [{Guide Name}](../path/to/guide.md) - {Description}

**Updated:**
- [{Guide Name}](../path/to/guide.md) - {What changed}

---

## Breaking Changes

[List any breaking changes - even internal ones]

### {Breaking Change Title}

**What Changed:**
{Description of change}

**Impact:**
{Who is affected and how}

**Migration:**
{Step-by-step migration guide}

---

## Deprecations

[List anything deprecated]

**{Deprecated Item}:**
- **Replaced by**: {New approach}
- **Timeline**: {When it will be removed}
- **Migration**: {How to update code}

---

## Performance Improvements

[If applicable, list performance improvements with metrics]

**{Feature}:**
- **Before**: {Old metric}
- **After**: {New metric}
- **Improvement**: {Percentage or description}

---

## Known Issues

[List any known issues or limitations introduced]

1. **{Issue Title}**
   - **Impact**: {Who is affected}
   - **Workaround**: {Temporary solution}
   - **Planned Fix**: {When it will be addressed}

---

## Migration Guide

[Step-by-step guide for users/developers to migrate]

### For End Users

1. {Step 1}
2. {Step 2}

### For Contributors

1. {Step 1}
2. {Step 2}

---

## Acknowledgments

[Thank contributors, if applicable]

Special thanks to:
- @{username} for {contribution}

---

## Related Links

- [CHANGELOG.md](../../CHANGELOG.md#{version}) - User-facing summary
- [GitHub Release](https://github.com/JoshSmithXRM/Power-Platform-Developer-Suite/releases/tag/v{VERSION})
- [Migration Guide](#migration-guide) (if breaking changes)
```

---

## Writing Guidelines

### 1. Use Clear Headings

**Good:**
```markdown
## Clean Architecture Implementation
```

**Bad:**
```markdown
## Changes
```

### 2. Include Code Examples

Always show before/after code when explaining refactors.

**Good:**
```markdown
### Before (Anemic Model):
```typescript
interface Environment {
  id: string;
  name: string;
}
// Logic scattered across services
```

### After (Rich Entity):
```typescript
class Environment {
  validate(): ValidationResult { /* ... */ }
  requiresClientSecret(): boolean { /* ... */ }
}
```
```

**Bad:**
```markdown
We changed Environment to have more methods.
```

### 3. Explain the "Why"

**Good:**
```markdown
We migrated to Clean Architecture because the component
framework created tight coupling between UI and business
logic, making testing difficult and features hard to maintain.
```

**Bad:**
```markdown
We refactored the codebase.
```

### 4. Provide Migration Paths

**Good:**
```markdown
### Migration

1. Update imports from `src/components/*` to `src/features/*/presentation/*`
2. Replace `BaseComponent` with feature-specific coordinators
3. Run `npm run compile` to verify no TypeScript errors
```

**Bad:**
```markdown
The old components are deleted, use new ones.
```

### 5. Use Metrics When Possible

**Good:**
```markdown
**Test Coverage:**
- Domain layer: 96% (target: 95-100%)
- Application layer: 89% (target: 85-95%)
- 168 test files added
```

**Bad:**
```markdown
We added a lot of tests.
```

### 6. Link to Relevant Documentation

**Good:**
```markdown
For details on the new architecture, see:
- [Clean Architecture Guide](../architecture/CLEAN_ARCHITECTURE_GUIDE.md)
- [Testing Guide](../testing/TESTING_GUIDE.md)
```

**Bad:**
```markdown
See the docs for more info.
```

---

## Examples of Good Release Notes

### Example 1: v0.2.0 (Architectural Refactor)

**Strengths:**
- ✅ Clear before/after code examples
- ✅ Explains motivation (why we changed)
- ✅ Lists all affected features
- ✅ Provides metrics (168 tests, 13,873 lines of docs)
- ✅ Migration guide (no user action needed)

**See:** [v0.2.0.md](./v0.2.0.md)

---

## Release Notes Checklist

Before publishing release notes, verify:

- [ ] Version number matches CHANGELOG.md and package.json
- [ ] Release date is accurate
- [ ] Overview section explains the release clearly
- [ ] Code examples are included (for technical changes)
- [ ] Migration guide provided (if breaking changes)
- [ ] Links to related documentation work
- [ ] Spelling and grammar checked
- [ ] No "Last Updated" dates (use git history)
- [ ] File named correctly (`v{MAJOR}.{MINOR}.{PATCH}.md`)
- [ ] README.md index updated with new release
- [ ] CHANGELOG.md has concise entry for same release

---

## Maintaining Release Notes

### After Publishing

1. **Update README.md index** - Add new release to index
2. **Link from CHANGELOG.md** - Reference release notes from changelog
3. **Archive old releases** - Keep most recent 5-10 releases, archive older ones

### Retention Policy

- **Keep forever**: Major releases (1.0.0, 2.0.0, etc.)
- **Keep 5-10 releases**: Minor releases (0.2.0, 0.3.0, etc.)
- **Archive older releases**: Move to `archive/` folder after 2 years

---

## Quick Start

To create release notes for v0.3.0:

1. Copy this template into `docs/releases/v0.3.0.md`
2. Fill in all sections using guidelines above
3. Update `docs/releases/README.md` index
4. Link from `CHANGELOG.md` v0.3.0 entry
5. Review checklist before commit

---

## Questions?

- **Where do I put small patch notes?** - CHANGELOG.md only
- **Do I need both CHANGELOG and release notes?** - Yes, for major/minor releases
- **Can I skip sections?** - Yes, if not applicable (e.g., no breaking changes)
- **How long should release notes be?** - As long as needed, typically 500-2000 lines for major releases

---

**Remember:** Release notes are documentation. They should help developers understand what changed, why it changed, and how to adapt. Write for your future self who forgot why this decision was made.
