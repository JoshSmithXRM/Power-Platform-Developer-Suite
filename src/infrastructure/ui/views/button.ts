/**
 * Button view function.
 * Renders a button with variant styles.
 */

import { html, attrs } from '../utils/HtmlUtils';

export interface ButtonProps {
	/** Unique identifier for the button */
	id: string;
	/** Button text content */
	text: string;
	/** Button variant style */
	variant?: 'primary' | 'secondary' | 'danger';
	/** Button type */
	type?: 'button' | 'submit' | 'reset';
	/** Whether the button is disabled */
	disabled?: boolean;
	/** Inline styles (use sparingly) */
	style?: string;
}

/**
 * Renders a button with variant styles.
 *
 * @param props - Button configuration
 * @returns HTML string for button element
 *
 * @example
 * renderButton({
 *   id: 'saveButton',
 *   text: 'Save Changes',
 *   variant: 'primary',
 *   type: 'submit'
 * })
 */
export function renderButton(props: ButtonProps): string {
	const variant = props.variant || 'primary';
	const type = props.type || 'button';

	return html`
		<button ${attrs({
			id: props.id,
			class: `button ${variant}`,
			type: type,
			disabled: props.disabled,
			style: props.style
		})}>
			${props.text}
		</button>
	`;
}
