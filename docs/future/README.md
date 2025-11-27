# Future Enhancements

Planned features and improvements organized by area. This replaces the single `FUTURE_ENHANCEMENTS.md` file for better scalability and AI discoverability.

## Purpose

Track features and improvements that are planned but not actively being worked on. This is distinct from:
- `TECHNICAL_DEBT.md` - Code quality issues
- `docs/work/` - Active work in progress
- `docs/design/` - Features currently being designed/implemented

## Feature Files

| File | Description | Priority Items |
|------|-------------|----------------|
| [DATA_MANAGEMENT.md](DATA_MANAGEMENT.md) | Data Explorer, SQL4CDS, Record Cloning, Bulk Operations | High |
| [DEVELOPMENT_TOOLS.md](DEVELOPMENT_TOOLS.md) | Plugin Registration, Web Resources Manager | High |
| [ALM_DEVOPS.md](ALM_DEVOPS.md) | Deployment promotion, Solution Diff, Release management | High/Medium |
| [ADMINISTRATION.md](ADMINISTRATION.md) | Connection Manager, Async Jobs, Security Roles, Workflows | High |
| [OBSERVABILITY.md](OBSERVABILITY.md) | Flow History, Dependencies, Telemetry | Medium |
| [INFRASTRUCTURE.md](INFRASTRUCTURE.md) | Testing infrastructure, Multi-environment, UX | Low |

## Lifecycle

### Adding Enhancements

1. **New idea during development**: Add to relevant feature file with context
2. **From design doc deletion**: Migrate "Future Enhancements" section before deleting design doc
3. **From user feedback**: Create item with source noted

### Item Format

```markdown
#### Feature Name
**Status**: Planned | In Progress | Deferred | Implemented
**Priority**: High | Medium | Low
**Estimated Effort**: X-Y hours
**Value**: Why this matters

**Description**:
What the feature does.

**Core Features**:
- Feature 1
- Feature 2

**Technical Considerations**:
- Consideration 1

**Success Criteria**:
- How we know it's done

**Dependencies**:
- What needs to exist first (if any)
```

### Promoting to Active Work

When ready to implement:
1. Create feature branch
2. Create design doc in `docs/design/`
3. Update status in future file to "In Progress"
4. After completion, remove from future file

### Cleanup

- **Implemented**: Remove from file (it's done!)
- **No longer relevant**: Remove with note in commit message
- **Rejected**: Move to Archive section at bottom of file with reason

## Review Schedule

- **Quarterly**: Review High Priority items
- **Bi-annually**: Review Medium/Low Priority items
- **Annually**: Archive cleanup

## Archive (Considered & Rejected)

Items moved here from feature files with rejection reason.

*None yet.*

---

**Last Reviewed**: 2025-11-26
