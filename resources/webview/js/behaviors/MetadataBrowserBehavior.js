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

import { JsonHighlighter } from '../utils/JsonHighlighter.js';

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
			case 'restoreDetailPanelWidth':
				this.restoreDetailPanelWidth(message.data.width);
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
	 * Shows loading state in tree sections
	 */
	showTreeLoading() {
		const entitiesTree = document.getElementById('entitiesTree');
		const choicesTree = document.getElementById('choicesTree');

		if (entitiesTree) {
			entitiesTree.innerHTML = '<div class="tree-loading">Loading entities...</div>';
		}
		if (choicesTree) {
			choicesTree.innerHTML = '<div class="tree-loading">Loading choices...</div>';
		}
	},

	/**
	 * Sets entity mode with all tabs
	 */
	setEntityMode(data) {
		const { entity, attributes, keys, oneToManyRelationships, manyToOneRelationships, manyToManyRelationships, privileges, selectedTab } = data;

		// Update selection header
		if (entity) {
			this.updateSelectionHeader({
				type: 'entity',
				icon: entity.icon || '📊',
				displayName: entity.displayName || 'Entity',
				technicalName: entity.logicalName || ''
			});
		}

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
		const { choice, choiceValues } = data;

		// Update selection header
		if (choice) {
			this.updateSelectionHeader({
				type: 'choice',
				icon: choice.icon || '🎨',
				displayName: choice.displayName || 'Global Choice',
				technicalName: choice.name || ''
			});
		}

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
		// Show loading state in tree
		this.showTreeLoading();

		// Reset counts
		const entitiesCount = document.getElementById('entitiesCount');
		const choicesCount = document.getElementById('choicesCount');
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

		// Hide selection header
		const selectionHeader = document.getElementById('selectionHeader');
		if (selectionHeader) {
			selectionHeader.style.display = 'none';
		}

		// Hide detail panel
		this.hideDetailPanel();
	},

	/**
	 * Updates the selection header with current entity/choice information.
	 * Shows breadcrumb with icon, display name, and technical name.
	 */
	updateSelectionHeader(selection) {
		const header = document.getElementById('selectionHeader');
		const icon = document.getElementById('selectionIcon');
		const name = document.getElementById('selectionName');
		const technical = document.getElementById('selectionTechnical');

		if (!header || !icon || !name || !technical) return;

		// Populate header content
		icon.textContent = selection.icon;
		name.textContent = selection.displayName;
		technical.textContent = selection.technicalName;

		// Show header
		header.style.display = 'flex';
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
			<tr data-index="${index}" class="${index % 2 === 0 ? 'row-even' : 'row-odd'}">
				<td title="${escapeHtml(rel.name)}">
					<a href="#" class="table-link" data-action="openDetail" data-tab="oneToMany" data-index="${index}">
						${escapeHtml(rel.name)}
					</a>
				</td>
				<td title="${escapeHtml(rel.relatedEntity)}">${this.renderRelatedEntity(rel)}</td>
				<td title="${escapeHtml(rel.referencingAttribute)}">${escapeHtml(rel.referencingAttribute)}</td>
			</tr>
		`).join('');

		// Attach handlers
		this.attachTableHandlers('oneToManyTable', relationships, 'oneToMany');
	},

	/**
	 * Renders N:1 relationships table
	 */
	renderManyToOneRelationshipsTable(relationships) {
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
			<tr data-index="${index}" class="${index % 2 === 0 ? 'row-even' : 'row-odd'}">
				<td title="${escapeHtml(rel.name)}">
					<a href="#" class="table-link" data-action="openDetail" data-tab="manyToOne" data-index="${index}">
						${escapeHtml(rel.name)}
					</a>
				</td>
				<td title="${escapeHtml(rel.relatedEntity)}">${this.renderRelatedEntity(rel)}</td>
				<td title="${escapeHtml(rel.referencingAttribute)}">${escapeHtml(rel.referencingAttribute)}</td>
			</tr>
		`).join('');

		// Attach handlers
		this.attachTableHandlers('manyToOneTable', relationships, 'manyToOne');
	},

	/**
	 * Renders N:N relationships table
	 */
	renderManyToManyRelationshipsTable(relationships) {
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
			<tr data-index="${index}" class="${index % 2 === 0 ? 'row-even' : 'row-odd'}">
				<td title="${escapeHtml(rel.name)}">
					<a href="#" class="table-link" data-action="openDetail" data-tab="manyToMany" data-index="${index}">
						${escapeHtml(rel.name)}
					</a>
				</td>
				<td title="${escapeHtml(rel.relatedEntity)}">${this.renderRelatedEntity(rel)}</td>
				<td title="${escapeHtml(rel.referencingAttribute)}">${escapeHtml(rel.referencingAttribute)}</td>
			</tr>
		`).join('');

		// Attach handlers
		this.attachTableHandlers('manyToManyTable', relationships, 'manyToMany');
	},

	/**
	 * Renders related entity with navigation link
	 */
	renderRelatedEntity(rel) {
		const escapedEntity = escapeHtml(rel.relatedEntity);
		if (rel.navigationType === 'entity') {
			const target = Array.isArray(rel.navigationTarget) ? rel.navigationTarget[0] : rel.navigationTarget;
			return `<a href="#" class="table-link" data-action="navigate" data-target="${escapeAttr(target)}" title="${escapedEntity}">${escapedEntity}</a>`;
		} else if (rel.navigationType === 'quickPick') {
			const targets = Array.isArray(rel.navigationTarget) ? rel.navigationTarget : [rel.navigationTarget];
			return `<a href="#" class="table-link" data-action="navigateQuickPick" data-targets="${escapeAttr(JSON.stringify(targets))}" title="${escapedEntity}">${escapedEntity}</a>`;
		}
		return escapedEntity;
	},

	/**
	 * Renders privileges table
	 */
	renderPrivilegesTable(privileges) {
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

		tbody.innerHTML = data.map((row, index) => `
			<tr data-index="${index}" class="${index % 2 === 0 ? 'row-even' : 'row-odd'}">
				${columns.map(col => {
					const value = row[col.key];
					const escapedValue = escapeHtml(value);
					const titleAttr = value ? ` title="${escapedValue}"` : '';
					if (col.isLinkable && row.isLinkable) {
						return `<td${titleAttr}><a href="#" class="table-link" data-action="openDetail" data-tab="${tab}" data-index="${index}">${escapedValue}</a></td>`;
					}
					return `<td${titleAttr}>${escapedValue}</td>`;
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

		links.forEach(link => {
			link.addEventListener('click', (e) => {
				e.preventDefault();
				const action = link.dataset.action;

				if (action === 'openDetail') {
					const index = parseInt(link.dataset.index);

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
				const tab = button.dataset.tab;
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
			if (btn.dataset.tab === tab) {
				btn.classList.add('active');
			} else {
				btn.classList.remove('active');
			}
		});

		// Update tab panel visibility
		document.querySelectorAll('.detail-tab-panel').forEach(panel => {
			if (panel.dataset.tab === tab) {
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
		const { tab, itemId, metadata, rawEntity } = data;

		if (!metadata) {
			console.error('[MetadataBrowser] No metadata provided to showDetailPanel');
			return;
		}

		// Set title
		const title = document.getElementById('detailPanelTitle');
		if (title) {
			title.textContent = this.getDetailTitle(tab, itemId);
		}

		// Update properties tab content (target INNER element by ID)
		const propertiesContent = document.getElementById('metadataPropertiesContent');
		if (propertiesContent) {
			this.renderProperties(metadata, propertiesContent);
		}

		// Update raw data tab content (target INNER element by ID)
		const rawDataContent = document.getElementById('metadataRawDataContent');
		if (rawDataContent) {
			this.renderRawData(rawEntity || metadata, rawDataContent);
		}

		// Show panel
		const panel = document.getElementById('metadataDetailPanel');
		if (panel) {
			panel.style.display = 'flex';
		} else {
			console.error('[MetadataBrowser] Detail panel element not found');
		}

		// Setup resize handle (only once, on first show)
		const resizeHandle = document.getElementById('detailPanelResizeHandle');
		if (resizeHandle && !this.resizeSetup) {
			this.setupDetailPanelResize(resizeHandle);
			this.resizeSetup = true;
		}

		// Switch to properties tab by default
		this.switchDetailTab('properties');
	},

	/**
	 * Hides detail panel
	 */
	hideDetailPanel() {
		const panel = document.getElementById('metadataDetailPanel');
		if (panel) {
			panel.style.display = 'none';
		}

		// Reset to properties tab for next time
		this.switchDetailTab('properties');
	},

	/**
	 * Restores detail panel width from persisted state.
	 */
	restoreDetailPanelWidth(width) {
		if (!width) {
			return;
		}

		const detailPanel = document.getElementById('metadataDetailPanel');
		if (!detailPanel) {
			return;
		}

		detailPanel.style.width = `${width}px`;
	},

	/**
	 * Sets up detail panel resize functionality
	 */
	setupDetailPanelResize(handle) {
		const detailPanel = document.getElementById('metadataDetailPanel');
		if (!detailPanel) {
			console.error('[MetadataBrowser] Cannot setup resize - panel not found');
			return;
		}

		let isResizing = false;
		let startX = 0;
		let startWidth = 0;

		const MIN_WIDTH = 300;
		const MAX_WIDTH = window.innerWidth * 0.8;

		handle.addEventListener('mousedown', (e) => {
			isResizing = true;
			startX = e.clientX;
			startWidth = detailPanel.offsetWidth;
			handle.classList.add('resizing');
			document.body.style.cursor = 'col-resize';
			document.body.style.userSelect = 'none';
			e.preventDefault();
		});

		document.addEventListener('mousemove', (e) => {
			if (!isResizing) {
				return;
			}

			const deltaX = startX - e.clientX;
			const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + deltaX));
			detailPanel.style.width = `${newWidth}px`;
			e.preventDefault();
		});

		document.addEventListener('mouseup', () => {
			if (!isResizing) {
				return;
			}

			isResizing = false;
			handle.classList.remove('resizing');
			document.body.style.cursor = '';
			document.body.style.userSelect = '';

			// Persist width preference via backend
			const currentWidth = detailPanel.offsetWidth;
			window.vscode.postMessage({
				command: 'saveDetailPanelWidth',
				data: { width: currentWidth }
			});
		});
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
	renderProperties(metadata, container) {
		if (!container) {
			console.error('[MetadataBrowser] Properties container not provided');
			return;
		}

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
		const rows = options.map(opt => {
			const escapedLabel = escapeHtml(opt.label);
			const escapedValue = escapeHtml(String(opt.value));
			const escapedColor = escapeHtml(opt.color || '#0000ff');
			return `
			<tr>
				<td title="${escapedLabel}">${escapedLabel}</td>
				<td title="${escapedValue}">${escapedValue}</td>
				<td title="${escapedColor}"><span class="color-badge" style="background-color: ${escapedColor}"></span> ${escapedColor}</td>
			</tr>
		`;
		}).join('');

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
	renderRawData(metadata, container) {
		if (!container) {
			console.error('[MetadataBrowser] Raw data container not provided');
			return;
		}

		// Inject JSON highlighter styles if not already present
		if (!document.getElementById('json-highlighter-styles')) {
			const nonceMeta = document.getElementById('vscode-csp-nonce');
			const nonce = nonceMeta ? nonceMeta.getAttribute('content') : '';

			const styleTag = document.createElement('style');
			styleTag.id = 'json-highlighter-styles';
			if (nonce) {
				styleTag.setAttribute('nonce', nonce);
			}
			styleTag.textContent = JsonHighlighter.getStyles();
			document.head.appendChild(styleTag);
		}

		// Wrap in a pre tag for proper formatting
		const preWrapper = document.createElement('pre');
		preWrapper.className = 'raw-data-display';
		preWrapper.innerHTML = JsonHighlighter.highlight(metadata);

		// Clear container and add pre wrapper
		container.innerHTML = '';
		container.appendChild(preWrapper);
	},

	/**
	 * Selects an entity from tree
	 */
	selectEntity(logicalName) {
		// Update tree selection
		this.updateTreeSelection('entity', logicalName);

		// Show loading state in all entity tables with descriptive messages
		const tableMessages = {
			'attributesTable': `Loading ${logicalName} attributes...`,
			'keysTable': `Loading ${logicalName} keys...`,
			'oneToManyTable': `Loading ${logicalName} 1:N relationships...`,
			'manyToOneTable': `Loading ${logicalName} N:1 relationships...`,
			'manyToManyTable': `Loading ${logicalName} N:N relationships...`,
			'privilegesTable': `Loading ${logicalName} privileges...`
		};

		Object.keys(tableMessages).forEach(tableId => {
			window.TableRenderer.showTableLoading(tableId, tableMessages[tableId]);
		});

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

		// Show loading state in choice values table with descriptive message
		window.TableRenderer.showTableLoading('choiceValuesTable', `Loading ${name} choice values...`);

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
