import { MetadataBrowserLayoutSection } from './MetadataBrowserLayoutSection';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';

describe('MetadataBrowserLayoutSection', () => {
	let section: MetadataBrowserLayoutSection;

	beforeEach(() => {
		section = new MetadataBrowserLayoutSection();
	});

	describe('constructor and position', () => {
		it('should set position to Main', () => {
			expect(section.position).toBe(SectionPosition.Main);
		});

		it('should initialize with MetadataBrowserDetailSection', () => {
			const html = section.render({});

			// Should contain detail panel elements from MetadataBrowserDetailSection
			expect(html).toContain('id="metadataDetailPanel"');
		});
	});

	describe('complete layout structure', () => {
		it('should render three-panel layout container', () => {
			const html = section.render({});

			expect(html).toContain('class="metadata-browser-container"');
		});

		it('should render all three main panels (sidebar, content, detail)', () => {
			const html = section.render({});

			expect(html).toContain('class="metadata-sidebar"');
			expect(html).toContain('class="metadata-content"');
			expect(html).toContain('id="metadataDetailPanel"'); // Detail panel from detailSection
		});

		it('should render panels in correct order (left, center, right)', () => {
			const html = section.render({});

			const sidebarIndex = html.indexOf('class="metadata-sidebar"');
			const contentIndex = html.indexOf('class="metadata-content"');
			const detailIndex = html.indexOf('id="metadataDetailPanel"');

			expect(sidebarIndex).toBeGreaterThan(-1);
			expect(contentIndex).toBeGreaterThan(sidebarIndex);
			expect(detailIndex).toBeGreaterThan(contentIndex);
		});
	});

	describe('left panel structure (tree view)', () => {
		it('should render tree search container', () => {
			const html = section.render({});

			expect(html).toContain('class="tree-search-container"');
		});

		it('should render search input with correct attributes', () => {
			const html = section.render({});

			expect(html).toContain('type="text"');
			expect(html).toContain('id="treeSearch"');
			expect(html).toContain('class="tree-search-input"');
			expect(html).toContain('placeholder="🔍 Filter metadata..."');
			expect(html).toContain('autocomplete="off"');
		});

		it('should render tree container', () => {
			const html = section.render({});

			expect(html).toContain('class="tree-container"');
		});

		it('should render entities tree section', () => {
			const html = section.render({});

			expect(html).toContain('data-section="entities"');
			expect(html).toContain('class="tree-section-title">Entities</span>');
			expect(html).toContain('id="entitiesCount"');
			expect(html).toContain('id="entitiesTree"');
		});

		it('should render choices tree section', () => {
			const html = section.render({});

			expect(html).toContain('data-section="choices"');
			expect(html).toContain('class="tree-section-title">Global Choices</span>');
			expect(html).toContain('id="choicesCount"');
			expect(html).toContain('id="choicesTree"');
		});

		it('should render tree section headers with expand/collapse icons', () => {
			const html = section.render({});

			// Both sections should have tree-section-icon
			const iconMatches = html.match(/class="tree-section-icon">/g);
			expect(iconMatches).toHaveLength(2);

			// Both should have the expand icon (▼)
			expect(html).toContain('▼');
		});

		it('should render loading states for tree sections', () => {
			const html = section.render({});

			expect(html).toContain('class="tree-loading">Loading entities...</div>');
			expect(html).toContain('class="tree-loading">Loading choices...</div>');
		});

		it('should render count badges initialized to zero', () => {
			const html = section.render({});

			expect(html).toContain('id="entitiesCount">0</span>');
			expect(html).toContain('id="choicesCount">0</span>');
		});
	});

	describe('middle panel structure (tab navigation)', () => {
		it('should render tab navigation container', () => {
			const html = section.render({});

			expect(html).toContain('class="tab-navigation"');
			expect(html).toContain('id="tabNavigation"');
		});

		it('should render all tab buttons with correct data attributes', () => {
			const html = section.render({});

			expect(html).toContain('data-tab="attributes"');
			expect(html).toContain('data-tab="keys"');
			expect(html).toContain('data-tab="oneToMany"');
			expect(html).toContain('data-tab="manyToOne"');
			expect(html).toContain('data-tab="manyToMany"');
			expect(html).toContain('data-tab="privileges"');
			expect(html).toContain('data-tab="choiceValues"');
		});

		it('should render attributes tab button as active by default', () => {
			const html = section.render({});

			// Find the attributes tab button
			const attributesButtonMatch = html.match(
				/<button[^>]*data-tab="attributes"[^>]*>/
			);
			expect(attributesButtonMatch).toBeTruthy();
			expect(attributesButtonMatch?.[0]).toContain('class="tab-button active"');
		});

		it('should render choice values tab as hidden by default', () => {
			const html = section.render({});

			// Find the choiceValues tab button
			const choiceValuesButtonMatch = html.match(
				/<button[^>]*data-tab="choiceValues"[^>]*>/
			);
			expect(choiceValuesButtonMatch).toBeTruthy();
			expect(choiceValuesButtonMatch?.[0]).toContain('style="display: none;"');
		});

		it('should render tab buttons with correct labels', () => {
			const html = section.render({});

			expect(html).toContain('>Attributes</button>');
			expect(html).toContain('>Keys</button>');
			expect(html).toContain('>1:N Relationships</button>');
			expect(html).toContain('>N:1 Relationships</button>');
			expect(html).toContain('>N:N Relationships</button>');
			expect(html).toContain('>Privileges</button>');
			expect(html).toContain('>Choice Values</button>');
		});
	});

	describe('middle panel structure (tab content)', () => {
		it('should render tab content container', () => {
			const html = section.render({});

			expect(html).toContain('class="tab-content-container"');
		});

		it('should render all tab panels with correct data attributes', () => {
			const html = section.render({});

			expect(html).toContain('data-tab-panel="attributes"');
			expect(html).toContain('data-tab-panel="keys"');
			expect(html).toContain('data-tab-panel="oneToMany"');
			expect(html).toContain('data-tab-panel="manyToOne"');
			expect(html).toContain('data-tab-panel="manyToMany"');
			expect(html).toContain('data-tab-panel="privileges"');
			expect(html).toContain('data-tab-panel="choiceValues"');
		});

		it('should render attributes tab panel as active by default', () => {
			const html = section.render({});

			const attributesPanelMatch = html.match(
				/<div[^>]*data-tab-panel="attributes"[^>]*>/
			);
			expect(attributesPanelMatch).toBeTruthy();
			expect(attributesPanelMatch?.[0]).toContain('class="tab-panel active"');
		});

		it('should render table containers for all tabs', () => {
			const html = section.render({});

			// Each tab panel should have a table-container
			const tableContainerMatches = html.match(/class="table-container"/g);
			expect(tableContainerMatches).toHaveLength(7); // 7 tabs
		});

		it('should render search inputs for all table tabs', () => {
			const html = section.render({});

			expect(html).toContain('data-table="attributes"');
			expect(html).toContain('data-table="keys"');
			expect(html).toContain('data-table="oneToMany"');
			expect(html).toContain('data-table="manyToOne"');
			expect(html).toContain('data-table="manyToMany"');
			expect(html).toContain('data-table="privileges"');
			expect(html).toContain('data-table="choiceValues"');
		});

		it('should render correct search placeholders', () => {
			const html = section.render({});

			expect(html).toContain('placeholder="🔍 Search attributes..."');
			expect(html).toContain('placeholder="🔍 Search keys..."');
			expect(html).toContain('placeholder="🔍 Search 1:N relationships..."');
			expect(html).toContain('placeholder="🔍 Search N:1 relationships..."');
			expect(html).toContain('placeholder="🔍 Search N:N relationships..."');
			expect(html).toContain('placeholder="🔍 Search privileges..."');
			expect(html).toContain('placeholder="🔍 Search choice values..."');
		});
	});

	describe('table structure', () => {
		it('should render all tables with correct IDs', () => {
			const html = section.render({});

			expect(html).toContain('id="attributesTable"');
			expect(html).toContain('id="keysTable"');
			expect(html).toContain('id="oneToManyTable"');
			expect(html).toContain('id="manyToOneTable"');
			expect(html).toContain('id="manyToManyTable"');
			expect(html).toContain('id="privilegesTable"');
			expect(html).toContain('id="choiceValuesTable"');
		});

		it('should render attributes table with correct columns', () => {
			const html = section.render({});

			// Extract attributes table section
			const attributesTableMatch = html.match(
				/<table[^>]*id="attributesTable"[^>]*>[\s\S]*?<\/table>/
			);
			expect(attributesTableMatch).toBeTruthy();

			const tableHtml = attributesTableMatch?.[0] ?? '';
			expect(tableHtml).toContain('data-sort="displayName">Display Name</th>');
			expect(tableHtml).toContain('data-sort="logicalName">Logical Name</th>');
			expect(tableHtml).toContain('data-sort="type">Type</th>');
			expect(tableHtml).toContain('data-sort="required">Required</th>');
			expect(tableHtml).toContain('data-sort="maxLength">Max Length</th>');
		});

		it('should render keys table with correct columns', () => {
			const html = section.render({});

			const keysTableMatch = html.match(
				/<table[^>]*id="keysTable"[^>]*>[\s\S]*?<\/table>/
			);
			expect(keysTableMatch).toBeTruthy();

			const tableHtml = keysTableMatch?.[0] ?? '';
			expect(tableHtml).toContain('data-sort="name">Name</th>');
			expect(tableHtml).toContain('data-sort="type">Type</th>');
			expect(tableHtml).toContain('data-sort="keyAttributes">Key Attributes</th>');
		});

		it('should render oneToMany table with correct columns', () => {
			const html = section.render({});

			const oneToManyTableMatch = html.match(
				/<table[^>]*id="oneToManyTable"[^>]*>[\s\S]*?<\/table>/
			);
			expect(oneToManyTableMatch).toBeTruthy();

			const tableHtml = oneToManyTableMatch?.[0] ?? '';
			expect(tableHtml).toContain('data-sort="name">Schema Name</th>');
			expect(tableHtml).toContain('data-sort="relatedEntity">Related Entity</th>');
			expect(tableHtml).toContain('data-sort="referencingAttribute">Referencing Attribute</th>');
		});

		it('should render manyToOne table with correct columns', () => {
			const html = section.render({});

			const manyToOneTableMatch = html.match(
				/<table[^>]*id="manyToOneTable"[^>]*>[\s\S]*?<\/table>/
			);
			expect(manyToOneTableMatch).toBeTruthy();

			const tableHtml = manyToOneTableMatch?.[0] ?? '';
			expect(tableHtml).toContain('data-sort="name">Schema Name</th>');
			expect(tableHtml).toContain('data-sort="relatedEntity">Related Entity</th>');
			expect(tableHtml).toContain('data-sort="referencingAttribute">Referencing Attribute</th>');
		});

		it('should render manyToMany table with correct columns', () => {
			const html = section.render({});

			const manyToManyTableMatch = html.match(
				/<table[^>]*id="manyToManyTable"[^>]*>[\s\S]*?<\/table>/
			);
			expect(manyToManyTableMatch).toBeTruthy();

			const tableHtml = manyToManyTableMatch?.[0] ?? '';
			expect(tableHtml).toContain('data-sort="name">Schema Name</th>');
			expect(tableHtml).toContain('data-sort="relatedEntity">Related Entities</th>');
			expect(tableHtml).toContain('data-sort="referencingAttribute">Intersect Entity</th>');
		});

		it('should render privileges table with correct columns', () => {
			const html = section.render({});

			const privilegesTableMatch = html.match(
				/<table[^>]*id="privilegesTable"[^>]*>[\s\S]*?<\/table>/
			);
			expect(privilegesTableMatch).toBeTruthy();

			const tableHtml = privilegesTableMatch?.[0] ?? '';
			expect(tableHtml).toContain('data-sort="name">Name</th>');
			expect(tableHtml).toContain('data-sort="privilegeType">Type</th>');
			expect(tableHtml).toContain('data-sort="depths">Depth</th>');
		});

		it('should render choice values table with correct columns', () => {
			const html = section.render({});

			const choiceValuesTableMatch = html.match(
				/<table[^>]*id="choiceValuesTable"[^>]*>[\s\S]*?<\/table>/
			);
			expect(choiceValuesTableMatch).toBeTruthy();

			const tableHtml = choiceValuesTableMatch?.[0] ?? '';
			expect(tableHtml).toContain('data-sort="label">Label</th>');
			expect(tableHtml).toContain('data-sort="value">Value</th>');
			expect(tableHtml).toContain('data-sort="color">Color</th>');
		});

		it('should render empty tbody elements for all tables', () => {
			const html = section.render({});

			// All 7 tables should have empty tbody
			const tbodyMatches = html.match(/<tbody><\/tbody>/g);
			expect(tbodyMatches).toHaveLength(7);
		});

		it('should render table wrappers for all tables', () => {
			const html = section.render({});

			// All 7 tabs should have table-wrapper
			const tableWrapperMatches = html.match(/class="table-wrapper"/g);
			expect(tableWrapperMatches).toHaveLength(7);
		});
	});

	describe('empty state handling', () => {
		it('should render hidden empty state messages for all tabs', () => {
			const html = section.render({});

			// All empty states should be hidden initially
			const emptyStateMatches = html.match(
				/<div class="table-empty" style="display: none;">/g
			);
			expect(emptyStateMatches).toHaveLength(7);
		});

		it('should render correct empty state messages', () => {
			const html = section.render({});

			expect(html).toContain('<p>No attributes to display.</p>');
			expect(html).toContain('<p>No keys to display.</p>');
			expect(html).toContain('<p>No 1:N relationships to display.</p>');
			expect(html).toContain('<p>No N:1 relationships to display.</p>');
			expect(html).toContain('<p>No N:N relationships to display.</p>');
			expect(html).toContain('<p>No privileges to display.</p>');
			expect(html).toContain('<p>No choice values to display.</p>');
		});
	});

	describe('CSS class assignments', () => {
		it('should apply data-table class to all tables', () => {
			const html = section.render({});

			const dataTableMatches = html.match(/class="data-table"/g);
			expect(dataTableMatches).toHaveLength(7);
		});

		it('should apply tree-section class to both tree sections', () => {
			const html = section.render({});

			const treeSectionMatches = html.match(/class="tree-section"/g);
			expect(treeSectionMatches).toHaveLength(2);
		});

		it('should apply table-search class to all search inputs', () => {
			const html = section.render({});

			const tableSearchMatches = html.match(/class="table-search"/g);
			expect(tableSearchMatches).toHaveLength(7);
		});

		it('should apply table-toolbar class to all toolbars', () => {
			const html = section.render({});

			const toolbarMatches = html.match(/class="table-toolbar"/g);
			expect(toolbarMatches).toHaveLength(7);
		});
	});

	describe('data attributes for scripting', () => {
		it('should include data-tab attributes on main tab buttons', () => {
			const html = section.render({});

			// Count data-tab attributes on main tab buttons (not including detail panel tabs)
			const mainTabMatches = html.match(/<button class="tab-button[^>]*data-tab="/g);
			expect(mainTabMatches).toHaveLength(7);
		});

		it('should include data-tab-panel attributes on tab panels', () => {
			const html = section.render({});

			const dataPanelMatches = html.match(/data-tab-panel="/g);
			expect(dataPanelMatches).toHaveLength(7);
		});

		it('should include data-section attributes on tree headers', () => {
			const html = section.render({});

			expect(html).toContain('data-section="entities"');
			expect(html).toContain('data-section="choices"');
		});

		it('should include data-table attributes on search inputs', () => {
			const html = section.render({});

			const dataTableMatches = html.match(/data-table="/g);
			expect(dataTableMatches).toHaveLength(7);
		});

		it('should include data-sort attributes on table headers', () => {
			const html = section.render({});

			// Multiple sort attributes across all tables
			const dataSortMatches = html.match(/data-sort="/g);
			expect(dataSortMatches).not.toBeNull();
			expect(dataSortMatches!.length).toBeGreaterThan(20); // Multiple columns across tables
		});
	});

	describe('accessibility attributes', () => {
		it('should include autocomplete="off" on search inputs', () => {
			const html = section.render({});

			expect(html).toContain('id="treeSearch"');
			const treeSearchMatch = html.match(
				/<input[^>]*id="treeSearch"[^>]*>/
			);
			expect(treeSearchMatch?.[0]).toContain('autocomplete="off"');
		});

		it('should include type attributes on input elements', () => {
			const html = section.render({});

			const inputTypeMatches = html.match(/type="text"/g);
			expect(inputTypeMatches).not.toBeNull();
			expect(inputTypeMatches!.length).toBeGreaterThanOrEqual(8); // Tree search + 7 table searches
		});

		it('should include placeholder text on all search inputs', () => {
			const html = section.render({});

			const placeholderMatches = html.match(/placeholder="🔍/g);
			expect(placeholderMatches).toHaveLength(8); // 1 tree search + 7 table searches
		});
	});

	describe('resizable detail panel integration', () => {
		it('should render detail panel from MetadataBrowserDetailSection', () => {
			const html = section.render({});

			expect(html).toContain('id="metadataDetailPanel"');
		});

		it('should render detail panel with properties and raw data tabs', () => {
			const html = section.render({});

			expect(html).toContain('data-tab="properties"');
			expect(html).toContain('data-tab="rawData"');
		});

		it('should render detail panel with resize handle', () => {
			const html = section.render({});

			expect(html).toContain('id="detailPanelResizeHandle"');
			expect(html).toContain('class="detail-panel-resize-handle"');
		});

		it('should render detail panel initially hidden', () => {
			const html = section.render({});

			// Detail panel should have display: none
			const detailPanelMatch = html.match(
				/<div[^>]*id="metadataDetailPanel"[^>]*>/
			);
			expect(detailPanelMatch?.[0]).toContain('style="display: none;"');
		});
	});

	describe('nested container hierarchy', () => {
		it('should nest tree sections inside tree container', () => {
			const html = section.render({});

			const treeContainerMatch = html.match(
				/<div class="tree-container">[\s\S]*?<\/div>\s*<\/div>\s*<!-- Center Panel/
			);
			expect(treeContainerMatch).toBeTruthy();

			const containerContent = treeContainerMatch?.[0] ?? '';
			expect(containerContent).toContain('data-section="entities"');
			expect(containerContent).toContain('data-section="choices"');
		});

		it('should nest tab panels inside tab content container', () => {
			const html = section.render({});

			const tabContentMatch = html.match(
				/<div class="tab-content-container">[\s\S]*?<\/div>\s*<\/div>\s*<!-- Right Panel/
			);
			expect(tabContentMatch).toBeTruthy();

			const containerContent = tabContentMatch?.[0] ?? '';
			expect(containerContent).toContain('data-tab-panel="attributes"');
			expect(containerContent).toContain('data-tab-panel="keys"');
			expect(containerContent).toContain('data-tab-panel="choiceValues"');
		});

		it('should nest tables inside table wrappers', () => {
			const html = section.render({});

			// Each table should be inside a table-wrapper
			const wrapperMatches = html.match(
				/<div class="table-wrapper">[\s\S]*?<table class="data-table"/g
			);
			expect(wrapperMatches).toHaveLength(7);
		});

		it('should nest table wrappers inside table containers', () => {
			const html = section.render({});

			// Each table container should contain table-wrapper
			const containerMatches = html.match(
				/<div class="table-container">[\s\S]*?<div class="table-wrapper">/g
			);
			expect(containerMatches).toHaveLength(7);
		});
	});

	describe('layout responsiveness classes', () => {
		it('should use semantic container classes for layout', () => {
			const html = section.render({});

			expect(html).toContain('class="metadata-browser-container"');
			expect(html).toContain('class="metadata-sidebar"');
			expect(html).toContain('class="metadata-content"');
		});

		it('should use tree-specific classes for tree sections', () => {
			const html = section.render({});

			expect(html).toContain('class="tree-search-container"');
			expect(html).toContain('class="tree-search-input"');
			expect(html).toContain('class="tree-container"');
			expect(html).toContain('class="tree-section"');
			expect(html).toContain('class="tree-section-header"');
			expect(html).toContain('class="tree-section-icon"');
			expect(html).toContain('class="tree-section-title"');
			expect(html).toContain('class="tree-section-count"');
			expect(html).toContain('class="tree-section-content"');
		});

		it('should use tab-specific classes for tab components', () => {
			const html = section.render({});

			expect(html).toContain('class="tab-navigation"');
			expect(html).toContain('class="tab-button');
			expect(html).toContain('class="tab-content-container"');
			expect(html).toContain('class="tab-panel');
		});

		it('should use table-specific classes for table components', () => {
			const html = section.render({});

			expect(html).toContain('class="table-container"');
			expect(html).toContain('class="table-toolbar"');
			expect(html).toContain('class="table-search"');
			expect(html).toContain('class="table-wrapper"');
			expect(html).toContain('class="data-table"');
			expect(html).toContain('class="table-empty"');
		});
	});
});
