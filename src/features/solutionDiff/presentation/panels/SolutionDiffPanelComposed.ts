import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { EnvironmentOption } from '../../../../shared/infrastructure/ui/DataTablePanel';
import { PanelCoordinator } from '../../../../shared/infrastructure/ui/coordinators/PanelCoordinator';
import { HtmlScaffoldingBehavior, type HtmlScaffoldingConfig } from '../../../../shared/infrastructure/ui/behaviors/HtmlScaffoldingBehavior';
import { SectionCompositionBehavior } from '../../../../shared/infrastructure/ui/behaviors/SectionCompositionBehavior';
import { ActionButtonsSection } from '../../../../shared/infrastructure/ui/sections/ActionButtonsSection';
import { PanelLayout } from '../../../../shared/infrastructure/ui/types/PanelLayout';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import { getNonce } from '../../../../shared/infrastructure/ui/utils/cspNonce';
import { resolveCssModules } from '../../../../shared/infrastructure/ui/utils/CssModuleResolver';
import { SafeWebviewPanel } from '../../../../shared/infrastructure/ui/panels/SafeWebviewPanel';
import { LoadingStateBehavior } from '../../../../shared/infrastructure/ui/behaviors/LoadingStateBehavior';
import type { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import type { ISolutionRepository } from '../../../solutionExplorer/domain/interfaces/ISolutionRepository';
import type { ISolutionComponentRepository } from '../../../../shared/domain/interfaces/ISolutionComponentRepository';
import { CompareSolutionMetadataUseCase } from '../../application/useCases/CompareSolutionMetadataUseCase';
import { CompareSolutionComponentsUseCase } from '../../application/useCases/CompareSolutionComponentsUseCase';
import { SolutionComparisonViewModelMapper } from '../../application/mappers/SolutionComparisonViewModelMapper';
import { ComponentDiffViewModelMapper } from '../../application/mappers/ComponentDiffViewModelMapper';
import type { SolutionComparisonViewModel, SolutionOptionViewModel } from '../../application/viewModels/SolutionComparisonViewModel';
import type { ComponentDiffViewModel } from '../../application/viewModels/ComponentDiffViewModel';
import { ComponentTypeRegistry } from '../../domain/services/ComponentTypeRegistry';
import { ComponentDataFetcher } from '../../infrastructure/services/ComponentDataFetcher';
import { DualEnvironmentSelectorSection } from '../sections/DualEnvironmentSelectorSection';
import { SolutionComparisonSection } from '../sections/SolutionComparisonSection';

/**
 * Commands supported by Solution Diff panel.
 */
type SolutionDiffCommands =
  | 'refresh'
  | 'sourceEnvironmentChange'
  | 'targetEnvironmentChange'
  | 'solutionSelect';

/**
 * Panel for comparing solutions between two Power Platform environments.
 *
 * NEW PATTERN: Dual-environment panel (source + target environments).
 * This is the FIRST dual-environment feature in the codebase.
 *
 * Key differences from EnvironmentScopedPanel:
 * - Manages TWO environments (source + target)
 * - Singleton (only one diff panel at a time, not per-environment)
 * - Loads solutions from source environment for selection
 */
export class SolutionDiffPanelComposed {
  public static readonly viewType = 'powerPlatformDevSuite.solutionDiff';
  private static currentPanel: SolutionDiffPanelComposed | undefined;

  private readonly coordinator: PanelCoordinator<SolutionDiffCommands>;
  private readonly scaffoldingBehavior: HtmlScaffoldingBehavior;
  private readonly loadingBehavior: LoadingStateBehavior;
  private readonly compareUseCase: CompareSolutionMetadataUseCase;
  private readonly compareComponentsUseCase: CompareSolutionComponentsUseCase;
  private readonly componentDiffMapper: ComponentDiffViewModelMapper;

  // Dual environment state
  private sourceEnvironmentId: string | undefined;
  private targetEnvironmentId: string | undefined;
  private selectedSolutionUniqueName: string | null = null;
  private solutions: SolutionOptionViewModel[] = [];
  private comparisonViewModel: SolutionComparisonViewModel | null = null;
  private componentDiffViewModel: ComponentDiffViewModel | null = null;

  private constructor(
    private readonly panel: SafeWebviewPanel,
    private readonly extensionUri: vscode.Uri,
    private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
    private readonly solutionRepository: ISolutionRepository,
    private readonly componentRepository: ISolutionComponentRepository,
    private readonly apiService: IDataverseApiService,
    private readonly logger: ILogger,
    sourceEnvironmentId?: string,
    targetEnvironmentId?: string
  ) {
    this.sourceEnvironmentId = sourceEnvironmentId;
    this.targetEnvironmentId = targetEnvironmentId;

    // Create services and use cases
    const componentTypeRegistry = new ComponentTypeRegistry();
    const componentDataFetcher = new ComponentDataFetcher(apiService, componentTypeRegistry, logger);
    this.componentDiffMapper = new ComponentDiffViewModelMapper(componentTypeRegistry);
    this.compareUseCase = new CompareSolutionMetadataUseCase(solutionRepository, logger);
    this.compareComponentsUseCase = new CompareSolutionComponentsUseCase(
      componentRepository,
      componentDataFetcher,
      logger
    );

    // Configure webview
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [extensionUri]
    };

    const result = this.createCoordinator();
    this.coordinator = result.coordinator;
    this.scaffoldingBehavior = result.scaffoldingBehavior;

    // Initialize loading behavior
    this.loadingBehavior = new LoadingStateBehavior(
      panel,
      LoadingStateBehavior.createButtonConfigs(['refresh']),
      logger
    );

    this.registerCommandHandlers();

    void this.initializeAndLoadData();
  }

  /**
   * Factory method: Creates or shows the Solution Diff panel.
   */
  public static async createOrShow(
    extensionUri: vscode.Uri,
    getEnvironments: () => Promise<EnvironmentOption[]>,
    solutionRepository: ISolutionRepository,
    componentRepository: ISolutionComponentRepository,
    apiService: IDataverseApiService,
    logger: ILogger,
    sourceEnvironmentId?: string,
    targetEnvironmentId?: string
  ): Promise<SolutionDiffPanelComposed> {
    // Singleton pattern - only one diff panel at a time
    if (SolutionDiffPanelComposed.currentPanel !== undefined) {
      SolutionDiffPanelComposed.currentPanel.panel.reveal(vscode.ViewColumn.One);
      return SolutionDiffPanelComposed.currentPanel;
    }

    const rawPanel = vscode.window.createWebviewPanel(
      SolutionDiffPanelComposed.viewType,
      'Solution Diff',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri]
      }
    );

    const safePanel = new SafeWebviewPanel(rawPanel);

    const newPanel = new SolutionDiffPanelComposed(
      safePanel,
      extensionUri,
      getEnvironments,
      solutionRepository,
      componentRepository,
      apiService,
      logger,
      sourceEnvironmentId,
      targetEnvironmentId
    );

    SolutionDiffPanelComposed.currentPanel = newPanel;

    safePanel.onDidDispose(() => {
      SolutionDiffPanelComposed.currentPanel = undefined;
    });

    return newPanel;
  }

  private createCoordinator(): {
    coordinator: PanelCoordinator<SolutionDiffCommands>;
    scaffoldingBehavior: HtmlScaffoldingBehavior;
  } {
    const dualEnvSelector = new DualEnvironmentSelectorSection();
    const comparisonSection = new SolutionComparisonSection();
    const actionButtons = new ActionButtonsSection({
      buttons: [
        { id: 'refresh', label: 'Compare', disabled: true }
      ]
    }, SectionPosition.Toolbar);

    const compositionBehavior = new SectionCompositionBehavior(
      [actionButtons, dualEnvSelector, comparisonSection],
      PanelLayout.SingleColumn
    );

    const cssUris = resolveCssModules(
      {
        base: true,
        components: ['buttons', 'inputs'],
        sections: ['environment-selector', 'action-buttons']
      },
      this.extensionUri,
      this.panel.webview
    );

    // Add feature-specific CSS
    const featureCssUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'css', 'features', 'solution-diff.css')
    ).toString();

    const scaffoldingConfig: HtmlScaffoldingConfig = {
      cssUris: [...cssUris, featureCssUri],
      jsUris: [
        this.panel.webview.asWebviewUri(
          vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'messaging.js')
        ).toString(),
        this.panel.webview.asWebviewUri(
          vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'behaviors', 'SolutionDiffBehavior.js')
        ).toString()
      ],
      cspNonce: getNonce(),
      title: 'Solution Diff'
    };

    const scaffoldingBehavior = new HtmlScaffoldingBehavior(
      this.panel,
      compositionBehavior,
      scaffoldingConfig
    );

    const coordinator = new PanelCoordinator<SolutionDiffCommands>({
      panel: this.panel,
      extensionUri: this.extensionUri,
      behaviors: [scaffoldingBehavior],
      logger: this.logger
    });

    return { coordinator, scaffoldingBehavior };
  }

  private registerCommandHandlers(): void {
    this.coordinator.registerHandler('refresh', async () => {
      await this.handleCompare();
    });

    this.coordinator.registerHandler('sourceEnvironmentChange', async (data) => {
      const environmentId = (data as { environmentId?: string })?.environmentId;
      if (environmentId !== undefined) {
        await this.handleSourceEnvironmentChange(environmentId);
      }
    });

    this.coordinator.registerHandler('targetEnvironmentChange', async (data) => {
      const environmentId = (data as { environmentId?: string })?.environmentId;
      if (environmentId !== undefined) {
        await this.handleTargetEnvironmentChange(environmentId);
      }
    });

    this.coordinator.registerHandler('solutionSelect', async (data) => {
      const uniqueName = (data as { uniqueName?: string })?.uniqueName;
      if (uniqueName !== undefined) {
        await this.handleSolutionSelect(uniqueName);
      }
    });
  }

  /**
   * Creates SectionRenderData with custom properties wrapped in customData.
   */
  private createRenderData(
    environments: EnvironmentOption[],
    options: {
      isSolutionsLoading?: boolean | undefined;
      isComparing?: boolean | undefined;
      selectedSolutionUniqueName?: string | undefined;
      comparisonViewModel?: SolutionComparisonViewModel | undefined;
      componentDiffViewModel?: ComponentDiffViewModel | undefined;
    } = {}
  ): { environments: EnvironmentOption[]; customData: Record<string, unknown> } {
    return {
      environments,
      customData: {
        sourceEnvironmentId: this.sourceEnvironmentId,
        targetEnvironmentId: this.targetEnvironmentId,
        solutions: this.solutions,
        selectedSolutionUniqueName: options.selectedSolutionUniqueName,
        isSolutionsLoading: options.isSolutionsLoading ?? false,
        isComparing: options.isComparing ?? false,
        comparisonViewModel: options.comparisonViewModel,
        componentDiffViewModel: options.componentDiffViewModel
      }
    };
  }

  private async initializeAndLoadData(): Promise<void> {
    this.logger.debug('SolutionDiffPanel: Initializing');

    // Load environments
    const environments = await this.getEnvironments();

    // If no source environment selected, just show empty state
    if (this.sourceEnvironmentId === undefined) {
      await this.scaffoldingBehavior.refresh(this.createRenderData(environments));
      return;
    }

    // Initial render with loading state
    await this.scaffoldingBehavior.refresh(this.createRenderData(environments, {
      isSolutionsLoading: true
    }));

    // Load solutions from source environment
    await this.loadSolutionsFromSource();
  }

  private async loadSolutionsFromSource(): Promise<void> {
    if (this.sourceEnvironmentId === undefined) {
      this.logger.debug('No source environment selected, skipping solution load');
      return;
    }

    try {
      this.logger.debug('Loading solutions from source environment', {
        sourceEnvironmentId: this.sourceEnvironmentId
      });

      const solutions = await this.solutionRepository.findAllForDropdown(this.sourceEnvironmentId);

      this.solutions = solutions
        .map(s => ({ id: s.id, name: s.name, uniqueName: s.uniqueName }))
        .sort((a, b) => a.name.localeCompare(b.name));

      this.logger.info('Solutions loaded from source environment', {
        count: this.solutions.length
      });

      // Update UI with solutions
      const environments = await this.getEnvironments();
      await this.scaffoldingBehavior.refresh(this.createRenderData(environments, {
        selectedSolutionUniqueName: this.selectedSolutionUniqueName ?? undefined,
        comparisonViewModel: this.comparisonViewModel ?? undefined
      }));
    } catch (error) {
      this.logger.error('Failed to load solutions', error);
      void vscode.window.showErrorMessage('Failed to load solutions from source environment');
    }
  }

  private async handleSourceEnvironmentChange(newEnvironmentId: string): Promise<void> {
    this.logger.debug('Source environment changed', { newEnvironmentId });

    // Handle empty selection (user selected placeholder)
    if (newEnvironmentId === '') {
      this.sourceEnvironmentId = undefined;
      this.selectedSolutionUniqueName = null;
      this.solutions = [];
      this.comparisonViewModel = null;
      this.componentDiffViewModel = null;

      await this.panel.postMessage({
        command: 'setButtonState',
        buttonId: 'refresh',
        disabled: true
      });

      const environments = await this.getEnvironments();
      await this.scaffoldingBehavior.refresh(this.createRenderData(environments));
      return;
    }

    this.sourceEnvironmentId = newEnvironmentId;

    // Clear solution selection and comparison (solution may not exist in new environment)
    this.selectedSolutionUniqueName = null;
    this.comparisonViewModel = null;
    this.componentDiffViewModel = null;

    // Disable compare button
    await this.panel.postMessage({
      command: 'setButtonState',
      buttonId: 'refresh',
      disabled: true
    });

    // Show loading state and reload solutions from new source environment
    const environments = await this.getEnvironments();
    await this.scaffoldingBehavior.refresh(this.createRenderData(environments, {
      isSolutionsLoading: true
    }));

    await this.loadSolutionsFromSource();
  }

  private async handleTargetEnvironmentChange(newEnvironmentId: string): Promise<void> {
    this.logger.debug('Target environment changed', { newEnvironmentId });

    // Handle empty selection (user selected placeholder)
    if (newEnvironmentId === '') {
      this.targetEnvironmentId = undefined;
      this.comparisonViewModel = null;
      this.componentDiffViewModel = null;

      const environments = await this.getEnvironments();
      await this.scaffoldingBehavior.refresh(this.createRenderData(environments, {
        selectedSolutionUniqueName: this.selectedSolutionUniqueName ?? undefined
      }));
      return;
    }

    this.targetEnvironmentId = newEnvironmentId;

    // Clear comparison (needs to be re-run with new target)
    this.comparisonViewModel = null;
    this.componentDiffViewModel = null;

    // Re-run comparison if solution already selected
    if (this.selectedSolutionUniqueName !== null) {
      await this.handleCompare();
    }
  }

  private async handleSolutionSelect(uniqueName: string): Promise<void> {
    this.logger.debug('Solution selected', { uniqueName });

    if (uniqueName === '') {
      this.selectedSolutionUniqueName = null;
      this.comparisonViewModel = null;

      // Disable compare button
      await this.panel.postMessage({
        command: 'setButtonState',
        buttonId: 'refresh',
        disabled: true
      });

      // Update UI to show placeholder
      const environments = await this.getEnvironments();
      await this.scaffoldingBehavior.refresh(this.createRenderData(environments));
      return;
    }

    this.selectedSolutionUniqueName = uniqueName;

    // Enable compare button
    await this.panel.postMessage({
      command: 'setButtonState',
      buttonId: 'refresh',
      disabled: false
    });

    // Auto-compare on selection
    await this.handleCompare();
  }

  private async handleCompare(): Promise<void> {
    if (this.selectedSolutionUniqueName === null) {
      this.logger.warn('Compare called without solution selected');
      return;
    }

    if (this.sourceEnvironmentId === undefined || this.targetEnvironmentId === undefined) {
      this.logger.warn('Compare called without both environments selected');
      return;
    }

    this.logger.debug('Comparing solution', {
      sourceEnvironmentId: this.sourceEnvironmentId,
      targetEnvironmentId: this.targetEnvironmentId,
      solutionUniqueName: this.selectedSolutionUniqueName
    });

    await this.loadingBehavior.setLoading(true);

    try {
      // Show loading state
      const environments = await this.getEnvironments();
      await this.scaffoldingBehavior.refresh(this.createRenderData(environments, {
        selectedSolutionUniqueName: this.selectedSolutionUniqueName ?? undefined,
        isComparing: true
      }));

      // Execute metadata comparison
      const comparison = await this.compareUseCase.execute(
        this.sourceEnvironmentId,
        this.targetEnvironmentId,
        this.selectedSolutionUniqueName
      );

      // Execute component comparison (only if both solutions exist)
      this.componentDiffViewModel = null;
      const sourceSolution = comparison.getSourceSolution();
      const targetSolution = comparison.getTargetSolution();

      if (sourceSolution !== null && targetSolution !== null) {
        const componentComparison = await this.compareComponentsUseCase.execute(
          this.sourceEnvironmentId,
          this.targetEnvironmentId,
          sourceSolution.id,
          targetSolution.id
        );

        this.componentDiffViewModel = this.componentDiffMapper.toViewModel(componentComparison);

        this.logger.info('Component comparison completed', {
          sourceCount: this.componentDiffViewModel.sourceComponentCount,
          targetCount: this.componentDiffViewModel.targetComponentCount,
          summary: this.componentDiffViewModel.summary
        });
      }

      // Map metadata to ViewModel WITH component diff info for combined status
      const componentDiffSummary = this.componentDiffViewModel !== null
        ? {
            hasDifferences: this.componentDiffViewModel.addedCount > 0 ||
              this.componentDiffViewModel.removedCount > 0 ||
              this.componentDiffViewModel.modifiedCount > 0,
            addedCount: this.componentDiffViewModel.addedCount,
            removedCount: this.componentDiffViewModel.removedCount,
            modifiedCount: this.componentDiffViewModel.modifiedCount
          }
        : undefined;

      this.comparisonViewModel = SolutionComparisonViewModelMapper.toViewModel(
        comparison,
        componentDiffSummary
      );

      this.logger.info('Comparison completed', {
        status: this.comparisonViewModel.status,
        differences: this.comparisonViewModel.differences.length,
        hasComponentDiff: this.componentDiffViewModel !== null
      });

      // Update UI with results
      await this.scaffoldingBehavior.refresh(this.createRenderData(environments, {
        selectedSolutionUniqueName: this.selectedSolutionUniqueName ?? undefined,
        comparisonViewModel: this.comparisonViewModel ?? undefined,
        componentDiffViewModel: this.componentDiffViewModel ?? undefined
      }));
    } catch (error) {
      this.logger.error('Comparison failed', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      void vscode.window.showErrorMessage(`Failed to compare solutions: ${errorMessage}`);

      // Clear comparison and show placeholder
      this.comparisonViewModel = null;
      this.componentDiffViewModel = null;
      const environments = await this.getEnvironments();
      await this.scaffoldingBehavior.refresh(this.createRenderData(environments, {
        selectedSolutionUniqueName: this.selectedSolutionUniqueName ?? undefined
      }));
    } finally {
      await this.loadingBehavior.setLoading(false);
    }
  }
}
