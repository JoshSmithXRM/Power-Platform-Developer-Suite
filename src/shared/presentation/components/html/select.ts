/**
 * Select dropdown view function.
 * Renders a labeled select element with options.
 */

import { html, attrs, each } from '../../../../infrastructure/ui/utils/HtmlUtils';

export interface SelectOption {
	/** Option value */
	value: string;
	/** Option display label */
	label: string;
}

export interface SelectProps {
	/** Unique identifier for the select element */
	id: string;
	/** Label text displayed above the select */
	label: string;
	/** Select name attribute (defaults to id) */
	name?: string;
	/** Currently selected value */
	value?: string;
	/** Select options */
	options: SelectOption[];
	/** Help text displayed below the select */
	helpText?: string;
	/** Whether the field is required */
	required?: boolean;
	/** Whether the field is disabled */
	disabled?: boolean;
}

/**
 * Renders a select dropdown with label and options.
 *
 * @param props - Select configuration
 * @returns HTML string with auto-escaped values
 *
 * @example
 * renderSelect({
 *   id: 'country',
 *   label: 'Country',
 *   options: [
 *     { value: 'us', label: 'United States' },
 *     { value: 'ca', label: 'Canada' }
 *   ],
 *   required: true
 * })
 */
export function renderSelect(props: SelectProps): string {
	return html`
		<div class="form-group">
			<label for="${props.id}">
				${props.label}${props.required ? ' *' : ''}
			</label>
			<select ${attrs({
				id: props.id,
				name: props.name || props.id,
				required: props.required,
				disabled: props.disabled
			})}>
				${each(props.options, option => html`
					<option value="${option.value}" ${option.value === props.value ? 'selected' : ''}>
						${option.label}
					</option>
				`)}
			</select>
			${props.helpText ? html`<span class="help-text">${props.helpText}</span>` : ''}
		</div>
	`.__html;
}
