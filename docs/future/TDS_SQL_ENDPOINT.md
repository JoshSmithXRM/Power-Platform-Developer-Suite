# TDS SQL Endpoint Investigation

**Status:** Future consideration
**Created:** 2025-12-10

## Context

Currently we transpile SQL → FetchXML → OData API. Dataverse has a native TDS (SQL) endpoint that could execute SQL directly.

## Current Architecture

```
User SQL → SqlParser → SqlToFetchXmlTranspiler → FetchXML → OData API
```

## Proposed Architecture

```
User SQL → TDS Endpoint (direct)
User FetchXML → OData API (unchanged)
```

## Benefits

1. **No transpilation bugs** - SQL goes directly to Dataverse
2. **Full SQL support** - Whatever Dataverse TDS supports, we support
3. **Better error messages** - Errors come from Dataverse, not our parser
4. **Less code** - Remove SqlParser, SqlToFetchXmlTranspiler

## Considerations

### Authentication
- TDS endpoint uses same Azure AD OAuth tokens we already have
- Should be able to reuse existing auth flow
- Connection string format: `Server={org}.crm.dynamics.com,5558;Authentication=ActiveDirectoryInteractive`

### Environment Requirements
- TDS endpoint must be enabled on the environment
- Not enabled by default - admin must turn it on
- Need to detect if TDS is available and fallback gracefully

### IntelliSense Implications
- **SQL mode**: IntelliSense must match TDS behavior
  - Virtual fields (`*name`, `*yominame`) don't work in TDS
  - Need to filter these from SQL suggestions
- **FetchXML mode**: Keep current behavior
  - Virtual `*name` fields work (via FormattedValue mapping)

### Dependencies
- Need SQL client library (`tedious` or `mssql` npm package)
- Adds ~500KB to bundle size

## Investigation Tasks

- [ ] Test TDS endpoint with our existing OAuth token
- [ ] Determine how to detect if TDS is enabled on environment
- [ ] Evaluate tedious vs mssql npm packages
- [ ] Design fallback strategy (TDS unavailable → transpile to FetchXML)
- [ ] Plan IntelliSense differentiation (SQL vs FetchXML suggestions)

## Decision

Deferred. Current transpilation approach works. Revisit when:
1. Users report SQL features we can't transpile
2. Transpilation bugs become significant maintenance burden
3. We need TDS-specific features

## References

- [Dataverse TDS Endpoint Docs](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/dataverse-sql-query)
- [Enable TDS Endpoint](https://learn.microsoft.com/en-us/power-platform/admin/settings-features)
