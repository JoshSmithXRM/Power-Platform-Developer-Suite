# Fix Tests

Run tests iteratively, fixing failures until all pass.

## Usage

`/fix-tests`

## Behavior

1. Run the test suite
2. If all tests pass, report success and stop
3. If tests fail:
   - Analyze the failure output
   - Identify the root cause (test bug or implementation bug)
   - Fix the issue
   - Return to step 1
4. Maximum 5 retry attempts to prevent infinite loops
5. If stuck on same failure 3 times, ask for help

## Test Commands

### Unit Tests (Default)

```bash
npm test
```

### E2E Tests (After Unit Pass)

If unit tests pass and E2E validation is needed:

```bash
npm run e2e:smoke
```

For full E2E suite:

```bash
npm run e2e:all
```

### Playwright Setup

If E2E tests fail due to missing browsers:

```bash
npx playwright install --with-deps chromium
```

## Analysis Approach

1. **Parse failure output** - Extract test name, assertion message, stack trace
2. **Locate the test** - Find test file (`.test.ts` or `.spec.ts`)
3. **Understand the assertion** - What behavior is being verified?
4. **Find code under test** - Navigate to the implementation
5. **Determine root cause**:
   - Is the test wrong? (outdated expectation, incorrect mock)
   - Is the implementation wrong? (bug, missing case)
6. **Apply minimal fix** - Change only what's necessary

## E2E Test Considerations

E2E tests can be flaky. Before deep investigation:

1. **Retry once** - Transient failures happen
2. **Check browser state** - May need `npx playwright install`
3. **Check extension state** - May need fresh Extension Development Host
4. **Check test isolation** - Ensure tests don't depend on each other

## What To Fix

| Scenario | Action |
|----------|--------|
| Implementation bug | Fix the source code |
| Test has wrong expectation | Fix the test assertion |
| Mock is incomplete | Update mock to match real behavior |
| Test is flaky | Add proper waits/retries or stabilize |

## What NOT To Do

- Don't skip or delete failing tests
- Don't add `.skip()` without discussion
- Don't weaken assertions to make tests pass
- Don't fix unrelated code while fixing tests

## Output

```
Fix Tests
=========
[1/5] Running unit tests...
[✗] 1 test failed

Analyzing failure:
1. PluginRegistration.parseOutput.should_extract_assembly_name
   - Expected: "MyPlugin.dll", Actual: undefined
   - Root cause: Regex doesn't handle paths with spaces
   - Fix: Update regex pattern in parseOutput()

Applying fix...
[2/5] Running unit tests...
[✓] All 23 unit tests passed

[3/5] Running E2E smoke tests...
[✓] All 5 E2E tests passed

Done.
```

## When to Use

- After making changes that might break tests
- When CI reports test failures
- After refactoring to verify behavior preserved
- Before PR to catch issues early

## Related Commands

- `/prepare-pr` - Full pre-PR validation
- `/prepare-release` - Release preparation
