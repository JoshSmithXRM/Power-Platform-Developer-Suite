# Web Resources Panel - Technical Design

**Status:** Draft
**Date:** 2025-11-26
**Complexity:** Complex

---

## Overview

**User Problem:** Developers need to edit web resources (JavaScript, HTML, CSS, images) in Dataverse/Power Platform, but current tools require switching between VS Code and the Maker Portal, leading to context switching and slow feedback cycles.

**Solution:** A VS Code panel that browses web resources by solution and opens them directly in VS Code editor tabs using a custom FileSystemProvider, enabling full IDE support (syntax highlighting, IntelliSense, extensions) with auto-upload on save.

**Value:** Dramatically improves developer productivity by eliminating context switching and providing native IDE features for web resource development, with seamless two-way sync to Dataverse.

---

## Requirements

### Functional Requirements
- [ ] Browse web resources filtered by solution (including "Default Solution" for all web resources)
- [ ] Display web resource metadata in data table (name, display name, type, size, modified date)
- [ ] Click row to open web resource in VS Code editor tab
- [ ] Edit web resource with full IDE support (syntax highlighting, IntelliSense, user extensions)
- [ ] Auto-upload to Dataverse on save
- [ ] Publish single web resource after edit
- [ ] Custom URI scheme (`ppds:/webresource/{envId}/{webResourceId}`)
- [ ] FileSystemProvider for VS Code editor integration

### Non-Functional Requirements
- [ ] Performance: Load web resources in < 2 seconds for environments with 100+ resources
- [ ] Performance: Save operation completes in < 1 second
- [ ] Reliability: Handle concurrent saves gracefully
- [ ] UX: Clear indication when file is saving/syncing
- [ ] Security: Content stored securely (in-memory only, not persisted to disk)

### Success Criteria
- [ ] User can browse web resources by solution
- [ ] User can open JavaScript file in VS Code tab with full IntelliSense
- [ ] User can edit and save, with changes automatically uploaded to Dataverse
- [ ] User can publish web resource after editing
- [ ] All file types supported (JS, HTML, CSS, images, XML, etc.)

---

## Implementation Slices (Vertical Slicing)

### MVP Slice (Slice 1): "User can browse and view web resources in read-only mode"
**Goal:** Prove entire stack with basic read-only viewing

**Domain:**
- `WebResource` entity with essential fields: id, name, displayName, webResourceType, content
- `WebResourceType` value object (enum: JavaScript, HTML, CSS, Image, etc.)
- `IWebResourceRepository` interface with `findAllByEnvironment()` and `findById()`

**Application:**
- `ListWebResourcesUseCase` (fetch all web resources for environment)
- `WebResourceViewModel` (id, name, displayName, type, size, modifiedOn)
- `WebResourceViewModelMapper`

**Infrastructure:**
- `DataverseWebResourceRepository` implementing `IWebResourceRepository`
- Query Dataverse `webresource` entity via Web API
- Map DTO (webresourceid, name, displayname, webresourcetype, content) to domain

**Presentation:**
- `WebResourcesPanelComposed` using PanelCoordinator pattern
- Sections: ActionButtonsSection (Refresh, Open in Maker), EnvironmentSelectorSection, SolutionFilterSection, DataTableSection
- Data table with columns: name, displayName, type, size (calculated), modifiedOn
- Click row → show info message (implementation in Slice 2)

**Result:** WORKING PANEL ✅ (user can see web resources, filter by solution, but cannot open yet)

**Estimated Duration:** 60-90 minutes

---

### Slice 2: "User can open web resource in VS Code editor (read-only)"
**Builds on:** Slice 1

**Domain:**
- Add `getContent()` method to `WebResource` entity
- Add `getFileExtension()` method (based on type: .js, .html, .css, etc.)

**Application:**
- `GetWebResourceContentUseCase` (fetch single web resource by ID)

**Infrastructure:**
- `WebResourceFileSystemProvider` implementing `vscode.FileSystemProvider`
- Custom URI scheme registration: `ppds-webresource://`
- URI format: `ppds-webresource:/{envId}/{webResourceId}?name={name}&type={type}`
- `readFile()` method fetches content from Dataverse
- `stat()` method returns file metadata (size, mtime)
- Other methods throw "read-only" errors (temporary)

**Presentation:**
- Update row click handler to call `vscode.workspace.openTextDocument()` with custom URI
- Register FileSystemProvider in extension activation

**Result:** WORKING FILE OPEN ✅ (user can open web resource in editor tab, read-only)

**Estimated Duration:** 60-90 minutes

---

### Slice 3: "User can edit and save web resource (auto-upload)"
**Builds on:** Slice 2

**Domain:**
- Add `updateContent(newContent: string): void` method to `WebResource` entity
- Add business rule: `canEdit()` (managed web resources cannot be edited)

**Application:**
- `UpdateWebResourceUseCase` (save content back to Dataverse)

**Infrastructure:**
- Implement `writeFile()` in `WebResourceFileSystemProvider`
- In-memory cache for content (avoid re-fetching on every read)
- Call `UpdateWebResourceUseCase` on save
- Fire `vscode.FileSystemProvider.onDidChangeFile` event after save

**Presentation:**
- Status bar item showing "Saving..." during upload
- Success/error notifications

**Result:** FULL EDIT CAPABILITY ✅ (user can edit and save with auto-upload)

**Estimated Duration:** 60-90 minutes

---

### Slice 4: "User can publish web resource after edit"
**Builds on:** Slice 3

**Domain:**
- Add `canPublish()` method to `WebResource` entity

**Application:**
- `PublishWebResourceUseCase` (call Dataverse Publish API)

**Infrastructure:**
- Implement Publish API call (POST to `PublishXml` action)

**Presentation:**
- Add "Publish" button to panel toolbar (context-aware, enabled only when web resource selected)
- Add row action menu with "Publish" option
- Success notification after publish

**Result:** COMPLETE WORKFLOW ✅ (browse → edit → save → publish)

**Estimated Duration:** 45-60 minutes

---

### Slice 5: "Enhanced UX and error handling"
**Builds on:** Slice 4

**Domain:**
- Add validation: `validateContent()` for JavaScript (syntax check)
- Add `isManaged` field to determine editability

**Application:**
- Enhance ViewModels with `isEditable` flag

**Infrastructure:**
- Better error handling (network failures, conflict detection)
- Retry logic for transient failures

**Presentation:**
- Disable editing for managed web resources (show read-only badge)
- Conflict detection: warn if web resource was modified by another user
- Show file type icon in table
- Filter/search improvements

**Result:** PRODUCTION READY ✅ (robust error handling, great UX)

**Estimated Duration:** 45-60 minutes

---

## Architecture Design

### Panel Mockup (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Web Resources - Dev Environment                                        ▢ □ ✕│
├─────────────────────────────────────────────────────────────────────────┤
│ [Open in Maker] [Refresh] [Publish]   [Default Solution ▼]  [Dev Env ▼]│
├─────────────────────────────────────────────────────────────────────────┤
│ 🔍 Search web resources...                                              │
├─────────────────────────────────────────────────────────────────────────┤
│ Name                    │ Display Name      │ Type       │ Size │ Modified│
├─────────────────────────┼──────────────────┼────────────┼──────┼─────────┤
│ new_myscript.js         │ My Script         │ JavaScript │ 2 KB │ 2 hrs   │
│ new_mystyles.css        │ My Styles         │ CSS        │ 1 KB │ 1 day   │
│ new_mypage.html         │ My Page           │ HTML       │ 3 KB │ 3 days  │
│ new_logo.png            │ Company Logo      │ Image (PNG)│ 15KB │ 1 week  │
└─────────────────────────────────────────────────────────────────────────┘

