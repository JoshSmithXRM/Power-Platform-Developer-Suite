# Data Explorer - Session Work Tracking

This document tracks work in progress and remaining items for the Data Explorer feature.

## Completed This Session

### Bug Fixes
- [x] **Link-entity columns not appearing** - Fixed repository to handle `_x002e_` encoding for aliased columns (e.g., `su.domainname`)
- [x] **Missing OData annotations** - Added `Prefer: odata.include-annotations="*"` header to DataverseApiService to get lookup entity types and formatted values
- [x] **Entity type "unknown"** - Fixed by requesting annotations; now properly returns `systemuser` for createdby/modifiedby
- [x] **Empty results state** - Added "No records found" message when query returns no rows

### New Features
- [x] **Open record in browser** - Clicking lookup values opens the record in Dataverse
- [x] **Copy record URL** - Hover copy button to copy record URL to clipboard
- [x] **Primary key linking** - contactid, accountid, etc. columns are now clickable
- [x] **DataverseRecordUrlService** - Created reusable service for building/opening/copying Dataverse record URLs

### Infrastructure
- [x] Added `dataverseUrl` to `EnvironmentInfo` interface
- [x] Added `entityLogicalName` to `QueryResultViewModel` for primary key detection

## In Progress

### Bugs to Fix
- [x] **Stacked columns bug** - Fixed by using `<span class="record-cell-content">` wrapper instead of `display: flex` on `<td>`
- [ ] **Duplicate query execution** - Single click triggers multiple queries (see logs with queryId 7, 8, etc.) - PARKING LOT for next commit

## Parking Lot (Future Sessions)

### Known Issues
- [ ] **Duplicate query execution** - Queries are being executed multiple times on single click. Likely causes:
  - Multiple event listeners being attached
  - Webview sending duplicate messages
  - Panel coordination issue
  - Needs investigation across all panels

### Potential Enhancements
- [ ] Consider adding table alias support for main entity in SQL (FetchXML limitation - main entity doesn't support alias)
- [ ] Add sorting persistence
- [ ] Add column resizing
- [ ] Export to CSV/Excel

## Files Modified This Session

### Core Changes
- `src/shared/infrastructure/services/DataverseApiService.ts` - Added Prefer header for annotations
- `src/shared/infrastructure/services/DataverseRecordUrlService.ts` - NEW: Reusable URL builder
- `src/features/dataExplorer/infrastructure/repositories/DataverseDataExplorerQueryRepository.ts` - Link-entity handling, lookup extraction
- `src/features/dataExplorer/application/mappers/QueryResultViewModelMapper.ts` - Entity name extraction, lookup mapping
- `src/features/dataExplorer/application/viewModels/QueryResultViewModel.ts` - Added entityLogicalName, rowLookups
- `src/features/dataExplorer/presentation/panels/DataExplorerPanelComposed.ts` - openRecord/copyRecordUrl handlers

### Webview Changes
- `resources/webview/js/behaviors/DataExplorerBehavior.js` - Record links, copy buttons, empty state
- `resources/webview/css/features/data-explorer.css` - Record link and copy button styling

### Shared Infrastructure
- `src/shared/infrastructure/ui/panels/EnvironmentScopedPanel.ts` - Added dataverseUrl to interface
- `src/infrastructure/dependencyInjection/SharedFactories.ts` - Added dataverseUrl to getEnvironmentById

## Notes

- The `Prefer: odata.include-annotations="*"` header is critical for getting lookup metadata from Dataverse
- Primary key columns are detected using pattern `{entityname}id` (e.g., contactid for contact entity)
- Copy button only appears on hover - this is intentional modern UX pattern
