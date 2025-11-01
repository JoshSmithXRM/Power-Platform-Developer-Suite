import { StorageMetadata } from '../../domain/valueObjects/StorageMetadata';
import { StorageMetadataViewModel } from '../viewModels/StorageMetadataViewModel';

/**
 * Maps storage metadata to view model
 */
export class StorageMetadataMapper {
	public static toViewModel(metadata: StorageMetadata): StorageMetadataViewModel {
		return {
			dataType: metadata.dataType,
			sizeInBytes: metadata.sizeInBytes,
			displaySize: StorageMetadataMapper.formatSize(metadata.sizeInBytes)
		};
	}

	private static formatSize(bytes: number): string {
		if (bytes < 1024) {
			return `${bytes} B`;
		}
		if (bytes < 1024 * 1024) {
			return `${(bytes / 1024).toFixed(2)} KB`;
		}
		return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
	}
}