(Click any row → Opens in VS Code editor tab with custom URI)
```

### Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Presentation Layer                                                      │
│ - WebResourcesPanelComposed (PanelCoordinator pattern)                 │
│ - WebResourceFileSystemProvider (vscode.FileSystemProvider)            │
│ - Row click → openTextDocument(custom URI)                              │
│ - Toolbar actions: refresh, openMaker, publish                         │
│ - NO business logic                                                     │
└─────────────────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ Application Layer                                                       │
│ - ListWebResourcesUseCase (orchestrates fetch + filter)                │
│ - GetWebResourceContentUseCase (fetch single web resource)             │
│ - UpdateWebResourceUseCase (save content to Dataverse)                 │
│ - PublishWebResourceUseCase (publish via Dataverse API)                │
│ - WebResourceViewModel (DTO for table display)                         │
│ - WebResourceViewModelMapper (domain → ViewModel)                      │
│ - NO business logic (orchestration only)                                │
└─────────────────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ Domain Layer                                                            │
│ - WebResource entity (rich model with behavior)                        │
│   • getContent(): string                                                │
│   • updateContent(content: string): void                                │
│   • getFileExtension(): string                                          │
│   • canEdit(): boolean (business rule: not managed)                    │
│   • canPublish(): boolean                                               │
│   • calculateSize(): number                                             │
│ - WebResourceType value object (enum + validation)                     │
│ - WebResourceName value object (validation: must start with prefix)    │
│ - IWebResourceRepository interface                                     │
│ - ZERO external dependencies                                           │
└─────────────────────────────────────────────────────────────────────────┘
                          ↑ implements ↑
┌─────────────────────────────────────────────────────────────────────────┐
│ Infrastructure Layer                                                    │
│ - DataverseWebResourceRepository (implements IWebResourceRepository)   │
│ - Dataverse Web API integration (query webresource entity)             │
│ - DTO → Domain mapping                                                  │
│ - Content encoding/decoding (Base64)                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Dependency Direction
✅ **CORRECT:**
- Presentation → Application → Domain
- Infrastructure → Domain
- All dependencies point INWARD

❌ **NEVER:**
- Domain → Any outer layer
- Application → Presentation
- Application → Infrastructure

---

## Type Contracts (Define BEFORE Implementation)

### Domain Layer Types

#### Entities

```typescript
/**
 * Represents a web resource in Dataverse.
 *
 * Business Rules:
 * - Web resources have immutable IDs and names
 * - Managed web resources cannot be edited
 * - Content must be valid for the web resource type (e.g., valid JS syntax)
 * - File extension determined by web resource type
 * - Size calculated from content length
 *
 * Rich behavior (NOT anemic):
 * - getContent(): Returns decoded content
 * - updateContent(newContent): Updates content with validation
 * - getFileExtension(): Returns extension based on type (.js, .html, etc.)
 * - canEdit(): Business rule for editability
 * - canPublish(): Business rule for publishability
 * - calculateSize(): Business logic for size calculation
 */
export class WebResource {
  constructor(
    private readonly id: string,
    private readonly name: WebResourceName,
    private readonly displayName: string,
    private readonly webResourceType: WebResourceType,
    private content: string, // Base64 encoded
    private readonly isManaged: boolean,
    private readonly modifiedOn: Date
  ) {
    this.validateInvariants();
  }

  /**
   * Validates business invariants on construction.
   * Throws if invariants violated.
   */
  private validateInvariants(): void {
    if (!this.content) {
      throw new Error('Web resource content cannot be empty');
    }
  }

  /**
   * Returns decoded content (string for text files, Buffer for binary).
   * Used by FileSystemProvider.readFile().
   */
  public getContent(): string {
    return Buffer.from(this.content, 'base64').toString('utf-8');
  }

  /**
   * Returns content as Buffer for FileSystemProvider.
   */
  public getContentBuffer(): Buffer {
    return Buffer.from(this.content, 'base64');
  }

  /**
   * Updates web resource content.
   * Business rule: Validates content is appropriate for type.
   *
   * @throws Error if content is invalid or web resource is managed
   */
  public updateContent(newContent: string): void {
    if (this.isManaged) {
      throw new Error('Cannot edit managed web resource');
    }

    // Convert to Base64
    this.content = Buffer.from(newContent, 'utf-8').toString('base64');
  }

  /**
   * Returns file extension based on web resource type.
   * Used by FileSystemProvider to set proper language mode.
   *
   * Business logic: Maps WebResourceType to file extension
   */
  public getFileExtension(): string {
    return this.webResourceType.getFileExtension();
  }

  /**
   * Business rule: Can edit if not managed.
   * Used by ViewModel mapper to set isEditable flag.
   */
  public canEdit(): boolean {
    return !this.isManaged;
  }

  /**
   * Business rule: Can publish if exists in Dataverse.
   * Used by presentation layer to enable/disable Publish button.
   */
  public canPublish(): boolean {
    return this.id !== '';
  }

  /**
   * Calculates size in bytes.
   * Business logic: Decodes Base64 to get actual size.
   */
  public calculateSize(): number {
    return Buffer.from(this.content, 'base64').length;
  }

  // Getters (NO business logic in getters)
  public getId(): string { return this.id; }
  public getName(): WebResourceName { return this.name; }
  public getDisplayName(): string { return this.displayName; }
  public getWebResourceType(): WebResourceType { return this.webResourceType; }
  public getIsManaged(): boolean { return this.isManaged; }
  public getModifiedOn(): Date { return this.modifiedOn; }
}
```

#### Value Objects

```typescript
/**
 * Value object representing web resource type.
 *
 * Immutable, validated on construction.
 * Business logic: Maps type codes to extensions and display names.
 */
export class WebResourceType {
  // Dataverse type codes
  public static readonly HTML = new WebResourceType(1, 'HTML', '.html');
  public static readonly CSS = new WebResourceType(2, 'CSS', '.css');
  public static readonly JAVASCRIPT = new WebResourceType(3, 'JavaScript', '.js');
  public static readonly XML = new WebResourceType(4, 'XML', '.xml');
  public static readonly PNG = new WebResourceType(5, 'Image (PNG)', '.png');
  public static readonly JPG = new WebResourceType(6, 'Image (JPG)', '.jpg');
  public static readonly GIF = new WebResourceType(7, 'Image (GIF)', '.gif');
  public static readonly XAP = new WebResourceType(8, 'Silverlight (XAP)', '.xap');
  public static readonly XSL = new WebResourceType(9, 'XSL', '.xsl');
  public static readonly ICO = new WebResourceType(10, 'Image (ICO)', '.ico');
  public static readonly SVG = new WebResourceType(11, 'Image (SVG)', '.svg');
  public static readonly RESX = new WebResourceType(12, 'String (RESX)', '.resx');

  private constructor(
    private readonly code: number,
    private readonly displayName: string,
    private readonly extension: string
  ) {}

