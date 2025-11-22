import { EntityTreeItemMapper } from './EntityTreeItemMapper';
import { EntityMetadata } from '../../domain/entities/EntityMetadata';
import { LogicalName } from '../../domain/valueObjects/LogicalName';
import { SchemaName } from '../../domain/valueObjects/SchemaName';

describe('EntityTreeItemMapper', () => {
	let mapper: EntityTreeItemMapper;

	beforeEach(() => {
		mapper = new EntityTreeItemMapper();
	});

	// Test data factory
	function createEntity(
		logicalName: string,
		options: Partial<Parameters<typeof EntityMetadata.create>[0]> = {}
	): EntityMetadata {
		return EntityMetadata.create({
			metadataId: `entity-${logicalName}`,
			logicalName: LogicalName.create(logicalName),
			schemaName: SchemaName.create(logicalName.charAt(0).toUpperCase() + logicalName.slice(1)),
			displayName: logicalName.charAt(0).toUpperCase() + logicalName.slice(1),
			pluralName: `${logicalName.charAt(0).toUpperCase() + logicalName.slice(1)}s`,
			description: null,
			isCustomEntity: false,
			isManaged: true,
			ownershipType: 'UserOwned',
			attributes: [],
			...options
		});
	}

	describe('toViewModel - single entity mapping', () => {
		it('should map id from logicalName', () => {
			// Arrange
			const entity = createEntity('account');

			// Act
			const result = mapper.toViewModel(entity);

			// Assert
			expect(result.id).toBe('account');
		});

		it('should map logicalName', () => {
			// Arrange
			const entity = createEntity('contact');

			// Act
			const result = mapper.toViewModel(entity);

			// Assert
			expect(result.logicalName).toBe('contact');
		});

		it('should map displayName when present', () => {
			// Arrange
			const entity = createEntity('account', {
				displayName: 'Business Account'
			});

			// Act
			const result = mapper.toViewModel(entity);

			// Assert
			expect(result.displayName).toBe('Business Account');
		});

		it('should map isCustom when true', () => {
			// Arrange
			const entity = createEntity('cr_customentity', {
				isCustomEntity: true
			});

			// Act
			const result = mapper.toViewModel(entity);

			// Assert
			expect(result.isCustom).toBe(true);
		});

		it('should map isCustom when false', () => {
			// Arrange
			const entity = createEntity('account', {
				isCustomEntity: false
			});

			// Act
			const result = mapper.toViewModel(entity);

			// Assert
			expect(result.isCustom).toBe(false);
		});

		it('should set icon to 🏷️ for custom entities', () => {
			// Arrange
			const entity = createEntity('cr_custom', {
				isCustomEntity: true
			});

			// Act
			const result = mapper.toViewModel(entity);

			// Assert
			expect(result.icon).toBe('🏷️');
		});

		it('should set icon to 📋 for system entities', () => {
			// Arrange
			const entity = createEntity('account', {
				isCustomEntity: false
			});

			// Act
			const result = mapper.toViewModel(entity);

			// Assert
			expect(result.icon).toBe('📋');
		});
	});

	describe('edge cases', () => {
		it('should handle special characters in displayName', () => {
			// Arrange
			const entity = createEntity('account', {
				displayName: 'Account & Contact <Special>'
			});

			// Act
			const result = mapper.toViewModel(entity);

			// Assert
			expect(result.displayName).toBe('Account & Contact <Special>');
		});

		it('should handle very long displayName', () => {
			// Arrange
			const longName = 'A'.repeat(200);
			const entity = createEntity('test', {
				displayName: longName
			});

			// Act
			const result = mapper.toViewModel(entity);

			// Assert
			expect(result.displayName).toBe(longName);
		});

		it('should handle custom entity with new_ prefix', () => {
			// Arrange
			const entity = createEntity('new_customentity', {
				isCustomEntity: true,
				displayName: 'Custom Entity'
			});

			// Act
			const result = mapper.toViewModel(entity);

			// Assert
			expect(result.logicalName).toBe('new_customentity');
			expect(result.displayName).toBe('Custom Entity');
			expect(result.isCustom).toBe(true);
			expect(result.icon).toBe('🏷️');
		});

		it('should handle custom entity with cr_ prefix', () => {
			// Arrange
			const entity = createEntity('cr_customentity', {
				isCustomEntity: true,
				displayName: 'Custom Record'
			});

			// Act
			const result = mapper.toViewModel(entity);

			// Assert
			expect(result.logicalName).toBe('cr_customentity');
			expect(result.displayName).toBe('Custom Record');
			expect(result.isCustom).toBe(true);
			expect(result.icon).toBe('🏷️');
		});

		it('should handle system entities (common ones)', () => {
			// Arrange
			const systemEntities = [
				createEntity('account', { displayName: 'Account' }),
				createEntity('contact', { displayName: 'Contact' }),
				createEntity('opportunity', { displayName: 'Opportunity' }),
				createEntity('lead', { displayName: 'Lead' })
			];

			// Act
			const results = systemEntities.map(entity => mapper.toViewModel(entity));

			// Assert
			results.forEach(result => {
				expect(result.isCustom).toBe(false);
				expect(result.icon).toBe('📋');
			});
		});

		it('should preserve id and logicalName consistency', () => {
			// Arrange
			const entity = createEntity('account');

			// Act
			const result = mapper.toViewModel(entity);

			// Assert
			expect(result.id).toBe(result.logicalName);
		});
	});
});
