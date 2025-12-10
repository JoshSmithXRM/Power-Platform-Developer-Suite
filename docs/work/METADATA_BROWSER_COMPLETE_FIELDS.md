# Metadata Browser: Complete Field Display

**Branch:** `fix/notebook-no-data-race-condition`
**Created:** 2025-12-09
**Status:** In Progress

---

## Problem Statement

The Metadata Browser is a developer tool. Its purpose is to give developers **complete visibility** into Dataverse metadata. Currently:

- DTOs only capture a subset of API fields
- Domain entities mirror these incomplete DTOs
- Properties tab shows incomplete data
- Developers can't trust the tool because data is hidden

**This is unacceptable.** A metadata browser that hides metadata is useless.

---

## Design Decision

### What We're NOT Doing
- ❌ Adding 50+ fields to every DTO and domain entity
- ❌ Creating maintenance burden that lags behind Microsoft API changes
- ❌ Type-specific serializers for every metadata type

### What We ARE Doing
- ✅ Preserving `_rawDto` (complete API response) on ALL metadata types
- ✅ Properties tab renders from `_rawDto` (guarantees completeness)
- ✅ Raw Data tab renders from `_rawDto` (already working for attributes)
- ✅ Domain entities stay focused on business logic (typed fields for sorting, filtering, behavior)
- ✅ Visual indicator in dev mode showing field counts

### Why This Is Better
1. **Automatic completeness** - New Microsoft fields appear automatically
2. **Zero maintenance** - No DTO updates when API changes
3. **Clean architecture** - Domain entities focused on behavior, not data dumping
4. **Developer trust** - What API returns is what developers see

---

## Architecture

```
API Response (100% complete)
    ↓
DTO (typed fields for business logic)
    + _rawDto preserved ← COMPLETE API RESPONSE
    ↓
Domain Entity (behavior methods)
    + _rawDto passed through
    ↓
Detail Panel
    ├── Properties Tab ← renders from _rawDto (COMPLETE)
    └── Raw Data Tab ← renders from _rawDto (COMPLETE)
```

---

## Implementation Checklist

### Phase 1: Ensure _rawDto Preservation for All Types ✅ COMPLETE

| Metadata Type | Mapper | setRawDto() | Status |
|---------------|--------|-------------|--------|
| AttributeMetadata | AttributeMetadataMapper | ✅ | Done |
| EntityMetadata | EntityMetadataMapper | ✅ | Done (previous session) |
| OneToManyRelationship | RelationshipMetadataMapper | ✅ | Done (previous session) |
| ManyToManyRelationship | RelationshipMetadataMapper | ✅ | Done (previous session) |
| EntityKey | EntityKeyMapper | ✅ | Done (previous session) |
| SecurityPrivilege | SecurityPrivilegeMapper | ✅ | Done (previous session) |
| OptionSetMetadata | OptionSetMetadataMapper | ⬜ | N/A - Choice values don't have detail panel |

### Phase 2: Generic _rawDto Extraction in Panel ✅ COMPLETE

| Task | Status |
|------|--------|
| Update `handleOpenDetailPanel()` to extract `_rawDto` generically | ✅ |
| Remove type-specific `isAttributeMetadata()` check | ✅ |
| Remove unused `AttributeMetadataSerializer` dependency | ✅ |
| Pass `rawEntity` for ALL metadata types | ✅ |
| Add debug logging for field counts | ✅ |

### Phase 3: Properties Tab Uses _rawDto ✅ COMPLETE

| Task | Status |
|------|--------|
| Update `showDetailPanel()` to use `displayData = rawEntity \|\| metadata` | ✅ |
| Both Properties and Raw Data tabs now render from same complete data | ✅ |
| Verify `flattenMetadata()` handles PascalCase keys | ⬜ Manual test |
| Verify nested objects render correctly (DisplayName.UserLocalizedLabel.Label) | ⬜ Manual test |
| Verify managed property objects render correctly ({ Value, CanBeChanged }) | ⬜ Manual test |

### Phase 4: Dev Mode Visual Indicator ✅ COMPLETE

| Task | Status |
|------|--------|
| Add field count comparison in `handleOpenDetailPanel()` | ✅ |
| Log field counts via logger.debug | ✅ |
| Add visual badge in detail panel header showing "X fields" | ✅ |
| Badge shows warning color if _rawDto missing | ✅ |
| CSS styles for `.field-count-badge.complete` and `.incomplete` | ✅ |

### Phase 5: Validation (Per Metadata Type) - IN PROGRESS

| Type | Raw Data Complete | Properties Complete | Visual Indicator Works |
|------|-------------------|---------------------|------------------------|
| Attribute | ⬜ | ⬜ | ⬜ |
| Entity | ⬜ | ⬜ | ⬜ |
| 1:N Relationship | ⬜ | ⬜ | ⬜ |
| N:N Relationship | ⬜ | ⬜ | ⬜ |
| Key | ⬜ | ⬜ | ⬜ |
| Privilege | ⬜ | ⬜ | ⬜ |
| Choice Value | N/A | N/A | N/A |

