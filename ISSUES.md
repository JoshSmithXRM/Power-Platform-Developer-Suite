# Known Issues and Planned Fixes

This document tracks known issues, limitations, and planned improvements for the Power Platform Developer Suite extension.

## Active Issues

### 1. Local Optionset Values Not Available in Metadata Browser

**Status:** 🔴 Open
**Priority:** Medium
**Component:** Metadata Browser
**Reported:** 2025-10-27

**Description:**
When viewing optionset (picklist) attributes in the Metadata Browser, local optionset values and labels are not displayed. The raw metadata returned from the API does not include the `OptionSet` property with the available options.

**Current Behavior:**
- PicklistAttributeMetadata is returned without option values/labels
- Only metadata properties like `DefaultFormValue`, `AttributeType`, etc. are available
- No way to see what valid values exist for the picklist

**Expected Behavior:**
- Display all available option values with their labels
- Show option value (integer) and corresponding label
- Support for multi-language labels if available

**Example Missing Data:**
For attribute `et_residencetypecode` on `customeraddress` entity:
- Missing: OptionSet.Options array containing Value/Label pairs
- Present: Basic metadata (LogicalName, DisplayName, AttributeType, etc.)

**Potential Causes:**
1. API call may not be expanding the `OptionSet` property
2. May need additional API call to retrieve option definitions
3. Select/expand parameters may be incomplete

**Investigation Needed:**
- [ ] Check current API call for EntityDefinitions/AttributeDefinitions
- [ ] Verify if `$expand=OptionSet` or similar parameter is needed
- [ ] Determine if separate API call is required for local vs global optionsets
- [ ] Review Dataverse API documentation for PicklistAttributeMetadata retrieval

**Proposed Solution:**
TBD - Need to investigate API requirements first

**Related Files:**
- TBD (Metadata Browser service/panel files)

---

## Issue Template

When adding new issues, use this format:

```markdown
### N. [Issue Title]

**Status:** 🔴 Open / 🟡 In Progress / 🟢 Resolved
**Priority:** High / Medium / Low
**Component:** [Component Name]
**Reported:** YYYY-MM-DD

**Description:**
[Brief description of the issue]

**Current Behavior:**
[What currently happens]

**Expected Behavior:**
[What should happen]

**Investigation Needed:**
- [ ] Task 1
- [ ] Task 2

**Proposed Solution:**
[Proposed fix or "TBD"]

**Related Files:**
- [List of relevant files]
```

---

### 2. Choice Values Not Displayed When Choice Selected

**Status:** 🔴 Open
**Priority:** High
**Component:** Metadata Browser
**Reported:** 2025-10-27

**Description:**
When selecting a choice from the left sidebar in Metadata Browser, nothing is displayed in the main content area. The choice values section remains hidden even though a choice is selected.

**Root Cause:**
Race condition in mode-setting logic. The panel sends two messages when a choice is selected:
1. `set-mode` (mode: 'choice') - correctly sets choice-mode
2. `update-selection` (with counts) - **overwrites** the mode

In `metadataBrowserBehavior.js:383-429`, the `updateSelection` method re-determines mode based on counts:
- If `counts.choices === 0`, then `hasChoiceData` is false
- Mode classes are removed and only re-added if `hasChoiceData` is true
- This causes choice-mode to be removed, hiding the choice values section

**Current Behavior:**
- Select a choice from left sidebar
- Main content area shows nothing
- Choice values table is not visible (even if empty)

**Expected Behavior:**
- Select a choice from left sidebar
- Choice values section becomes visible
- Table displays choice values (or shows empty state)
- Mode should be 'choice' regardless of whether there are 0 or more values

**Proposed Solution:**
Remove mode-determination logic from `updateSelection` method. The `set-mode` message should be the authoritative source for mode. The `updateSelection` method should only:
1. Update the selection display text
2. Update section counts
3. Expand appropriate sections
4. NOT change the mode classes

**Related Files:**
- `resources/webview/js/panels/metadataBrowserBehavior.js:383-429` (updateSelection method)
- `src/panels/MetadataBrowserPanel.ts:955-983` (handleChoiceSelection method)

---

## Resolved Issues

_(Issues will be moved here when resolved, with resolution notes)_
