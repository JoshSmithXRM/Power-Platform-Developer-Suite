import type { IDataverseApiService } from './../../../../shared/infrastructure/interfaces/IDataverseApiService';
import type { ILogger } from './../../../../infrastructure/logging/ILogger';
import { DataverseEntityMetadataRepository } from './DataverseEntityMetadataRepository';
import { OptionSetMetadataMapper } from './../mappers/OptionSetMetadataMapper';
import { EntityKeyMapper } from './../mappers/EntityKeyMapper';
import { SecurityPrivilegeMapper } from './../mappers/SecurityPrivilegeMapper';
import { RelationshipMetadataMapper } from './../mappers/RelationshipMetadataMapper';
import { AttributeMetadataMapper } from './../mappers/AttributeMetadataMapper';
import { EntityMetadataMapper } from './../mappers/EntityMetadataMapper';
import { LogicalName } from './../../domain/valueObjects/LogicalName';
import { assertDefined, createMockDataverseApiService, createNullLogger } from '../../../../shared/testing';

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
        mockApiService = createMockDataverseApiService();
        logger = createNullLogger();

        // Create mapper chain (dependencies flow inward)
        const optionSetMapper = new OptionSetMetadataMapper();
        const entityKeyMapper = new EntityKeyMapper();
        const securityPrivilegeMapper = new SecurityPrivilegeMapper();
        const relationshipMapper = new RelationshipMetadataMapper();
        const attributeMapper = new AttributeMetadataMapper(optionSetMapper);
        const entityMapper = new EntityMetadataMapper(attributeMapper, relationshipMapper, entityKeyMapper, securityPrivilegeMapper);

        repository = new DataverseEntityMetadataRepository(mockApiService, entityMapper, optionSetMapper, logger);
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
            assertDefined(result.attributes[0]);
            const attribute = result.attributes[0];
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
            assertDefined(result.attributes[0]);
            const attribute = result.attributes[0];
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
            assertDefined(result.attributes[0]);
            const attribute = result.attributes[0];
            expect(attribute).toBeDefined();
            expect(attribute.optionSet).not.toBeNull();
            expect(attribute.optionSet?.getOptionCount()).toBe(1);
            expect(attribute.optionSet?.options[0]?.label).toBe('Option 1');
        });
    });

    describe('Query Options - $select combinations', () => {
        it('should use minimal $select fields for getAllEntities (tree display)', async () => {
            mockApiService.get.mockResolvedValue({
                value: [
                    {
                        MetadataId: 'entity-123',
                        LogicalName: 'account',
                        SchemaName: 'Account',
                        DisplayName: { UserLocalizedLabel: { Label: 'Account' } },
                        IsCustomEntity: false
                    }
                ]
            });

            await repository.getAllEntities('env-123');

            expect(mockApiService.get).toHaveBeenCalledWith(
                'env-123',
                expect.stringContaining('$select=MetadataId,LogicalName,SchemaName,DisplayName,IsCustomEntity')
            );

            const callArg = mockApiService.get.mock.calls[0]?.[1] as string;
            expect(callArg).not.toContain('Attributes');
            expect(callArg).not.toContain('Relationships');
        });

        it('should use minimal $select for getAllGlobalChoices (tree display)', async () => {
            mockApiService.get.mockResolvedValue({
                value: [
                    {
                        Name: 'et_accounttype',
                        DisplayName: { UserLocalizedLabel: { Label: 'Account Type' } },
                        IsCustomOptionSet: true
                    }
                ]
            });

            await repository.getAllGlobalChoices('env-123');

            const callArg = mockApiService.get.mock.calls[0]?.[1] as string;
            expect(callArg).toContain('$select=Name,DisplayName,IsCustomOptionSet');
            expect(callArg).not.toContain('Options');
            expect(callArg).not.toContain('OptionSetType');
        });

        it('should fetch full fields for getGlobalChoiceWithOptions', async () => {
            const globalOptionSetDto = {
                Name: 'et_accounttype',
                DisplayName: { UserLocalizedLabel: { Label: 'Account Type' } },
                IsGlobal: true,
                IsCustomOptionSet: true,
                OptionSetType: 'Picklist',
                Options: [
                    {
                        Value: 1,
                        Label: { UserLocalizedLabel: { Label: 'Option 1' } },
                        Color: '#0000ff'
                    }
                ]
            };

            mockApiService.get.mockResolvedValue(globalOptionSetDto);

            await repository.getGlobalChoiceWithOptions('env-123', 'et_accounttype');

            const callArg = mockApiService.get.mock.calls[0]?.[1] as string;
            expect(callArg).toContain("GlobalOptionSetDefinitions(Name='et_accounttype')");
            expect(callArg).not.toContain('$select');
        });
    });

    describe('Query Options - $expand combinations', () => {
        it('should use $expand for Attributes and Relationships in getEntityWithAttributes', async () => {
            const entityDto = {
                MetadataId: 'entity-123',
                LogicalName: 'account',
                SchemaName: 'Account',
                DisplayName: { UserLocalizedLabel: { Label: 'Account' } },
                Attributes: [],
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

            await repository.getEntityWithAttributes('env-123', LogicalName.create('account'));

            const mainQueryCall = mockApiService.get.mock.calls[0]?.[1] as string;
            expect(mainQueryCall).toContain('$expand=Attributes,OneToManyRelationships,ManyToOneRelationships,ManyToManyRelationships,Keys');
        });

        it('should use $expand=OptionSet,GlobalOptionSet for PicklistAttributeMetadata', async () => {
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

            await repository.getEntityWithAttributes('env-123', LogicalName.create('account'));

            const picklistCall = mockApiService.get.mock.calls[1]?.[1] as string;
            expect(picklistCall).toContain('PicklistAttributeMetadata');
            expect(picklistCall).toContain('$expand=OptionSet,GlobalOptionSet');
        });

        it('should fetch all typed metadata endpoints in parallel', async () => {
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
                .mockResolvedValueOnce({ value: [] })
                .mockResolvedValueOnce({ value: [] })
                .mockResolvedValueOnce({ value: [] })
                .mockResolvedValueOnce({ value: [] })
                .mockResolvedValueOnce({ value: [] });

            await repository.getEntityWithAttributes('env-123', LogicalName.create('account'));

            const calls = mockApiService.get.mock.calls;
            expect(calls.length).toBeGreaterThanOrEqual(6);
        });
    });

    describe('Query Options - Filter by logical name', () => {
        it('should filter entity by LogicalName in getEntityWithAttributes', async () => {
            const entityDto = {
                MetadataId: 'entity-123',
                LogicalName: 'account',
                SchemaName: 'Account',
                DisplayName: { UserLocalizedLabel: { Label: 'Account' } },
                Attributes: [],
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

            await repository.getEntityWithAttributes('env-123', LogicalName.create('account'));

            const mainQueryCall = mockApiService.get.mock.calls[0]?.[1] as string;
            expect(mainQueryCall).toContain("EntityDefinitions(LogicalName='account')");
        });

        it('should filter global choice by Name in getGlobalChoiceWithOptions', async () => {
            const globalOptionSetDto = {
                Name: 'et_accounttype',
                DisplayName: { UserLocalizedLabel: { Label: 'Account Type' } },
                IsGlobal: true,
                IsCustomOptionSet: true,
                OptionSetType: 'Picklist',
                Options: []
            };

            mockApiService.get.mockResolvedValue(globalOptionSetDto);

            await repository.getGlobalChoiceWithOptions('env-123', 'et_accounttype');

            const callArg = mockApiService.get.mock.calls[0]?.[1] as string;
            expect(callArg).toContain("GlobalOptionSetDefinitions(Name='et_accounttype')");
        });
    });

    describe('Query Options - Complex entity queries', () => {
        it('should combine filter, expand in single query for entity metadata', async () => {
            const entityDto = {
                MetadataId: 'entity-123',
                LogicalName: 'contact',
                SchemaName: 'Contact',
                DisplayName: { UserLocalizedLabel: { Label: 'Contact' } },
                Attributes: [],
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

            await repository.getEntityWithAttributes('env-123', LogicalName.create('contact'));

            const mainQueryCall = mockApiService.get.mock.calls[0]?.[1] as string;
            expect(mainQueryCall).toContain("EntityDefinitions(LogicalName='contact')");
            expect(mainQueryCall).toContain('$expand=');
            expect(mainQueryCall).toContain('Attributes');
            expect(mainQueryCall).toContain('OneToManyRelationships');
            expect(mainQueryCall).toContain('ManyToOneRelationships');
            expect(mainQueryCall).toContain('ManyToManyRelationships');
            expect(mainQueryCall).toContain('Keys');
        });

        it('should handle complex query with expand and enrichment', async () => {
            const entityDto = {
                MetadataId: 'entity-123',
                LogicalName: 'lead',
                SchemaName: 'Lead',
                DisplayName: { UserLocalizedLabel: { Label: 'Lead' } },
                Attributes: [
                    {
                        MetadataId: 'attr-123',
                        LogicalName: 'industrycode',
                        SchemaName: 'IndustryCode',
                        AttributeTypeName: { Value: 'PicklistType' },
                        DisplayName: { UserLocalizedLabel: { Label: 'Industry' } },
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

            await repository.getEntityWithAttributes('env-123', LogicalName.create('lead'));

            const mainQueryCall = mockApiService.get.mock.calls[0]?.[1] as string;
            expect(mainQueryCall).toContain("EntityDefinitions(LogicalName='lead')");
            expect(mainQueryCall).toContain('$expand=');
        });
    });

    describe('Query Options - Special characters in names', () => {
        it('should handle entity names with underscores', async () => {
            const entityDto = {
                MetadataId: 'entity-123',
                LogicalName: 'et_custom_entity',
                SchemaName: 'et_CustomEntity',
                DisplayName: { UserLocalizedLabel: { Label: 'Custom Entity' } },
                Attributes: [],
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

            await repository.getEntityWithAttributes('env-123', LogicalName.create('et_custom_entity'));

            const mainQueryCall = mockApiService.get.mock.calls[0]?.[1] as string;
            expect(mainQueryCall).toContain("EntityDefinitions(LogicalName='et_custom_entity')");
        });

        it('should handle global choice names with special prefixes', async () => {
            const globalOptionSetDto = {
                Name: 'cr123_accounttype',
                DisplayName: { UserLocalizedLabel: { Label: 'Account Type' } },
                IsGlobal: true,
                IsCustomOptionSet: true,
                OptionSetType: 'Picklist',
                Options: []
            };

            mockApiService.get.mockResolvedValue(globalOptionSetDto);

            await repository.getGlobalChoiceWithOptions('env-123', 'cr123_accounttype');

            const callArg = mockApiService.get.mock.calls[0]?.[1] as string;
            expect(callArg).toContain("GlobalOptionSetDefinitions(Name='cr123_accounttype')");
        });
    });

    describe('Query Options - Cache behavior', () => {
        it('should use cached entity on subsequent calls (no new API call)', async () => {
            const entityDto = {
                MetadataId: 'entity-123',
                LogicalName: 'account',
                SchemaName: 'Account',
                DisplayName: { UserLocalizedLabel: { Label: 'Account' } },
                Attributes: [],
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

            await repository.getEntityWithAttributes('env-123', LogicalName.create('account'));
            const callCountAfterFirst = mockApiService.get.mock.calls.length;

            await repository.getEntityWithAttributes('env-123', LogicalName.create('account'));
            const callCountAfterSecond = mockApiService.get.mock.calls.length;

            expect(callCountAfterSecond).toBe(callCountAfterFirst);
        });

        it('should clear cache and fetch fresh data after clearCache()', async () => {
            const entityDto = {
                MetadataId: 'entity-123',
                LogicalName: 'account',
                SchemaName: 'Account',
                DisplayName: { UserLocalizedLabel: { Label: 'Account' } },
                Attributes: [],
                OneToManyRelationships: [],
                ManyToOneRelationships: [],
                ManyToManyRelationships: [],
                Keys: [],
                Privileges: []
            };

            mockApiService.get.mockResolvedValue({ value: [] });
            mockApiService.get.mockResolvedValueOnce(entityDto);

            await repository.getEntityWithAttributes('env-123', LogicalName.create('account'));
            const callCountAfterFirst = mockApiService.get.mock.calls.length;

            repository.clearCache();

            mockApiService.get.mockResolvedValueOnce(entityDto);

            await repository.getEntityWithAttributes('env-123', LogicalName.create('account'));
            const callCountAfterClear = mockApiService.get.mock.calls.length;

            expect(callCountAfterClear).toBeGreaterThan(callCountAfterFirst);
        });
    });
});
