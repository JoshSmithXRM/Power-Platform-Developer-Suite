import type { DataProvider } from '../../domain/entities/DataProvider';
import type { DataProviderMetadata, TreeItemViewModel } from '../viewModels/TreeItemViewModel';

/**
 * Maps DataProvider domain entity to TreeItemViewModel.
 *
 * Transformation only (NO business logic).
 */
export class DataProviderViewModelMapper {
	/**
	 * Maps a DataProvider entity to a tree item.
	 *
	 * @param dataProvider - The DataProvider domain entity
	 * @returns TreeItemViewModel for the data provider
	 */
	public toTreeItem(dataProvider: DataProvider): TreeItemViewModel {
		const metadata: DataProviderMetadata = {
			type: 'dataProvider',
			dataSourceLogicalName: dataProvider.getDataSourceLogicalName(),
			description: dataProvider.getDescription(),
			hasRetrieve: dataProvider.hasRetrieve(),
			hasRetrieveMultiple: dataProvider.hasRetrieveMultiple(),
			hasCreate: dataProvider.hasCreate(),
			hasUpdate: dataProvider.hasUpdate(),
			hasDelete: dataProvider.hasDelete(),
			createdOn: dataProvider.getCreatedOn().toISOString(),
			modifiedOn: dataProvider.getModifiedOn().toISOString(),
			canUpdate: dataProvider.canUpdate(),
			canDelete: dataProvider.canDelete(),
		};

		return {
			id: dataProvider.getId(),
			parentId: null, // DataProviders are root-level items
			type: 'dataProvider',
			name: dataProvider.getName(),
			displayName: `(Data Provider) ${dataProvider.getName()} → ${dataProvider.getDataSourceLogicalName()}`,
			icon: '🗄️',
			metadata,
			isManaged: dataProvider.isInManagedState(),
			children: [], // DataProviders have no children in the tree
		};
	}
}