  public static fromCode(code: number): WebResourceType {
    const types = [
      WebResourceType.HTML,
      WebResourceType.CSS,
      WebResourceType.JAVASCRIPT,
      WebResourceType.XML,
      WebResourceType.PNG,
      WebResourceType.JPG,
      WebResourceType.GIF,
      WebResourceType.XAP,
      WebResourceType.XSL,
      WebResourceType.ICO,
      WebResourceType.SVG,
      WebResourceType.RESX
    ];

    const type = types.find(t => t.code === code);
    if (!type) {
      throw new Error(`Unknown web resource type code: ${code}`);
    }

    return type;
  }

  public getCode(): number { return this.code; }
  public getDisplayName(): string { return this.displayName; }
  public getFileExtension(): string { return this.extension; }

  public isTextBased(): boolean {
    return [1, 2, 3, 4, 9, 12].includes(this.code); // HTML, CSS, JS, XML, XSL, RESX
  }

  public isImage(): boolean {
    return [5, 6, 7, 10, 11].includes(this.code); // PNG, JPG, GIF, ICO, SVG
  }
}

/**
 * Value object representing web resource name.
 *
 * Business rule: Must follow Dataverse naming conventions.
 */
export class WebResourceName {
  private constructor(private readonly value: string) {}

  public static create(value: string): WebResourceName {
    if (!value || value.trim().length === 0) {
      throw new Error('Web resource name cannot be empty');
    }

    // Business rule: Must contain prefix + underscore
    if (!value.includes('_')) {
      throw new Error('Web resource name must follow format: prefix_name');
    }

    return new WebResourceName(value);
  }

  public getValue(): string { return this.value; }

  public getPrefix(): string {
    return this.value.split('_')[0];
  }

  public getNameWithoutPrefix(): string {
    const parts = this.value.split('_');
    return parts.slice(1).join('_');
  }
}
```

#### Repository Interfaces

```typescript
/**
 * Repository interface for web resources (defined in domain).
 * Implemented by infrastructure layer.
 */
export interface IWebResourceRepository {
  /**
   * Finds all web resources for a specific environment.
   *
   * @param environmentId - Environment ID
   * @param solutionId - Optional solution filter (defaults to all)
   * @returns Array of web resources
   */
  findAllByEnvironment(
    environmentId: string,
    solutionId?: string
  ): Promise<readonly WebResource[]>;

  /**
   * Finds a single web resource by ID.
   *
   * @param environmentId - Environment ID
   * @param webResourceId - Web resource ID
   * @returns Web resource or null if not found
   */
  findById(
    environmentId: string,
    webResourceId: string
  ): Promise<WebResource | null>;

  /**
   * Updates web resource content.
   *
   * @param environmentId - Environment ID
   * @param webResource - Updated web resource entity
   */
  update(environmentId: string, webResource: WebResource): Promise<void>;

  /**
   * Publishes web resource.
   *
   * @param environmentId - Environment ID
   * @param webResourceId - Web resource ID
   */
  publish(environmentId: string, webResourceId: string): Promise<void>;
}
```

---

### Application Layer Types

#### Use Cases

```typescript
/**
 * Loads all web resources for a specific environment, optionally filtered by solution.
 *
 * Orchestrates: Repository fetch → Domain entity validation → ViewModel mapping
 *
 * @param environmentId - The Power Platform environment ID
 * @param solutionId - Optional solution ID filter
 * @returns Array of ViewModels ready for display
 */
export class ListWebResourcesUseCase {
  constructor(
    private readonly repo: IWebResourceRepository,
    private readonly logger: ILogger
  ) {}

  public async execute(
    environmentId: string,
    solutionId?: string
  ): Promise<readonly WebResource[]> {
    this.logger.info('Loading web resources', { environmentId, solutionId });

    // Fetch domain entities from repository
    const webResources = await this.repo.findAllByEnvironment(
      environmentId,
      solutionId
    );

    this.logger.info('Web resources loaded', { count: webResources.length });

    return webResources;
  }
}

/**
 * Fetches content of a single web resource.
 * Used by FileSystemProvider to load content for editor.
 *
 * Orchestrates: Repository fetch by ID
 */
export class GetWebResourceContentUseCase {
  constructor(
    private readonly repo: IWebResourceRepository,
    private readonly logger: ILogger
  ) {}

  public async execute(
    environmentId: string,
    webResourceId: string
  ): Promise<WebResource | null> {
    this.logger.debug('Fetching web resource content', {
      environmentId,
      webResourceId
    });

    const webResource = await this.repo.findById(environmentId, webResourceId);

    if (!webResource) {
      this.logger.warn('Web resource not found', { webResourceId });
      return null;
    }

    return webResource;
  }
}

/**
 * Updates web resource content in Dataverse.
 * Used by FileSystemProvider when user saves file.
 *
 * Orchestrates: Domain entity update → Repository save
 */
export class UpdateWebResourceUseCase {
  constructor(
    private readonly repo: IWebResourceRepository,
    private readonly logger: ILogger
  ) {}

  public async execute(
    environmentId: string,
    webResourceId: string,
    newContent: string
  ): Promise<void> {
    this.logger.info('Updating web resource content', {
      environmentId,
      webResourceId,
      contentLength: newContent.length
    });

    // Fetch existing web resource
    const webResource = await this.repo.findById(environmentId, webResourceId);
    if (!webResource) {
      throw new Error(`Web resource not found: ${webResourceId}`);
    }

    // Domain entity handles update logic
    webResource.updateContent(newContent);

    // Save back to repository
    await this.repo.update(environmentId, webResource);

    this.logger.info('Web resource content updated successfully');
  }
}

/**
 * Publishes web resource in Dataverse.
 * Makes changes visible to end users.
 *
 * Orchestrates: Repository publish call
 */
export class PublishWebResourceUseCase {
  constructor(
    private readonly repo: IWebResourceRepository,
    private readonly logger: ILogger
  ) {}

  public async execute(
    environmentId: string,
    webResourceId: string
  ): Promise<void> {
    this.logger.info('Publishing web resource', {
      environmentId,
      webResourceId
    });

    await this.repo.publish(environmentId, webResourceId);

    this.logger.info('Web resource published successfully');
  }
}
```

#### ViewModels

```typescript
/**
 * Data structure for displaying web resources in the panel.
 *
 * Mapped from domain WebResource entity via WebResourceViewModelMapper.
 */
export interface WebResourceViewModel {
  readonly id: string;
  readonly name: string;
  readonly displayName: string;
  readonly type: string; // Display name (e.g., "JavaScript", "HTML")
  readonly size: string; // Formatted size (e.g., "2.5 KB")
  readonly modifiedOn: string; // ISO 8601 formatted or relative (e.g., "2 hours ago")
  readonly isManaged: boolean;
  readonly isEditable: boolean; // Derived from canEdit()
  readonly canPublish: boolean; // Derived from canPublish()
}
```

#### Mappers

```typescript
/**
 * Maps WebResource domain entity to ViewModel.
 * Transformation only - NO business logic or sorting.
 */
