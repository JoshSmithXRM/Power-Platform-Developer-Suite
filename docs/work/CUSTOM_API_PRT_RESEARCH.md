# Custom API Display in PRT - Research Findings

Research into how Microsoft's Plugin Registration Tool (PRT) displays Custom APIs in its tree view.

---

## Summary

| Aspect | PRT Behavior |
|--------|-------------|
| **Location** | Message View only (root level, before message nodes) |
| **Icon** | `Plugin` icon (puzzle piece) |
| **Display Format** | `(Custom API) DisplayName - UniqueName` |
| **Children** | Bound Entity node (optional) |
| **Detail Panel** | Grid showing Request/Response Parameters |

---

## 1. Tree Hierarchy

### View Modes

PRT has three view modes:
1. **Assembly View** - Custom APIs are **NOT displayed**
2. **Message View** - Custom APIs appear at **ROOT level**
3. **Package View** - Custom APIs are **NOT displayed**

### Message View Hierarchy

```
[Root]
├── (Custom API) My API - new_myapi          <- Custom API (root level)
│   └── (Entity) account                     <- Bound entity (if entity-bound)
│       └── MyPlugin.PluginType              <- Implementing plugin
├── (Custom API) Another API - new_another   <- Custom API (root level)
├── Create                                   <- SDK Message (after Custom APIs)
│   └── account (2)                          <- Message Entity
│       └── Step 1                           <- Plugin Step
└── Update                                   <- SDK Message
    └── ...
```

### Key Points

- Custom APIs are sorted **alphabetically by DisplayName**
- Custom APIs appear **before** SDK Message nodes in the tree
- Custom APIs use `CrmTreeNodeType.Message` as their NodeType (historically treated as custom messages)
- There is also a `CrmTreeNodeType.CustomApi` enum value (0x4000) but CrmCustomApi uses `Message`

**Source:** `OrganizationControlViewModel.cs:1781-1788`
```csharp
if (view == CrmViewType.Message)
{
    foreach (CrmCustomApi item4 in from c in Organization.CustomApis.ToCollection()
        orderby c.DisplayName
        select c)
    {
        list.Add(item4);
    }
}
```

---

## 2. Visual Treatment

### Tree Node Icon

- **Image Type:** `CrmTreeNodeImageType.Plugin` (puzzle piece icon)
- Same icon as Plugin Types
- No Custom API-specific tree icon

**Source:** `CrmCustomApi.cs:158`
```csharp
CrmTreeNodeImageType ICrmTreeNode.NodeImageType => CrmTreeNodeImageType.Plugin;
```

### Display Text Format

Format: `({NodeTypeLabel}) {DisplayName} - {UniqueName}`

Example: `(Custom API) Get Customer Data - new_getcustomerdata`

**Source:** `CrmCustomApi.cs:81-84`
```csharp
public string NodeTypeLabel => "Custom API";

public string NodeText => string.Format(CultureInfo.CurrentCulture,
    "({0}) {1} - {2}", NodeTypeLabel, DisplayName, UniqueName);
```

### Menu Icon

- Separate icon for "Register New Custom API" menu: `CrmImageType.RegisterNewCustomApi`

---

## 3. Child Nodes

### Bound Entity Child

Custom APIs can have **one child node**: `CrmCustomApiEntity`

- Shows as: `(Entity) {logicalName}` or `(Entity) none` if globally bound
- Uses `CrmTreeNodeImageType.MessageEntity` icon
- Only appears if `BoundEntityLogicalName` is set

**Source:** `CrmCustomApi.cs:142-156`
```csharp
public ObservableCollection<ICrmTreeNode> NodeChildren
{
    get
    {
        if (!IsSearch || _children == null)
        {
            _children = new ObservableCollection<ICrmTreeNode>();
            if (_boundEntity != null)
            {
                _children.Add(_boundEntity);
            }
        }
        return _children;
    }
}
```

### Plugin Type Child (under Entity)

The `CrmCustomApiEntity` can have a child showing the implementing plugin:

**Source:** `CrmCustomApiEntity.cs:91-104`
```csharp
public ObservableCollection<ICrmTreeNode> NodeChildren
{
    get
    {
        if (!IsSearch || _children == null)
        {
            _children = new ObservableCollection<ICrmTreeNode>();
            if (_plugin != null)
            {
                _children.Add(_plugin);
            }
        }
        return _children;
    }
}
```

### Request/Response Parameters

Parameters are **NOT shown as tree children**. They are displayed in the detail grid panel when a Custom API is selected.

---

## 4. Detail Panel (Selection Behavior)

When a Custom API is selected, the detail panel shows:

