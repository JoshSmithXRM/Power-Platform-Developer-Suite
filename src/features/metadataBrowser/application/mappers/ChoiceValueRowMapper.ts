import type { OptionMetadata } from '../../domain/valueObjects/OptionSetMetadata';
import type { ChoiceValueRowViewModel } from '../viewModels/ChoiceValueRowViewModel';

/**
 * Maps OptionMetadata to ChoiceValueRowViewModel.
 *
 * Transformation rules:
 * - value: Convert number to string
 * - color: Show hex code or "-" if null
 */
export class ChoiceValueRowMapper {
    public toViewModel(option: OptionMetadata): ChoiceValueRowViewModel {
        return {
            id: option.value.toString(),
            label: option.label,
            value: option.value.toString(),
            color: option.color ?? '-',
            isLinkable: true,
            metadata: option
        };
    }
}
