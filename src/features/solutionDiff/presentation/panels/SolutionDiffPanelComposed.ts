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
import type { ISolutionRepository } from '../../../solutionExplorer/domain/interfaces/ISolutionRepository';
import { CompareSolutionMetadataUseCase } from '../../application/useCases/CompareSolutionMetadataUseCase';
import { SolutionComparisonViewModelMapper } from '../../application/mappers/SolutionComparisonViewModelMapper';
import type { SolutionComparisonViewModel, SolutionOptionViewModel } from '../../application/viewModels/SolutionComparisonViewModel';
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

  // Dual environment state
  private sourceEnvironmentId: string;
  private targetEnvironmentId: string;
  private selectedSolutionUniqueName: string | null = null;
  private solutions: SolutionOptionViewModel[] = [];
  private comparisonViewModel: SolutionComparisonViewModel | null = null;

  private constructor(
    private readonly panel: SafeWebviewPanel,
    private readonly extensionUri: vscode.Uri,
    private readonly getEnvironments: () => Promise<EnvironmentOption[]>,
    private readonly solutionRepository: ISolutionRepository,
    private readonly logger: ILogger,
    sourceEnvironmentId: string,
    targetEnvironmentId: string
  ) {
    this.sourceEnvironmentId = sourceEnvironmentId;
    this.targetEnvironmentId = targetEnvironmentId;

    // Create use case
    this.compareUseCase = new CompareSolutionMetadataUseCase(solutionRepository, logger);

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
    logger: ILogger,
    sourceEnvironmentId: string,
    targetEnvironmentId: string
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
        comparisonViewModel: options.comparisonViewModel
      }
    };
  }

  private async initializeAndLoadData(): Promise<void> {
    this.logger.debug('SolutionDiffPanel: Initializing');

    // Load environments
    const environments = await this.getEnvironments();

    // Initial render with loading state
    await this.scaffoldingBehavior.refresh(this.createRenderData(environments, {
      isSolutionsLoading: true
    }));

    // Load solutions from source environment
    await this.loadSolutionsFromSource();
  }

  private async loadSolutionsFromSource(): Promise<void> {
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
    this.sourceEnvironmentId = newEnvironmentId;

    // Clear solution selection and comparison (solution may not exist in new environment)
    this.selectedSolutionUniqueName = null;
    this.comparisonViewModel = null;

    // Disable compare button
    await this.panel.postMessage({
      command: 'setButtonState',
      buttonId: 'refresh',
      disabled: true
    });

    // Reload solutions from new source environment
    await this.loadSolutionsFromSource();
  }

  private async handleTargetEnvironmentChange(newEnvironmentId: string): Promise<void> {
    this.logger.debug('Target environment changed', { newEnvironmentId });
    this.targetEnvironmentId = newEnvironmentId;

    // Clear comparison (needs to be re-run with new target)
    this.comparisonViewModel = null;

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

      // Execute comparison
      const comparison = await this.compareUseCase.execute(
        this.sourceEnvironmentId,
        this.targetEnvironmentId,
        this.selectedSolutionUniqueName
      );

      // Map to ViewModel
      this.comparisonViewModel = SolutionComparisonViewModelMapper.toViewModel(comparison);

      this.logger.info('Comparison completed', {
        status: this.comparisonViewModel.status,
        differences: this.comparisonViewModel.differences.length
      });

      // Update UI with results
      await this.scaffoldingBehavior.refresh(this.createRenderData(environments, {
        selectedSolutionUniqueName: this.selectedSolutionUniqueName ?? undefined,
        comparisonViewModel: this.comparisonViewModel ?? undefined
      }));
    } catch (error) {
      this.logger.error('Comparison failed', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      void vscode.window.showErrorMessage(`Failed to compare solutions: ${errorMessage}`);

      // Clear comparison and show placeholder
      this.comparisonViewModel = null;
      const environments = await this.getEnvironments();
      await this.scaffoldingBehavior.refresh(this.createRenderData(environments, {
        selectedSolutionUniqueName: this.selectedSolutionUniqueName ?? undefined
      }));
    } finally {
      await this.loadingBehavior.setLoading(false);
    }
  }
}
