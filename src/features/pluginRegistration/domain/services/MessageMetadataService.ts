/**
 * Information about a valid image property name for an SDK message.
 */
export interface ImagePropertyNameInfo {
	readonly name: string;
	readonly label: string;
	readonly description?: string;
}

/**
 * Static metadata about SDK messages.
 *
 * This service provides hardcoded knowledge about which messages support
 * filtering attributes and which property names are valid for images.
 * This mirrors the Plugin Registration Tool behavior - this data is not
 * retrieved from Dataverse but is static knowledge.
 */
export class MessageMetadataService {
	/**
	 * Messages that support filtering attributes.
	 * Only Create/Update variants support this functionality.
	 */
	private static readonly FILTERED_ATTRIBUTE_MESSAGES = new Set([
		'Create',
		'CreateMultiple',
		'Update',
		'UpdateMultiple',
		'OnExternalUpdated',
	]);

	/**
	 * Valid image property names per message.
	 * Most messages have a single property; Merge has two.
	 */
	private static readonly IMAGE_PROPERTY_NAMES: ReadonlyMap<
		string,
		readonly ImagePropertyNameInfo[]
	> = new Map([
		['Create', [{ name: 'id', label: 'Created Entity' }]],
		['CreateMultiple', [{ name: 'Ids', label: 'Created Entities' }]],
		['Update', [{ name: 'Target', label: 'Updated Entity' }]],
		['UpdateMultiple', [{ name: 'Targets', label: 'Updated Entities' }]],
		['Delete', [{ name: 'Target', label: 'Deleted Entity' }]],
		['Assign', [{ name: 'Target', label: 'Assigned Entity' }]],
		['SetState', [{ name: 'EntityMoniker', label: 'Entity' }]],
		['SetStateDynamicEntity', [{ name: 'EntityMoniker', label: 'Entity' }]],
		['Route', [{ name: 'Target', label: 'Routed Entity' }]],
		['Send', [{ name: 'EmailId', label: 'Sent Entity Id' }]],
		['DeliverIncoming', [{ name: 'EmailId', label: 'Delivered E-mail Id' }]],
		['DeliverPromote', [{ name: 'EmailId', label: 'Delivered E-mail Id' }]],
		['ExecuteWorkflow', [{ name: 'Target', label: 'Workflow Entity' }]],
		[
			'Merge',
			[
				{ name: 'Target', label: 'Parent Entity' },
				{ name: 'SubordinateId', label: 'Child Entity' },
			],
		],
	]);

	/**
	 * Returns whether the message supports filtering attributes.
	 * Only Create/Update variants support this.
	 */
	supportsFilteredAttributes(messageName: string): boolean {
		return MessageMetadataService.FILTERED_ATTRIBUTE_MESSAGES.has(messageName);
	}

	/**
	 * Returns valid image property names for a message.
	 * Returns empty array if message doesn't support images.
	 */
	getImagePropertyNames(messageName: string): readonly ImagePropertyNameInfo[] {
		return MessageMetadataService.IMAGE_PROPERTY_NAMES.get(messageName) ?? [];
	}

	/**
	 * Returns the default/primary image property name for a message.
	 * Most messages have exactly one; Merge has two (user must pick).
	 * Returns null if message doesn't support images or has multiple options.
	 */
	getDefaultImagePropertyName(messageName: string): string | null {
		const properties = this.getImagePropertyNames(messageName);
		if (properties.length !== 1) {
			return null;
		}
		const firstProperty = properties[0];
		if (firstProperty === undefined) {
			return null;
		}
		return firstProperty.name;
	}
}
