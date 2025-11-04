/**
 * Unit tests for toolbar button rendering utilities
 */

import { renderToolbarButtons } from './toolbarButtons';
import type { ToolbarButtonConfig } from '../DataTablePanel';

describe('toolbarButtons', () => {
	describe('renderToolbarButtons', () => {
		it('should return empty string for empty array', () => {
			const result = renderToolbarButtons([]);
			expect(result).toBe('');
		});

		it('should render single button with default position (left)', () => {
			const buttons: ReadonlyArray<ToolbarButtonConfig> = [
				{
					id: 'testBtn',
					label: 'Test Button',
					command: 'testCommand'
				}
			];

			const result = renderToolbarButtons(buttons);

			expect(result).toContain('.toolbar-left');
			expect(result).toContain('testBtn');
			expect(result).toContain('Test Button');
			expect(result).toContain('testCommand');
		});

		it('should render button with left position explicitly', () => {
			const buttons: ReadonlyArray<ToolbarButtonConfig> = [
				{
					id: 'leftBtn',
					label: 'Left Button',
					command: 'leftCommand',
					position: 'left'
				}
			];

			const result = renderToolbarButtons(buttons);

			expect(result).toContain('.toolbar-left');
			expect(result).not.toContain('.toolbar-right');
		});

		it('should render button with right position', () => {
			const buttons: ReadonlyArray<ToolbarButtonConfig> = [
				{
					id: 'rightBtn',
					label: 'Right Button',
					command: 'rightCommand',
					position: 'right'
				}
			];

			const result = renderToolbarButtons(buttons);

			expect(result).toContain('.toolbar-right');
			expect(result).not.toContain('.toolbar-left');
		});

		it('should render multiple buttons', () => {
			const buttons: ReadonlyArray<ToolbarButtonConfig> = [
				{
					id: 'btn1',
					label: 'Button 1',
					command: 'cmd1',
					position: 'left'
				},
				{
					id: 'btn2',
					label: 'Button 2',
					command: 'cmd2',
					position: 'right'
				}
			];

			const result = renderToolbarButtons(buttons);

			expect(result).toContain('btn1');
			expect(result).toContain('Button 1');
			expect(result).toContain('cmd1');
			expect(result).toContain('btn2');
			expect(result).toContain('Button 2');
			expect(result).toContain('cmd2');
		});

		it('should include duplicate prevention check', () => {
			const buttons: ReadonlyArray<ToolbarButtonConfig> = [
				{
					id: 'testBtn',
					label: 'Test',
					command: 'test'
				}
			];

			const result = renderToolbarButtons(buttons);

			expect(result).toContain('document.getElementById');
			expect(result).toContain('!document.getElementById(\'testBtn\')');
		});

		it('should attach click event listener', () => {
			const buttons: ReadonlyArray<ToolbarButtonConfig> = [
				{
					id: 'clickBtn',
					label: 'Click Me',
					command: 'clickCommand'
				}
			];

			const result = renderToolbarButtons(buttons);

			expect(result).toContain('addEventListener(\'click\'');
			expect(result).toContain('vscode.postMessage');
		});

		it('should use unique variable names per button', () => {
			const buttons: ReadonlyArray<ToolbarButtonConfig> = [
				{
					id: 'btn1',
					label: 'Button 1',
					command: 'cmd1'
				},
				{
					id: 'btn2',
					label: 'Button 2',
					command: 'cmd2'
				}
			];

			const result = renderToolbarButtons(buttons);

			expect(result).toContain('toolbar_btn1');
			expect(result).toContain('btn_btn1');
			expect(result).toContain('toolbar_btn2');
			expect(result).toContain('btn_btn2');
		});

		it('should append button to correct toolbar container', () => {
			const buttons: ReadonlyArray<ToolbarButtonConfig> = [
				{
					id: 'appendBtn',
					label: 'Append',
					command: 'append'
				}
			];

			const result = renderToolbarButtons(buttons);

			expect(result).toContain('appendChild(btn_appendBtn)');
		});
	});
});
