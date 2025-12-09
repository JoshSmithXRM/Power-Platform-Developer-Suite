/**
 * Enumeration of Power Platform solution component types.
 *
 * Based on Dataverse componenttype field in solutioncomponent table.
 * @see https://learn.microsoft.com/en-us/power-apps/developer/data-platform/reference/entities/solutioncomponent
 */
export enum ComponentType {
	/** Custom or system entity (componenttype = 1) */
	Entity = 1,

	/** Workflow or Cloud Flow (componenttype = 29) */
	Workflow = 29,

	/** Web Resource (componenttype = 61) */
	WebResource = 61,

	/** Plugin Assembly (componenttype = 91) */
	PluginAssembly = 91,

	/** SDK Message Processing Step (Plugin Step) (componenttype = 92) */
	PluginStep = 92,

	/** Model-Driven App (componenttype = 80) */
	ModelDrivenApp = 80,

	/** Canvas App (componenttype = 300) */
	CanvasApp = 300,

	/** Environment Variable Definition (componenttype = 380) */
	EnvironmentVariable = 380,

	/** Connection Reference (componenttype = 381) */
	ConnectionReference = 381,

	/** View (SavedQuery) (componenttype = 26) */
	View = 26,

	/** Form (SystemForm) (componenttype = 60) */
	Form = 60,

	/** Other/Unknown component type */
	Other = 0
}

/**
 * Maps componenttype number to ComponentType enum.
 *
 * @param componentTypeCode - Component type code from Dataverse API
 * @returns Corresponding ComponentType enum value, or Other if unknown
 */
export function mapComponentType(componentTypeCode: number): ComponentType {
	const knownTypes = Object.values(ComponentType).filter(v => typeof v === 'number') as number[];
	if (knownTypes.includes(componentTypeCode)) {
		return componentTypeCode as ComponentType;
	}
	return ComponentType.Other;
}

/**
 * Gets display name for a component type.
 *
 * @param type - Component type enum value
 * @returns Human-readable display name for UI
 */
export function getComponentTypeDisplayName(type: ComponentType): string {
	switch (type) {
		case ComponentType.Entity:
			return 'Entities';
		case ComponentType.Workflow:
			return 'Flows';
		case ComponentType.WebResource:
			return 'Web Resources';
		case ComponentType.PluginAssembly:
			return 'Plugin Assemblies';
		case ComponentType.PluginStep:
			return 'Plugin Steps';
		case ComponentType.ModelDrivenApp:
			return 'Model-Driven Apps';
		case ComponentType.CanvasApp:
			return 'Canvas Apps';
		case ComponentType.EnvironmentVariable:
			return 'Environment Variables';
		case ComponentType.ConnectionReference:
			return 'Connection References';
		case ComponentType.View:
			return 'Views';
		case ComponentType.Form:
			return 'Forms';
		case ComponentType.Other:
			return 'Other Components';
	}
}
