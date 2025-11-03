/**
 * Sync Deployment Settings button view.
 * Renders the JavaScript for adding the Sync Deployment Settings button to data table toolbars.
 */

const TOOLBAR_SELECTOR = '.toolbar-left';
const BUTTON_ID = 'syncDeploymentSettingsBtn';
const BUTTON_TEXT = 'Sync Deployment Settings';
const COMMAND_NAME = 'syncDeploymentSettings';

/**
 * Renders JavaScript to add Sync Deployment Settings button to toolbar.
 * Injects button into toolbar-left container and attaches click handler.
 *
 * @returns JavaScript code snippet to execute after data table rendering
 */
export function renderSyncDeploymentSettingsButton(): string {
	return `
		// Add Sync Deployment Settings button to toolbar
		const toolbarLeft = document.querySelector('${TOOLBAR_SELECTOR}');
		if (toolbarLeft && !document.getElementById('${BUTTON_ID}')) {
			const syncBtn = document.createElement('button');
			syncBtn.id = '${BUTTON_ID}';
			syncBtn.textContent = '${BUTTON_TEXT}';
			syncBtn.addEventListener('click', () => {
				vscode.postMessage({ command: '${COMMAND_NAME}' });
			});
			toolbarLeft.appendChild(syncBtn);
		}
	`;
}
