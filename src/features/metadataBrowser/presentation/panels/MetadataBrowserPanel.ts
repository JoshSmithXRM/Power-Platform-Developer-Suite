import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { EnvironmentOption } from '../../../../shared/infrastructure/ui/DataTablePanel';
import { PanelCoordinator } from '../../../../shared/infrastructure/ui/coordinators/PanelCoordinator';
import { HtmlScaffoldingBehavior, type HtmlScaffoldingConfig } from '../../../../shared/infrastructure/ui/behaviors/HtmlScaffoldingBehavior';
import { SectionCompositionBehavior } from '../../../../shared/infrastructure/ui/behaviors/SectionCompositionBehavior';
import { ActionButtonsSection } from '../../../../shared/infrastructure/ui/sections/ActionButtonsSection';
import { EnvironmentSelectorSection } from '../../../../shared/infrastructure/ui/sections/EnvironmentSelectorSection';
import { PanelLayout } from '../../../../shared/infrastructure/ui/types/PanelLayout';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import { getNonce } from '../../../../shared/infrastructure/ui/utils/cspNonce';
import { resolveCssModules } from '../../../../shared/infrastructure/ui/utils/CssModuleResolver';
import { VSCodePanelStateRepository } from '../../../../shared/infrastructure/ui/VSCodePanelStateRepository';
import type { Environment } from '../../../environmentSetup/domain/entities/Environment';
import type { LoadMetadataTreeUseCase } from '../../application/useCases/LoadMetadataTreeUseCase';
import type { LoadEntityMetadataUseCase } from '../../application/useCases/LoadEntityMetadataUseCase';
import type { LoadChoiceMetadataUseCase } from '../../application/useCases/LoadChoiceMetadataUseCase';
import type { OpenInMakerUseCase } from '../../application/useCases/OpenInMakerUseCase';
import type { MetadataTab } from '../../application/viewModels/DetailPanelViewModel';
import type { IEntityMetadataRepository } from '../../domain/repositories/IEntityMetadataRepository';
import { MetadataBrowserLayoutSection } from '../sections/MetadataBrowserLayoutSection';
import { AttributeMetadataSerializer } from '../serializers/AttributeMetadataSerializer';
import type { AttributeMetadata } from '../../domain/entities/AttributeMetadata';
import { EnvironmentScopedPanel, type EnvironmentInfo } from '../../../../shared/infrastructure/ui/panels/EnvironmentScopedPanel';

/**
 * Commands supported by Metadata Browser panel.
 * Type-safe command registration with PanelCoordinator.
 */
type MetadataBrowserCommands =
	| 'refresh'
	| 'openMaker'
	| 'environmentChange'
	| 'selectEntity'
	| 'selectChoice'
	| 'navigateToEntity'
	| 'navigateToEntityQuickPick'
	| 'openDetailPanel'
	| 'closeDetailPanel'
	| 'tabChange'
	| 'saveDetailPanelWidth';

/**
 * Metadata Browser panel using PanelCoordinator architecture.
 * Extends EnvironmentScopedPanel for singleton pattern management.
 *
 * Features:
 * - Three-panel layout: Tree (left), Tables (center), Detail (right)
 * - Tab-based metadata views (Attributes, Keys, Relationships, Privileges, Choice Values)
 * - Resizable detail panel with state persistence
 * - Environment-scoped metadata exploration
 * - Integration with Power Apps Maker portal
 *
 * Architecture:
 * - Uses PanelCoordinator for type-safe command handling
 * - Sections define UI (no HTML in panel class)
 * - Data-driven updates via postMessage (no full HTML re-renders)
 * - Workspace state persistence for user preferences
 */
export class MetadataBrowserPanel extends EnvironmentScopedPanel<MetadataBrowserPanel> {
	public static readonly viewType = 'powerPlatformDevSuite.metadataBrowser';
	private static panels = new Map<string, MetadataBrowserPanel>();

	private readonly coordinator: PanelCoordinator<MetadataBrowserCommands>;
	private readonly scaffoldingBehavior: HtmlScaffoldingBehavior;
	private readonly stateRepository: VSCodePanelStateRepository;
	private readonly attributeMetadataSerializer: AttributeMetadataSerializer;

	// Current state
	private currentEnvironmentId: string;
	private currentSelectionType: 'entity' | 'choice' | null = null;
	private currentSelectionId: string | null = null;
	private currentTab: MetadataTab = 'attributes';
	private detailPanelWidth: number | null = null;

