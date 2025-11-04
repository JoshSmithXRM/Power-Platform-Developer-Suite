import { PanelTrackingBehavior } from './PanelTrackingBehavior';

interface MockPanel {
	id: string;
	title: string;
}

describe('PanelTrackingBehavior', () => {
	let panelMap: Map<string, MockPanel>;
	let behavior: PanelTrackingBehavior<MockPanel>;

	beforeEach(() => {
		panelMap = new Map<string, MockPanel>();
		behavior = new PanelTrackingBehavior(panelMap);
	});

	describe('registerPanel', () => {
		it('should register panel in map', () => {
			const panel: MockPanel = { id: 'panel-1', title: 'Test Panel' };

			behavior.registerPanel('env-1', panel);

			expect(panelMap.get('env-1')).toBe(panel);
		});

		it('should register multiple panels for different environments', () => {
			const panel1: MockPanel = { id: 'panel-1', title: 'Panel 1' };
			const panel2: MockPanel = { id: 'panel-2', title: 'Panel 2' };

			behavior.registerPanel('env-1', panel1);
			behavior.registerPanel('env-2', panel2);

			expect(panelMap.get('env-1')).toBe(panel1);
			expect(panelMap.get('env-2')).toBe(panel2);
			expect(panelMap.size).toBe(2);
		});

		it('should overwrite existing panel for same environment', () => {
			const panel1: MockPanel = { id: 'panel-1', title: 'First Panel' };
			const panel2: MockPanel = { id: 'panel-2', title: 'Second Panel' };

			behavior.registerPanel('env-1', panel1);
			behavior.registerPanel('env-1', panel2);

			expect(panelMap.get('env-1')).toBe(panel2);
			expect(panelMap.size).toBe(1);
		});

		it('should handle empty environment ID', () => {
			const panel: MockPanel = { id: 'panel-1', title: 'Test Panel' };

			behavior.registerPanel('', panel);

			expect(panelMap.get('')).toBe(panel);
		});
	});

	describe('unregisterPanel', () => {
		it('should remove panel from map', () => {
			const panel: MockPanel = { id: 'panel-1', title: 'Test Panel' };
			behavior.registerPanel('env-1', panel);

			behavior.unregisterPanel('env-1');

			expect(panelMap.get('env-1')).toBeUndefined();
			expect(panelMap.size).toBe(0);
		});

		it('should handle unregistering non-existent panel', () => {
			expect(() => behavior.unregisterPanel('non-existent')).not.toThrow();
			expect(panelMap.size).toBe(0);
		});

		it('should only remove specified panel', () => {
			const panel1: MockPanel = { id: 'panel-1', title: 'Panel 1' };
			const panel2: MockPanel = { id: 'panel-2', title: 'Panel 2' };

			behavior.registerPanel('env-1', panel1);
			behavior.registerPanel('env-2', panel2);

			behavior.unregisterPanel('env-1');

			expect(panelMap.get('env-1')).toBeUndefined();
			expect(panelMap.get('env-2')).toBe(panel2);
			expect(panelMap.size).toBe(1);
		});

		it('should handle multiple unregister calls for same environment', () => {
			const panel: MockPanel = { id: 'panel-1', title: 'Test Panel' };
			behavior.registerPanel('env-1', panel);

			behavior.unregisterPanel('env-1');
			behavior.unregisterPanel('env-1');

			expect(panelMap.size).toBe(0);
		});
	});

	describe('getPanel', () => {
		it('should return registered panel', () => {
			const panel: MockPanel = { id: 'panel-1', title: 'Test Panel' };
			behavior.registerPanel('env-1', panel);

			const retrieved = behavior.getPanel('env-1');

			expect(retrieved).toBe(panel);
		});

		it('should return undefined for non-existent panel', () => {
			const retrieved = behavior.getPanel('non-existent');

			expect(retrieved).toBeUndefined();
		});

		it('should return correct panel for multiple environments', () => {
			const panel1: MockPanel = { id: 'panel-1', title: 'Panel 1' };
			const panel2: MockPanel = { id: 'panel-2', title: 'Panel 2' };

			behavior.registerPanel('env-1', panel1);
			behavior.registerPanel('env-2', panel2);

			expect(behavior.getPanel('env-1')).toBe(panel1);
			expect(behavior.getPanel('env-2')).toBe(panel2);
		});

		it('should return undefined after unregister', () => {
			const panel: MockPanel = { id: 'panel-1', title: 'Test Panel' };
			behavior.registerPanel('env-1', panel);

			behavior.unregisterPanel('env-1');

			expect(behavior.getPanel('env-1')).toBeUndefined();
		});

		it('should return updated panel after overwrite', () => {
			const panel1: MockPanel = { id: 'panel-1', title: 'First Panel' };
			const panel2: MockPanel = { id: 'panel-2', title: 'Second Panel' };

			behavior.registerPanel('env-1', panel1);
			behavior.registerPanel('env-1', panel2);

			expect(behavior.getPanel('env-1')).toBe(panel2);
		});
	});

	describe('dispose', () => {
		it('should not throw when called', () => {
			expect(() => behavior.dispose()).not.toThrow();
		});

		it('should not clear the map on dispose', () => {
			const panel: MockPanel = { id: 'panel-1', title: 'Test Panel' };
			behavior.registerPanel('env-1', panel);

			behavior.dispose();

			expect(panelMap.get('env-1')).toBe(panel);
			expect(panelMap.size).toBe(1);
		});

		it('should allow operations after dispose', () => {
			behavior.dispose();

			const panel: MockPanel = { id: 'panel-1', title: 'Test Panel' };

			expect(() => behavior.registerPanel('env-1', panel)).not.toThrow();
			expect(panelMap.get('env-1')).toBe(panel);
		});
	});

	describe('singleton pattern enforcement', () => {
		it('should prevent duplicate panels per environment', () => {
			const panel1: MockPanel = { id: 'panel-1', title: 'Panel 1' };
			const panel2: MockPanel = { id: 'panel-2', title: 'Panel 2' };

			behavior.registerPanel('env-1', panel1);

			const existing = behavior.getPanel('env-1');
			if (existing) {
				// Simulate "reveal existing panel" behavior
				expect(existing).toBe(panel1);
			} else {
				behavior.registerPanel('env-1', panel2);
			}

			expect(panelMap.size).toBe(1);
			expect(panelMap.get('env-1')).toBe(panel1);
		});

		it('should support panel replacement when intentional', () => {
			const panel1: MockPanel = { id: 'panel-1', title: 'Old Panel' };
			const panel2: MockPanel = { id: 'panel-2', title: 'New Panel' };

			behavior.registerPanel('env-1', panel1);
			behavior.registerPanel('env-1', panel2);

			expect(behavior.getPanel('env-1')).toBe(panel2);
		});
	});

	describe('edge cases', () => {
		it('should handle panels with identical properties', () => {
			const panel1: MockPanel = { id: 'same-id', title: 'Same Title' };
			const panel2: MockPanel = { id: 'same-id', title: 'Same Title' };

			behavior.registerPanel('env-1', panel1);
			behavior.registerPanel('env-2', panel2);

			expect(behavior.getPanel('env-1')).toBe(panel1);
			expect(behavior.getPanel('env-2')).toBe(panel2);
			expect(panelMap.size).toBe(2);
		});

		it('should handle null panel gracefully', () => {
			behavior.registerPanel('env-1', null as unknown as MockPanel);

			expect(behavior.getPanel('env-1')).toBeNull();
		});

		it('should handle undefined panel gracefully', () => {
			behavior.registerPanel('env-1', undefined as unknown as MockPanel);

			expect(behavior.getPanel('env-1')).toBeUndefined();
		});
	});
});
