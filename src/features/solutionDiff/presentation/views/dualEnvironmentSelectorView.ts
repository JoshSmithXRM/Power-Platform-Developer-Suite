/**
 * View rendering for dual environment selector.
 * Generates HTML for source and target environment dropdowns.
 */

import { escapeHtml } from '../../../../shared/infrastructure/ui/views/htmlHelpers';

export interface EnvironmentOption {
  readonly id: string;
  readonly name: string;
}

/**
 * Renders dual environment selector dropdowns (source and target).
 */
export function renderDualEnvironmentSelector(
  environments: ReadonlyArray<EnvironmentOption>,
  sourceEnvironmentId: string | undefined,
  targetEnvironmentId: string | undefined
): string {
  if (environments.length === 0) {
    return `
      <div class="dual-environment-selector">
        <p class="no-environments">No environments configured. Use "Power Platform: Setup Environment" to add environments.</p>
      </div>
    `;
  }

  const renderOptions = (selectedId: string | undefined): string => {
    // Add placeholder option if no environment is pre-selected
    const placeholder = selectedId === undefined
      ? '<option value="" selected>-- Select environment --</option>'
      : '<option value="">-- Select environment --</option>';

    const envOptions = environments.map(env => {
      const selected = env.id === selectedId ? ' selected' : '';
      return `<option value="${escapeHtml(env.id)}"${selected}>${escapeHtml(env.name)}</option>`;
    }).join('');

    return placeholder + envOptions;
  };

  return `
    <div class="dual-environment-selector">
      <div class="environment-selector-group">
        <label for="sourceEnvironmentSelect">Source Environment:</label>
        <select id="sourceEnvironmentSelect" class="environment-dropdown">
          ${renderOptions(sourceEnvironmentId)}
        </select>
      </div>

      <div class="comparison-arrow">
        <span class="arrow-icon">&rarr;</span>
      </div>

      <div class="environment-selector-group">
        <label for="targetEnvironmentSelect">Target Environment:</label>
        <select id="targetEnvironmentSelect" class="environment-dropdown">
          ${renderOptions(targetEnvironmentId)}
        </select>
      </div>
    </div>
  `;
}
