import type { IDataverseApiService } from '../../../../../shared/infrastructure/interfaces/IDataverseApiService';
import type { ILogger } from '../../../../../infrastructure/logging/ILogger';
import { NullLogger } from '../../../../../infrastructure/logging/NullLogger';
import { DataverseEntityMetadataRepository } from '../DataverseEntityMetadataRepository';
import { LogicalName } from '../../../domain/valueObjects/LogicalName';

/**
 * Tests for option set enrichment in DataverseEntityMetadataRepository.
 *
 * These tests verify that:
 * 1. Option set data is fetched using typed endpoints ($expand=OptionSet,GlobalOptionSet)
 * 2. Global option sets are enriched with full option values
 * 3. Local option sets retain their option values
 * 4. No metadata is lost during mapping
 */
describe('DataverseEntityMetadataRepository - Option Set Enrichment', () => {
    let mockApiService: jest.Mocked<IDataverseApiService>;
    let logger: ILogger;
    let repository: DataverseEntityMetadataRepository;

    beforeEach(() => {
        mockApiService = {
            get: jest.fn()
        } as unknown as jest.Mocked<IDataverseApiService>;
        logger = new NullLogger();
        repository = new DataverseEntityMetadataRepository(mockApiService, logger);
    });

    describe('getEntityWithAttributes - Local Option Sets', () => {
        it('should preserve option values from local option sets', async () => {
            // Arrange: Mock API responses
            const entityDto = {
                MetadataId: 'entity-123',
                LogicalName: 'account',
                SchemaName: 'Account',
                DisplayName: { UserLocalizedLabel: { Label: 'Account' } },
                Attributes: [
                    {
                        MetadataId: 'attr-123',
                        LogicalName: 'industrycode',
                        SchemaName: 'IndustryCode',
                        AttributeTypeName: { Value: 'PicklistType' },
                        DisplayName: { UserLocalizedLabel: { Label: 'Industry' } },
                        OptionSet: null, // Initially null from generic endpoint
                        GlobalOptionSet: { Name: 'account_industrycode' }
                    }
                ],
                OneToManyRelationships: [],
                ManyToOneRelationships: [],
                ManyToManyRelationships: [],
                Keys: [],
                Privileges: []
            };

            // Mock the typed endpoint response with full option set data
            const picklistResponse = {
                value: [
                    {
                        MetadataId: 'attr-123',
                        LogicalName: 'industrycode',
                        SchemaName: 'IndustryCode',
                        AttributeTypeName: { Value: 'PicklistType' },
                        DisplayName: { UserLocalizedLabel: { Label: 'Industry' } },
                        OptionSet: {
                            Name: 'account_industrycode',
                            IsGlobal: false,
                            OptionSetType: 'Picklist',
                            Options: [
                                {
                                    Value: 1,
                                    Label: { UserLocalizedLabel: { Label: 'Accounting' } },
                                    Color: '#0000ff'
                                },
                                {
                                    Value: 2,
                                    Label: { UserLocalizedLabel: { Label: 'Agriculture' } },
                                    Color: '#0000ff'
                                }
                            ]
                        },
                        GlobalOptionSet: { Name: 'account_industrycode' }
                    }
                ]
            };

            mockApiService.get
                .mockResolvedValueOnce(entityDto) // Main entity query
                .mockResolvedValueOnce(picklistResponse) // PicklistAttributeMetadata
                .mockResolvedValueOnce({ value: [] }) // StateAttributeMetadata
                .mockResolvedValueOnce({ value: [] }) // StatusAttributeMetadata
                .mockResolvedValueOnce({ value: [] }) // BooleanAttributeMetadata
                .mockResolvedValueOnce({ value: [] }); // MultiSelectPicklistAttributeMetadata

            // Act
            const result = await repository.getEntityWithAttributes('env-123', LogicalName.create('account'));

            // Assert
            expect(result.attributes).toHaveLength(1);
            const attribute = result.attributes[0]!;
            expect(attribute).toBeDefined();

            // Verify option set is populated
            expect(attribute.optionSet).not.toBeNull();
            expect(attribute.optionSet?.hasOptions()).toBe(true);
            expect(attribute.optionSet?.getOptionCount()).toBe(2);

            // Verify option values
            const options = attribute.optionSet?.options || [];
            expect(options[0]?.label).toBe('Accounting');
            expect(options[0]?.value).toBe(1);
            expect(options[1]?.label).toBe('Agriculture');
            expect(options[1]?.value).toBe(2);
        });
    });

    describe('getEntityWithAttributes - Global Option Sets', () => {
        it('should fetch and populate global option set values', async () => {
            // Arrange
            const entityDto = {
                MetadataId: 'entity-123',
                LogicalName: 'account',
                SchemaName: 'Account',
                DisplayName: { UserLocalizedLabel: { Label: 'Account' } },
                Attributes: [
                    {
                        MetadataId: 'attr-123',
                        LogicalName: 'et_accounttype',
                        SchemaName: 'et_AccountType',
                        AttributeTypeName: { Value: 'PicklistType' },
                        DisplayName: { UserLocalizedLabel: { Label: 'Account Type' } },
                        OptionSet: null,
                        GlobalOptionSet: { Name: 'et_accounttype' }
                    }
                ],
                OneToManyRelationships: [],
                ManyToOneRelationships: [],
                ManyToManyRelationships: [],
                Keys: [],
                Privileges: []
            };

            // Typed endpoint returns OptionSet with IsGlobal=true but empty options
            const picklistResponse = {
                value: [
                    {
                        MetadataId: 'attr-123',
                        LogicalName: 'et_accounttype',
                        SchemaName: 'et_AccountType',
                        AttributeTypeName: { Value: 'PicklistType' },
                        DisplayName: { UserLocalizedLabel: { Label: 'Account Type' } },
                        OptionSet: {
                            Name: 'et_accounttype',
                            IsGlobal: true,
                            OptionSetType: 'Picklist',
                            Options: [] // Empty from typed endpoint for global option sets
                        },
                        GlobalOptionSet: { Name: 'et_accounttype' }
                    }
                ]
            };

            // Full global option set definition
            const globalOptionSetDto = {
                Name: 'et_accounttype',
                IsGlobal: true,
                OptionSetType: 'Picklist',
                Options: [
                    {
                        Value: 500000000,
                        Label: { UserLocalizedLabel: { Label: 'Customer' } },
                        Color: '#0000ff'
                    },
                    {
                        Value: 500000001,
                        Label: { UserLocalizedLabel: { Label: 'Installer' } },
                        Color: '#0000ff'
                    },
                    {
                        Value: 500000002,
                        Label: { UserLocalizedLabel: { Label: 'Location' } },
                        Color: '#0000ff'
                    }
                ]
            };

            mockApiService.get
                .mockResolvedValueOnce(entityDto) // Main entity query
                .mockResolvedValueOnce(picklistResponse) // PicklistAttributeMetadata
                .mockResolvedValueOnce({ value: [] }) // StateAttributeMetadata
                .mockResolvedValueOnce({ value: [] }) // StatusAttributeMetadata
                .mockResolvedValueOnce({ value: [] }) // BooleanAttributeMetadata
                .mockResolvedValueOnce({ value: [] }) // MultiSelectPicklistAttributeMetadata
                .mockResolvedValueOnce(globalOptionSetDto); // GlobalOptionSetDefinitions fetch

            // Act
            const result = await repository.getEntityWithAttributes('env-123', LogicalName.create('account'));

            // Assert: Verify global option set was fetched
            expect(mockApiService.get).toHaveBeenCalledWith(
                'env-123',
                expect.stringContaining('GlobalOptionSetDefinitions(Name=\'et_accounttype\')')
            );

            // Verify option set is populated with global values
            expect(result.attributes).toHaveLength(1);
            const attribute = result.attributes[0]!;
            expect(attribute).toBeDefined();

            expect(attribute.optionSet).not.toBeNull();
            expect(attribute.optionSet?.hasOptions()).toBe(true);
            expect(attribute.optionSet?.getOptionCount()).toBe(3);

            // Verify option values from global definition
            const options = attribute.optionSet?.options || [];
            expect(options[0]?.label).toBe('Customer');
            expect(options[0]?.value).toBe(500000000);
            expect(options[1]?.label).toBe('Installer');
            expect(options[2]?.label).toBe('Location');
        });
    });

    describe('getEntityWithAttributes - Typed Endpoint Queries', () => {
        it('should query all typed attribute metadata endpoints with $expand=OptionSet', async () => {
            // Arrange
            const entityDto = {
                MetadataId: 'entity-123',
                LogicalName: 'account',
                SchemaName: 'Account',
                DisplayName: { UserLocalizedLabel: { Label: 'Account' } },
                Attributes: [
                    {
                        MetadataId: 'attr-123',
                        LogicalName: 'testfield',
                        SchemaName: 'TestField',
                        AttributeTypeName: { Value: 'PicklistType' },
                        DisplayName: { UserLocalizedLabel: { Label: 'Test' } },
                        OptionSet: null,
                        GlobalOptionSet: null
                    }
                ],
                OneToManyRelationships: [],
                ManyToOneRelationships: [],
                ManyToManyRelationships: [],
                Keys: [],
                Privileges: []
            };

            mockApiService.get
                .mockResolvedValueOnce(entityDto)
                .mockResolvedValueOnce({ value: [] }) // Picklist
                .mockResolvedValueOnce({ value: [] }) // State
                .mockResolvedValueOnce({ value: [] }) // Status
                .mockResolvedValueOnce({ value: [] }) // Boolean
                .mockResolvedValueOnce({ value: [] }); // MultiSelect

            // Act
            await repository.getEntityWithAttributes('env-123', LogicalName.create('account'));

            // Assert: Verify all typed endpoints were called with $expand
            const calls = mockApiService.get.mock.calls;
            expect(calls.length).toBeGreaterThanOrEqual(6);

            // PicklistAttributeMetadata with OptionSet,GlobalOptionSet
            expect(calls[1]?.[1]).toContain('PicklistAttributeMetadata');
            expect(calls[1]?.[1]).toContain('$expand=OptionSet,GlobalOptionSet');

            // StateAttributeMetadata with OptionSet
            expect(calls[2]?.[1]).toContain('StateAttributeMetadata');
            expect(calls[2]?.[1]).toContain('$expand=OptionSet');

            // StatusAttributeMetadata with OptionSet
            expect(calls[3]?.[1]).toContain('StatusAttributeMetadata');
            expect(calls[3]?.[1]).toContain('$expand=OptionSet');

            // BooleanAttributeMetadata with OptionSet
            expect(calls[4]?.[1]).toContain('BooleanAttributeMetadata');
            expect(calls[4]?.[1]).toContain('$expand=OptionSet');

            // MultiSelectPicklistAttributeMetadata with OptionSet,GlobalOptionSet
            expect(calls[5]?.[1]).toContain('MultiSelectPicklistAttributeMetadata');
            expect(calls[5]?.[1]).toContain('$expand=OptionSet,GlobalOptionSet');
        });

        it('should NOT use $select on the main entity query to avoid filtering fields', async () => {
            // Arrange
            const entityDto = {
                MetadataId: 'entity-123',
                LogicalName: 'account',
                SchemaName: 'Account',
                DisplayName: { UserLocalizedLabel: { Label: 'Account' } },
                Attributes: [
                    {
                        MetadataId: 'attr-123',
                        LogicalName: 'testfield',
                        SchemaName: 'TestField',
                        AttributeTypeName: { Value: 'StringType' },
                        DisplayName: { UserLocalizedLabel: { Label: 'Test' } },
                        OptionSet: null,
                        GlobalOptionSet: null
                    }
                ],
                OneToManyRelationships: [],
                ManyToOneRelationships: [],
                ManyToManyRelationships: [],
                Keys: [],
                Privileges: []
            };

            mockApiService.get
                .mockResolvedValueOnce(entityDto)
                .mockResolvedValueOnce({ value: [] })
                .mockResolvedValueOnce({ value: [] })
                .mockResolvedValueOnce({ value: [] })
                .mockResolvedValueOnce({ value: [] })
                .mockResolvedValueOnce({ value: [] });

            // Act
            await repository.getEntityWithAttributes('env-123', LogicalName.create('account'));

            // Assert: Main query should NOT have $select (to get all fields)
            const calls = mockApiService.get.mock.calls;
            expect(calls.length).toBeGreaterThan(0);
            const mainQuery = calls[0]?.[1];
            expect(mainQuery).toBeDefined();
            expect(mainQuery).not.toContain('$select');

            // Should have $expand for navigation properties
            expect(mainQuery).toContain('$expand=Attributes');
            expect(mainQuery).toContain('OneToManyRelationships');
            expect(mainQuery).toContain('ManyToOneRelationships');
            expect(mainQuery).toContain('ManyToManyRelationships');
            expect(mainQuery).toContain('Keys');
        });
    });

    describe('Mapping Priority - OptionSet over GlobalOptionSet', () => {
        it('should prioritize OptionSet with values over GlobalOptionSet reference', async () => {
            // This tests the bug fix where GlobalOptionSet was checked first
            // and returned empty options, discarding the enriched OptionSet data

            const entityDto = {
                MetadataId: 'entity-123',
                LogicalName: 'account',
                SchemaName: 'Account',
                DisplayName: { UserLocalizedLabel: { Label: 'Account' } },
                Attributes: [
                    {
                        MetadataId: 'attr-123',
                        LogicalName: 'testfield',
                        SchemaName: 'TestField',
                        AttributeTypeName: { Value: 'PicklistType' },
                        DisplayName: { UserLocalizedLabel: { Label: 'Test Field' } },
                        // After enrichment, BOTH properties exist
                        OptionSet: {
                            Name: 'test_optionset',
                            IsGlobal: true,
                            OptionSetType: 'Picklist',
                            Options: [
                                {
                                    Value: 1,
                                    Label: { UserLocalizedLabel: { Label: 'Option 1' } },
                                    Color: '#ff0000'
                                }
                            ]
                        },
                        GlobalOptionSet: { Name: 'test_optionset' } // Reference also exists
                    }
                ],
                OneToManyRelationships: [],
                ManyToOneRelationships: [],
                ManyToManyRelationships: [],
                Keys: [],
                Privileges: []
            };

            mockApiService.get
                .mockResolvedValueOnce(entityDto)
                .mockResolvedValueOnce({ value: [entityDto.Attributes[0]] })
                .mockResolvedValueOnce({ value: [] })
                .mockResolvedValueOnce({ value: [] })
                .mockResolvedValueOnce({ value: [] })
                .mockResolvedValueOnce({ value: [] });

            // Act
            const result = await repository.getEntityWithAttributes('env-123', LogicalName.create('account'));

            // Assert: Should use OptionSet values, NOT return empty array
            const attribute = result.attributes[0]!;
            expect(attribute).toBeDefined();
            expect(attribute.optionSet).not.toBeNull();
            expect(attribute.optionSet?.getOptionCount()).toBe(1);
            expect(attribute.optionSet?.options[0]?.label).toBe('Option 1');
        });
    });
});