---

## Files to Modify

### Phase 1: Mappers
- `src/features/metadataBrowser/infrastructure/mappers/EntityMetadataMapper.ts`
- `src/features/metadataBrowser/infrastructure/mappers/RelationshipMetadataMapper.ts`
- `src/features/metadataBrowser/infrastructure/mappers/EntityKeyMapper.ts`
- `src/features/metadataBrowser/infrastructure/mappers/SecurityPrivilegeMapper.ts`
- `src/features/metadataBrowser/infrastructure/mappers/OptionSetMetadataMapper.ts`

### Phase 2: Panel
- `src/features/metadataBrowser/presentation/panels/MetadataBrowserPanel.ts`

### Phase 3: Webview Behavior
- `resources/webview/js/behaviors/MetadataBrowserBehavior.js`

### Phase 4: Dev Mode Indicator
- `src/features/metadataBrowser/presentation/panels/MetadataBrowserPanel.ts`
- `resources/webview/js/behaviors/MetadataBrowserBehavior.js`
- `resources/webview/css/metadataBrowser.css` (badge styling)

---

## Validation Approach

### Debug Logging (Extension Side)
```typescript
this.logger.debug('Detail panel data', {
    type: tab,
    itemId,
    hasRawDto: '_rawDto' in metadataRecord,
    rawDtoKeyCount: rawEntity ? Object.keys(rawEntity).length : 0,
    domainEntityKeyCount: Object.keys(metadataRecord).length
});
```

### Visual Indicator (Webview Side)
- Detail panel header shows: `"Attribute: accountid (52 fields)"`
- If `_rawDto` missing: Badge shows warning icon + "incomplete"
- In dev mode: Tooltip shows raw key count vs rendered count

### Manual Verification Per Type
1. Open Metadata Browser
2. Select entity
3. Click item to open detail panel
4. Check Properties tab - all API fields visible?
5. Check Raw Data tab - complete JSON?
6. Check field count badge - matches expectation?

---

## Session Log

### Session 1 (2025-12-09) - Planning

**Problem Identified:**
- Properties tab shows incomplete data
- Only AttributeMetadata has _rawDto extraction working
- Other metadata types don't preserve _rawDto properly

**Design Decision:**
- Render Properties tab from _rawDto (not domain entity)
- Generic _rawDto extraction (not type-specific serializers)
- Add dev mode visual indicator for field counts

**Ready to implement Phase 1.**

### Session 2 (2025-12-09) - Implementation Complete

**Phases 1-4 Completed:**
- Generic `_rawDto` extraction working for all metadata types
- Properties tab now renders from raw API response
- Visual indicator badge showing field count
- All tests passing

**Additional Improvements:**
- Priority field ordering for Properties tab (MetadataId, LogicalName, etc. at top)
- Managed property wrappers unwrapped (IsCustomizable, RequiredLevel now show just the value)
- Simple value wrappers unwrapped (AttributeTypeName shows "LookupType" not "Value: LookupType")
- DisplayName/Description labels extracted from nested structure
- Simple arrays joined with commas (Targets: "account, contact")
- Alphabetical sorting for non-priority fields
- @odata.context filtered out (just request URL noise)

**@odata.type Investigation:**
- `@odata.type` ONLY appears for AttributeMetadata (polymorphic - LookupAttributeMetadata, StringAttributeMetadata, etc.)
- Relationships, Keys, Privileges are NOT polymorphic - API doesn't return `@odata.type` for them
- This is expected Dataverse API behavior, NOT a bug

**Ready for F5 testing and validation.**

---

## Technical Notes

### Why _rawDto Instead of Typed DTOs?

The Dataverse API returns different fields for different attribute types:
- `LookupAttributeMetadata`: Targets, Format
- `StringAttributeMetadata`: MaxLength, FormatName
- `DateTimeAttributeMetadata`: DateTimeBehavior, Format, ImeMode
- `MoneyAttributeMetadata`: Precision, MinValue, MaxValue, PrecisionSource
- etc.

Trying to enumerate all fields across all types is:
1. Error-prone (easy to miss fields)
2. High maintenance (Microsoft adds fields)
3. Unnecessary (we don't need typed access to display them)

By preserving `_rawDto`, we get:
1. 100% completeness automatically
2. Zero maintenance for new fields
3. Type safety where we actually need it (business logic)

### OData Fields Policy

| Field | Keep? | Reason |
|-------|-------|--------|
| `@odata.type` | ✅ Yes | Developers need to know concrete type |
| `@odata.etag` | ✅ Yes | Useful for versioning/caching understanding |
| `@odata.context` | ❌ No | Just the request URL, noise |

Implementation: Filter out `@odata.context` in the renderer, keep everything else.
