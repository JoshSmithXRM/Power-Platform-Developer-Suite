import type { DropdownItem } from '../../../../shared/infrastructure/ui/types/DropdownTypes';
import { DropdownSection } from '../../../../shared/infrastructure/ui/sections/DropdownSection';
import type { SectionRenderData } from '../../../../shared/infrastructure/ui/types/SectionRenderData';

/**
 * Auto-refresh dropdown section for Plugin Trace Viewer.
 * Allows setting automatic refresh interval (Off, 10s, 30s, 60s).
 */
export class AutoRefreshDropdownSection extends DropdownSection {
	private currentInterval: string | undefined = undefined;

	constructor() {
		super('autoRefreshDropdown', 'refresh');
	}

	protected getDropdownItems(): ReadonlyArray<DropdownItem> {
		return [
			{ id: '0', label: 'Off' },
			{ id: '10', label: 'Every 10 seconds' },
			{ id: '30', label: 'Every 30 seconds' },
			{ id: '60', label: 'Every 60 seconds' },
		];
	}

	protected getButtonLabel(): string {
		const intervalNames = {
			'0': 'Off',
			'10': '10s',
			'30': '30s',
			'60': '60s'
		};

		const currentIntervalName = this.currentInterval ? intervalNames[this.currentInterval as keyof typeof intervalNames] : '...';
		return `Auto-Refresh: ${currentIntervalName}`;
	}

	protected getCurrentSelectionId(): string | undefined {
		return this.currentInterval;
	}

	public render(data: SectionRenderData): string {
		// Update state from data before rendering
		if (data.state && typeof data.state === 'object' && 'autoRefreshInterval' in data.state) {
			const autoRefreshState = (data.state as { autoRefreshInterval?: number }).autoRefreshInterval;
			if (autoRefreshState !== undefined) {
				this.currentInterval = autoRefreshState.toString();
			}
		}

		return super.render(data);
	}
}