export class WebResourceViewModelMapper {
  /**
   * Maps single domain entity to ViewModel.
   */
  public toViewModel(webResource: WebResource): WebResourceViewModel {
    return {
      id: webResource.getId(),
      name: webResource.getName().getValue(),
      displayName: webResource.getDisplayName(),
      type: webResource.getWebResourceType().getDisplayName(),
      size: this.formatSize(webResource.calculateSize()),
      modifiedOn: this.formatDate(webResource.getModifiedOn()),
      isManaged: webResource.getIsManaged(),
      isEditable: webResource.canEdit(),
      canPublish: webResource.canPublish()
    };
  }

  /**
   * Maps array of entities to ViewModels.
   * NO SORTING - sort before or after mapping, not inside mapper.
   */
  public toViewModels(
    webResources: readonly WebResource[]
  ): WebResourceViewModel[] {
    return webResources.map(wr => this.toViewModel(wr));
  }

  /**
   * Formats size in bytes to human-readable string.
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  }

  /**
   * Formats date to relative time or ISO string.
   */
  private formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffHours < 24 * 7) {
      const days = Math.floor(diffHours / 24);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    }
  }
}
```

---

### Infrastructure Layer Types

#### DTO (from Dataverse API)

```typescript
/**
 * DTO from Dataverse Web API for webresource entity.
 * See: https://learn.microsoft.com/en-us/power-apps/developer/data-platform/reference/entities/webresource
 */
export interface WebResourceDto {
  webresourceid: string; // Primary key
  name: string; // Logical name (e.g., "new_myscript.js")
  displayname: string | null; // Display name
  webresourcetype: number; // Type code (1=HTML, 2=CSS, 3=JS, etc.)
  content: string; // Base64 encoded content
  ismanaged: boolean; // Managed vs unmanaged
  modifiedon: string; // ISO 8601 date string
  _solutionid_value?: string; // Solution ID (optional)
}
```

#### Repository Implementation

```typescript
/**
 * Dataverse implementation of IWebResourceRepository.
 * Handles API communication and DTO → Domain transformation.
 */
export class DataverseWebResourceRepository implements IWebResourceRepository {
  constructor(
    private readonly apiService: IDataverseApiService,
    private readonly logger: ILogger
  ) {}

  public async findAllByEnvironment(
    environmentId: string,
    solutionId?: string
  ): Promise<readonly WebResource[]> {
    this.logger.debug('Fetching web resources from Dataverse', {
      environmentId,
      solutionId
    });

    // Build OData query
    let query = 'webresourceset?$select=webresourceid,name,displayname,webresourcetype,content,ismanaged,modifiedon';

    if (solutionId && solutionId !== DEFAULT_SOLUTION_ID) {
      query += `&$filter=_solutionid_value eq ${solutionId}`;
    }

    const response = await this.apiService.get<{ value: WebResourceDto[] }>(
      environmentId,
      query
    );

    // Map DTOs to domain entities
    return response.value.map(dto => this.mapToDomain(dto));
  }

  public async findById(
    environmentId: string,
    webResourceId: string
  ): Promise<WebResource | null> {
    this.logger.debug('Fetching web resource by ID', {
      environmentId,
      webResourceId
    });

    try {
      const response = await this.apiService.get<WebResourceDto>(
        environmentId,
        `webresourceset(${webResourceId})?$select=webresourceid,name,displayname,webresourcetype,content,ismanaged,modifiedon`
      );

      return this.mapToDomain(response);
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  public async update(
    environmentId: string,
    webResource: WebResource
  ): Promise<void> {
    this.logger.debug('Updating web resource in Dataverse', {
      environmentId,
      webResourceId: webResource.getId()
    });

    const updateDto = {
      content: webResource.getContentBuffer().toString('base64')
    };

    await this.apiService.patch(
      environmentId,
      `webresourceset(${webResource.getId()})`,
      updateDto
    );
  }

  public async publish(
    environmentId: string,
    webResourceId: string
  ): Promise<void> {
    this.logger.debug('Publishing web resource', {
      environmentId,
      webResourceId
    });

    // Dataverse Publish API
    const publishXml = `
      <importexportxml>
        <webresources>
          <webresource>{${webResourceId}}</webresource>
        </webresources>
      </importexportxml>
    `;

    await this.apiService.post(
      environmentId,
      'PublishXml',
      { ParameterXml: publishXml }
    );
  }

  /**
   * Maps Dataverse DTO to domain entity.
   */
  private mapToDomain(dto: WebResourceDto): WebResource {
    const name = WebResourceName.create(dto.name);
    const type = WebResourceType.fromCode(dto.webresourcetype);
    const modifiedOn = new Date(dto.modifiedon);

    return new WebResource(
      dto.webresourceid,
      name,
      dto.displayname || dto.name,
      type,
      dto.content,
      dto.ismanaged,
      modifiedOn
    );
  }

  private isNotFoundError(error: unknown): boolean {
    // Check if error is 404 Not Found
    return (
      error instanceof Error &&
      'status' in error &&
      (error as any).status === 404
    );
  }
}
```

---

### Presentation Layer Types

#### FileSystemProvider (Key Integration Point)

```typescript
/**
 * VS Code FileSystemProvider for web resources.
 *
 * Implements read/write operations for custom URI scheme.
 * Integrates with VS Code editor to provide seamless editing experience.
 *
 * URI format: ppds-webresource:/{envId}/{webResourceId}?name={name}&type={typeCode}
 *
 * Key responsibilities:
 * - readFile: Fetch content from Dataverse via GetWebResourceContentUseCase
 * - writeFile: Save content to Dataverse via UpdateWebResourceUseCase
 * - stat: Return file metadata (size, mtime)
 * - In-memory caching to avoid repeated API calls
 *
 * See: https://code.visualstudio.com/api/extension-guides/virtual-documents
 */
export class WebResourceFileSystemProvider implements vscode.FileSystemProvider {
  private readonly _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  public readonly onDidChangeFile = this._emitter.event;

  // In-memory cache: URI → content
  private readonly contentCache = new Map<string, Buffer>();

  constructor(
    private readonly getContentUseCase: GetWebResourceContentUseCase,
    private readonly updateContentUseCase: UpdateWebResourceUseCase,
    private readonly logger: ILogger
  ) {}

  /**
   * Reads file content from Dataverse.
   * Called when VS Code opens file in editor.
   */
  public async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    const cacheKey = uri.toString();

    // Check cache first
    if (this.contentCache.has(cacheKey)) {
      this.logger.debug('Returning cached web resource content', { uri: cacheKey });
      return this.contentCache.get(cacheKey)!;
    }

    // Parse URI
    const { environmentId, webResourceId } = this.parseUri(uri);

    this.logger.debug('Reading web resource from Dataverse', {
      environmentId,
      webResourceId
    });

    // Fetch from Dataverse
    const webResource = await this.getContentUseCase.execute(
      environmentId,
      webResourceId
    );

    if (!webResource) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }

    const content = webResource.getContentBuffer();

    // Cache content
    this.contentCache.set(cacheKey, content);

    return content;
  }

