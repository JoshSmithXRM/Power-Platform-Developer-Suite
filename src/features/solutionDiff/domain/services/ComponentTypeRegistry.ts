import { ComponentType } from '../enums/ComponentType';

/**
 * Configuration for a component type's deep comparison.
 * Defines how to fetch and compare component records.
 */
export interface ComponentTypeConfig {
  /** Dataverse table name (e.g., "workflows") */
  readonly tableName: string;

  /** Primary key column (e.g., "workflowid") */
  readonly primaryKeyColumn: string;

  /** Column for display name (e.g., "name") */
  readonly displayNameColumn: string;

  /** Columns to compare for differences (excludes timestamps, owner, org, etc.) */
  readonly comparableColumns: readonly string[];

  /** Human-readable names for columns (for UI display) */
  readonly columnDisplayNames: Readonly<Record<string, string>>;
}

/**
 * Domain service that maps component types to their Dataverse table configuration.
 *
 * Responsibilities:
 * - Map ComponentType enum to Dataverse table name
 * - Define which columns to compare for each type
 * - Define which columns to ignore (always different across environments)
 *
 * Business Rules:
 * - Only supported component types can be deeply compared
 * - Unsupported types fall back to existence-only comparison
 * - Columns are explicitly whitelisted (new MS columns won't cause false positives)
 *
 * Columns Always Ignored (never in comparableColumns):
 * - modifiedon, modifiedby - Per-environment timestamp/user
 * - createdon, createdby - Per-environment timestamp/user
 * - ownerid - May differ between environments
 * - organizationid - Always different
 * - solutionid - Solution GUIDs differ across environments
 * - _*_value - Lookup references (GUIDs differ)
 */
export class ComponentTypeRegistry {
  private readonly configs: ReadonlyMap<ComponentType, ComponentTypeConfig>;

  constructor() {
    this.configs = this.buildConfigs();
  }

  /**
   * Gets configuration for a component type.
   *
   * @param componentType - The component type to look up
   * @returns Configuration if supported, undefined otherwise
   */
  public getConfig(componentType: ComponentType): ComponentTypeConfig | undefined {
    return this.configs.get(componentType);
  }

  /**
   * Checks if deep comparison is supported for this component type.
   *
   * @param componentType - The component type to check
   * @returns true if deep comparison is supported
   */
  public isDeepComparisonSupported(componentType: ComponentType): boolean {
    return this.configs.has(componentType);
  }

  /**
   * Gets all supported component types.
   *
   * @returns Array of ComponentTypes that support deep comparison
   */
  public getSupportedTypes(): readonly ComponentType[] {
    return [...this.configs.keys()];
  }

