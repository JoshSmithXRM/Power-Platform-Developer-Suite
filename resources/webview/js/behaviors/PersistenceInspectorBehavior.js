/**
 * Client-side behavior for Persistence Inspector panel.
 * Handles storage entry rendering and user interactions.
 */
window.createBehavior({
	initialize() {
		const vscode = window.vscode;

		// Request initial data on load
		vscode.postMessage({ command: 'refresh' });
	},

	handleMessage(message) {
		switch (message.command) {
			case 'storageData':
				renderStorageData(message.data);
				break;
			case 'secretRevealed':
				updateSecretValue(message.key, message.value);
				break;
			case 'error':
				alert('Error: ' + message.message);
				break;
		}
	}
});

function renderStorageData(data) {
	renderEntries(data.globalStateEntries, 'globalStateEntries');
	renderEntries(data.secretEntries, 'secretEntries');
}

function renderEntries(entries, containerId) {
	const container = document.getElementById(containerId);
	if (!container) {
		console.error('[PersistenceInspector] Container not found:', containerId);
		return;
	}

	container.innerHTML = '';

	if (!entries || entries.length === 0) {
		container.innerHTML = '<div style="color: var(--vscode-descriptionForeground);">No entries</div>';
		return;
	}

	entries.forEach(entry => {
		const entryDiv = document.createElement('div');
		entryDiv.className = 'entry';
		if (entry.isProtected) entryDiv.classList.add('protected');
		if (entry.isSecret) entryDiv.classList.add('secret');

		const header = document.createElement('div');
		header.className = 'entry-header';

		const keySpan = document.createElement('span');
		keySpan.className = 'entry-key';
		keySpan.textContent = entry.key;

		const actions = document.createElement('div');
		actions.className = 'entry-actions';

		if (entry.isSecret) {
			const toggleBtn = document.createElement('button');
			toggleBtn.id = 'toggle-' + entry.key;
			toggleBtn.textContent = 'Show';
			toggleBtn.setAttribute('data-revealed', 'false');
			toggleBtn.onclick = () => {
				const isRevealed = toggleBtn.getAttribute('data-revealed') === 'true';
				if (isRevealed) {
					// Hide the secret
					const valueDiv = document.getElementById('value-' + entry.key);
					if (valueDiv) {
						valueDiv.textContent = entry.displayValue;
					}
					toggleBtn.textContent = 'Show';
					toggleBtn.setAttribute('data-revealed', 'false');
				} else {
					// Reveal the secret
					window.vscode.postMessage({
						command: 'revealSecret',
						data: { key: entry.key }
					});
				}
			};
			actions.appendChild(toggleBtn);
		}

		if (entry.canBeCleared) {
			const clearBtn = document.createElement('button');
			clearBtn.textContent = 'Clear';
			clearBtn.onclick = () => {
				window.vscode.postMessage({
					command: 'clearEntry',
					data: { key: entry.key }
				});
			};
			actions.appendChild(clearBtn);
		}

		if (entry.isExpandable && !entry.isSecret && entry.canBeCleared) {
			const clearPropBtn = document.createElement('button');
			clearPropBtn.textContent = 'Clear Property';
			clearPropBtn.onclick = () => {
				const path = prompt('Enter property path to clear (e.g., settings.dataverseUrl or [0].name):');
				if (path) {
					window.vscode.postMessage({
						command: 'clearProperty',
						data: { key: entry.key, path: path }
					});
				}
			};
			actions.appendChild(clearPropBtn);
		}

		header.appendChild(keySpan);
		header.appendChild(actions);

		const value = document.createElement('div');
		value.className = 'entry-value';
		value.id = 'value-' + entry.key;
		value.textContent = entry.displayValue;

		const meta = document.createElement('div');
		meta.className = 'entry-meta';
		meta.textContent = `Type: ${entry.metadata.dataType} | Size: ${entry.metadata.displaySize}` +
			(entry.isProtected ? ' | Protected' : '');

		entryDiv.appendChild(header);
		entryDiv.appendChild(value);
		entryDiv.appendChild(meta);

		container.appendChild(entryDiv);
	});
}

function updateSecretValue(key, value) {
	const valueDiv = document.getElementById('value-' + key);
	if (valueDiv) {
		valueDiv.textContent = value;
	}
	const toggleBtn = document.getElementById('toggle-' + key);
	if (toggleBtn) {
		toggleBtn.textContent = 'Hide';
		toggleBtn.setAttribute('data-revealed', 'true');
	}
}
