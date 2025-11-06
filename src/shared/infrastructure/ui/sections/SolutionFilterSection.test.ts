import { SolutionFilterSection } from './SolutionFilterSection';
import { SectionPosition } from '../types/SectionPosition';
import type { SolutionOption } from '../views/solutionFilterView';

describe('SolutionFilterSection', () => {
	describe('constructor', () => {
		it('should create section with toolbar position', () => {
			const section = new SolutionFilterSection();

			expect(section.position).toBe(SectionPosition.Toolbar);
		});

		it('should create section with custom label', () => {
			const section = new SolutionFilterSection({ label: 'Filter by Solution:' });

			expect(section).toBeDefined();
		});

		it('should create section with includeAllOption config', () => {
			const section = new SolutionFilterSection({ includeAllOption: false });

			expect(section).toBeDefined();
		});
	});

	describe('render', () => {
		it('should render empty string when no solutions', () => {
			const section = new SolutionFilterSection();

			const html = section.render({ solutions: [] });

			expect(html).toBe('');
		});

		it('should render single solution', () => {
			const section = new SolutionFilterSection();
			const solutions: SolutionOption[] = [
				{ id: 'sol-1', name: 'My Solution', uniqueName: 'MySolution' }
			];

			const html = section.render({ solutions });

			expect(html).toContain('id="solutionSelect"');
			expect(html).toContain('value="sol-1"');
			expect(html).toContain('My Solution');
		});

		it('should render multiple solutions', () => {
			const section = new SolutionFilterSection();
			const solutions: SolutionOption[] = [
				{ id: 'sol-1', name: 'Solution A', uniqueName: 'SolutionA' },
				{ id: 'sol-2', name: 'Solution B', uniqueName: 'SolutionB' }
			];

			const html = section.render({ solutions });

			expect(html).toContain('value="sol-1"');
			expect(html).toContain('Solution A');
			expect(html).toContain('value="sol-2"');
			expect(html).toContain('Solution B');
		});

		it('should include "All Solutions" option by default', () => {
			const section = new SolutionFilterSection();
			const solutions: SolutionOption[] = [
				{ id: 'sol-1', name: 'My Solution', uniqueName: 'MySolution' }
			];

			const html = section.render({ solutions });

			expect(html).toContain('All Solutions');
			expect(html).toContain('value=""');
		});

		it('should not include "All Solutions" option when includeAllOption is false', () => {
			const section = new SolutionFilterSection({ includeAllOption: false });
			const solutions: SolutionOption[] = [
				{ id: 'sol-1', name: 'My Solution', uniqueName: 'MySolution' }
			];

			const html = section.render({ solutions });

			expect(html).not.toContain('All Solutions');
		});

		it('should mark "All Solutions" as selected when currentSolutionId is undefined', () => {
			const section = new SolutionFilterSection();
			const solutions: SolutionOption[] = [
				{ id: 'sol-1', name: 'My Solution', uniqueName: 'MySolution' }
			];

			const html = section.render({ solutions });

			const allOption = html.match(/<option value=""[^>]*>/);
			expect(allOption).toBeDefined();
			expect(allOption![0]).toContain('selected');
		});

		it('should mark selected solution with selected attribute', () => {
			const section = new SolutionFilterSection();
			const solutions: SolutionOption[] = [
				{ id: 'sol-1', name: 'Solution A', uniqueName: 'SolutionA' },
				{ id: 'sol-2', name: 'Solution B', uniqueName: 'SolutionB' }
			];

			const html = section.render({
				solutions,
				currentSolutionId: 'sol-2'
			});

			const solutionBOption = html.match(/<option value="sol-2"[^>]*>/);
			expect(solutionBOption).toBeDefined();
			expect(solutionBOption![0]).toContain('selected');
		});

		it('should not mark "All Solutions" as selected when a specific solution is selected', () => {
			const section = new SolutionFilterSection();
			const solutions: SolutionOption[] = [
				{ id: 'sol-1', name: 'My Solution', uniqueName: 'MySolution' }
			];

			const html = section.render({
				solutions,
				currentSolutionId: 'sol-1'
			});

			const allOption = html.match(/<option value=""[^>]*>/);
			expect(allOption).toBeDefined();
			expect(allOption![0]).not.toContain('selected');
		});

		it('should render custom label', () => {
			const section = new SolutionFilterSection({ label: 'Filter by Solution:' });
			const solutions: SolutionOption[] = [
				{ id: 'sol-1', name: 'My Solution', uniqueName: 'MySolution' }
			];

			const html = section.render({ solutions });

			expect(html).toContain('Filter by Solution:');
		});

		it('should render default label when not specified', () => {
			const section = new SolutionFilterSection();
			const solutions: SolutionOption[] = [
				{ id: 'sol-1', name: 'My Solution', uniqueName: 'MySolution' }
			];

			const html = section.render({ solutions });

			expect(html).toContain('Solution:');
		});

		it('should escape HTML in solution names', () => {
			const section = new SolutionFilterSection();
			const solutions: SolutionOption[] = [
				{ id: 'sol-1', name: '<script>alert("xss")</script>', uniqueName: 'Test' }
			];

			const html = section.render({ solutions });

			expect(html).toContain('&lt;script&gt;');
			expect(html).not.toContain('<script>alert');
		});

		it('should escape HTML in solution IDs', () => {
			const section = new SolutionFilterSection();
			const solutions: SolutionOption[] = [
				{ id: '"><script>alert("xss")</script><"', name: 'Test', uniqueName: 'Test' }
			];

			const html = section.render({ solutions });

			expect(html).toContain('&quot;&gt;&lt;script&gt;');
			expect(html).not.toContain('"><script>');
		});

		it('should escape HTML in custom label', () => {
			const section = new SolutionFilterSection({ label: '<script>xss</script>' });
			const solutions: SolutionOption[] = [
				{ id: 'sol-1', name: 'My Solution', uniqueName: 'MySolution' }
			];

			const html = section.render({ solutions });

			expect(html).toContain('&lt;script&gt;');
			expect(html).not.toContain('<script>xss</script>');
		});

		it('should handle missing solutions property in data', () => {
			const section = new SolutionFilterSection();

			const html = section.render({});

			expect(html).toBe('');
		});
	});
});