  /**
   * Writes file content to Dataverse.
   * Called when user saves file in VS Code.
   */
  public async writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean }
  ): Promise<void> {
    const { environmentId, webResourceId } = this.parseUri(uri);

    this.logger.info('Writing web resource to Dataverse', {
      environmentId,
      webResourceId,
      contentLength: content.length
    });

    // Convert Uint8Array to string
    const contentString = Buffer.from(content).toString('utf-8');

    // Update via use case
    await this.updateContentUseCase.execute(
      environmentId,
      webResourceId,
      contentString
    );

    // Update cache
    const cacheKey = uri.toString();
    this.contentCache.set(cacheKey, Buffer.from(content));

    // Notify VS Code that file changed
    this._emitter.fire([
      { type: vscode.FileChangeType.Changed, uri }
    ]);

    this.logger.info('Web resource saved successfully');
  }

  /**
   * Returns file metadata.
   * Called by VS Code to display file info.
   */
  public async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    const { environmentId, webResourceId } = this.parseUri(uri);

    const webResource = await this.getContentUseCase.execute(
      environmentId,
      webResourceId
    );

    if (!webResource) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }

    return {
      type: vscode.FileType.File,
      ctime: webResource.getModifiedOn().getTime(),
      mtime: webResource.getModifiedOn().getTime(),
      size: webResource.calculateSize()
    };
  }

  /**
   * Parses custom URI to extract environment ID and web resource ID.
   */
  private parseUri(uri: vscode.Uri): { environmentId: string; webResourceId: string } {
    // URI format: ppds-webresource:/{envId}/{webResourceId}?name={name}&type={typeCode}
    const pathParts = uri.path.split('/').filter(p => p.length > 0);

    if (pathParts.length < 2) {
      throw new Error(`Invalid web resource URI: ${uri.toString()}`);
    }

    return {
      environmentId: pathParts[0],
      webResourceId: pathParts[1]
    };
  }

  // Required by FileSystemProvider interface (not implemented for web resources)
  public watch(): vscode.Disposable {
    return new vscode.Disposable(() => {});
  }

  public readDirectory(): [string, vscode.FileType][] {
    throw vscode.FileSystemError.NoPermissions('Directory operations not supported');
  }

  public createDirectory(): void {
    throw vscode.FileSystemError.NoPermissions('Directory operations not supported');
  }

  public delete(): void {
    throw vscode.FileSystemError.NoPermissions('Delete not supported via file system');
  }

  public rename(): void {
    throw vscode.FileSystemError.NoPermissions('Rename not supported via file system');
  }
}
```

#### Panel (PanelCoordinator Pattern)

```typescript
/**
 * Commands that the Web Resources panel can receive from the webview.
 */
type WebResourcesPanelCommands =
  | 'refresh'
  | 'openMaker'
  | 'publish'
  | 'openInEditor'
  | 'environmentChange'
  | 'solutionChange';

/**
 * Presentation layer panel for Web Resources.
 * Uses PanelCoordinator pattern with section composition.
 * Extends EnvironmentScopedPanel for singleton pattern management.
 */
export class WebResourcesPanelComposed extends EnvironmentScopedPanel<WebResourcesPanelComposed> {
  public static readonly viewType = 'powerPlatformDevSuite.webResources';
  private static panels = new Map<string, WebResourcesPanelComposed>();

