import { CloudFlow } from './CloudFlow';
import { ValidationError } from '../../../../shared/domain/errors/ValidationError';

describe('CloudFlow', () => {
	describe('constructor', () => {
		it('should create cloud flow with valid properties', () => {
			// Arrange
			const id = 'flow-guid-123';
			const name = 'My Flow';
			const modifiedOn = new Date('2024-01-15');
			const isManaged = true;
			const createdBy = 'user@example.com';
			const clientData = '{"properties":{}}';

			// Act
			const flow = new CloudFlow(id, name, modifiedOn, isManaged, createdBy, clientData);

			// Assert
			expect(flow.id).toBe(id);
			expect(flow.name).toBe(name);
			expect(flow.modifiedOn).toBe(modifiedOn);
			expect(flow.isManaged).toBe(isManaged);
			expect(flow.createdBy).toBe(createdBy);
			expect(flow.clientData).toBe(clientData);
		});

		test.each<{ clientData: string | null; description: string }>([
			{ clientData: null, description: 'null client data' },
			{ clientData: '', description: 'empty string client data' }
		])('should create cloud flow with $description', ({ clientData }) => {
			// Act
			const flow = createCloudFlow({ clientData });

			// Assert
			expect(flow.clientData).toBe(clientData);
		});

		it('should create unmanaged cloud flow', () => {
			// Arrange
			const isManaged = false;

			// Act
			const flow = createCloudFlow({ isManaged });

			// Assert
			expect(flow.isManaged).toBe(false);
		});

		test.each<{ invalidJson: string; description: string }>([
			{ invalidJson: '{invalid json}', description: 'malformed JSON' },
			{ invalidJson: 'not json at all', description: 'non-JSON string' }
		])('should throw ValidationError when client data is $description', ({ invalidJson }) => {
			// Act & Assert
			expect(() => {
				new CloudFlow(
					'flow-123',
					'Test Flow',
					new Date(),
					false,
					'user@example.com',
					invalidJson
				);
			}).toThrow(ValidationError);
		});

		it('should throw ValidationError with correct error details for invalid JSON', () => {
			// Arrange
			const invalidJson = 'not json at all';

			// Act & Assert
			expect(() => {
				new CloudFlow(
					'flow-123',
					'Test Flow',
					new Date(),
					false,
					'user@example.com',
					invalidJson
				);
			}).toThrow(expect.objectContaining({
				entityName: 'CloudFlow',
				field: 'clientData',
				constraint: 'Must be valid JSON or null'
			}));
		});

		it('should truncate long invalid JSON in error message', () => {
			// Arrange
			const longInvalidJson = 'a'.repeat(150);

			// Act & Assert
			expect(() => {
				new CloudFlow(
					'flow-123',
					'Test Flow',
					new Date(),
					false,
					'user@example.com',
					longInvalidJson
				);
			}).toThrow(expect.objectContaining({
				value: expect.stringMatching(/^.{100}$/) // Exactly 100 characters
			}));
		});

		it('should accept valid JSON with nested objects', () => {
			// Arrange
			const validJson = JSON.stringify({
				properties: {
					connectionReferences: {
						shared_sharepointonline: {
							connection: {
								connectionReferenceLogicalName: 'cr_sharepoint'
							}
						}
					}
				}
			});

			// Act
			const flow = createCloudFlow({ clientData: validJson });

			// Assert
			expect(flow.clientData).toBe(validJson);
		});
	});

	describe('hasClientData', () => {
		test.each<{ clientData: string | null; expected: boolean; description: string }>([
			{ clientData: '{"properties":{}}', expected: true, description: 'non-empty string' },
			{ clientData: null, expected: false, description: 'null' },
			{ clientData: '', expected: false, description: 'empty string' }
		])('should return $expected when client data is $description', ({ clientData, expected }) => {
			// Arrange
			const flow = createCloudFlow({ clientData });

			// Act
			const result = flow.hasClientData();

			// Assert
			expect(result).toBe(expected);
		});

		it('should act as type guard narrowing client data to string', () => {
			// Arrange
			const flow = createCloudFlow({ clientData: '{"test":true}' });

			// Act
			if (flow.hasClientData()) {
				// Assert - TypeScript should treat flow.clientData as string
				const length: number = flow.clientData.length;
				expect(length).toBeGreaterThan(0);
			}
		});
	});

	describe('extractConnectionReferenceNames', () => {
		it('should extract single connection reference name from valid client data', () => {
			// Arrange
			const clientData = JSON.stringify({
				properties: {
					connectionReferences: {
						shared_sharepointonline: {
							connection: {
								connectionReferenceLogicalName: 'cr_sharepoint'
							}
						}
					}
				}
			});
			const flow = createCloudFlow({ clientData });

			// Act
			const names = flow.extractConnectionReferenceNames();

			// Assert
			expect(names).toEqual(['cr_sharepoint']);
		});

		it('should extract multiple connection reference names from client data', () => {
			// Arrange
			const clientData = JSON.stringify({
				properties: {
					connectionReferences: {
						shared_sharepointonline: {
							connection: {
								connectionReferenceLogicalName: 'cr_sharepoint'
							}
						},
						shared_commondataserviceforapps: {
							connection: {
								connectionReferenceLogicalName: 'cr_dataverse'
							}
						},
						shared_outlook: {
							connection: {
								connectionReferenceLogicalName: 'cr_outlook'
							}
						}
					}
				}
			});
			const flow = createCloudFlow({ clientData });

			// Act
			const names = flow.extractConnectionReferenceNames();

			// Assert
			expect(names).toHaveLength(3);
			expect(names).toContain('cr_sharepoint');
			expect(names).toContain('cr_dataverse');
			expect(names).toContain('cr_outlook');
		});

		test.each<{ scenario: string; getClientData: () => string | null }>([
			{ scenario: 'client data is null', getClientData: () => null },
			{ scenario: 'client data is empty string', getClientData: () => '' },
			{
				scenario: 'properties is missing',
				getClientData: () => JSON.stringify({ otherField: 'value' })
			},
			{
				scenario: 'connectionReferences is missing',
				getClientData: () => JSON.stringify({ properties: { otherField: 'value' } })
			},
			{
				scenario: 'connectionReferences is null',
				getClientData: () => JSON.stringify({ properties: { connectionReferences: null } })
			},
			{
				scenario: 'connectionReferences is not an object',
				getClientData: () => JSON.stringify({ properties: { connectionReferences: 'not an object' } })
			},
			{
				scenario: 'connectionReferences is empty object',
				getClientData: () => JSON.stringify({ properties: { connectionReferences: {} } })
			}
		])('should return empty array when $scenario', ({ getClientData }) => {
			// Arrange
			const flow = createCloudFlow({ clientData: getClientData() });

			// Act
			const names = flow.extractConnectionReferenceNames();

			// Assert
			expect(names).toEqual([]);
		});

		test.each<{ scenario: string; getClientData: () => string }>([
			{
				scenario: 'connection reference without connection property',
				getClientData: () => JSON.stringify({
					properties: {
						connectionReferences: {
							shared_sharepointonline: {
								otherField: 'value'
							}
						}
					}
				})
			},
			{
				scenario: 'connection reference when connection is null',
				getClientData: () => JSON.stringify({
					properties: {
						connectionReferences: {
							shared_sharepointonline: {
								connection: null
							}
						}
					}
				})
			},
			{
				scenario: 'connection reference without connectionReferenceLogicalName',
				getClientData: () => JSON.stringify({
					properties: {
						connectionReferences: {
							shared_sharepointonline: {
								connection: {
									otherField: 'value'
								}
							}
						}
					}
				})
			},
			{
				scenario: 'connection reference when connectionReferenceLogicalName is not a string',
				getClientData: () => JSON.stringify({
					properties: {
						connectionReferences: {
							shared_sharepointonline: {
								connection: {
									connectionReferenceLogicalName: 123
								}
							}
						}
					}
				})
			}
		])('should skip $scenario', ({ getClientData }) => {
			// Arrange
			const flow = createCloudFlow({ clientData: getClientData() });

			// Act
			const names = flow.extractConnectionReferenceNames();

			// Assert
			expect(names).toEqual([]);
		});

		it('should handle mixed valid and invalid connection references', () => {
			// Arrange
			const clientData = JSON.stringify({
				properties: {
					connectionReferences: {
						valid1: {
							connection: {
								connectionReferenceLogicalName: 'cr_valid1'
							}
						},
						invalid_no_connection: {
							otherField: 'value'
						},
						valid2: {
							connection: {
								connectionReferenceLogicalName: 'cr_valid2'
							}
						},
						invalid_number: {
							connection: {
								connectionReferenceLogicalName: 456
							}
						}
					}
				}
			});
			const flow = createCloudFlow({ clientData });

			// Act
			const names = flow.extractConnectionReferenceNames();

			// Assert
			expect(names).toHaveLength(2);
			expect(names).toContain('cr_valid1');
			expect(names).toContain('cr_valid2');
		});

		it('should return empty array when JSON parsing throws error during extraction', () => {
			// Arrange - Create flow with valid JSON first
			const flow = createCloudFlow({ clientData: '{"properties":{}}' });

			// Modify clientData to be invalid after construction (edge case testing)
			// Note: This tests the catch block in extractConnectionReferenceNames
			Object.defineProperty(flow, 'clientData', {
				value: 'not valid json',
				writable: false
			});

			// Act
			const names = flow.extractConnectionReferenceNames();

			// Assert
			expect(names).toEqual([]);
		});
	});

	describe('hasConnectionReferences', () => {
		test.each<{ scenario: string; getClientData: () => string | null; expected: boolean }>([
			{
				scenario: 'flow has connection references',
				getClientData: () => JSON.stringify({
					properties: {
						connectionReferences: {
							shared_sharepointonline: {
								connection: {
									connectionReferenceLogicalName: 'cr_sharepoint'
								}
							}
						}
					}
				}),
				expected: true
			},
			{
				scenario: 'flow has no connection references',
				getClientData: () => JSON.stringify({
					properties: {
						connectionReferences: {}
					}
				}),
				expected: false
			},
			{
				scenario: 'client data is null',
				getClientData: () => null,
				expected: false
			},
			{
				scenario: 'connectionReferences section is missing',
				getClientData: () => JSON.stringify({
					properties: {}
				}),
				expected: false
			}
		])('should return $expected when $scenario', ({ getClientData, expected }) => {
			// Arrange
			const flow = createCloudFlow({ clientData: getClientData() });

			// Act
			const result = flow.hasConnectionReferences();

			// Assert
			expect(result).toBe(expected);
		});
	});
});

// Test Data Factory
function createCloudFlow(overrides: Partial<{
	id: string;
	name: string;
	modifiedOn: Date;
	isManaged: boolean;
	createdBy: string;
	clientData: string | null;
}> = {}): CloudFlow {
	return new CloudFlow(
		'id' in overrides ? overrides.id! : 'flow-guid-default',
		'name' in overrides ? overrides.name! : 'Default Flow',
		'modifiedOn' in overrides ? overrides.modifiedOn! : new Date('2024-01-01'),
		'isManaged' in overrides ? overrides.isManaged! : false,
		'createdBy' in overrides ? overrides.createdBy! : 'user@example.com',
		'clientData' in overrides ? overrides.clientData : '{"properties":{}}'
	);
}
