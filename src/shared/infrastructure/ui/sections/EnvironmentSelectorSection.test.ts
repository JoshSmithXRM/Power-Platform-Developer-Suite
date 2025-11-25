import { EnvironmentSelectorSection } from './EnvironmentSelectorSection';
import { SectionPosition } from '../types/SectionPosition';
import type { EnvironmentOption } from '../types/EnvironmentSelectorTypes';

describe('EnvironmentSelectorSection', () => {
	describe('constructor', () => {
		it('should create section with toolbar position', () => {
			const section = new EnvironmentSelectorSection();

			expect(section.position).toBe(SectionPosition.Toolbar);
		});

		it('should create section with custom label', () => {
			const section = new EnvironmentSelectorSection({ label: 'Select Environment:' });

			expect(section).toBeDefined();
		});
	});

	describe('render', () => {
		it('should render empty string when no environments', () => {
			const section = new EnvironmentSelectorSection();

			const html = section.render({ environments: [] });

			expect(html).toBe('');
		});

		it('should render single environment', () => {
			const section = new EnvironmentSelectorSection();
			const environments: EnvironmentOption[] = [
				{ id: 'env-1', name: 'Development' }
			];

			const html = section.render({ environments });

			expect(html).toContain('id="environmentSelect"');
			expect(html).toContain('value="env-1"');
			expect(html).toContain('Development');
		});

		it('should render multiple environments', () => {
			const section = new EnvironmentSelectorSection();
			const environments: EnvironmentOption[] = [
				{ id: 'env-1', name: 'Development' },
				{ id: 'env-2', name: 'Production' }
			];

			const html = section.render({ environments });

			expect(html).toContain('value="env-1"');
			expect(html).toContain('Development');
			expect(html).toContain('value="env-2"');
			expect(html).toContain('Production');
		});

		it('should mark selected environment with selected attribute', () => {
			const section = new EnvironmentSelectorSection();
			const environments: EnvironmentOption[] = [
				{ id: 'env-1', name: 'Development' },
				{ id: 'env-2', name: 'Production' }
			];

			const html = section.render({
				environments,
				currentEnvironmentId: 'env-2'
			});

			const productionOption = html.match(/<option value="env-2"[^>]*>/);
			expect(productionOption).toBeDefined();
			expect(productionOption![0]).toContain('selected');
		});

		it('should not mark any environment as selected when currentEnvironmentId is undefined', () => {
			const section = new EnvironmentSelectorSection();
			const environments: EnvironmentOption[] = [
				{ id: 'env-1', name: 'Development' },
				{ id: 'env-2', name: 'Production' }
			];

			const html = section.render({ environments });

			expect(html).not.toContain('selected');
		});

		it('should render custom label', () => {
			const section = new EnvironmentSelectorSection({ label: 'Select Environment:' });
			const environments: EnvironmentOption[] = [
				{ id: 'env-1', name: 'Development' }
			];

			const html = section.render({ environments });

			expect(html).toContain('Select Environment:');
		});

		it('should render default label when not specified', () => {
			const section = new EnvironmentSelectorSection();
			const environments: EnvironmentOption[] = [
				{ id: 'env-1', name: 'Development' }
			];

			const html = section.render({ environments });

			expect(html).toContain('Environment:');
		});

		it('should escape HTML in environment names', () => {
			const section = new EnvironmentSelectorSection();
			const environments: EnvironmentOption[] = [
				{ id: 'env-1', name: '<script>alert("xss")</script>' }
			];

			const html = section.render({ environments });

			expect(html).toContain('&lt;script&gt;');
			expect(html).not.toContain('<script>alert');
		});

		it('should escape HTML in environment IDs', () => {
			const section = new EnvironmentSelectorSection();
			const environments: EnvironmentOption[] = [
				{ id: '"><script>alert("xss")</script><"', name: 'Test' }
			];

			const html = section.render({ environments });

			expect(html).toContain('&quot;&gt;&lt;script&gt;');
			expect(html).not.toContain('"><script>');
		});

		it('should escape HTML in custom label', () => {
			const section = new EnvironmentSelectorSection({ label: '<script>xss</script>' });
			const environments: EnvironmentOption[] = [
				{ id: 'env-1', name: 'Development' }
			];

			const html = section.render({ environments });

			expect(html).toContain('&lt;script&gt;');
			expect(html).not.toContain('<script>xss</script>');
		});

		it('should handle missing environments property in data', () => {
			const section = new EnvironmentSelectorSection();

			const html = section.render({});

			expect(html).toBe('');
		});
	});
});
