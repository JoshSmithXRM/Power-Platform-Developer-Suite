import { OptionSetMetadata, OptionMetadata } from '../../domain/valueObjects/OptionSetMetadata';
import { MetadataLabelExtractor } from '../utils/MetadataLabelExtractor';
import type {
	OptionSetMetadataDto,
	OptionMetadataDto,
	GlobalOptionSetDefinitionDto
} from '../dtos/EntityMetadataDto';

/**
 * Maps option set and option metadata DTOs to domain value objects.
 * Handles both inline option sets and global option set references.
 */
export class OptionSetMetadataMapper {
	/**
	 * Maps option set DTO to value object.
	 * After enrichment, both optionSetDto (with options) and globalOptionSetDto (reference) may be present.
	 * Prioritizes optionSetDto with actual option values.
	 */
	public mapOptionSetDtoToValueObject(
		optionSetDto: OptionSetMetadataDto | undefined,
		globalOptionSetDto: { Name: string } | undefined
	): OptionSetMetadata | null {
		if (!optionSetDto && !globalOptionSetDto) {
			return null;
		}

		// If optionSetDto exists with options, use it (even if globalOptionSetDto also exists)
		if (optionSetDto?.Options && optionSetDto.Options.length > 0) {
			const options = optionSetDto.Options.map(optDto => this.mapOptionMetadataDtoToValueObject(optDto));
			return OptionSetMetadata.create({
				name: optionSetDto.Name ?? null,
				displayName: null,
				isGlobal: optionSetDto.IsGlobal ?? false,
				isCustom: false,
				options: options
			});
		}

		// If optionSetDto exists but has no options, still use it for metadata
		if (optionSetDto) {
			const options = optionSetDto.Options?.map(optDto => this.mapOptionMetadataDtoToValueObject(optDto)) || [];
			return OptionSetMetadata.create({
				name: optionSetDto.Name ?? null,
				displayName: null,
				isGlobal: optionSetDto.IsGlobal ?? false,
				isCustom: false,
				options: options
			});
		}

		// Only use globalOptionSetDto as a fallback when optionSetDto doesn't exist
		if (globalOptionSetDto) {
			// Global option set reference (no inline options, no display name at attribute level)
			return OptionSetMetadata.create({
				name: globalOptionSetDto.Name,
				displayName: null,
				isGlobal: true,
				isCustom: false,
				options: []
			});
		}

		return null;
	}

	/**
	 * Maps option metadata DTO to value object.
	 */
	public mapOptionMetadataDtoToValueObject(dto: OptionMetadataDto): OptionMetadata {
		return OptionMetadata.create({
			value: dto.Value,
			label: MetadataLabelExtractor.extractLabel(dto.Label) || String(dto.Value),
			description: MetadataLabelExtractor.extractLabel(dto.Description),
			color: dto.Color ?? null
		});
	}

	/**
	 * Maps global option set definition DTO to value object.
	 */
	public mapGlobalOptionSetDtoToValueObject(dto: GlobalOptionSetDefinitionDto): OptionSetMetadata {
		const options = dto.Options?.map(optDto => this.mapOptionMetadataDtoToValueObject(optDto)) || [];
		return OptionSetMetadata.create({
			name: dto.Name,
			displayName: MetadataLabelExtractor.extractLabel(dto.DisplayName),
			isGlobal: dto.IsGlobal ?? true,
			isCustom: dto.IsCustomOptionSet ?? false,
			options: options
		});
	}
}
