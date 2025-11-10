/**
 * Metadata Browser Behavior
 * Handles client-side interactions for the Metadata Browser panel.
 *
 * Responsibilities:
 * - Tree navigation (entities and choices)
 * - Tree filtering (client-side search)
 * - Tab switching (entity mode vs choice mode)
 * - Table rendering for all tabs
 * - Detail panel open/close/resize
 * - Navigation via relationship links
 */

window.createBehavior({
	initialize() {
		this.setupTreeSearch();
		this.setupTableSearch();
		this.setupTabSwitching();
		this.setupTreeSectionToggles();
		this.setupDetailPanel();
	},

	handleMessage(message) {
		switch (message.command) {
			case 'populateTree':
				this.populateTree(message.data);
				break;
			case 'setEntityMode':
				this.setEntityMode(message.data);
				break;
			case 'setChoiceMode':
				this.setChoiceMode(message.data);
				break;
			case 'clearSelection':
				this.clearSelection();
				break;
			case 'showDetailPanel':
				this.showDetailPanel(message.data);
				break;
			case 'hideDetailPanel':
				this.hideDetailPanel();
				break;
		}
	},

	/**
	 * Populates the tree with entities and choices
	 */
	populateTree(data) {
		const { entities, choices } = data;

		// Populate entities tree
		const entitiesTree = document.getElementById('entitiesTree');
		const entitiesCount = document.getElementById('entitiesCount');
		if (entitiesTree && entities) {
			entitiesTree.innerHTML = entities.map(entity => `
				<div class="tree-item" data-type="entity" data-id="${escapeAttr(entity.logicalName)}">
					<span class="tree-item-icon">${entity.icon}</span>
					<span class="tree-item-label">
						<span class="tree-item-name">${escapeHtml(entity.displayName)}</span>
						<span class="tree-item-technical">${escapeHtml(entity.logicalName)}</span>
					</span>
				</div>
			`).join('');

			if (entitiesCount) {
				entitiesCount.textContent = entities.length;
			}

			// Attach click handlers
			entitiesTree.querySelectorAll('.tree-item').forEach(item => {
				item.addEventListener('click', () => {
					const logicalName = item.dataset.id;
					this.selectEntity(logicalName);
				});
			});
		}

		// Populate choices tree
		const choicesTree = document.getElementById('choicesTree');
		const choicesCount = document.getElementById('choicesCount');
		if (choicesTree && choices) {
			choicesTree.innerHTML = choices.map(choice => `
				<div class="tree-item" data-type="choice" data-id="${escapeAttr(choice.name)}">
					<span class="tree-item-icon">${choice.icon}</span>
					<span class="tree-item-label">
						<span class="tree-item-name">${escapeHtml(choice.displayName)}</span>
						<span class="tree-item-technical">${escapeHtml(choice.name)}</span>
					</span>
				</div>
			`).join('');

			if (choicesCount) {
				choicesCount.textContent = choices.length;
			}

			// Attach click handlers
			choicesTree.querySelectorAll('.tree-item').forEach(item => {
				item.addEventListener('click', () => {
					const name = item.dataset.id;
					this.selectChoice(name);
				});
			});
		}
	},

	/**
	 * Sets entity mode with all tabs
	 */
	setEntityMode(data) {
		const { attributes, keys, oneToManyRelationships, manyToOneRelationships, manyToManyRelationships, privileges, selectedTab } = data;

		// Show entity tabs, hide choice tabs
		this.showEntityTabs();

		// Render all entity tables
		this.renderAttributesTable(attributes);
		this.renderKeysTable(keys);
		this.renderOneToManyRelationshipsTable(oneToManyRelationships);
		this.renderManyToOneRelationshipsTable(manyToOneRelationships);
		this.renderManyToManyRelationshipsTable(manyToManyRelationships);
		this.renderPrivilegesTable(privileges);

		// Switch to selected tab
		this.switchToTab(selectedTab || 'attributes');
	},

	/**
	 * Sets choice mode
	 */
	setChoiceMode(data) {
		const { choiceValues } = data;

		// Show choice tabs, hide entity tabs
		this.showChoiceTabs();

		// Render choice values table
		this.renderChoiceValuesTable(choiceValues);

		// Switch to choice values tab
		this.switchToTab('choiceValues');
	},

	/**
	 * Clears current selection and tree items.
	 * Used when switching environments to prevent showing stale data.
	 */
	clearSelection() {
		// Clear tree items
		const entitiesTree = document.getElementById('entitiesTree');
		const choicesTree = document.getElementById('choicesTree');
		const entitiesCount = document.getElementById('entitiesCount');
		const choicesCount = document.getElementById('choicesCount');

		if (entitiesTree) {
			entitiesTree.innerHTML = '';
		}
		if (choicesTree) {
			choicesTree.innerHTML = '';
		}
		if (entitiesCount) {
			entitiesCount.textContent = '0';
		}
		if (choicesCount) {
			choicesCount.textContent = '0';
		}

		// Clear all table bodies
		['attributesTable', 'keysTable', 'oneToManyTable', 'manyToOneTable', 'manyToManyTable', 'privilegesTable', 'choiceValuesTable'].forEach(tableId => {
			const tbody = document.querySelector(`#${tableId} tbody`);
			if (tbody) {
				tbody.innerHTML = '';
			}
		});

		// Remove tree selection (if any remain after clearing)
		document.querySelectorAll('.tree-item.selected').forEach(item => {
			item.classList.remove('selected');
		});

		// Hide detail panel
		this.hideDetailPanel();
	},

	/**
	 * Shows entity tabs (Attributes, Keys, Relationships, Privileges)
	 */
	showEntityTabs() {
		const tabs = ['attributes', 'keys', 'oneToMany', 'manyToOne', 'manyToMany', 'privileges'];
		tabs.forEach(tab => {
			const button = document.querySelector(`[data-tab="${tab}"]`);
			if (button) {
				button.style.display = '';
			}
		});

		// Hide choice tabs
		const choiceTab = document.querySelector('[data-tab="choiceValues"]');
		if (choiceTab) {
			choiceTab.style.display = 'none';
		}
	},

	/**
	 * Shows choice tabs (Choice Values only)
	 */
	showChoiceTabs() {
		const entityTabs = ['attributes', 'keys', 'oneToMany', 'manyToOne', 'manyToMany', 'privileges'];
		entityTabs.forEach(tab => {
			const button = document.querySelector(`[data-tab="${tab}"]`);
			if (button) {
				button.style.display = 'none';
			}
		});

		// Show choice tab
		const choiceTab = document.querySelector('[data-tab="choiceValues"]');
		if (choiceTab) {
			choiceTab.style.display = '';
		}
	},

	/**
	 * Renders attributes table
	 */
	renderAttributesTable(attributes) {
		this.renderTable('attributesTable', attributes, [
			{ key: 'displayName', isLinkable: true },
			{ key: 'logicalName' },
			{ key: 'type' },
			{ key: 'required' },
			{ key: 'maxLength' }
		], 'attributes');
	},

	/**
	 * Renders keys table
	 */
	renderKeysTable(keys) {
		console.log('[MetadataBrowser] renderKeysTable', { count: keys.length });
		this.renderTable('keysTable', keys, [
			{ key: 'name', isLinkable: true },
			{ key: 'type' },
			{ key: 'keyAttributes' }
		], 'keys');
	},

	/**
	 * Renders 1:N relationships table
	 */
	renderOneToManyRelationshipsTable(relationships) {
		console.log('[MetadataBrowser] renderOneToManyRelationshipsTable', { count: relationships.length });
		const tbody = document.querySelector('#oneToManyTable tbody');
		const empty = document.querySelector('#oneToManyTable').closest('.tab-panel').querySelector('.table-empty');

		if (!tbody) return;

		if (!relationships || relationships.length === 0) {
			tbody.innerHTML = '';
			if (empty) empty.style.display = 'block';
			return;
		}

		if (empty) empty.style.display = 'none';

		tbody.innerHTML = relationships.map((rel, index) => `
			<tr data-index="${index}">
				<td>
					<a href="#" class="table-link" data-action="openDetail" data-tab="oneToMany" data-index="${index}">
						${escapeHtml(rel.name)}
					</a>
				</td>
				<td>${this.renderRelatedEntity(rel)}</td>
				<td>${escapeHtml(rel.referencingAttribute)}</td>
			</tr>
		`).join('');

		// Attach handlers
		this.attachTableHandlers('oneToManyTable', relationships, 'oneToMany');
	},

	/**
	 * Renders N:1 relationships table
	 */
	renderManyToOneRelationshipsTable(relationships) {
		console.log('[MetadataBrowser] renderManyToOneRelationshipsTable', { count: relationships.length });
		const tbody = document.querySelector('#manyToOneTable tbody');
		const empty = document.querySelector('#manyToOneTable').closest('.tab-panel').querySelector('.table-empty');

		if (!tbody) return;

		if (!relationships || relationships.length === 0) {
			tbody.innerHTML = '';
			if (empty) empty.style.display = 'block';
			return;
		}

		if (empty) empty.style.display = 'none';

		tbody.innerHTML = relationships.map((rel, index) => `
			<tr data-index="${index}">
				<td>
					<a href="#" class="table-link" data-action="openDetail" data-tab="manyToOne" data-index="${index}">
						${escapeHtml(rel.name)}
					</a>
				</td>
				<td>${this.renderRelatedEntity(rel)}</td>
				<td>${escapeHtml(rel.referencingAttribute)}</td>
			</tr>
		`).join('');

		// Attach handlers
		this.attachTableHandlers('manyToOneTable', relationships, 'manyToOne');
	},

	/**
	 * Renders N:N relationships table
	 */
	renderManyToManyRelationshipsTable(relationships) {
		console.log('[MetadataBrowser] renderManyToManyRelationshipsTable', { count: relationships.length });
		const tbody = document.querySelector('#manyToManyTable tbody');
		const empty = document.querySelector('#manyToManyTable').closest('.tab-panel').querySelector('.table-empty');

		if (!tbody) return;

		if (!relationships || relationships.length === 0) {
			tbody.innerHTML = '';
			if (empty) empty.style.display = 'block';
			return;
		}

		if (empty) empty.style.display = 'none';

		tbody.innerHTML = relationships.map((rel, index) => `
			<tr data-index="${index}">
				<td>
					<a href="#" class="table-link" data-action="openDetail" data-tab="manyToMany" data-index="${index}">
						${escapeHtml(rel.name)}
					</a>
				</td>
				<td>${this.renderRelatedEntity(rel)}</td>
				<td>${escapeHtml(rel.referencingAttribute)}</td>
			</tr>
		`).join('');

		// Attach handlers
		this.attachTableHandlers('manyToManyTable', relationships, 'manyToMany');
	},

	/**
	 * Renders related entity with navigation link
	 */
	renderRelatedEntity(rel) {
		if (rel.navigationType === 'entity') {
			const target = Array.isArray(rel.navigationTarget) ? rel.navigationTarget[0] : rel.navigationTarget;
			return `<a href="#" class="table-link" data-action="navigate" data-target="${escapeAttr(target)}">${escapeHtml(rel.relatedEntity)}</a>`;
		} else if (rel.navigationType === 'quickPick') {
			const targets = Array.isArray(rel.navigationTarget) ? rel.navigationTarget : [rel.navigationTarget];
			return `<a href="#" class="table-link" data-action="navigateQuickPick" data-targets="${escapeAttr(JSON.stringify(targets))}">${escapeHtml(rel.relatedEntity)}</a>`;
		}
		return escapeHtml(rel.relatedEntity);
	},

	/**
	 * Renders privileges table
	 */
	renderPrivilegesTable(privileges) {
		console.log('[MetadataBrowser] renderPrivilegesTable', { count: privileges.length });
		this.renderTable('privilegesTable', privileges, [
			{ key: 'name', isLinkable: true },
			{ key: 'privilegeType' },
			{ key: 'depths' }
		], 'privileges');
	},

	/**
	 * Renders choice values table
	 */
	renderChoiceValuesTable(choiceValues) {
		this.renderTable('choiceValuesTable', choiceValues, [
			{ key: 'label', isLinkable: true },
			{ key: 'value' },
			{ key: 'color' }
		], 'choiceValues');
	},

	/**
	 * Generic table rendering
	 */
	renderTable(tableId, data, columns, tab) {
		console.log('[MetadataBrowser] renderTable', { tableId, tab, dataCount: data?.length });

		const tbody = document.querySelector(`#${tableId} tbody`);
		const empty = document.querySelector(`#${tableId}`).closest('.tab-panel').querySelector('.table-empty');

		if (!tbody) {
			console.error('[MetadataBrowser] tbody not found for table', tableId);
			return;
		}

		if (!data || data.length === 0) {
			tbody.innerHTML = '';
			if (empty) empty.style.display = 'block';
			return;
		}

		if (empty) empty.style.display = 'none';

		// Check first row for debugging
		if (data.length > 0) {
			console.log('[MetadataBrowser] First row sample', {
				tableId,
				hasIsLinkable: 'isLinkable' in data[0],
				isLinkable: data[0].isLinkable,
				hasMetadata: 'metadata' in data[0],
				keys: Object.keys(data[0])
			});
		}

		tbody.innerHTML = data.map((row, index) => `
			<tr data-index="${index}">
				${columns.map(col => {
					const value = row[col.key];
					if (col.isLinkable && row.isLinkable) {
						return `<td><a href="#" class="table-link" data-action="openDetail" data-tab="${tab}" data-index="${index}">${escapeHtml(value)}</a></td>`;
					}
					return `<td>${escapeHtml(value)}</td>`;
				}).join('')}
			</tr>
		`).join('');

		// Attach handlers
		this.attachTableHandlers(tableId, data, tab);
	},

	/**
	 * Attaches table click handlers
	 */
	attachTableHandlers(tableId, data, tab) {
		const tbody = document.querySelector(`#${tableId} tbody`);
		if (!tbody) {
			console.error('[MetadataBrowser] tbody not found in attachTableHandlers', tableId);
			return;
		}

		const links = tbody.querySelectorAll('a.table-link');
		console.log('[MetadataBrowser] attachTableHandlers', { tableId, tab, linkCount: links.length, dataLength: data.length });

		links.forEach(link => {
			link.addEventListener('click', (e) => {
				e.preventDefault();
				const action = link.dataset.action;

				if (action === 'openDetail') {
					const index = parseInt(link.dataset.index);
					console.log('[MetadataBrowser] Opening detail panel', { tab, index, dataLength: data.length });

					if (index < 0 || index >= data.length) {
						console.error('[MetadataBrowser] Invalid index', { index, dataLength: data.length });
						return;
					}

					const row = data[index];
					if (!row) {
						console.error('[MetadataBrowser] Row not found at index', { index });
						return;
					}

					const metadata = row.metadata;
					const itemId = row.id;

					if (!metadata) {
						console.error('[MetadataBrowser] No metadata found for row', { index, row });
						return;
					}

					console.log('[MetadataBrowser] Sending openDetailPanel message', { tab, itemId });
					this.openDetailPanel(tab, itemId, metadata);
				} else if (action === 'navigate') {
					const target = link.dataset.target;
					this.navigateToEntity(target);
				} else if (action === 'navigateQuickPick') {
					const targets = JSON.parse(link.dataset.targets);
					this.navigateToEntityQuickPick(targets);
				}
			});
		});
	},

	/**
	 * Tree search setup
	 */
	setupTreeSearch() {
		const searchInput = document.getElementById('treeSearch');
		if (!searchInput) return;

		searchInput.addEventListener('input', (e) => {
			const query = e.target.value.toLowerCase();
			this.filterTree(query);
		});
	},

	/**
	 * Filters tree items based on search query
	 */
	filterTree(query) {
		const items = document.querySelectorAll('.tree-item');

		items.forEach(item => {
			const name = item.querySelector('.tree-item-name')?.textContent.toLowerCase() || '';
			const technical = item.querySelector('.tree-item-technical')?.textContent.toLowerCase() || '';

			if (query === '' || name.includes(query) || technical.includes(query)) {
				item.style.display = '';
			} else {
				item.style.display = 'none';
			}
		});
	},

	/**
	 * Table search setup
	 */
	setupTableSearch() {
		document.querySelectorAll('.table-search').forEach(searchInput => {
			searchInput.addEventListener('input', (e) => {
				const query = e.target.value.toLowerCase();
				const tableId = e.target.dataset.table;
				this.filterTable(tableId, query);
			});
		});
	},

	/**
	 * Filters table rows based on search query
	 */
	filterTable(tableId, query) {
		const tableMap = {
			'attributes': 'attributesTable',
			'keys': 'keysTable',
			'oneToMany': 'oneToManyTable',
			'manyToOne': 'manyToOneTable',
			'manyToMany': 'manyToManyTable',
			'privileges': 'privilegesTable',
			'choiceValues': 'choiceValuesTable'
		};

		const actualTableId = tableMap[tableId] || tableId;
		const tbody = document.querySelector(`#${actualTableId} tbody`);

		if (!tbody) return;

		const rows = tbody.querySelectorAll('tr');
		let visibleCount = 0;

		rows.forEach(row => {
			const text = row.textContent.toLowerCase();
			if (query === '' || text.includes(query)) {
				row.style.display = '';
				visibleCount++;
			} else {
				row.style.display = 'none';
			}
		});

		// Show/hide empty state
		const tabPanel = document.querySelector(`[data-tab-panel="${tableId}"]`);
		if (tabPanel) {
			const emptyState = tabPanel.querySelector('.table-empty');
			if (emptyState) {
				if (visibleCount === 0 && rows.length > 0) {
					emptyState.textContent = `No ${tableId} match your search.`;
					emptyState.style.display = 'block';
				} else if (rows.length === 0) {
					emptyState.style.display = 'block';
				} else {
					emptyState.style.display = 'none';
				}
			}
		}
	},

	/**
	 * Tab switching setup
	 */
	setupTabSwitching() {
		document.querySelectorAll('.tab-button').forEach(button => {
			button.addEventListener('click', () => {
				const tab = button.dataset.tab;
				this.switchToTab(tab);

				// Notify extension of tab change
				window.vscode.postMessage({
					command: 'tabChange',
					data: { tab }
				});
			});
		});
	},

	/**
	 * Switches to specified tab
	 */
	switchToTab(tab) {
		// Update tab buttons
		document.querySelectorAll('.tab-button').forEach(btn => {
			if (btn.dataset.tab === tab) {
				btn.classList.add('active');
			} else {
				btn.classList.remove('active');
			}
		});

		// Update tab panels
		document.querySelectorAll('.tab-panel').forEach(panel => {
			if (panel.dataset.tabPanel === tab) {
				panel.classList.add('active');
			} else {
				panel.classList.remove('active');
			}
		});
	},

	/**
	 * Tree section toggle setup
	 */
	setupTreeSectionToggles() {
		document.querySelectorAll('.tree-section-header').forEach(header => {
			header.addEventListener('click', () => {
				const section = header.closest('.tree-section');
				const content = section.querySelector('.tree-section-content');
				const icon = header.querySelector('.tree-section-icon');

				if (content.style.display === 'none') {
					content.style.display = '';
					icon.textContent = '▼';
				} else {
					content.style.display = 'none';
					icon.textContent = '▶';
				}
			});
		});
	},

	/**
	 * Detail panel setup
	 */
	setupDetailPanel() {
		const closeButton = document.getElementById('detailPanelClose');
		if (closeButton) {
			closeButton.addEventListener('click', () => {
				this.hideDetailPanel();

				// Notify extension
				window.vscode.postMessage({
					command: 'closeDetailPanel'
				});
			});
		}

		// Detail tab switching
		document.querySelectorAll('.detail-tab-button').forEach(button => {
			button.addEventListener('click', () => {
				const tab = button.dataset.detailTab;
				this.switchDetailTab(tab);
			});
		});
	},

	/**
	 * Switches detail panel tab
	 */
	switchDetailTab(tab) {
		// Update tab button active states
		document.querySelectorAll('.detail-tab-button').forEach(btn => {
			if (btn.dataset.detailTab === tab) {
				btn.classList.add('active');
			} else {
				btn.classList.remove('active');
			}
		});

		// Update tab panel visibility
		document.querySelectorAll('.detail-tab-panel').forEach(panel => {
			if (panel.dataset.detailPanel === tab) {
				panel.classList.add('active');
				panel.style.display = 'block';
			} else {
				panel.classList.remove('active');
				panel.style.display = 'none';
			}
		});
	},

	/**
	 * Shows detail panel with metadata
	 */
	showDetailPanel(data) {
		console.log('[MetadataBrowser] showDetailPanel called', { data });

		const { tab, itemId, metadata } = data;

		if (!metadata) {
			console.error('[MetadataBrowser] No metadata provided to showDetailPanel');
			return;
		}

		// Set title
		const title = document.getElementById('detailPanelTitle');
		if (title) {
			title.textContent = this.getDetailTitle(tab, itemId);
		}

		// Render properties
		this.renderProperties(metadata);

		// Render raw data
		this.renderRawData(metadata);

		// Show panel
		const panel = document.getElementById('detailPanel');
		if (panel) {
			panel.style.display = 'flex';
			console.log('[MetadataBrowser] Detail panel displayed');
		} else {
			console.error('[MetadataBrowser] Detail panel element not found');
		}

		const resizeHandle = document.getElementById('detailPanelResizeHandle');
		if (resizeHandle) {
			resizeHandle.style.display = 'block';
		}

		// Re-attach detail tab event listeners (defensive programming)
		this.attachDetailTabListeners();

		// Switch to properties tab by default
		this.switchDetailTab('properties');
	},

	/**
	 * Attaches event listeners to detail panel tabs
	 */
	attachDetailTabListeners() {
		document.querySelectorAll('.detail-tab-button').forEach(button => {
			// Remove existing listener to avoid duplicates
			const newButton = button.cloneNode(true);
			button.parentNode.replaceChild(newButton, button);

			newButton.addEventListener('click', () => {
				const tab = newButton.dataset.detailTab;
				this.switchDetailTab(tab);
			});
		});
	},

	/**
	 * Hides detail panel
	 */
	hideDetailPanel() {
		const panel = document.getElementById('detailPanel');
		if (panel) {
			panel.style.display = 'none';
		}

		const resizeHandle = document.getElementById('detailPanelResizeHandle');
		if (resizeHandle) {
			resizeHandle.style.display = 'none';
		}

		// Reset to properties tab for next time
		this.switchDetailTab('properties');
	},

	/**
	 * Gets detail panel title
	 */
	getDetailTitle(tab, itemId) {
		const titles = {
			attributes: 'Attribute',
			keys: 'Key',
			oneToMany: '1:N Relationship',
			manyToOne: 'N:1 Relationship',
			manyToMany: 'N:N Relationship',
			privileges: 'Privilege',
			choiceValues: 'Choice Value'
		};
		return `${titles[tab]}: ${itemId}`;
	},

	/**
	 * Renders properties in detail panel
	 */
	renderProperties(metadata) {
		const container = document.getElementById('propertiesList');
		if (!container) return;

		const properties = this.flattenMetadata(metadata);
		container.innerHTML = properties.map(prop => {
			if (prop.isTable) {
				// Render as a table
				return `
					<div class="property-section">
						<div class="property-section-title">${escapeHtml(prop.name)}</div>
						${prop.value}
					</div>
				`;
			} else {
				// Render as a simple key-value pair
				return `
					<div class="property-item">
						<div class="property-name">${escapeHtml(prop.name)}</div>
						<div class="property-value">${escapeHtml(prop.value)}</div>
					</div>
				`;
			}
		}).join('');
	},

	/**
	 * Flattens metadata object into key-value pairs
	 * Special handling for option sets - renders as tables
	 */
	flattenMetadata(obj, prefix = '') {
		const result = [];

		for (const key in obj) {
			if (!obj.hasOwnProperty(key)) continue;

			const value = obj[key];

			if (value === null || value === undefined || value === '') {
				continue;
			}

			// Special handling for optionSet.options array
			if (key === 'options' && Array.isArray(value) && value.length > 0 &&
			    value[0].hasOwnProperty('value') && value[0].hasOwnProperty('label')) {
				result.push({
					name: 'Option Set Values',
					value: this.renderOptionsTable(value),
					isTable: true
				});
				continue;
			}

			// Check if this is a value object (object with only 'value' property)
			if (typeof value === 'object' && !Array.isArray(value) && value.hasOwnProperty('value')) {
				const keys = Object.keys(value);
				// If object only has 'value' property (or value + maybe null/undefined fields), unwrap it
				if (keys.length === 1 || (keys.length <= 3 && keys.includes('value'))) {
					const unwrappedValue = value.value;
					const displayName = this.formatPropertyName(prefix ? `${prefix}.${key}` : key);

					if (unwrappedValue === null || unwrappedValue === undefined || unwrappedValue === '') {
						continue;
					}

					if (typeof unwrappedValue === 'boolean') {
						result.push({ name: displayName, value: unwrappedValue ? 'Yes' : 'No' });
					} else {
						result.push({ name: displayName, value: String(unwrappedValue) });
					}
					continue;
				}
			}

			const fullKey = prefix ? `${prefix}.${key}` : key;

			if (typeof value === 'boolean') {
				result.push({ name: this.formatPropertyName(fullKey), value: value ? 'Yes' : 'No' });
			} else if (typeof value === 'object' && !Array.isArray(value)) {
				result.push(...this.flattenMetadata(value, fullKey));
			} else if (Array.isArray(value)) {
				value.forEach((item, index) => {
					if (typeof item === 'object') {
						result.push(...this.flattenMetadata(item, `${fullKey}[${index}]`));
					} else {
						result.push({ name: this.formatPropertyName(`${fullKey}[${index}]`), value: String(item) });
					}
				});
			} else {
				result.push({ name: this.formatPropertyName(fullKey), value: String(value) });
			}
		}

		return result;
	},

	/**
	 * Formats property name from camelCase to Title Case
	 * Examples: logicalName -> Logical Name, metadataId -> Metadata ID
	 */
	formatPropertyName(key) {
		// Remove prefixes from nested keys (e.g., "logicalName" not "prefix.logicalName")
		const parts = key.split('.');
		const lastPart = parts[parts.length - 1];

		// Handle array indices
		if (lastPart.includes('[')) {
			const baseName = lastPart.substring(0, lastPart.indexOf('['));
			const index = lastPart.substring(lastPart.indexOf('['));
			return this.formatPropertyName(baseName) + ' ' + index;
		}

		// Convert camelCase to Title Case
		const formatted = lastPart
			// Insert space before uppercase letters
			.replace(/([A-Z])/g, ' $1')
			// Capitalize first letter
			.replace(/^./, str => str.toUpperCase())
			.trim();

		// Special case: ID should be uppercase
		return formatted.replace(/\bId\b/g, 'ID');
	},

	/**
	 * Renders option set values as a formatted table
	 */
	renderOptionsTable(options) {
		const rows = options.map(opt => `
			<tr>
				<td>${escapeHtml(opt.label)}</td>
				<td>${escapeHtml(String(opt.value))}</td>
				<td><span class="color-badge" style="background-color: ${escapeHtml(opt.color || '#0000ff')}"></span> ${escapeHtml(opt.color || '#0000ff')}</td>
			</tr>
		`).join('');

		return `
			<table class="options-table">
				<thead>
					<tr>
						<th>Label</th>
						<th>Value</th>
						<th>Color</th>
					</tr>
				</thead>
				<tbody>
					${rows}
				</tbody>
			</table>
		`;
	},

	/**
	 * Renders raw JSON data
	 */
	renderRawData(metadata) {
		const container = document.getElementById('rawDataDisplay');
		if (!container) return;

		container.textContent = JSON.stringify(metadata, null, 2);
	},

	/**
	 * Selects an entity from tree
	 */
	selectEntity(logicalName) {
		// Update tree selection
		this.updateTreeSelection('entity', logicalName);

		// Notify extension
		window.vscode.postMessage({
			command: 'selectEntity',
			data: { logicalName }
		});
	},

	/**
	 * Selects a choice from tree
	 */
	selectChoice(name) {
		// Update tree selection
		this.updateTreeSelection('choice', name);

		// Notify extension
		window.vscode.postMessage({
			command: 'selectChoice',
			data: { name }
		});
	},

	/**
	 * Updates tree item selection
	 */
	updateTreeSelection(type, id) {
		// Remove all selections
		document.querySelectorAll('.tree-item.selected').forEach(item => {
			item.classList.remove('selected');
		});

		// Add selection to clicked item
		const item = document.querySelector(`.tree-item[data-type="${type}"][data-id="${id}"]`);
		if (item) {
			item.classList.add('selected');
		}
	},

	/**
	 * Opens detail panel
	 */
	openDetailPanel(tab, itemId, metadata) {
		console.log('[MetadataBrowser] openDetailPanel - posting message to extension', { tab, itemId, hasMetadata: !!metadata });
		window.vscode.postMessage({
			command: 'openDetailPanel',
			data: { tab, itemId, metadata }
		});
	},

	/**
	 * Navigates to related entity
	 */
	navigateToEntity(logicalName) {
		window.vscode.postMessage({
			command: 'navigateToEntity',
			data: { logicalName }
		});
	},

	/**
	 * Navigates via quick pick (N:N relationships)
	 */
	navigateToEntityQuickPick(entities) {
		window.vscode.postMessage({
			command: 'navigateToEntityQuickPick',
			data: { entities }
		});
	}
});

/**
 * Escapes HTML to prevent XSS
 */
function escapeHtml(text) {
	if (text === null || text === undefined) {
		return '';
	}
	const div = document.createElement('div');
	div.textContent = String(text);
	return div.innerHTML;
}

/**
 * Escapes attribute values
 */
function escapeAttr(text) {
	if (text === null || text === undefined) {
		return '';
	}
	return String(text).replace(/"/g, '&quot;');
}