	private constructor(
		private readonly panel: vscode.WebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly context: vscode.ExtensionContext,
		private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
		private readonly getEnvironmentById: (envId: string) => Promise<Environment | null>,
		// Use cases (injected)
		private readonly loadMetadataTreeUseCase: LoadMetadataTreeUseCase,
		private readonly loadEntityMetadataUseCase: LoadEntityMetadataUseCase,
		private readonly loadChoiceMetadataUseCase: LoadChoiceMetadataUseCase,
		private readonly openInMakerUseCase: OpenInMakerUseCase,
		// Repository (for cache management)
		private readonly entityMetadataRepository: IEntityMetadataRepository,
		private readonly logger: ILogger,
		environmentId: string
	) {
		super();
		this.currentEnvironmentId = environmentId;
		this.stateRepository = new VSCodePanelStateRepository(
			context.workspaceState,
			logger
		);
		this.attributeMetadataSerializer = new AttributeMetadataSerializer();

		logger.debug('MetadataBrowserPanel: Initializing');

		// Configure webview
		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [extensionUri]
		};

		// Create coordinator with sections
		const result = this.createCoordinator();
		this.coordinator = result.coordinator;
		this.scaffoldingBehavior = result.scaffoldingBehavior;

		// Register command handlers
		this.registerCommandHandlers();

