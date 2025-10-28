# Plugin Registration - Implementation Plan

**Feature:** Plugin Registration Tool
**Status:** In Development

---

## Phase 1: Foundation - Read-Only Tree View

**Deliverables:**
- TreeViewComponent (generic, reusable)
- PluginRegistrationService (read-only API methods)
- PluginRegistrationPanel with tree display
- Assembly → PluginType → Step → Image hierarchy

### TreeViewComponent (New Component)
Four-file structure following architecture:
- `TreeViewComponent.ts` - Component logic
- `TreeViewConfig.ts` - Configuration interface
- `TreeViewView.ts` - HTML generation
- `TreeViewBehavior.js` - Webview interactions

### PluginRegistrationService
Read-only methods:
```typescript
getAssemblies(environmentId: string): Promise<PluginAssembly[]>
getPluginTypes(environmentId: string, assemblyId: string): Promise<PluginType[]>
getSteps(environmentId: string, pluginTypeId: string): Promise<PluginStep[]>
getImages(environmentId: string, stepId: string): Promise<PluginImage[]>
```

### PluginRegistrationPanel
Panel composition following architecture patterns:
- EnvironmentSelectorComponent (reused)
- ActionBarComponent (reused)
- TreeViewComponent (new)

---

## Phase 2: Details Panel

**Deliverables:**
- SplitPanelComponent integration
- Property display for each node type
- Selection state management

---

## Phase 3: Modal Infrastructure

**Deliverables:**
- ModalComponent base class
- Modal behavior script
- Form validation support

---

## Phase 4: Register Assembly

**Deliverables:**
- RegisterAssemblyModal
- DLL file upload
- Assembly registration workflow

---

## Phase 5: Register Step & Image

**Deliverables:**
- RegisterStepModal
- RegisterImageModal
- Update/Delete operations

---

## Phase 6: Advanced Features

**Deliverables:**
- Enable/Disable steps
- Filters (Managed/Unmanaged, Hide Microsoft)
- Tree search
- Context menus

---

## Data Models

```typescript
interface TreeNode {
    id: string;
    label: string;
    icon: string;
    type: string;
    children?: TreeNode[];
    expanded: boolean;
    data?: any;
}

interface PluginAssembly {
    pluginassemblyid: string;
    name: string;
    version: string;
    isolationmode: number;
    ismanaged: boolean;
}

interface PluginType {
    plugintypeid: string;
    typename: string;
    pluginassemblyid: string;
}

interface PluginStep {
    sdkmessageprocessingstepid: string;
    name: string;
    plugintypeid: string;
    stage: number;
    mode: number;
    statecode: number;
}

interface PluginImage {
    sdkmessageprocessingstepimageid: string;
    name: string;
    imagetype: number;
    sdkmessageprocessingstepid: string;
}
```
