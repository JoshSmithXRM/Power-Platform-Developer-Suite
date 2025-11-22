import type { LabelMetadata } from '../dtos/EntityMetadataDto';

/**
 * Static utility for extracting localized labels from Dataverse metadata.
 * Provides consistent label extraction across all metadata mappers.
 */
export class MetadataLabelExtractor {
	/**
	 * Extracts the user localized label from label metadata.
	 * Returns null if no label is available.
	 */
	public static extractLabel(labelMetadata: LabelMetadata | undefined): string | null {
		return labelMetadata?.UserLocalizedLabel?.Label || null;
	}
}
