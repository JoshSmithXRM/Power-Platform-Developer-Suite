import type { ISection } from '../../../../shared/infrastructure/ui/sections/ISection';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import type { SectionRenderData } from '../../../../shared/infrastructure/ui/types/SectionRenderData';

import { MetadataBrowserDetailSection } from './MetadataBrowserDetailSection';

/**
 * Custom section that renders three-panel metadata browser layout.
 *
 * Layout Structure:
 * - Left sidebar: Tree view (entities and choices)
 * - Center panel: Tab-based tables (Attributes, Keys, Relationships, Privileges, Choice Values)
 * - Right panel: Resizable detail panel (Properties and Raw Data tabs)
 *
 * Client-side behavior loaded from MetadataBrowserBehavior.js handles:
 * - Tree filtering and navigation
 * - Tab switching
 * - Table rendering (uses TableRenderer.js)
 * - Detail panel open/close/resize
 */
export class MetadataBrowserLayoutSection implements ISection {
	readonly position = SectionPosition.Main;
	private readonly detailSection: MetadataBrowserDetailSection;

	constructor() {
		this.detailSection = new MetadataBrowserDetailSection();
	}

	render(_data: SectionRenderData): string {
		return `
			<div class="metadata-browser-container">
				<!-- Left Sidebar: Tree View -->
				<div class="metadata-sidebar">
					<div class="tree-search-container">
						<input
							type="text"
							id="treeSearch"
							class="tree-search-input"
							placeholder="🔍 Filter metadata..."
							autocomplete="off"
						/>
					</div>

					<div class="tree-container">
						<!-- Entities Section -->
						<div class="tree-section">
							<div class="tree-section-header" data-section="entities">
								<span class="tree-section-icon">▼</span>
								<span class="tree-section-title">Entities</span>
								<span class="tree-section-count" id="entitiesCount">0</span>
							</div>
							<div class="tree-section-content" id="entitiesTree">
								<div class="tree-loading">Loading entities...</div>
							</div>
						</div>

						<!-- Choices Section -->
						<div class="tree-section">
							<div class="tree-section-header" data-section="choices">
								<span class="tree-section-icon">▼</span>
								<span class="tree-section-title">Global Choices</span>
								<span class="tree-section-count" id="choicesCount">0</span>
							</div>
							<div class="tree-section-content" id="choicesTree">
								<div class="tree-loading">Loading choices...</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Center Panel: Tabbed Content -->
				<div class="metadata-content">
					<!-- Selection Header (Breadcrumb) -->
					<div class="selection-header" id="selectionHeader" style="display: none;">
						<span class="selection-icon" id="selectionIcon"></span>
						<div class="selection-info">
							<span class="selection-name" id="selectionName"></span>
							<span class="selection-technical" id="selectionTechnical"></span>
						</div>
					</div>

					<!-- Tab Navigation -->
					<div class="tab-navigation" id="tabNavigation">
						<!-- Tabs will be dynamically shown/hidden based on selection type -->
						<button class="tab-button active" data-tab="attributes">Attributes</button>
						<button class="tab-button" data-tab="keys">Keys</button>
						<button class="tab-button" data-tab="oneToMany">1:N Relationships</button>
						<button class="tab-button" data-tab="manyToOne">N:1 Relationships</button>
						<button class="tab-button" data-tab="manyToMany">N:N Relationships</button>
						<button class="tab-button" data-tab="privileges">Privileges</button>
						<button class="tab-button" data-tab="choiceValues" style="display: none;">Choice Values</button>
					</div>

					<!-- Tab Content Panels -->
					<div class="tab-content-container">
						<!-- Attributes Tab -->
						<div class="tab-panel active" data-tab-panel="attributes">
							<div class="table-container">
								<div class="table-toolbar">
									<input
										type="text"
										class="table-search"
										placeholder="🔍 Search attributes..."
										data-table="attributes"
									/>
								</div>
								<div class="table-wrapper">
									<table class="data-table" id="attributesTable">
										<thead>
											<tr>
												<th data-sort="displayName">Display Name</th>
												<th data-sort="logicalName">Logical Name</th>
												<th data-sort="type">Type</th>
												<th data-sort="required">Required</th>
												<th data-sort="maxLength">Max Length</th>
											</tr>
										</thead>
										<tbody></tbody>
									</table>
								</div>
								<div class="table-empty" style="display: none;">
									<p>No attributes to display.</p>
								</div>
							</div>
						</div>

						<!-- Keys Tab -->
						<div class="tab-panel" data-tab-panel="keys">
							<div class="table-container">
								<div class="table-toolbar">
									<input
										type="text"
										class="table-search"
										placeholder="🔍 Search keys..."
										data-table="keys"
									/>
								</div>
								<div class="table-wrapper">
									<table class="data-table" id="keysTable">
										<thead>
											<tr>
												<th data-sort="name">Name</th>
												<th data-sort="type">Type</th>
												<th data-sort="keyAttributes">Key Attributes</th>
											</tr>
										</thead>
										<tbody></tbody>
									</table>
								</div>
								<div class="table-empty" style="display: none;">
									<p>No keys to display.</p>
								</div>
							</div>
						</div>

						<!-- 1:N Relationships Tab -->
						<div class="tab-panel" data-tab-panel="oneToMany">
							<div class="table-container">
								<div class="table-toolbar">
									<input
										type="text"
										class="table-search"
										placeholder="🔍 Search 1:N relationships..."
										data-table="oneToMany"
									/>
								</div>
								<div class="table-wrapper">
									<table class="data-table" id="oneToManyTable">
										<thead>
											<tr>
												<th data-sort="name">Schema Name</th>
												<th data-sort="relatedEntity">Related Entity</th>
												<th data-sort="referencingAttribute">Referencing Attribute</th>
											</tr>
										</thead>
										<tbody></tbody>
									</table>
								</div>
								<div class="table-empty" style="display: none;">
									<p>No 1:N relationships to display.</p>
								</div>
							</div>
						</div>

						<!-- N:1 Relationships Tab -->
						<div class="tab-panel" data-tab-panel="manyToOne">
							<div class="table-container">
								<div class="table-toolbar">
									<input
										type="text"
										class="table-search"
										placeholder="🔍 Search N:1 relationships..."
										data-table="manyToOne"
									/>
								</div>
								<div class="table-wrapper">
									<table class="data-table" id="manyToOneTable">
										<thead>
											<tr>
												<th data-sort="name">Schema Name</th>
												<th data-sort="relatedEntity">Related Entity</th>
												<th data-sort="referencingAttribute">Referencing Attribute</th>
											</tr>
										</thead>
										<tbody></tbody>
									</table>
								</div>
								<div class="table-empty" style="display: none;">
									<p>No N:1 relationships to display.</p>
								</div>
							</div>
						</div>

						<!-- N:N Relationships Tab -->
						<div class="tab-panel" data-tab-panel="manyToMany">
							<div class="table-container">
								<div class="table-toolbar">
									<input
										type="text"
										class="table-search"
										placeholder="🔍 Search N:N relationships..."
										data-table="manyToMany"
									/>
								</div>
								<div class="table-wrapper">
									<table class="data-table" id="manyToManyTable">
										<thead>
											<tr>
												<th data-sort="name">Schema Name</th>
												<th data-sort="relatedEntity">Related Entities</th>
												<th data-sort="referencingAttribute">Intersect Entity</th>
											</tr>
										</thead>
										<tbody></tbody>
									</table>
								</div>
								<div class="table-empty" style="display: none;">
									<p>No N:N relationships to display.</p>
								</div>
							</div>
						</div>

						<!-- Privileges Tab -->
						<div class="tab-panel" data-tab-panel="privileges">
							<div class="table-container">
								<div class="table-toolbar">
									<input
										type="text"
										class="table-search"
										placeholder="🔍 Search privileges..."
										data-table="privileges"
									/>
								</div>
								<div class="table-wrapper">
									<table class="data-table" id="privilegesTable">
										<thead>
											<tr>
												<th data-sort="name">Name</th>
												<th data-sort="privilegeType">Type</th>
												<th data-sort="depths">Depth</th>
											</tr>
										</thead>
										<tbody></tbody>
									</table>
								</div>
								<div class="table-empty" style="display: none;">
									<p>No privileges to display.</p>
								</div>
							</div>
						</div>

						<!-- Choice Values Tab -->
						<div class="tab-panel" data-tab-panel="choiceValues">
							<div class="table-container">
								<div class="table-toolbar">
									<input
										type="text"
										class="table-search"
										placeholder="🔍 Search choice values..."
										data-table="choiceValues"
									/>
								</div>
								<div class="table-wrapper">
									<table class="data-table" id="choiceValuesTable">
										<thead>
											<tr>
												<th data-sort="label">Label</th>
												<th data-sort="value">Value</th>
												<th data-sort="color">Color</th>
											</tr>
										</thead>
										<tbody></tbody>
									</table>
								</div>
								<div class="table-empty" style="display: none;">
									<p>No choice values to display.</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Right Panel: Resizable detail panel (rendered by MetadataBrowserDetailSection) -->
				${this.detailSection.render(_data)}
			</div>
		`;
	}
}
