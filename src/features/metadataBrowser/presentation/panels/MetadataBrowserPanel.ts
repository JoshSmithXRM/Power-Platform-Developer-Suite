import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';
import type { DataTableConfig, EnvironmentOption } from '../../../../shared/infrastructure/ui/DataTablePanel';
import { PanelCoordinator } from '../../../../shared/infrastructure/ui/coordinators/PanelCoordinator';
import { HtmlScaffoldingBehavior, type HtmlScaffoldingConfig } from '../../../../shared/infrastructure/ui/behaviors/HtmlScaffoldingBehavior';
import { SectionCompositionBehavior } from '../../../../shared/infrastructure/ui/behaviors/SectionCompositionBehavior';
import { ActionButtonsSection } from '../../../../shared/infrastructure/ui/sections/ActionButtonsSection';
import { EnvironmentSelectorSection } from '../../../../shared/infrastructure/ui/sections/EnvironmentSelectorSection';
import { DataTableSection } from '../../../../shared/infrastructure/ui/sections/DataTableSection';
import { PanelLayout } from '../../../../shared/infrastructure/ui/types/PanelLayout';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import { getNonce } from '../../../../shared/infrastructure/ui/utils/cspNonce';
import { resolveCssModules } from '../../../../shared/infrastructure/ui/utils/CssModuleResolver';
import type { LoadEntityTreeUseCase } from '../../application/useCases/LoadEntityTreeUseCase';
import type { LoadEntityAttributesUseCase } from '../../application/useCases/LoadEntityAttributesUseCase';
import type { EntityTreeItemViewModel } from '../../application/viewModels/EntityTreeItemViewModel';
import type { EntityAttributeViewModel } from '../../application/viewModels/EntityAttributeViewModel';
import { MetadataAttributesDetailSection } from '../sections/MetadataAttributesDetailSection';

/**
 * Commands supported by Metadata Browser panel.
 */
type MetadataBrowserCommands =
    | 'refresh'
    | 'environmentChange'
    | 'selectEntity';

/**
 * Metadata Browser panel using PanelCoordinator architecture.
 * MVP: Entity tree navigation + Attributes table.
 * Uses data-driven pattern: static structure, dynamic data via postMessage.
 */
export class MetadataBrowserPanel {
    public static readonly viewType = 'powerPlatformDevSuite.metadataBrowser';
    private static panels = new Map<string, MetadataBrowserPanel>();

    private readonly coordinator: PanelCoordinator<MetadataBrowserCommands>;
    private readonly scaffoldingBehavior: HtmlScaffoldingBehavior;
    private currentEnvironmentId: string;
    private entities: readonly EntityTreeItemViewModel[] = [];
    private selectedEntityLogicalName: string | null = null;
    private attributes: readonly EntityAttributeViewModel[] = [];

    private constructor(
        private readonly panel: vscode.WebviewPanel,
        private readonly extensionUri: vscode.Uri,
        private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
        private readonly loadEntityTreeUseCase: LoadEntityTreeUseCase,
        private readonly loadEntityAttributesUseCase: LoadEntityAttributesUseCase,
        private readonly logger: ILogger,
        environmentId: string
    ) {
        this.currentEnvironmentId = environmentId;
        logger.debug('MetadataBrowserPanel: Initialized');

        panel.webview.options = {
            enableScripts: true,
            localResourceRoots: [extensionUri]
        };

        const result = this.createCoordinator();
        this.coordinator = result.coordinator;
        this.scaffoldingBehavior = result.scaffoldingBehavior;

        this.registerCommandHandlers();

        void this.initializeAndLoadData();
    }

