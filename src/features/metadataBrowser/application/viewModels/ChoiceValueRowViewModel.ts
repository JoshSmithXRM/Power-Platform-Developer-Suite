import type { OptionMetadata } from '../../domain/valueObjects/OptionSetMetadata';

/**
 * ViewModel for displaying choice value (option) in table.
 * Simple DTO for presentation layer.
 */
export interface ChoiceValueRowViewModel {
    /** Unique identifier (value as string) */
    readonly id: string;

    /** Option label (hyperlink) */
    readonly label: string;

    /** Option value (number) */
    readonly value: string;

    /** Color hex code or "-" */
    readonly color: string;

    /** Whether label should be hyperlink */
    readonly isLinkable: boolean;

    /** Raw metadata for detail panel */
    readonly metadata: OptionMetadata;
}
