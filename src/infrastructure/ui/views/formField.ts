/**
 * Form field view function.
 * Renders a labeled input field with optional help text and validation.
 */

import { html, attrs } from '../utils/HtmlUtils';

export interface FormFieldProps {
	/** Unique identifier for the input element */
	id: string;
	/** Label text displayed above the input */
	label: string;
	/** Input type */
	type: 'text' | 'email' | 'password' | 'number' | 'url';
	/** Input name attribute (defaults to id) */
	name?: string;
	/** Current value of the input */
	value?: string;
	/** Placeholder text shown when input is empty */
	placeholder?: string;
	/** Help text displayed below the input */
	helpText?: string;
	/** Whether the field is required */
	required?: boolean;
	/** Whether the field is disabled */
	disabled?: boolean;
}

/**
 * Renders a form field with label, input, and optional help text.
 *
 * @param props - Form field configuration
 * @returns HTML string with auto-escaped values
 *
 * @example
 * renderFormField({
 *   id: 'email',
 *   label: 'Email Address',
 *   type: 'email',
 *   required: true,
 *   helpText: 'We will never share your email'
 * })
 */
export function renderFormField(props: FormFieldProps): string {
	return html`
		<div class="form-group">
			<label for="${props.id}">
				${props.label}${props.required ? ' *' : ''}
			</label>
			<input ${attrs({
				type: props.type,
				id: props.id,
				name: props.name || props.id,
				value: props.value,
				placeholder: props.placeholder,
				required: props.required,
				disabled: props.disabled
			})} />
			${props.helpText ? html`<span class="help-text">${props.helpText}</span>` : ''}
		</div>
	`.__html;
}
