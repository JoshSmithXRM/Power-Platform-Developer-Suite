import { ClearAllResultMapper } from './ClearAllResultMapper';
import { ClearAllResult } from '../../domain/results/ClearAllResult';

describe('ClearAllResultMapper', () => {
	let mapper: ClearAllResultMapper;

	beforeEach(() => {
		mapper = new ClearAllResultMapper();
	});

	describe('toViewModel - basic mapping', () => {
		it('should map clearedGlobalKeys', () => {
			// Arrange
			const result = new ClearAllResult(5, 2, []);

			// Act
			const viewModel = mapper.toViewModel(result);

			// Assert
			expect(viewModel.clearedGlobalKeys).toBe(5);
		});

		it('should map clearedSecretKeys', () => {
			// Arrange
			const result = new ClearAllResult(3, 7, []);

			// Act
			const viewModel = mapper.toViewModel(result);

			// Assert
			expect(viewModel.clearedSecretKeys).toBe(7);
		});

		it('should map totalCleared', () => {
			// Arrange
			const result = new ClearAllResult(10, 5, []);

			// Act
			const viewModel = mapper.toViewModel(result);

			// Assert
			expect(viewModel.totalCleared).toBe(15);
		});

		it('should map errors array', () => {
			// Arrange
			const errors = [
				{ key: 'key1', error: 'Error 1' },
				{ key: 'key2', error: 'Error 2' }
			];
			const result = new ClearAllResult(10, 5, errors);

			// Act
			const viewModel = mapper.toViewModel(result);

			// Assert
			expect(viewModel.errors).toEqual(errors);
			expect(viewModel.errors).toHaveLength(2);
		});

		it('should map hasErrors to false when no errors', () => {
			// Arrange
			const result = new ClearAllResult(10, 5, []);

			// Act
			const viewModel = mapper.toViewModel(result);

			// Assert
			expect(viewModel.hasErrors).toBe(false);
		});

		it('should map hasErrors to true when errors exist', () => {
			// Arrange
			const result = new ClearAllResult(10, 5, [
				{ key: 'key1', error: 'Error message' }
			]);

			// Act
			const viewModel = mapper.toViewModel(result);

			// Assert
			expect(viewModel.hasErrors).toBe(true);
		});
	});

	describe('toViewModel - successful scenarios', () => {
		it('should map result with only global keys cleared', () => {
			// Arrange
			const result = new ClearAllResult(10, 0, []);

			// Act
			const viewModel = mapper.toViewModel(result);

			// Assert
			expect(viewModel.clearedGlobalKeys).toBe(10);
			expect(viewModel.clearedSecretKeys).toBe(0);
			expect(viewModel.totalCleared).toBe(10);
			expect(viewModel.hasErrors).toBe(false);
		});

		it('should map result with only secret keys cleared', () => {
			// Arrange
			const result = new ClearAllResult(0, 8, []);

			// Act
			const viewModel = mapper.toViewModel(result);

			// Assert
			expect(viewModel.clearedGlobalKeys).toBe(0);
			expect(viewModel.clearedSecretKeys).toBe(8);
			expect(viewModel.totalCleared).toBe(8);
			expect(viewModel.hasErrors).toBe(false);
		});

		it('should map result with both types cleared', () => {
			// Arrange
			const result = new ClearAllResult(15, 10, []);

			// Act
			const viewModel = mapper.toViewModel(result);

			// Assert
			expect(viewModel.clearedGlobalKeys).toBe(15);
			expect(viewModel.clearedSecretKeys).toBe(10);
			expect(viewModel.totalCleared).toBe(25);
			expect(viewModel.hasErrors).toBe(false);
		});

		it('should map result with zero keys cleared', () => {
			// Arrange
			const result = new ClearAllResult(0, 0, []);

			// Act
			const viewModel = mapper.toViewModel(result);

			// Assert
			expect(viewModel.clearedGlobalKeys).toBe(0);
			expect(viewModel.clearedSecretKeys).toBe(0);
			expect(viewModel.totalCleared).toBe(0);
			expect(viewModel.hasErrors).toBe(false);
		});
	});

	describe('toViewModel - error scenarios', () => {
		it('should map result with single error', () => {
			// Arrange
			const result = new ClearAllResult(5, 3, [
				{ key: 'failed-key', error: 'Access denied' }
			]);

			// Act
			const viewModel = mapper.toViewModel(result);

			// Assert
			expect(viewModel.hasErrors).toBe(true);
			expect(viewModel.errors).toHaveLength(1);
			expect(viewModel.errors[0]?.key).toBe('failed-key');
			expect(viewModel.errors[0]?.error).toBe('Access denied');
		});

		it('should map result with multiple errors', () => {
			// Arrange
			const result = new ClearAllResult(10, 5, [
				{ key: 'key1', error: 'Error 1' },
				{ key: 'key2', error: 'Error 2' },
				{ key: 'key3', error: 'Error 3' }
			]);

			// Act
			const viewModel = mapper.toViewModel(result);

			// Assert
			expect(viewModel.hasErrors).toBe(true);
			expect(viewModel.errors).toHaveLength(3);
		});

		it('should map result with partial success and errors', () => {
			// Arrange
			const result = new ClearAllResult(10, 5, [
				{ key: 'protected-key', error: 'Cannot delete protected entry' }
			]);

			// Act
			const viewModel = mapper.toViewModel(result);

			// Assert
			expect(viewModel.totalCleared).toBe(15);
			expect(viewModel.hasErrors).toBe(true);
			expect(viewModel.errors).toHaveLength(1);
		});
	});

	describe('edge cases', () => {
		it('should handle large numbers', () => {
			// Arrange
			const result = new ClearAllResult(1000, 500, []);

			// Act
			const viewModel = mapper.toViewModel(result);

			// Assert
			expect(viewModel.clearedGlobalKeys).toBe(1000);
			expect(viewModel.clearedSecretKeys).toBe(500);
			expect(viewModel.totalCleared).toBe(1500);
		});

		it('should handle empty errors array', () => {
			// Arrange
			const result = new ClearAllResult(10, 5, []);

			// Act
			const viewModel = mapper.toViewModel(result);

			// Assert
			expect(viewModel.errors).toEqual([]);
			expect(viewModel.errors).toHaveLength(0);
			expect(viewModel.hasErrors).toBe(false);
		});

		it('should preserve error messages exactly', () => {
			// Arrange
			const errorMessage = 'Cannot delete key "power-platform-dev-suite-environments": key is protected';
			const result = new ClearAllResult(10, 5, [
				{ key: 'power-platform-dev-suite-environments', error: errorMessage }
			]);

			// Act
			const viewModel = mapper.toViewModel(result);

			// Assert
			expect(viewModel.errors[0]?.error).toBe(errorMessage);
		});

		it('should handle special characters in error keys', () => {
			// Arrange
			const result = new ClearAllResult(5, 3, [
				{ key: 'power-platform-dev-suite-secret-user@example.com', error: 'Access denied' }
			]);

			// Act
			const viewModel = mapper.toViewModel(result);

			// Assert
			expect(viewModel.errors[0]?.key).toBe('power-platform-dev-suite-secret-user@example.com');
		});
	});
});
