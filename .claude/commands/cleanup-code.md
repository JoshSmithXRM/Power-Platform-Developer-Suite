# Code Cleanup - Comments & Logging

Find and fix code quality violations following CODE_QUALITY_GUIDE.md and LOGGING_GUIDE.md.

## Scope

If `$ARGUMENTS` provided, use that. Otherwise ask:
- `uncommitted` - Only uncommitted changes (default)
- `feature/NAME` - Specific feature directory
- `entire-project` - All src/**/*.ts files
- Custom path

## Violations to Find (Parallel Searches)

### CRITICAL (Must Fix)
- **Domain logging**: Any `logger.` or `console.` in `src/*/domain/**/*.ts`
- **console.log**: `console\.(log|debug|info|warn|error)` in production code
- **Silent catch**: try/catch without error logging

### HIGH (Should Fix)
- **Wrong level**: `logger.info` for technical details (should be debug), `logger.debug` for business events (should be info)
- **Missing use case logging**: Use case execute() without start/completion logs
- **Placeholder comments**: `TODO|FIXME|HACK` without context or issue number
- **Commented-out code**: `//\s*(const|let|var|function|class|export)`
- **Missing JSDoc**: Public methods without `/**` documentation

### MEDIUM (Nice to Fix)
- **Message format**: Lowercase start, trailing periods, string interpolation instead of structured args
- **Obvious comments**: `// Set|// Get|// Loop|// Handle|// Process`
- **Vague messages**: "Done", "Processing", "Error occurred"

## Process

1. **Discover** - Run parallel grep searches for all patterns above
2. **Prioritize** - Create TodoList grouped by CRITICAL > HIGH > MEDIUM
3. **Fix** - Address each violation, mark todos complete immediately
4. **Validate** - Run `npm run compile` and `npm test`

## Fix Patterns

| Violation | Fix |
|-----------|-----|
| Domain logging | Remove entirely (domain = zero logging) |
| console.log | Replace with injected ILogger or remove |
| Silent catch | Add `this.logger.error('Context', error)` |
| Wrong level | info→debug for technical, debug→info for business |
| Message format | Capitalize, no period, use structured args: `logger.info('Message', { key: value })` |
| Commented code | Delete (git remembers) |
| Missing JSDoc | Add for public APIs |

## Standards Reference

- `docs/architecture/CODE_QUALITY_GUIDE.md` - Comment standards
- `docs/architecture/LOGGING_GUIDE.md` - Logging architecture and levels