  /**
   * Builds the configuration map for all supported component types.
   *
   * Supported Types:
   * - Entity (1) - Custom and system entities (tables)
   * - Workflow (29) - Cloud Flows and classic workflows
   * - PluginAssembly (91) - Plugin DLL binaries
   * - PluginStep (92) - SDK message processing steps
   * - WebResource (61) - JavaScript, HTML, CSS, images
   * - EnvironmentVariable (380) - Environment variable definitions
   */
  private buildConfigs(): ReadonlyMap<ComponentType, ComponentTypeConfig> {
    return new Map<ComponentType, ComponentTypeConfig>([
      [ComponentType.Entity, {
        tableName: 'EntityDefinitions',
        primaryKeyColumn: 'MetadataId',
        displayNameColumn: 'LogicalName',
        comparableColumns: [
          'LogicalName',           // Logical name (e.g., "account")
          'SchemaName',            // Schema name (e.g., "Account")
          'EntitySetName',         // OData set name (e.g., "accounts")
          'IsActivity',            // Is an activity entity
          'IsValidForAdvancedFind',// Can be used in Advanced Find
          'IsQuickCreateEnabled',  // Quick create form enabled
          'IsConnectionsEnabled',  // Connections enabled
          'IsDuplicateDetectionEnabled', // Duplicate detection enabled
          'IsMailMergeEnabled',    // Mail merge enabled
          'HasNotes',              // Notes attachment enabled
          'HasActivities',         // Activities enabled
          'OwnershipType'          // Ownership type (UserOwned, OrganizationOwned, etc.)
        ],
        columnDisplayNames: {
          LogicalName: 'Logical Name',
          SchemaName: 'Schema Name',
          EntitySetName: 'API Set Name',
          IsActivity: 'Is Activity',
          IsValidForAdvancedFind: 'Advanced Find',
          IsQuickCreateEnabled: 'Quick Create',
          IsConnectionsEnabled: 'Connections',
          IsDuplicateDetectionEnabled: 'Duplicate Detection',
          IsMailMergeEnabled: 'Mail Merge',
          HasNotes: 'Notes Enabled',
          HasActivities: 'Activities Enabled',
          OwnershipType: 'Ownership Type'
        }
      }],

      [ComponentType.Workflow, {
        tableName: 'workflows',
        primaryKeyColumn: 'workflowid',
        displayNameColumn: 'name',
        comparableColumns: [
          'clientdata',        // Flow definition JSON (for Cloud Flows)
          'xaml',              // XAML definition (for classic workflows)
          'statecode',         // Active/Inactive state
          'statuscode',        // Status reason
          'category',          // Workflow category (0=Workflow, 1=Dialog, 2=BusinessRule, 3=Action, 4=BusinessProcessFlow, 5=ModernFlow)
          'type',              // Type (1=Definition, 2=Activation, 3=Template)
          'mode',              // Mode (0=Background, 1=RealTime)
          'scope',             // Scope (1=User, 2=BusinessUnit, 3=Parent:Child, 4=Organization)
          'primaryentity'      // Primary entity logical name
        ],
        columnDisplayNames: {
          clientdata: 'Flow Definition',
          xaml: 'XAML Definition',
          statecode: 'State',
          statuscode: 'Status Reason',
          category: 'Category',
          type: 'Type',
          mode: 'Mode',
          scope: 'Scope',
          primaryentity: 'Primary Entity'
        }
      }],

      [ComponentType.PluginAssembly, {
        tableName: 'pluginassemblies',
        primaryKeyColumn: 'pluginassemblyid',
        displayNameColumn: 'name',
        comparableColumns: [
          'content',           // Assembly binary (Base64 encoded)
          'version',           // Assembly version string
          'publickeytoken',    // Strong name public key token
          'culture',           // Assembly culture
          'sourcetype',        // Source type (0=Database, 1=Disk, 2=GAC, 3=AzureWebApp)
          'isolationmode',     // Isolation mode (0=None, 1=Sandbox, 2=External)
          'description'        // Description
        ],
        columnDisplayNames: {
          content: 'Assembly Binary',
          version: 'Version',
          publickeytoken: 'Public Key Token',
          culture: 'Culture',
          sourcetype: 'Source Type',
          isolationmode: 'Isolation Mode',
          description: 'Description'
        }
      }],

      [ComponentType.PluginStep, {
        tableName: 'sdkmessageprocessingsteps',
        primaryKeyColumn: 'sdkmessageprocessingstepid',
        displayNameColumn: 'name',
        comparableColumns: [
          'configuration',          // Unsecure configuration string
          'stage',                  // Execution stage (10=PreValidation, 20=PreOperation, 40=PostOperation)
          'mode',                   // Execution mode (0=Sync, 1=Async)
          'rank',                   // Execution order within same stage/mode
          'filteringattributes',    // Comma-separated attribute list for filtering
          'statecode',              // Active/Inactive state
          'asyncautodelete',        // Auto-delete async job on success
          'supporteddeployment',    // Deployment type (0=ServerOnly, 1=Offline, 2=Both)
          'invocationsource'        // Invocation source (0=Internal, 1=Parent, -1=NA)
        ],
        columnDisplayNames: {
          configuration: 'Configuration',
          stage: 'Stage',
          mode: 'Execution Mode',
          rank: 'Execution Order',
          filteringattributes: 'Filtering Attributes',
          statecode: 'State',
          asyncautodelete: 'Auto Delete',
          supporteddeployment: 'Deployment',
          invocationsource: 'Invocation Source'
        }
      }],

      [ComponentType.WebResource, {
        tableName: 'webresourceset',
        primaryKeyColumn: 'webresourceid',
        displayNameColumn: 'displayname',
        comparableColumns: [
          'content',            // Web resource content (Base64 encoded)
          'webresourcetype',    // Type (1=HTML, 2=CSS, 3=JS, 4=XML, 5=PNG, 6=JPG, 7=GIF, 8=XAP, 9=XSL, 10=ICO, 11=SVG, 12=RESX)
          'description',        // Description
          'languagecode',       // Language code
          'isenabledformobileclient', // Mobile enabled
          'dependencyxml'       // Dependency XML
        ],
        columnDisplayNames: {
          content: 'Content',
          webresourcetype: 'Type',
          description: 'Description',
          languagecode: 'Language',
          isenabledformobileclient: 'Mobile Enabled',
          dependencyxml: 'Dependencies'
        }
      }],

      [ComponentType.EnvironmentVariable, {
        tableName: 'environmentvariabledefinitions',
        primaryKeyColumn: 'environmentvariabledefinitionid',
        // Use schemaname (primary name attribute) - displayname may be null
        displayNameColumn: 'schemaname',
        comparableColumns: [
          'defaultvalue',       // Default value
          'type',               // Type (100000000=String, 100000001=Number, 100000002=Boolean, 100000003=JSON, 100000004=DataSource)
          'displayname',        // Display name (localizable)
          'description',        // Description
          'ishidden',           // Is hidden
          'isrequired',         // Is required
          'hint'                // Input hint
        ],
        columnDisplayNames: {
          defaultvalue: 'Default Value',
          type: 'Type',
          displayname: 'Display Name',
          description: 'Description',
          ishidden: 'Is Hidden',
          isrequired: 'Is Required',
          hint: 'Input Hint'
        }
      }]
    ]);
  }
}