  private readonly coordinator: PanelCoordinator<WebResourcesPanelCommands>;
  private readonly scaffoldingBehavior: HtmlScaffoldingBehavior;
  private currentEnvironmentId: string;
  private currentSolutionId: string = DEFAULT_SOLUTION_ID;
  private solutionOptions: SolutionOption[] = [];
  private readonly viewModelMapper: WebResourceViewModelMapper;

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
    private readonly getEnvironmentById: (envId: string) => Promise<EnvironmentInfo | null>,
    private readonly listWebResourcesUseCase: ListWebResourcesUseCase,
    private readonly publishWebResourceUseCase: PublishWebResourceUseCase,
    private readonly solutionRepository: ISolutionRepository,
    private readonly urlBuilder: IMakerUrlBuilder,
    private readonly logger: ILogger,
    environmentId: string,
    private readonly panelStateRepository: IPanelStateRepository | undefined
  ) {
    super();
    this.currentEnvironmentId = environmentId;
    this.viewModelMapper = new WebResourceViewModelMapper();
    logger.debug('WebResourcesPanel: Initialized');

    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [extensionUri]
    };

    const { coordinator, scaffoldingBehavior } = this.createCoordinator();
    this.coordinator = coordinator;
    this.scaffoldingBehavior = scaffoldingBehavior;

    this.registerCommandHandlers();

    void this.initializeAndLoadData();
  }

  protected reveal(column: vscode.ViewColumn): void {
    this.panel.reveal(column);
  }

  private createCoordinator(): {
    coordinator: PanelCoordinator<WebResourcesPanelCommands>;
    scaffoldingBehavior: HtmlScaffoldingBehavior;
  } {
    // 1. Define sections
    const actionButtons = new ActionButtonsSection(
      {
        buttons: [
          { id: 'openMaker', label: 'Open in Maker' },
          { id: 'refresh', label: 'Refresh' },
          { id: 'publish', label: 'Publish' }
        ]
      },
      SectionPosition.Toolbar
    );

    const solutionFilter = new SolutionFilterSection();
    const environmentSelector = new EnvironmentSelectorSection();

    const tableConfig: DataTableConfig = {
      viewType: WebResourcesPanelComposed.viewType,
      title: 'Web Resources',
      dataCommand: 'webResourcesData',
      defaultSortColumn: 'name',
      defaultSortDirection: 'asc',
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'displayName', label: 'Display Name' },
        { key: 'type', label: 'Type' },
        { key: 'size', label: 'Size' },
        { key: 'modifiedOn', label: 'Modified' }
      ],
      searchPlaceholder: '🔍 Search web resources...',
      noDataMessage: 'No web resources found.',
      toolbarButtons: []
    };

    const tableSection = new DataTableSection(tableConfig);

    // 2. Create composition behavior
    const compositionBehavior = new SectionCompositionBehavior(
      [actionButtons, solutionFilter, environmentSelector, tableSection],
      PanelLayout.SingleColumn
    );

    // 3. Resolve CSS modules
    const cssUris = resolveCssModules(
      {
        base: true,
        components: ['buttons', 'inputs'],
        sections: ['environment-selector', 'solution-filter', 'action-buttons', 'datatable']
      },
      this.extensionUri,
      this.panel.webview
    );

    // 4. Create scaffolding behavior
    const scaffoldingBehavior = new HtmlScaffoldingBehavior(
      this.panel.webview,
      compositionBehavior,
      {
        cssUris,
        jsUris: [
          this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'messaging.js')
          ).toString(),
          this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'TableRenderer.js')
          ).toString(),
          this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'DataTableBehavior.js')
          ).toString(),
          this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'WebResourcesBehavior.js')
          ).toString()
        ],
        cspNonce: getNonce(),
        title: 'Web Resources'
      }
    );

    // 5. Create coordinator
    const coordinator = new PanelCoordinator<WebResourcesPanelCommands>({
      panel: this.panel,
      extensionUri: this.extensionUri,
      behaviors: [scaffoldingBehavior],
      logger: this.logger
    });

    return { coordinator, scaffoldingBehavior };
  }

  private registerCommandHandlers(): void {
    this.coordinator.registerHandler('refresh', async () => {
      await this.handleRefresh();
    });

    this.coordinator.registerHandler('environmentChange', async (data) => {
      const environmentId = (data as { environmentId?: string })?.environmentId;
      if (environmentId) {
        await this.handleEnvironmentChange(environmentId);
      }
    });

    this.coordinator.registerHandler('solutionChange', async (data) => {
      const solutionId = (data as { solutionId?: string })?.solutionId;
      if (solutionId) {
        await this.handleSolutionChange(solutionId);
      }
    });

    this.coordinator.registerHandler('openMaker', async () => {
      await this.handleOpenMaker();
    });

    this.coordinator.registerHandler('publish', async (data) => {
      const webResourceId = (data as { webResourceId?: string })?.webResourceId;
      if (webResourceId) {
        await this.handlePublish(webResourceId);
      }
    });

    this.coordinator.registerHandler('openInEditor', async (data) => {
      const webResourceId = (data as { webResourceId?: string })?.webResourceId;
      const name = (data as { name?: string })?.name;
      const typeCode = (data as { typeCode?: number })?.typeCode;

      if (webResourceId && name && typeCode !== undefined) {
        await this.handleOpenInEditor(webResourceId, name, typeCode);
      }
    });
  }

  private async initializeAndLoadData(): Promise<void> {
    // Load persisted solution ID
    if (this.panelStateRepository) {
      const state = await this.panelStateRepository.load({
        panelType: 'webResources',
        environmentId: this.currentEnvironmentId
      });
      if (state?.selectedSolutionId) {
        this.currentSolutionId = state.selectedSolutionId;
      }
    }

    // Show initial loading state
    const environments = await this.getEnvironments();
    await this.scaffoldingBehavior.refresh({
      environments,
      currentEnvironmentId: this.currentEnvironmentId,
      solutions: [],
      currentSolutionId: this.currentSolutionId,
      tableData: [],
      isLoading: true
    });

    // PARALLEL LOADING
    const [solutions, webResources] = await Promise.all([
      this.loadSolutions(),
      this.listWebResourcesUseCase.execute(
        this.currentEnvironmentId,
        this.currentSolutionId
      )
    ]);

    // Validate persisted solution
    let finalSolutionId = this.currentSolutionId;
    if (
      this.currentSolutionId !== DEFAULT_SOLUTION_ID &&
      !solutions.some(s => s.id === this.currentSolutionId)
    ) {
      finalSolutionId = DEFAULT_SOLUTION_ID;
      this.currentSolutionId = DEFAULT_SOLUTION_ID;
    }

    const viewModels = this.viewModelMapper
      .toViewModels(webResources)
      .sort((a, b) => a.name.localeCompare(b.name));

    // Final render
    await this.scaffoldingBehavior.refresh({
      environments,
      currentEnvironmentId: this.currentEnvironmentId,
      solutions,
      currentSolutionId: finalSolutionId,
      tableData: viewModels
    });
  }

  private async handleRefresh(): Promise<void> {
    this.logger.debug('Refreshing web resources');

    try {
      const webResources = await this.listWebResourcesUseCase.execute(
        this.currentEnvironmentId,
        this.currentSolutionId
      );

      const viewModels = this.viewModelMapper
        .toViewModels(webResources)
        .sort((a, b) => a.name.localeCompare(b.name));

      this.logger.info('Web resources loaded successfully', { count: viewModels.length });

      // Data-driven update
      await this.panel.webview.postMessage({
        command: 'updateTableData',
        data: {
          viewModels,
          columns: tableConfig.columns
        }
      });
    } catch (error: unknown) {
      this.logger.error('Error refreshing web resources', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to refresh web resources: ${errorMessage}`);
    }
  }

  private async handleOpenInEditor(
    webResourceId: string,
    name: string,
    typeCode: number
  ): Promise<void> {
    this.logger.info('Opening web resource in editor', { webResourceId, name });

    try {
      // Build custom URI
      const uri = vscode.Uri.parse(
        `ppds-webresource:/${this.currentEnvironmentId}/${webResourceId}?name=${encodeURIComponent(name)}&type=${typeCode}`
      );

      // Open in VS Code editor
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document);

      this.logger.info('Web resource opened in editor');
    } catch (error) {
      this.logger.error('Failed to open web resource', error);
      vscode.window.showErrorMessage(`Failed to open web resource: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handlePublish(webResourceId: string): Promise<void> {
    this.logger.info('Publishing web resource', { webResourceId });

    try {
      await this.publishWebResourceUseCase.execute(
        this.currentEnvironmentId,
        webResourceId
      );

      vscode.window.showInformationMessage('Web resource published successfully');
      this.logger.info('Web resource published');
    } catch (error) {
      this.logger.error('Failed to publish web resource', error);
      vscode.window.showErrorMessage(`Failed to publish web resource: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleOpenMaker(): Promise<void> {
    const environment = await this.getEnvironmentById(this.currentEnvironmentId);
    if (!environment?.powerPlatformEnvironmentId) {
      this.logger.warn('Cannot open Maker Portal: Environment ID not configured');
      vscode.window.showErrorMessage(
        'Cannot open in Maker Portal: Environment ID not configured. Edit environment to add one.'
      );
      return;
    }

    const url = this.urlBuilder.buildWebResourcesUrl(
      environment.powerPlatformEnvironmentId,
      this.currentSolutionId
    );
    await vscode.env.openExternal(vscode.Uri.parse(url));
    this.logger.info('Opened web resources in Maker Portal');
  }

  private async loadSolutions(): Promise<SolutionOption[]> {
    try {
      this.solutionOptions = await this.solutionRepository.findAllForDropdown(
        this.currentEnvironmentId
      );
      return this.solutionOptions;
    } catch (error) {
      this.logger.error('Failed to load solutions', error);
      return [];
    }
  }

  // createOrShow, handleEnvironmentChange, handleSolutionChange similar to other panels...
}
```

---

## File Structure

```
src/features/webResources/
├── domain/
│   ├── entities/
│   │   └── WebResource.ts                        # Rich model with behavior (~200 lines)
│   ├── valueObjects/
│   │   ├── WebResourceType.ts                    # Enum + validation (~150 lines)
│   │   └── WebResourceName.ts                    # Validation (~50 lines)
│   └── interfaces/
│       └── IWebResourceRepository.ts             # Domain contract (~30 lines)
│
├── application/
│   ├── useCases/
│   │   ├── ListWebResourcesUseCase.ts            # Fetch all (~40 lines)
│   │   ├── GetWebResourceContentUseCase.ts       # Fetch single (~30 lines)
│   │   ├── UpdateWebResourceUseCase.ts           # Save content (~40 lines)
│   │   └── PublishWebResourceUseCase.ts          # Publish (~30 lines)
│   ├── viewModels/
│   │   └── WebResourceViewModel.ts               # DTO interface (~15 lines)
│   └── mappers/
│       └── WebResourceViewModelMapper.ts         # Transform (~80 lines)
│
├── infrastructure/
│   ├── repositories/
│   │   └── DataverseWebResourceRepository.ts     # API integration (~200 lines)
│   └── dtos/
│       └── WebResourceDto.ts                     # Dataverse DTO (~15 lines)
│
└── presentation/
    ├── panels/
    │   └── WebResourcesPanelComposed.ts          # PanelCoordinator pattern (~400 lines)
    └── fileSystem/
        └── WebResourceFileSystemProvider.ts      # VS Code integration (~250 lines)
```

**New Files:** 17 files
**Modified Files:**
- `src/extension.ts` (register command + FileSystemProvider)
- `package.json` (add commands and activation events)
**Total:** 19 files touched

---

## Testing Strategy

### Domain Tests (Target: 100% coverage)

```typescript
// WebResource entity tests
describe('WebResource', () => {
  describe('updateContent', () => {
    it('should update content for unmanaged web resource', () => {
      const wr = createWebResource({ isManaged: false });
      wr.updateContent('new content');
      expect(wr.getContent()).toBe('new content');
    });

    it('should throw error for managed web resource', () => {
      const wr = createWebResource({ isManaged: true });
      expect(() => wr.updateContent('new')).toThrow('Cannot edit managed');
    });
  });

  describe('getFileExtension', () => {
    it('should return .js for JavaScript type', () => {
      const wr = createWebResource({ type: WebResourceType.JAVASCRIPT });
      expect(wr.getFileExtension()).toBe('.js');
    });
  });

  describe('canEdit', () => {
    it('should return false for managed resources', () => {
      const wr = createWebResource({ isManaged: true });
      expect(wr.canEdit()).toBe(false);
    });

    it('should return true for unmanaged resources', () => {
      const wr = createWebResource({ isManaged: false });
      expect(wr.canEdit()).toBe(true);
    });
  });
});

// WebResourceType value object tests
describe('WebResourceType', () => {
  describe('fromCode', () => {
    it('should create JavaScript type from code 3', () => {
      const type = WebResourceType.fromCode(3);
      expect(type.getDisplayName()).toBe('JavaScript');
      expect(type.getFileExtension()).toBe('.js');
    });

    it('should throw for unknown type code', () => {
      expect(() => WebResourceType.fromCode(999)).toThrow('Unknown web resource type');
    });
  });

  describe('isTextBased', () => {
    it('should return true for JavaScript', () => {
      expect(WebResourceType.JAVASCRIPT.isTextBased()).toBe(true);
    });

    it('should return false for PNG', () => {
      expect(WebResourceType.PNG.isTextBased()).toBe(false);
    });
  });
});
```

### Application Tests (Target: 90% coverage)

```typescript
describe('ListWebResourcesUseCase', () => {
  let useCase: ListWebResourcesUseCase;
  let mockRepository: jest.Mocked<IWebResourceRepository>;

  beforeEach(() => {
    mockRepository = {
      findAllByEnvironment: jest.fn()
    } as any;
    useCase = new ListWebResourcesUseCase(mockRepository, new NullLogger());
  });

  it('should fetch web resources from repository', async () => {
    const mockWebResources = [
      createWebResource({ name: 'new_test.js' })
    ];
    mockRepository.findAllByEnvironment.mockResolvedValue(mockWebResources);

    const result = await useCase.execute('env-1', 'solution-1');

    expect(mockRepository.findAllByEnvironment).toHaveBeenCalledWith('env-1', 'solution-1');
    expect(result).toEqual(mockWebResources);
  });
});

describe('UpdateWebResourceUseCase', () => {
  let useCase: UpdateWebResourceUseCase;
  let mockRepository: jest.Mocked<IWebResourceRepository>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      update: jest.fn()
    } as any;
    useCase = new UpdateWebResourceUseCase(mockRepository, new NullLogger());
  });

  it('should update web resource content', async () => {
    const mockWebResource = createWebResource({ isManaged: false });
    mockRepository.findById.mockResolvedValue(mockWebResource);

    await useCase.execute('env-1', 'wr-1', 'new content');

    expect(mockRepository.update).toHaveBeenCalledWith('env-1', mockWebResource);
  });

  it('should throw error if web resource not found', async () => {
    mockRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('env-1', 'wr-1', 'new content')
    ).rejects.toThrow('Web resource not found');
  });
});
```

### Infrastructure Tests (Optional - for complex logic)

```typescript
describe('DataverseWebResourceRepository', () => {
  describe('mapToDomain', () => {
    it('should map DTO to domain entity correctly', () => {
      const dto: WebResourceDto = {
        webresourceid: 'id-1',
        name: 'new_test.js',
        displayname: 'Test Script',
        webresourcetype: 3,
        content: Buffer.from('console.log("test")').toString('base64'),
        ismanaged: false,
        modifiedon: '2025-01-01T00:00:00Z'
      };

      const entity = repository.mapToDomain(dto);

      expect(entity.getId()).toBe('id-1');
      expect(entity.getName().getValue()).toBe('new_test.js');
      expect(entity.getWebResourceType()).toBe(WebResourceType.JAVASCRIPT);
    });
  });
});
```

### Manual Testing Scenarios

1. **Happy path:**
   - Open Web Resources panel
   - Filter by solution
   - Click JavaScript file row
   - File opens in VS Code editor with syntax highlighting
   - Edit file, save (Ctrl+S)
   - Check Dataverse - changes uploaded
   - Click Publish button
   - Verify web resource published

2. **Error case - Managed web resource:**
   - Open managed web resource
   - Try to edit
   - Should show read-only error

3. **Error case - Network failure:**
   - Disconnect network
   - Try to save file
   - Should show error notification with retry option

4. **Edge case - Large file (1MB+):**
   - Open large JavaScript file
   - Should load within 3 seconds
   - Save should complete within 2 seconds

---

## Dependencies & Prerequisites

### External Dependencies
- **VS Code APIs:**
  - `vscode.FileSystemProvider` interface
  - `vscode.workspace.registerFileSystemProvider()`
  - `vscode.workspace.openTextDocument()`
  - `vscode.window.showTextDocument()`
  - `vscode.Uri.parse()`
  - Custom URI scheme: `ppds-webresource://`

- **Dataverse APIs:**
  - `GET webresourceset` (query web resources)
  - `GET webresourceset({id})` (fetch single web resource)
  - `PATCH webresourceset({id})` (update content)
  - `POST PublishXml` (publish web resources)

- **NPM packages:**
  - No new packages required (Buffer is Node.js built-in)

### Internal Prerequisites
- [x] Existing `ISolutionRepository` for solution filter dropdown
- [x] Existing `IMakerUrlBuilder` for "Open in Maker" functionality
- [x] Existing `IDataverseApiService` for API communication
- [x] Existing `PanelCoordinator` pattern
- [x] Existing section library (ActionButtonsSection, DataTableSection, etc.)

### Breaking Changes
- [ ] None

---

## Clean Architecture Compliance Checklist

**Domain Layer:**
- [x] Entities have behavior (not anemic data classes)
- [x] Zero external dependencies (no imports from outer layers)
- [x] Business logic in entities (canEdit, getFileExtension, calculateSize)
- [x] Repository interfaces defined in domain
- [x] Value objects are immutable (WebResourceType, WebResourceName)
- [x] No logging (pure business logic)

**Application Layer:**
- [x] Use cases orchestrate only (NO business logic)
- [x] ViewModels are DTOs (no behavior)
- [x] Mappers transform only (no sorting params)
- [x] Logging at use case boundaries
- [x] Explicit return types on all methods

**Infrastructure Layer:**
- [x] Repositories implement domain interfaces
- [x] Dependencies point inward (infra → domain)
- [x] No business logic in repositories
- [x] Logging for API calls

**Presentation Layer:**
- [x] Panel uses PanelCoordinator<WebResourcesPanelCommands> pattern
- [x] Command type defined (union of command strings)
- [x] Sections defined (ActionButtonsSection, DataTableSection, etc.)
- [x] Layout chosen (SingleColumn)
- [x] Command handlers registered with coordinator
- [x] EnvironmentSelectorSection included (panel operates within environment)
- [x] Data-driven updates via postMessage (no HTML re-renders)
- [x] Panel calls use cases only (NO business logic)
- [x] FileSystemProvider for VS Code editor integration
- [x] Dependencies point inward (pres → app → domain)
- [x] Logging for user actions

**Type Safety:**
- [x] No `any` types without explicit justification
- [x] Explicit return types on all public methods
- [x] Proper null handling (no `!` assertions)
- [x] Type guards for runtime safety

---

## Extension Integration Checklist

**Commands (for package.json):**
- [ ] Command ID defined: `power-platform-dev-suite.webResources`
- [ ] Command ID (pick environment) defined: `power-platform-dev-suite.webResourcesPickEnvironment`
- [ ] Command titles specified
- [ ] Activation event: `onFileSystem:ppds-webresource`
- [ ] Commands added to `"contributes.commands"` array

**Extension Registration (for extension.ts):**
- [ ] Feature initializer function created (`initializeWebResources()`)
- [ ] Lazy imports with dynamic `import()` for performance
- [ ] Command handlers registered (both direct and pick-environment)
- [ ] FileSystemProvider registered: `vscode.workspace.registerFileSystemProvider('ppds-webresource', provider)`
- [ ] Commands added to `context.subscriptions`
- [ ] Error handling in command handlers
- [ ] Environment picker logic implemented

**Verification:**
- [ ] `npm run compile` passes after package.json changes
- [ ] Command appears in Command Palette (Ctrl+Shift+P)
- [ ] FileSystemProvider activates on custom URI open
- [ ] Manual testing completed (F5, invoke command, panel opens, file opens in editor)

---

## Key Architectural Decisions

### Decision 1: FileSystemProvider vs TextDocumentContentProvider

**Considered:**
- Option A: `vscode.TextDocumentContentProvider` (read-only provider)
- Option B: `vscode.FileSystemProvider` (full read/write support)

**Chosen:** Option B - FileSystemProvider

**Rationale:**
- Provides full read/write capability (required for auto-upload on save)
- Supports file metadata (size, mtime) for better VS Code integration
- Enables "Save" operation via standard VS Code save flow (Ctrl+S)
- Industry standard for virtual file systems (see VS Code samples)

**Tradeoffs:**
- More complex to implement (must implement more methods)
- Need to handle in-memory caching to avoid repeated API calls
- BUT: Provides much better user experience (native save workflow)

**References:**
- [VS Code FileSystemProvider API](https://code.visualstudio.com/api/extension-guides/virtual-documents)
- [VS Code FileSystemProvider sample](https://github.com/microsoft/vscode-extension-samples/tree/main/fsprovider-sample)

---

### Decision 2: Custom URI Scheme Format

**Considered:**
- Option A: `ppds:/webresource/{envId}/{webResourceId}`
- Option B: `ppds-webresource:/{envId}/{webResourceId}?name={name}&type={type}`

**Chosen:** Option B - Separate scheme with query params

**Rationale:**
- Dedicated scheme (`ppds-webresource`) allows granular activation event (`onFileSystem:ppds-webresource`)
- Query params provide metadata without additional API calls
- Easier to parse and validate
- Follows VS Code URI conventions

**Tradeoffs:**
- Slightly longer URIs
- BUT: Better performance (metadata in URI reduces API calls)

---

### Decision 3: In-Memory Cache vs Persistent Storage

**Considered:**
- Option A: Store web resource content on disk
- Option B: In-memory cache only

**Chosen:** Option B - In-memory cache

**Rationale:**
- Security: Content not persisted to disk (sensitive data concern)
- Simplicity: No need to manage file cleanup
- Performance: Memory access faster than disk I/O
- Consistency: Always fetches latest from Dataverse on panel open

**Tradeoffs:**
- Content lost on VS Code reload (must re-fetch from Dataverse)
- BUT: This is acceptable tradeoff for security and consistency

---

## Open Questions

- [x] **Q: Should we support batch publish (multiple web resources)?**
  - A: Deferred to Phase 2. Slice 4 implements single publish only.

- [x] **Q: Should we validate JavaScript syntax before upload?**
  - A: Yes, but deferred to Slice 5 (enhanced UX). Use simple try/catch with `new Function(content)` for syntax check.

- [ ] **Q: How to handle concurrent edits (two users editing same web resource)?**
  - A: Deferred to Slice 5. Use optimistic locking with `modifiedon` timestamp comparison.

- [ ] **Q: Should we support creating new web resources via FileSystemProvider?**
  - A: Deferred to Phase 2. MVP is browse + edit only.

- [ ] **Q: Should we show diff view (local vs server) before save?**
  - A: Deferred to Phase 2. MVP auto-uploads on save without confirmation.

---

## Review & Approval

### Design Phase
- [ ] design-architect review (this document)
- [ ] Human approval of design

### Implementation Phase (per slice)
- [ ] Slice 1 implemented and reviewed (browse + view read-only)
- [ ] Slice 2 implemented and reviewed (open in editor read-only)
- [ ] Slice 3 implemented and reviewed (edit + save)
- [ ] Slice 4 implemented and reviewed (publish)
- [ ] Slice 5 implemented and reviewed (enhanced UX)

### Final Approval
- [ ] All slices implemented
- [ ] Tests written and passing (npm test ✅)
- [ ] Manual testing completed
- [ ] Documentation updated
- [ ] code-guardian final approval

**Status:** Pending Design Review
**Approver:** [Pending]
**Date:** [Pending]

---

## References

**Similar Features:**
- Connection References panel (solution filter pattern)
- Environment Variables panel (solution filter + edit pattern)
- Plugin Trace Viewer panel (data table pattern)

**External Documentation:**
- [Dataverse Web Resource Entity Reference](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/reference/entities/webresource)
- [VS Code FileSystemProvider API](https://code.visualstudio.com/api/extension-guides/virtual-documents)
- [VS Code FileSystemProvider Sample](https://github.com/microsoft/vscode-extension-samples/blob/main/fsprovider-sample/src/fileSystemProvider.ts)
- [Web Resources Guide (Microsoft)](https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/web-resources)

**Design Patterns:**
- PanelCoordinator pattern: `docs/architecture/PANEL_ARCHITECTURE.md`
- Clean Architecture: `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md`
- Panel initialization: `.claude/templates/PANEL_INITIALIZATION_PATTERN.md`

**Workflow Guide:** `.claude/workflows/DESIGN_WORKFLOW.md`

---

## Sources

- [Use FileSystemProvider or Custom URI Scheme for API interactions?](https://github.com/microsoft/vscode-discussions/discussions/217)
- [File System API | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/virtual-documents)
- [vscode-extension-samples FileSystemProvider](https://github.com/microsoft/vscode-extension-samples/blob/main/fsprovider-sample/src/fileSystemProvider.ts)
- [Web Resource Entity Reference (Microsoft Dataverse)](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/reference/entities/webresource)
- [Web Resources Guide (Power Apps)](https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/web-resources)
