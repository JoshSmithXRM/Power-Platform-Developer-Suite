import type { OptionSetMetadata } from '../../domain/valueObjects/OptionSetMetadata';
import type { ChoiceTreeItemViewModel } from '../viewModels/ChoiceTreeItemViewModel';

/**
 * Maps OptionSetMetadata to ChoiceTreeItemViewModel.
 *
 * Transformation rules:
 * - displayName: optionSet.displayName || optionSet.name
 * - icon: Always "🔽" (dropdown)
 */
export class ChoiceTreeItemMapper {
    public toViewModel(optionSet: OptionSetMetadata): ChoiceTreeItemViewModel {
        const name = optionSet.name || '';
        const displayName = optionSet.displayName || name;

        return {
            id: name,
            displayName,
            name,
            isCustom: optionSet.isCustom,
            icon: '🔽'
        };
    }
}