    public static async createOrShow(
        extensionUri: vscode.Uri,
        getEnvironments: () => Promise<EnvironmentOption[]>,
        loadEntityTreeUseCase: LoadEntityTreeUseCase,
        loadEntityAttributesUseCase: LoadEntityAttributesUseCase,
        logger: ILogger,
        initialEnvironmentId?: string
    ): Promise<MetadataBrowserPanel> {
        const column = vscode.ViewColumn.One;

        let targetEnvironmentId = initialEnvironmentId;
        if (!targetEnvironmentId) {
            const environments = await getEnvironments();
            targetEnvironmentId = environments[0]?.id;
        }

        if (!targetEnvironmentId) {
            throw new Error('No environments available');
        }

        const existing = this.panels.get(targetEnvironmentId);
        if (existing) {
            existing.panel.reveal(column);
            return existing;
        }

        const panel = vscode.window.createWebviewPanel(
            MetadataBrowserPanel.viewType,
            'Metadata Browser',
            column,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri],
                retainContextWhenHidden: true
            }
        );

        const metadataBrowserPanel = new MetadataBrowserPanel(
            panel,
            extensionUri,
            getEnvironments,
            loadEntityTreeUseCase,
            loadEntityAttributesUseCase,
            logger,
            targetEnvironmentId
        );

        this.panels.set(targetEnvironmentId, metadataBrowserPanel);

        const envId = targetEnvironmentId; // Capture for closure
        panel.onDidDispose(() => {
            this.panels.delete(envId);
        });

        return metadataBrowserPanel;
    }

    private createCoordinator(): {
        coordinator: PanelCoordinator<MetadataBrowserCommands>;
        scaffoldingBehavior: HtmlScaffoldingBehavior;
    } {
        const config = this.getTableConfig();

        const environmentSelector = new EnvironmentSelectorSection();
        const entityTableSection = new DataTableSection(config);
        const attributesSection = new MetadataAttributesDetailSection();

        const actionButtons = new ActionButtonsSection(
            {
                buttons: [{ id: 'refresh', label: 'Refresh' }]
            },
            SectionPosition.Toolbar
        );

        // Compose sections ONCE (static layout)
        const compositionBehavior = new SectionCompositionBehavior(
            [actionButtons, environmentSelector, entityTableSection, attributesSection],
            PanelLayout.SplitHorizontal
        );

        const cssUris = resolveCssModules(
            {
                base: true,
                components: ['buttons', 'inputs', 'split-panel'],
                sections: ['environment-selector', 'action-buttons', 'datatable']
            },
            this.extensionUri,
            this.panel.webview
        );

        const scaffoldingConfig: HtmlScaffoldingConfig = {
            title: 'Metadata Browser',
            cspNonce: getNonce(),
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
                    vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'MetadataBrowserBehavior.js')
                ).toString()
            ]
        };

        const scaffoldingBehavior = new HtmlScaffoldingBehavior(
            this.panel.webview,
            compositionBehavior,
            scaffoldingConfig
        );

        const coordinator = new PanelCoordinator<MetadataBrowserCommands>({
            panel: this.panel,
            extensionUri: this.extensionUri,
            behaviors: [scaffoldingBehavior],
            logger: this.logger
        });

        return { coordinator, scaffoldingBehavior };
    }

    private getTableConfig(): DataTableConfig {
        return {
            viewType: MetadataBrowserPanel.viewType,
            title: 'Entities',
            dataCommand: 'entityData',
            defaultSortColumn: 'displayName',
            defaultSortDirection: 'asc',
            columns: [
                { key: 'displayName', label: 'Display Name' },
                { key: 'logicalName', label: 'Logical Name' },
                { key: 'schemaName', label: 'Schema Name' },
                { key: 'attributeCount', label: 'Attributes' }
            ],
            searchPlaceholder: '🔍 Search entities...',
            noDataMessage: 'No entities found.',
            toolbarButtons: []
        };
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

        this.coordinator.registerHandler('selectEntity', async (data) => {
            const logicalName = (data as { logicalName?: string })?.logicalName;
            if (logicalName) {
                await this.handleSelectEntity(logicalName);
            }
        });
    }

    private async initializeAndLoadData(): Promise<void> {
        // Load environments first
        const environments = await this.getEnvironments();

        // Initial refresh with empty data (scaffolding behavior will render the HTML structure)
        await this.scaffoldingBehavior.refresh({
            environments,
            currentEnvironmentId: this.currentEnvironmentId,
            tableData: []
        });

        // Load and update entity data
        await this.handleRefresh();
    }

    private async handleRefresh(): Promise<void> {
        this.selectedEntityLogicalName = null;
        this.attributes = [];
        await this.loadEntities();
        await this.updateEntityTable();
        await this.updateAttributesTable();
    }

    private async handleEnvironmentChange(environmentId: string): Promise<void> {
        this.currentEnvironmentId = environmentId;
        this.selectedEntityLogicalName = null;
        this.attributes = [];
        await this.loadEntities();
        await this.updateEntityTable();
        await this.updateAttributesTable();
    }

    private async handleSelectEntity(logicalName: string): Promise<void> {
        try {
            this.logger.info('Loading attributes for entity', { logicalName });
            this.selectedEntityLogicalName = logicalName;
            this.attributes = await this.loadEntityAttributesUseCase.execute(this.currentEnvironmentId, logicalName);
            this.logger.info('Loaded attributes', { count: this.attributes.length });

            // Data-driven update: send ViewModels to frontend
            await this.updateAttributesTable();
        } catch (error) {
            const normalizedError = normalizeError(error);
            this.logger.error('Failed to load attributes', normalizedError);
            void vscode.window.showErrorMessage(`Failed to load attributes: ${normalizedError.message}`);
        }
    }

    private async loadEntities(): Promise<void> {
        try {
            this.logger.info('Loading entity tree', { environmentId: this.currentEnvironmentId });
            this.entities = await this.loadEntityTreeUseCase.execute(this.currentEnvironmentId);
            this.logger.info('Loaded entities', { count: this.entities.length });
        } catch (error) {
            const normalizedError = normalizeError(error);
            this.logger.error('Failed to load entities', normalizedError);
            void vscode.window.showErrorMessage(`Failed to load entities: ${normalizedError.message}`);
        }
    }

    private async updateEntityTable(): Promise<void> {
        const environments = await this.getEnvironments();

        // Use scaffoldingBehavior.refresh() to update table data (data-driven)
        await this.scaffoldingBehavior.refresh({
            tableData: [...this.entities],
            environments,
            currentEnvironmentId: this.currentEnvironmentId
        });
    }

    private async updateAttributesTable(): Promise<void> {
        // Data-driven update: send attribute data to frontend via postMessage
        await this.panel.webview.postMessage({
            command: 'updateAttributesTable',
            data: {
                attributes: this.attributes
            }
        });
    }
}
