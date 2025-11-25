import { StorageMetadata } from '../../domain/valueObjects/StorageMetadata';
import { StorageMetadataViewModel } from '../viewModels/StorageMetadataViewModel';
import { StorageSizeFormatter } from '../../../../shared/infrastructure/ui/utils/StorageSizeFormatter';

/**
 * Maps storage metadata to view model
 */
export class StorageMetadataMapper {
	public toViewModel(metadata: StorageMetadata): StorageMetadataViewModel {
		return {
			dataType: metadata.dataType,
			sizeInBytes: metadata.sizeInBytes,
			displaySize: StorageSizeFormatter.formatSize(metadata.sizeInBytes)
		};
	}
}
