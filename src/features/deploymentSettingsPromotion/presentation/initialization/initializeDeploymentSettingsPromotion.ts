import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Lazy-loads and initializes Deployment Settings Promotion panel.
 * Dynamic imports reduce initial extension activation time by deferring feature-specific code until needed.
 */
export async function initializeDeploymentSettingsPromotion(
	context: vscode.ExtensionContext,
	getEnvironments: () => Promise<Array<{ id: string; name: string; url: string }>>,
	logger: ILogger
): Promise<void> {
	const { DeploymentSettingsPromotionPanel } = await import('../panels/DeploymentSettingsPromotionPanel.js');

	DeploymentSettingsPromotionPanel.createOrShow(context.extensionUri, getEnvironments, logger);
}
