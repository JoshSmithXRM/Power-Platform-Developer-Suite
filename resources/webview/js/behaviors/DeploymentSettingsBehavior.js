/**
 * DeploymentSettingsBehavior - Wires up the deployment settings panel selectors.
 *
 * Handles:
 * - Source environment selector (sourceEnvSelect)
 * - Solution selector (solutionSelect)
 * - Target environment selector (targetEnvSelect)
 * - Save button (saveDeploymentSettings)
 */

window.createBehavior({
	initialize() {
		this.wireSourceEnvSelector();
		this.wireSolutionSelector();
		this.wireTargetEnvSelector();
		// Save button is wired by messaging.js via button ID convention
	},

	wireSourceEnvSelector() {
		const select = document.getElementById('sourceEnvSelect');
		if (!select) {
			return;
		}

		select.addEventListener('change', () => {
			window.vscode.postMessage({
				command: 'sourceEnvironmentChange',
				data: {
					environmentId: select.value
				}
			});
		});
	},

	wireSolutionSelector() {
		const select = document.getElementById('solutionSelect');
		if (!select) {
			return;
		}

		select.addEventListener('change', () => {
			window.vscode.postMessage({
				command: 'solutionChange',
				data: {
					solutionId: select.value
				}
			});
		});
	},

	wireTargetEnvSelector() {
		const select = document.getElementById('targetEnvSelect');
		if (!select) {
			return;
		}

		select.addEventListener('change', () => {
			window.vscode.postMessage({
				command: 'targetEnvironmentChange',
				data: {
					environmentId: select.value
				}
			});
		});
	},

	handleMessage(message) {
		switch (message.command) {
			case 'updateSolutionSelector':
				this.updateSolutionSelector(message.data);
				break;
			case 'setSelections':
				this.setSelections(message.data);
				break;
		}
	},

	/**
	 * Updates the solution dropdown with new options.
	 */
	updateSolutionSelector(data) {
		const select = document.getElementById('solutionSelect');
		if (!select) {
			return;
		}

		const { solutions, currentSolutionId, disabled } = data;

		// Clear existing options
		select.innerHTML = '';

		// Add placeholder
		const placeholder = document.createElement('option');
		placeholder.value = '';
		placeholder.textContent = solutions.length > 0 ? 'Select solution...' : 'Select source first...';
		placeholder.disabled = true;
		if (!currentSolutionId) {
			placeholder.selected = true;
		}
		select.appendChild(placeholder);

		// Add solution options
		for (const solution of solutions) {
			const option = document.createElement('option');
			option.value = solution.id;
			option.textContent = solution.name;
			if (solution.id === currentSolutionId) {
				option.selected = true;
			}
			select.appendChild(option);
		}

		// Update disabled state
		select.disabled = disabled ?? solutions.length === 0;
	},

	/**
	 * Updates multiple selector values at once.
	 */
	setSelections(data) {
		if (data.sourceEnvironmentId !== undefined) {
			const sourceSelect = document.getElementById('sourceEnvSelect');
			if (sourceSelect) {
				sourceSelect.value = data.sourceEnvironmentId;
			}
		}

		if (data.targetEnvironmentId !== undefined) {
			const targetSelect = document.getElementById('targetEnvSelect');
			if (targetSelect) {
				targetSelect.value = data.targetEnvironmentId;
			}
		}

		if (data.currentSolutionId !== undefined) {
			const solutionSelect = document.getElementById('solutionSelect');
			if (solutionSelect) {
				solutionSelect.value = data.currentSolutionId;
			}
		}
	}
});
