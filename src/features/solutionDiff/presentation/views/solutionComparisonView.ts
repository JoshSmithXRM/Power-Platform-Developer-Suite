/**
 * View rendering for solution comparison results.
 * Generates HTML for displaying side-by-side solution metadata comparison.
 */

import { escapeHtml, classNames } from '../../../../shared/infrastructure/ui/views/htmlHelpers';
import type { SolutionComparisonViewModel, SolutionOptionViewModel } from '../../application/viewModels/SolutionComparisonViewModel';

/**
 * Renders solution selector dropdown.
 */
export function renderSolutionSelector(
  solutions: ReadonlyArray<SolutionOptionViewModel>,
  selectedUniqueName: string | undefined,
  isLoading: boolean
): string {
  if (isLoading) {
    return `
      <div class="solution-selector">
        <label for="solutionSelect">Select Solution:</label>
        <select id="solutionSelect" class="solution-dropdown" disabled>
          <option value="">Loading solutions...</option>
        </select>
      </div>
    `;
  }

  if (solutions.length === 0) {
    return `
      <div class="solution-selector">
        <label for="solutionSelect">Select Solution:</label>
        <select id="solutionSelect" class="solution-dropdown" disabled>
          <option value="">No solutions found</option>
        </select>
      </div>
    `;
  }

  const options = solutions.map(sol => {
    const selected = sol.uniqueName === selectedUniqueName ? ' selected' : '';
    return `<option value="${escapeHtml(sol.uniqueName)}"${selected}>${escapeHtml(sol.name)}</option>`;
  }).join('');

  return `
    <div class="solution-selector">
      <label for="solutionSelect">Select Solution:</label>
      <select id="solutionSelect" class="solution-dropdown">
        <option value="">-- Select a solution --</option>
        ${options}
      </select>
    </div>
  `;
}

/**
 * Renders comparison placeholder when no solution is selected.
 */
export function renderComparisonPlaceholder(): string {
  return `
    <div class="comparison-placeholder">
      <div class="placeholder-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 12h6M12 9v6M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <p>Select a solution above to compare between environments.</p>
    </div>
  `;
}

/**
 * Renders comparison loading state.
 */
export function renderComparisonLoading(): string {
  return `
    <div class="comparison-loading">
      <div class="loading-spinner"></div>
      <p>Comparing solutions...</p>
    </div>
  `;
}

/**
 * Renders solution comparison results.
 */
export function renderSolutionComparison(comparison: SolutionComparisonViewModel): string {
  const statusClass = getStatusClass(comparison.status);
  const statusIcon = getStatusIcon(comparison.status);

  return `
    <div class="comparison-results">
      <div class="comparison-header">
        <h3>${escapeHtml(comparison.solutionName)}</h3>
        <div class="${classNames({ 'comparison-status': true, [statusClass]: true })}">
          ${statusIcon}
          <span>${escapeHtml(comparison.summary)}</span>
        </div>
      </div>

      ${renderMetadataTable(comparison)}

      ${comparison.differences.length > 0 ? renderDifferencesList(comparison.differences) : ''}
    </div>
  `;
}

/**
 * Renders side-by-side metadata comparison table.
 */
function renderMetadataTable(comparison: SolutionComparisonViewModel): string {
  const source = comparison.source;
  const target = comparison.target;

  const rows = [
    { label: 'Version', source: source?.version, target: target?.version },
    { label: 'Type', source: source?.managedStateDisplay, target: target?.managedStateDisplay },
    { label: 'Publisher', source: source?.publisherName, target: target?.publisherName },
    { label: 'Modified', source: source?.modifiedOn, target: target?.modifiedOn },
    { label: 'Installed', source: source?.installedOn, target: target?.installedOn }
  ];

  const tableRows = rows.map(row => {
    const sourceValue = row.source ?? 'N/A';
    const targetValue = row.target ?? 'N/A';
    const isDifferent = row.source !== row.target;
    const rowClass = isDifferent ? 'diff-row' : '';

    return `
      <tr class="${rowClass}">
        <td class="property-label">${escapeHtml(row.label)}</td>
        <td class="source-value">${escapeHtml(sourceValue)}</td>
        <td class="target-value">${escapeHtml(targetValue)}</td>
      </tr>
    `;
  }).join('');

  return `
    <table class="comparison-table">
      <thead>
        <tr>
          <th>Property</th>
          <th>Source</th>
          <th>Target</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;
}

/**
 * Renders list of differences.
 */
function renderDifferencesList(differences: readonly string[]): string {
  const items = differences.map(diff => `<li>${escapeHtml(diff)}</li>`).join('');

  return `
    <div class="differences-section">
      <h4>Changes:</h4>
      <ul class="differences-list">
        ${items}
      </ul>
    </div>
  `;
}

/**
 * Gets CSS class for comparison status.
 */
function getStatusClass(status: string): string {
  switch (status) {
    case 'Same': return 'status-same';
    case 'Different': return 'status-different';
    case 'SourceOnly': return 'status-source-only';
    case 'TargetOnly': return 'status-target-only';
    default: return '';
  }
}

/**
 * Gets icon SVG for comparison status.
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case 'Same':
      return '<svg class="status-icon" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
    case 'Different':
      return '<svg class="status-icon" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
    case 'SourceOnly':
    case 'TargetOnly':
      return '<svg class="status-icon" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>';
    default:
      return '';
  }
}
