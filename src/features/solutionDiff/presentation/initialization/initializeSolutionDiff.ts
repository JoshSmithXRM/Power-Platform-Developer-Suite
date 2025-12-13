import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Lazy-loads and initializes Solution Diff panel.
 * Dynamic imports reduce initial extension activation time by deferring feature-specific code until needed.
 *
 * This is the FIRST dual-environment panel in the codebase.
 */
export async function initializeSolutionDiff(
  context: vscode.ExtensionContext,
  getEnvironments: () => Promise<Array<{ id: string; name: string; url: string }>>,
  dataverseApiServiceFactory: {
    getAccessToken: (envId: string) => Promise<string>;
    getDataverseUrl: (envId: string) => Promise<string>;
  },
  logger: ILogger,
  sourceEnvironmentId?: string,
  targetEnvironmentId?: string
): Promise<void> {
  const { DataverseApiService } = await import('../../../../shared/infrastructure/services/DataverseApiService.js');
  const { DataverseApiSolutionRepository } = await import('../../../solutionExplorer/infrastructure/repositories/DataverseApiSolutionRepository.js');
  const { DataverseApiSolutionComponentRepository } = await import('../../../../shared/infrastructure/repositories/DataverseApiSolutionComponentRepository.js');
  const { SolutionDiffPanelComposed } = await import('../panels/SolutionDiffPanelComposed.js');

  const { getAccessToken, getDataverseUrl } = dataverseApiServiceFactory;
  const dataverseApiService = new DataverseApiService(getAccessToken, getDataverseUrl, logger);
  const solutionRepository = new DataverseApiSolutionRepository(dataverseApiService, logger);
  const componentRepository = new DataverseApiSolutionComponentRepository(dataverseApiService, logger);

  await SolutionDiffPanelComposed.createOrShow(
    context.extensionUri,
    getEnvironments,
    solutionRepository,
    componentRepository,
    logger,
    sourceEnvironmentId,
    targetEnvironmentId
  );
}
