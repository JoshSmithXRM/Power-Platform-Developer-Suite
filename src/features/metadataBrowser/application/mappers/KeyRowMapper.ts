import type { EntityKey } from '../../domain/entities/EntityKey';
import type { KeyRowViewModel } from '../viewModels/KeyRowViewModel';

/**
 * Maps EntityKey to KeyRowViewModel.
 *
 * Transformation rules:
 * - name: key.logicalName
 * - type: "Alternate" (primary keys not included in Keys collection)
 * - keyAttributes: Join key attributes with ", "
 */
export class KeyRowMapper {
    public toViewModel(key: EntityKey): KeyRowViewModel {
        const logicalName = key.logicalName.getValue();

        return {
            id: logicalName,
            name: logicalName,
            type: 'Alternate',
            keyAttributes: key.keyAttributes.join(', '),
            isLinkable: true,
            metadata: key
        };
    }
}