### Properties Grid

Standard property grid showing:
- Name
- DisplayName
- Description
- UniqueName
- BoundEntityLogicalName
- ExecutePrivilegeName
- IsFunction
- IsPrivate
- PluginType (display name)
- AllowedCustomProcessingStepType
- BindingType

### Data Grid (Parameters)

Shows Request and Response parameters in a grid with columns:

| Column | Type |
|--------|------|
| Direction | string ("In" or "Out") |
| Name | string |
| Display Name | string |
| Description | string |
| Logical Entity Name | string |
| Unique Name | string |
| Parameter Type | string |
| Optional | bool |

**Source:** `CustomApiParameter.cs:267-287`
```csharp
public static CrmEntityColumn[] Columns
{
    get
    {
        if (_entityColumns == null)
        {
            _entityColumns = new CrmEntityColumn[8]
            {
                new CrmEntityColumn("Direction", "Direction", typeof(string)),
                new CrmEntityColumn("Name", "Name", typeof(string)),
                new CrmEntityColumn("DisplayName", "Display Name", typeof(string)),
                new CrmEntityColumn("Description", "Description", typeof(string)),
                new CrmEntityColumn("LogicalEntityName", "Logical Entity Name", typeof(string)),
                new CrmEntityColumn("UniqueName", "Unique Name", typeof(string)),
                new CrmEntityColumn("ParameterType", "Parameter Type", typeof(string)),
                new CrmEntityColumn("IsOptional", "Optional", typeof(bool))
            };
        }
        return _entityColumns;
    }
}
```

---

## 5. Context Menu Actions

When right-clicking a Custom API:
- **Update** - Opens the Custom API edit dialog
- **Unregister** - Deletes the Custom API

**Source:** `OrganizationControlViewModel.cs:1545-1549`
```csharp
if (SelectedItem is CrmCustomApi && Organization.IsCustomApiEnabled())
{
    CrmContextMenuSource.Add(UpdateMenu);
}
CrmContextMenuSource.Add(UnregisterMenu);
```

---

## 6. Icon Resources Summary

| Usage | Icon Type | Description |
|-------|-----------|-------------|
| Tree Node | `CrmTreeNodeImageType.Plugin` | Puzzle piece (same as PluginType) |
| Menu Item | `CrmImageType.RegisterNewCustomApi` | Dedicated Custom API menu icon |
| Bound Entity | `CrmTreeNodeImageType.MessageEntity` | Entity icon |
| Parameters | `CrmTreeNodeImageType.Parameters` | Parameters icon |

---

## 7. Recommendations for VS Code Extension

Based on PRT behavior, our extension should:

### Tree Display

1. **Message View**: Show Custom APIs at root level, before message groups
2. **Assembly View**: Consider whether to show Custom APIs (PRT doesn't, but we currently do)
3. **Sort Order**: Sort Custom APIs by DisplayName alphabetically

### Visual Treatment

1. **Icon**: Use a plugin/puzzle piece icon (or create a distinct Custom API icon)
2. **Display Format**: Match PRT format: `(Custom API) DisplayName - UniqueName`
3. **Prefix**: The `(Custom API)` prefix clearly distinguishes from SDK Messages

### Children

1. **Don't show parameters as tree children** - manage in detail panel or modal
2. **Optionally show bound entity** as expandable child node
3. **Optionally show implementing plugin** under bound entity

### Detail Panel

1. Show parameters in a grid/table (not inline in tree)
2. Include Direction, Name, DisplayName, Type, Optional columns
3. Property panel for Custom API metadata

---

## Source Files Referenced

- `tmp/decompiled/PluginRegistration/Microsoft.Crm.Tools.PluginRegistration/OrganizationControlViewModel.cs`
- `tmp/decompiled/CrmLibraries/Microsoft.Crm.Tools.Libraries/CrmCustomApi.cs`
- `tmp/decompiled/CrmLibraries/Microsoft.Crm.Tools.Libraries/CrmCustomApiEntity.cs`
- `tmp/decompiled/CrmLibraries/Microsoft.Crm.Tools.Libraries/CustomApiParameter.cs`
- `tmp/decompiled/CrmLibraries/Microsoft.Crm.Tools.Libraries/NodeTypeToImageConverter.cs`
- `tmp/decompiled/CrmLibraries/Microsoft.Crm.Tools.Libraries/CrmTreeNodeImageType.cs`
- `tmp/decompiled/CrmLibraries/Microsoft.Crm.Tools.Libraries/CrmTreeNodeType.cs`
- `tmp/decompiled/CrmLibraries/Microsoft.Crm.Tools.Libraries/CrmImageType.cs`