		// Load persisted state and initialize
		void this.initializeWithPersistedState();
	}

	/**
	 * Reveals the panel in the specified column.
	 * Required by EnvironmentScopedPanel base class.
	 */
	protected reveal(column: vscode.ViewColumn): void {
		this.panel.reveal(column);
	}

	/**
	 * Factory method implementing singleton pattern per environment.
	 * Each environment gets its own panel instance to maintain independent state.
	 */
	public static async createOrShow(
		extensionUri: vscode.Uri,
		context: vscode.ExtensionContext,
		getEnvironments: () => Promise<EnvironmentOption[]>,
		getEnvironmentById: (envId: string) => Promise<Environment | null>,
		useCases: {
			loadMetadataTreeUseCase: LoadMetadataTreeUseCase;
			loadEntityMetadataUseCase: LoadEntityMetadataUseCase;
			loadChoiceMetadataUseCase: LoadChoiceMetadataUseCase;
			openInMakerUseCase: OpenInMakerUseCase;
		},
		entityMetadataRepository: IEntityMetadataRepository,
		logger: ILogger,
		initialEnvironmentId?: string
	): Promise<MetadataBrowserPanel> {
		// Adapter: Convert Environment domain entity to EnvironmentInfo for base class
		const getEnvironmentInfoById = async (envId: string): Promise<EnvironmentInfo | null> => {
			const environment = await getEnvironmentById(envId);
			if (!environment) {
				return null;
			}
			const ppEnvId = environment.getPowerPlatformEnvironmentId();
			return {
				id: envId,
				name: environment.getName().getValue(),
				powerPlatformEnvironmentId: ppEnvId ?? envId
			};
		};

		return EnvironmentScopedPanel.createOrShowPanel({
			viewType: MetadataBrowserPanel.viewType,
			titlePrefix: 'Metadata',
			extensionUri,
			getEnvironments,
			getEnvironmentById: getEnvironmentInfoById,
			initialEnvironmentId,
			panelFactory: (panel, envId) => new MetadataBrowserPanel(
				panel,
				extensionUri,
				context,
				getEnvironments,
				getEnvironmentById,
				useCases.loadMetadataTreeUseCase,
				useCases.loadEntityMetadataUseCase,
				useCases.loadChoiceMetadataUseCase,
				useCases.openInMakerUseCase,
				entityMetadataRepository,
				logger,
				envId
			),
			webviewOptions: {
				enableScripts: true,
				retainContextWhenHidden: true,
				enableFindWidget: true
			}
			// Note: No onDispose callback needed - this panel has no timers, intervals,
			// or external resources requiring cleanup. Panel state is automatically
			// persisted via IPanelStateRepository and removed from panels map on disposal.
		}, MetadataBrowserPanel.panels);
	}

	/**
	 * Creates PanelCoordinator with section composition.
	 * Sections are composed into SingleColumn layout (tree + tables + detail).
	 */
	private createCoordinator(): {
		coordinator: PanelCoordinator<MetadataBrowserCommands>;
		scaffoldingBehavior: HtmlScaffoldingBehavior;
	} {
		// Define sections (UI components)
		const sections = [
			// Toolbar buttons
			new ActionButtonsSection({
				buttons: [
					{ id: 'openMaker', label: 'Open in Maker' },
					{ id: 'refresh', label: 'Refresh', disabled: true }
				]
			}, SectionPosition.Toolbar),

			// Environment selector
			new EnvironmentSelectorSection(),

			// Custom section for three-panel layout (tree, tabs, detail)
			new MetadataBrowserLayoutSection()
		];

		// Compose sections into layout
		const compositionBehavior = new SectionCompositionBehavior(
			sections,
			PanelLayout.SingleColumn
		);

		// Resolve CSS modules
		const cssUris = resolveCssModules(
			{
				base: true,
				components: ['buttons', 'inputs'],
				sections: ['environment-selector', 'action-buttons', 'datatable']
			},
			this.extensionUri,
			this.panel.webview
		);

		// Add feature-specific CSS
		const featureCssUri = this.panel.webview.asWebviewUri(
			vscode.Uri.joinPath(
				this.extensionUri,
				'resources',
				'webview',
				'css',
				'features',
				'metadata-browser.css'
			)
		).toString();

		// Create scaffolding behavior (wraps in HTML document)
		const scaffoldingConfig: HtmlScaffoldingConfig = {
			cssUris: [...cssUris, featureCssUri],
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
					vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'MetadataBrowserBehavior.js')
				).toString()
			],
			cspNonce: getNonce(),
			title: 'Metadata Browser'
		};

		const scaffoldingBehavior = new HtmlScaffoldingBehavior(
			this.panel.webview,
			compositionBehavior,
			scaffoldingConfig
		);

		// Create coordinator
		const coordinator = new PanelCoordinator<MetadataBrowserCommands>({
			panel: this.panel,
			extensionUri: this.extensionUri,
			behaviors: [scaffoldingBehavior],
			logger: this.logger
		});

		return { coordinator, scaffoldingBehavior };
	}

	/**
	 * Registers type-safe command handlers.
	 * PanelCoordinator automatically manages button loading states.
	 */
	private registerCommandHandlers(): void {
		// Refresh current selection
		this.coordinator.registerHandler('refresh', async () => {
			await this.handleRefresh();
		});

		// Open in Maker portal
		this.coordinator.registerHandler('openMaker', async () => {
			await this.handleOpenMaker();
		});

		// Environment change
		this.coordinator.registerHandler('environmentChange', async (data) => {
			const environmentId = (data as { environmentId?: string })?.environmentId;
			if (environmentId) {
				await this.handleEnvironmentChange(environmentId);
			}
		});

		// Entity selection
		this.coordinator.registerHandler('selectEntity', async (data) => {
			const logicalName = (data as { logicalName?: string })?.logicalName;
			if (logicalName) {
				await this.handleSelectEntity(logicalName);
			}
		});

		// Choice selection
		this.coordinator.registerHandler('selectChoice', async (data) => {
			const name = (data as { name?: string })?.name;
			if (name) {
				await this.handleSelectChoice(name);
			}
		});

		// Navigate to related entity (from relationship link)
		this.coordinator.registerHandler('navigateToEntity', async (data) => {
			const logicalName = (data as { logicalName?: string })?.logicalName;
			if (logicalName) {
				await this.handleNavigateToEntity(logicalName);
			}
		}, { disableOnExecute: false });

		// Navigate to entity via quick pick (N:N relationships)
		this.coordinator.registerHandler('navigateToEntityQuickPick', async (data) => {
			const options = (data as { entities?: string[] })?.entities;
			if (options && options.length > 0) {
				await this.handleNavigateToEntityQuickPick(options);
			}
		}, { disableOnExecute: false });

		// Open detail panel
		this.coordinator.registerHandler('openDetailPanel', async (data) => {
			const payload = data as {
				tab: MetadataTab;
				itemId: string;
				metadata: unknown;
			};
			await this.handleOpenDetailPanel(payload.tab, payload.itemId, payload.metadata);
		}, { disableOnExecute: false });

		// Close detail panel
		this.coordinator.registerHandler('closeDetailPanel', async () => {
			await this.handleCloseDetailPanel();
		}, { disableOnExecute: false });

		// Tab change (persist state)
		this.coordinator.registerHandler('tabChange', async (data) => {
			if (typeof data === 'object' && data !== null && 'tab' in data) {
				const typedData = data as { tab?: string };
				const tab = typedData.tab;
				if (tab && this.isValidMetadataTab(tab)) {
					this.currentTab = tab;
					await this.persistState();
				}
			}
		}, { disableOnExecute: false });

		// Save detail panel width
		this.coordinator.registerHandler('saveDetailPanelWidth', async (data) => {
			const width = (data as { width?: number })?.width;
			if (width !== undefined) {
				await this.handleSaveDetailPanelWidth(width);
			}
		}, { disableOnExecute: false });
	}

	/**
	 * Initializes panel with persisted state from workspace.
	 * Restores: selected tab, selected entity/choice, to prevent blank panel on reload.
	 */
	private async initializeWithPersistedState(): Promise<void> {
		this.logger.debug('Loading persisted panel state');

		// Load persisted state
		const state = await this.stateRepository.load({
			panelType: MetadataBrowserPanel.viewType,
			environmentId: this.currentEnvironmentId
		});

		// Restore state from filterCriteria
		let restoredItemType: 'entity' | 'choice' | null = null;
		let restoredItemId: string | null = null;

		if (state && typeof state === 'object' && 'filterCriteria' in state) {
			const filterCriteria = state.filterCriteria as {
				selectedTab?: string;
				selectedItemType?: 'entity' | 'choice' | null;
				selectedItemId?: string | null;
			};

			// Restore selected tab
			const selectedTab = filterCriteria?.selectedTab;
			if (typeof selectedTab === 'string' && this.isValidMetadataTab(selectedTab)) {
				this.currentTab = selectedTab;
			}

			// Restore selected item (to reload after tree loads)
			if (filterCriteria?.selectedItemType && filterCriteria?.selectedItemId) {
				restoredItemType = filterCriteria.selectedItemType;
				restoredItemId = filterCriteria.selectedItemId;
			}
		}

		// Load detail panel width if persisted
		if (state?.detailPanelWidth && typeof state.detailPanelWidth === 'number') {
			this.detailPanelWidth = state.detailPanelWidth;
			this.logger.info('Detail panel width loaded from storage', { width: state.detailPanelWidth });
		}

		// Load environments first
		const environments = await this.getEnvironments();

		// Initialize coordinator with environments and tree data
		await this.scaffoldingBehavior.refresh({
			environments,
			currentEnvironmentId: this.currentEnvironmentId
		});

		// Load tree data
		await this.handleLoadTree();

		// Send detail panel width to webview if it was persisted
		if (this.detailPanelWidth) {
			await this.panel.webview.postMessage({
				command: 'restoreDetailPanelWidth',
				data: { width: this.detailPanelWidth }
			});
		}

		// Restore previous selection if it existed
		if (restoredItemType && restoredItemId) {
			this.logger.debug('Restoring previous selection', {
				type: restoredItemType,
				id: restoredItemId
			});

			if (restoredItemType === 'entity') {
				await this.handleSelectEntity(restoredItemId);
			} else if (restoredItemType === 'choice') {
				await this.handleSelectChoice(restoredItemId);
			}
		}
	}

	/**
	 * Loads entity and choice tree.
	 */
	private async handleLoadTree(): Promise<void> {
		this.logger.debug('Loading metadata tree');

		try {
			const result = await this.loadMetadataTreeUseCase.execute(
				this.currentEnvironmentId
			);

			await this.panel.webview.postMessage({
				command: 'populateTree',
				data: {
					entities: result.entities,
					choices: result.choices
				}
			});

			this.logger.info('Metadata tree loaded', {
				entityCount: result.entities.length,
				choiceCount: result.choices.length
			});
		} catch (error) {
			this.logger.error('Failed to load metadata tree', error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Failed to load metadata tree: ${errorMessage}`);
		}
	}

	/**
	 * Handles entity selection from tree.
	 * Loads all entity metadata and displays in tabs.
	 */
	private async handleSelectEntity(logicalName: string): Promise<void> {
		this.logger.debug('Selecting entity', { logicalName });

		this.currentSelectionType = 'entity';
		this.currentSelectionId = logicalName;
		this.currentTab = 'attributes';

		// Enable refresh button
		this.setButtonState('refresh', false);

		try {
			const result = await this.loadEntityMetadataUseCase.execute(
				this.currentEnvironmentId,
				logicalName
			);

			// Send all tab data to client
			const postData = {
				command: 'setEntityMode',
				data: {
					entity: result.entity,
					attributes: result.attributes,
					keys: result.keys,
					oneToManyRelationships: result.oneToManyRelationships,
					manyToOneRelationships: result.manyToOneRelationships,
					manyToManyRelationships: result.manyToManyRelationships,
					privileges: result.privileges,
					selectedTab: this.currentTab as string
				}
			};
			await this.panel.webview.postMessage(postData);

			this.logger.info('Entity metadata loaded', { logicalName });
			await this.persistState();
		} catch (error) {
			this.logger.error('Failed to load entity metadata', error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Failed to load entity metadata: ${errorMessage}`);
		}
	}

	/**
	 * Handles choice selection from tree.
	 * Loads choice metadata and displays choice values.
	 */
	private async handleSelectChoice(name: string): Promise<void> {
		this.logger.debug('Selecting choice', { name });

		this.currentSelectionType = 'choice';
		this.currentSelectionId = name;

		// Enable refresh button
		this.setButtonState('refresh', false);

		try {
			const result = await this.loadChoiceMetadataUseCase.execute(
				this.currentEnvironmentId,
				name
			);

			// Send choice data to client
			await this.panel.webview.postMessage({
				command: 'setChoiceMode',
				data: {
					choice: result.choice,
					choiceValues: result.choiceValues
				}
			});

			this.logger.info('Choice metadata loaded', { name });
			await this.persistState();
		} catch (error) {
			this.logger.error('Failed to load choice metadata', error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Failed to load choice metadata: ${errorMessage}`);
		}
	}

	/**
	 * Handles navigation to related entity via relationship link.
	 * Switches to Attributes tab by default.
	 */
	private async handleNavigateToEntity(logicalName: string): Promise<void> {
		this.logger.debug('Navigating to entity', { logicalName });
		this.currentTab = 'attributes';
		await this.handleSelectEntity(logicalName);
	}

	/**
	 * Handles navigation via quick pick (N:N relationships).
	 * Shows VS Code quick pick with two entity options.
	 */
	private async handleNavigateToEntityQuickPick(entities: string[]): Promise<void> {
		const selected = await vscode.window.showQuickPick(entities, {
			placeHolder: 'Select which entity to open'
		});

		if (selected) {
			await this.handleNavigateToEntity(selected);
		}
	}

	/**
	 * Opens detail panel with metadata for selected item.
	 */
	private async handleOpenDetailPanel(
		tab: MetadataTab,
		itemId: string,
		metadata: unknown
	): Promise<void> {
		this.logger.debug('Opening detail panel', { tab: tab as string, itemId });

		// Serialize to raw API format if it's an AttributeMetadata entity
		let rawEntity: Record<string, unknown> | null = null;
		if (this.isAttributeMetadata(metadata)) {
			rawEntity = this.attributeMetadataSerializer.serializeToRaw(metadata);
		}

		const postData = {
			command: 'showDetailPanel',
			data: {
				tab: tab as string,
				itemId,
				metadata,
				rawEntity
			}
		};
		await this.panel.webview.postMessage(postData);

		// Restore persisted width (deferred application after panel shown)
		if (this.detailPanelWidth !== null) {
			await this.panel.webview.postMessage({
				command: 'restoreDetailPanelWidth',
				data: { width: this.detailPanelWidth }
			});
		}

		await this.persistState();
	}

	/**
	 * Closes detail panel.
	 */
	private async handleCloseDetailPanel(): Promise<void> {
		this.logger.debug('Closing detail panel');

		await this.panel.webview.postMessage({
			command: 'hideDetailPanel'
		});

		await this.persistState();
	}

	/**
	 * Refreshes current selection (entity or choice).
	 */
	private async handleRefresh(): Promise<void> {
		this.logger.debug('Refreshing current selection');

		// Show loading state
		this.setButtonLoading('refresh', true);
		await this.panel.webview.postMessage({ command: 'showDetailLoading' });

		try {
			// Clear cache to force fresh data
			this.entityMetadataRepository.clearCache();

			if (this.currentSelectionType === 'entity' && this.currentSelectionId) {
				await this.handleSelectEntity(this.currentSelectionId);
			} else if (this.currentSelectionType === 'choice' && this.currentSelectionId) {
				await this.handleSelectChoice(this.currentSelectionId);
			}
		} finally {
			this.setButtonLoading('refresh', false);
		}
	}

	/**
	 * Opens current selection in Maker portal.
	 */
	private async handleOpenMaker(): Promise<void> {
		try {
			await this.openInMakerUseCase.execute(this.currentEnvironmentId);
			this.logger.info('Opened in Maker portal');
		} catch (error) {
			this.logger.error('Failed to open in Maker', error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Failed to open in Maker: ${errorMessage}`);
		}
	}

	/**
	 * Handles environment change.
	 * Clears current selection, cache, and reloads tree.
	 */
	private async handleEnvironmentChange(environmentId: string): Promise<void> {
		this.logger.debug('Environment changed', { environmentId });

		// Show loading spinner on refresh button
		this.setButtonLoading('refresh', true);

		try {
			const oldEnvironmentId = this.currentEnvironmentId;
			this.currentEnvironmentId = environmentId;

			// Reregister panel with new environment in singleton map
			this.reregisterPanel(MetadataBrowserPanel.panels, oldEnvironmentId, this.currentEnvironmentId);

			this.currentSelectionType = null;
			this.currentSelectionId = null;
			this.currentTab = 'attributes';

			// Clear cache when switching environments
			this.entityMetadataRepository.clearCache();

			// Update panel title
			const environment = await this.getEnvironmentById(environmentId);
			if (environment) {
				this.panel.title = `Metadata - ${environment.getName().getValue()}`;
			}

			// Clear tables
			await this.panel.webview.postMessage({
				command: 'clearSelection'
			});

			// Reload tree
			await this.handleLoadTree();
		} finally {
			// Disable refresh button (no selection) and stop spinner
			this.setButtonState('refresh', true);
		}
	}

	/**
	 * Persists panel state to workspace storage.
	 * Saves: selected tab, selected entity/choice, detail panel width to restore on reload.
	 */
	private async persistState(): Promise<void> {
		// Metadata browser uses custom state stored in filterCriteria
		await this.stateRepository.save(
			{
				panelType: MetadataBrowserPanel.viewType,
				environmentId: this.currentEnvironmentId
			},
			{
				selectedSolutionId: '', // Not used by metadata browser
				lastUpdated: new Date().toISOString(),
				filterCriteria: {
					selectedTab: this.currentTab,
					selectedItemType: this.currentSelectionType,
					selectedItemId: this.currentSelectionId
				},
				...(this.detailPanelWidth !== null && { detailPanelWidth: this.detailPanelWidth })
			}
		);
	}

	/**
	 * Save detail panel width preference to persistent storage.
	 */
	private async handleSaveDetailPanelWidth(width: number): Promise<void> {
		try {
			this.detailPanelWidth = width;
			await this.persistState();
			this.logger.debug('Saved detail panel width', { width });
		} catch (error) {
			this.logger.error('Error saving detail panel width', error);
		}
	}

	/**
	 * Sets button state (enabled/disabled).
	 */
	private setButtonState(buttonId: string, disabled: boolean): void {
		this.panel.webview.postMessage({
			command: 'setButtonState',
			buttonId,
			disabled,
			showSpinner: false
		});
	}

	/**
	 * Sets button loading state with spinner.
	 */
	private setButtonLoading(buttonId: string, isLoading: boolean): void {
		this.panel.webview.postMessage({
			command: 'setButtonState',
			buttonId,
			disabled: isLoading,
			showSpinner: isLoading
		});
	}

	/**
	 * Type guard to validate MetadataTab string values.
	 */
	private isValidMetadataTab(value: string): value is MetadataTab {
		const validTabs: readonly string[] = ['attributes', 'keys', 'relationships', 'privileges', 'choiceValues'];
		return validTabs.includes(value);
	}

	/**
	 * Type guard to check if metadata is AttributeMetadata entity.
	 */
	private isAttributeMetadata(metadata: unknown): metadata is AttributeMetadata {
		return (
			typeof metadata === 'object' &&
			metadata !== null &&
			'logicalName' in metadata &&
			'schemaName' in metadata &&
			'attributeType' in metadata &&
			'metadataId' in metadata
		);
	}
}
