# Power Platform Developer Suite - Roadmap

This document outlines the versioning philosophy, planned milestones, and path to 1.0.

---

## Versioning Philosophy

| Version Type | Criteria | Example |
|--------------|----------|---------|
| **PATCH** (0.2.x) | Bug fixes, small improvements, documentation | 0.2.4 → 0.2.5 |
| **MINOR** (0.x.0) | New feature area or significant enhancement to existing feature | 0.2.x → 0.3.0 |
| **MAJOR** (x.0.0) | Production-ready declaration, stability milestone | 0.x.x → 1.0.0 |

---

## Current State (v0.2.4)

### Complete Features (100%)
| Feature | Description |
|---------|-------------|
| Environment Management | Add/remove/reorder environments, token caching, connection testing |
| Solution Explorer | Browse solutions by environment with metadata display |
| Import Job Viewer | Monitor import operations with status filtering |
| Connection References | Browse connection references with metadata |
| Environment Variables | Browse environment variables with values |
| Plugin Trace Viewer | Fetch, filter, export traces with configurable limits |

### In Development (Partial)
| Feature | Completion | What's Missing |
|---------|------------|----------------|
| Metadata Browser | 70% | Detail panel UX polish, large dataset optimization |
| Data Explorer | 65% | SQL aggregates, JOINs, inline column filtering |
| Web Resources | 50% | Edit, save, publish (read-only complete) |

---

## Version Milestones

### v0.3.0 - "Complete the Foundation"

**Theme:** Finish all partially-implemented features before adding new ones.

| Feature | Work Required | Effort |
|---------|---------------|--------|
| **Metadata Browser** | Detail panel resizing, performance optimization | 8-12h |
| **Data Explorer** | Inline column filtering, better error messages | 8-12h |
| **Web Resources** | Edit, save, publish, conflict detection | 8-12h |
| **E2E Tests** | Tests for all modified panels | 4-8h |

**Success Criteria:**
- All three "In Development" features at 100%
- Zero critical bugs in core workflows
- E2E tests covering happy paths

---

### v0.4.0 - "Query Power"

**Theme:** Make Data Explorer a complete query tool.

| Feature | Description | Effort |
|---------|-------------|--------|
| **SQL Aggregates** | COUNT, SUM, AVG, MIN, MAX support | 8-16h |
| **SQL JOINs** | Lookup field joins in SQL mode | 8-12h |
| **Query History** | Recent queries with re-run capability | 4-8h |

**Success Criteria:**
- Can write aggregation queries in SQL mode
- Can join across lookup fields
- Query history persisted per environment

---

### v0.5.0 - "ALM & Deployment"

**Theme:** Tools for moving solutions between environments.

| Feature | Description | Effort |
|---------|-------------|--------|
| **Deployment Promotion** | Promote deployment settings between environments | 16-24h |
| **Solution Diff** | Compare solutions across environments | 24-32h |

**Success Criteria:**
- Can promote connection references and env variables to target environment
- Can see component differences between environments

---

### v0.6.0 - "Developer Tools"

**Theme:** Complete development toolkit.

| Feature | Description | Effort |
|---------|-------------|--------|
| **Plugin Registration Tool** | Register assemblies, steps, images from VS Code | 40-60h |
| **Web Resources Sync** | Map local folder to solution web resources | 16-24h |

**Success Criteria:**
- Can register plugins without leaving VS Code
- Can edit web resources locally with auto-sync

---

### v1.0.0 - "Production Ready"

**Theme:** Stability, polish, and confidence.

**Criteria for 1.0:**
- [ ] All core features stable (no major bugs for 30 days)
- [ ] Comprehensive E2E test coverage (all panels)
- [ ] Documentation complete (README, feature guides)
- [ ] Performance validated (large datasets, many environments)
- [ ] Error handling polished (clear messages, recovery paths)

**What 1.0 is NOT:**
- Not "feature complete" - new features will come in 1.1+
- Not a stopping point - ongoing development continues

---

## Post-1.0 Roadmap (1.x)

Features planned for after 1.0 stability is achieved:

### High Priority (1.1 - 1.2)
| Feature | Description | Effort |
|---------|-------------|--------|
| Record Cloning | Clone records across environments with mapping | 16-24h |
| Bulk Data Operations | Bulk update/delete with preview and safety | 16-24h |
| Connection Manager | View/manage connections, test health | 16-24h |

### Medium Priority (1.3+)
| Feature | Description | Effort |
|---------|-------------|--------|
| Async Job Monitor | Monitor system jobs, bulk cleanup | 16-24h |
| Workflow/Flow Manager | Activate/deactivate flows in bulk | 16-24h |
| Flow Run History | Debug flow failures from VS Code | 16-24h |

### Future Consideration
| Feature | Description | Status |
|---------|-------------|--------|
| Security Role Viewer | View/compare security role privileges | Planned |
| Entity Dependency Graph | Visual impact analysis | Planned |
| Telemetry & Analytics | Opt-in usage tracking | Under consideration |
| SQL UPDATE/INSERT | Write operations in Data Explorer | Under consideration |

---

## Feature Request Process

Have an idea? Here's how features get added:

1. **Open GitHub Issue** - Describe the use case and value
2. **Discussion** - Community and maintainer feedback
3. **Design** - If accepted, design document created
4. **Implementation** - Follows Clean Architecture patterns
5. **Release** - Included in next appropriate version

---

## Release Cadence

- **Patch releases** (0.x.Y): As needed for bug fixes
- **Minor releases** (0.X.0): When feature milestone complete
- **Major release** (1.0.0): When stability criteria met

No fixed schedule - releases happen when ready, not on arbitrary dates.

---

## Related Documentation

- [CHANGELOG.md](./CHANGELOG.md) - Detailed release history
- [docs/future/](./docs/future/) - Detailed feature specifications
- [docs/technical-debt/](./docs/technical-debt/) - Known trade-offs and decisions

---

**Last Updated:** 2025-11-30
