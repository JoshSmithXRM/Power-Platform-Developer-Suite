# Technical Debt

Technical debt items requiring remediation. Review monthly with `/review-technical-debt`.

---

## Active Items

### TD-001: EnvironmentSetup buttons use stopPropagation workaround

**Priority:** Low
**Added:** 2025-11-25
**Effort:** ~30 min

**Description:**
`EnvironmentSetupBehavior.js` uses `e.stopPropagation()` + capture phase as a workaround to prevent duplicate click handlers from `messaging.js:wireButtons()`. This works but is more brittle than the proper solution.

**Affected Files:**
- `resources/webview/js/behaviors/EnvironmentSetupBehavior.js` (lines 34-75)
- `src/features/environmentSetup/presentation/sections/EnvironmentFormSection.ts`

**Current Pattern (workaround):**
```javascript
saveButton.addEventListener('click', (e) => {
    e.stopPropagation();  // Workaround to prevent generic handler
    // ...
}, true);  // Capture phase
```

**Proper Pattern:**
Add `data-custom-handler` attribute to buttons in HTML:
```html
<button id="saveEnvironment" data-custom-handler>Save Environment</button>
```

Or migrate to `ActionButtonsSection` with `customHandler: true`.

**Why Low Priority:**
- Current workaround functions correctly
- No user-facing impact
- Migration is straightforward when touched

---

## Resolved Items

### TD-000: Data Explorer duplicate query execution (RESOLVED 2025-11-25)

**Resolution:** Added `customHandler` property to `ButtonConfig` interface. Set `customHandler: true` on executeQuery button to skip generic handler in `messaging.js:wireButtons()`.

**Commit:** d215ac9

---

## Guidelines

**When to add items:**
- Code that works but uses non-standard patterns
- Workarounds that should be migrated to proper solutions
- Patterns that should be consolidated but aren't blocking

**When NOT to add:**
- Bugs (use GitHub issues)
- Feature requests (use FUTURE_ENHANCEMENTS.md)
- Items that can be fixed immediately (just fix them)

**Priority Levels:**
- **High** - Causes confusion, blocks features, or has performance impact
- **Medium** - Should be fixed when working in the area
- **Low** - Nice to have, fix opportunistically
