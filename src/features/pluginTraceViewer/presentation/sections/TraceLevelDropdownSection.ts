import type { DropdownItem } from '../../../../shared/infrastructure/ui/sections/DropdownSection';
import { DropdownSection } from '../../../../shared/infrastructure/ui/sections/DropdownSection';
import type { SectionRenderData } from '../../../../shared/infrastructure/ui/types/SectionRenderData';

/**
 * Trace level dropdown section for Plugin Trace Viewer.
 * Displays current trace level and allows changing it (Off/Exception/All).
 */
export class TraceLevelDropdownSection extends DropdownSection {
	private currentLevel: string | undefined = undefined;

	constructor() {
		super('traceLevelDropdown', 'settings-gear');
	}

	protected getDropdownItems(): ReadonlyArray<DropdownItem> {
		return [
			{ id: '0', label: 'Off (No tracing)' },
			{ id: '1', label: 'Exception (Errors only)' },
			{ id: '2', label: 'All (Performance impact)' },
		];
	}

	protected getButtonLabel(): string {
		const levelNames = {
			'0': 'Off',
			'1': 'Exception',
			'2': 'All'
		};

		const currentLevelName = this.currentLevel ? levelNames[this.currentLevel as keyof typeof levelNames] : '...';
		return `Trace Level: ${currentLevelName}`;
	}

	protected getCurrentSelectionId(): string | undefined {
		return this.currentLevel;
	}

	public render(data: SectionRenderData): string {
		// Update state from data before rendering
		if (data.state && typeof data.state === 'object' && 'traceLevel' in data.state) {
			const traceLevelState = (data.state as { traceLevel?: number }).traceLevel;
			if (traceLevelState !== undefined) {
				this.currentLevel = traceLevelState.toString();
			}
		}

		return super.render(data);
	}
}
