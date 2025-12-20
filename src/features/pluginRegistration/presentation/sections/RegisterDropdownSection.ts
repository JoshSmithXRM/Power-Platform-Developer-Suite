import { DropdownSection } from '../../../../shared/infrastructure/ui/sections/DropdownSection';
import type { DropdownItem } from '../../../../shared/infrastructure/ui/types/DropdownTypes';

/**
 * Section: Register Dropdown
 *
 * Dropdown menu for registering new plugin components:
 * - Assembly (.dll)
 * - Package (.nupkg)
 * - Step (requires plugin type context)
 * - Image (requires step context)
 *
 * Uses primary button variant to indicate main action.
 */
export class RegisterDropdownSection extends DropdownSection {
	constructor() {
		super('registerDropdown', 'add');
	}

	protected getDropdownItems(): ReadonlyArray<DropdownItem> {
		// Order matches Plugin Registration Tool (PRT) with package before assembly
		return [
			{ id: 'package', label: 'Register New Package', icon: 'package' },
			{ id: 'assembly', label: 'Register New Assembly', icon: 'file-binary' },
			{ id: 'step', label: 'Register New Step', icon: 'zap' },
			{ id: 'image', label: 'Register New Image', icon: 'file-media' },
			{ id: 'separator1', label: '', separator: true },
			{ id: 'serviceEndpoint', label: 'Register New Service Endpoint', icon: 'broadcast' },
			{ id: 'webHook', label: 'Register New WebHook', icon: 'globe' },
			{ id: 'dataProvider', label: 'Register New Data Provider', icon: 'database' },
			{ id: 'customApi', label: 'Register New Custom API', icon: 'symbol-method' },
		];
	}

	protected getButtonLabel(): string {
		return 'Register';
	}

	protected getButtonVariant(): 'default' | 'primary' | 'danger' {
		return 'primary';
	}
}
