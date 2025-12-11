import { SecurityPrivilege } from './SecurityPrivilege';

describe('SecurityPrivilege', () => {
    describe('create', () => {
        it('should create SecurityPrivilege with all required properties', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvRead',
                privilegeType: 2,
                canBeBasic: true,
                canBeLocal: true,
                canBeDeep: true,
                canBeGlobal: true
            });

            expect(privilege.privilegeId).toBe('priv-123');
            expect(privilege.name).toBe('prvRead');
            expect(privilege.privilegeType).toBe(2);
            expect(privilege.canBeBasic).toBe(true);
            expect(privilege.canBeLocal).toBe(true);
            expect(privilege.canBeDeep).toBe(true);
            expect(privilege.canBeGlobal).toBe(true);
            expect(privilege.canBeEntityReference).toBe(false);
            expect(privilege.canBeParentEntityReference).toBe(false);
        });

        it('should create SecurityPrivilege with optional properties', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-456',
                name: 'prvAppend',
                privilegeType: 7,
                canBeBasic: false,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: false,
                canBeEntityReference: true,
                canBeParentEntityReference: true
            });

            expect(privilege.canBeEntityReference).toBe(true);
            expect(privilege.canBeParentEntityReference).toBe(true);
        });

        it('should default optional properties to false when not provided', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-789',
                name: 'prvCreate',
                privilegeType: 1,
                canBeBasic: true,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: false
            });

            expect(privilege.canBeEntityReference).toBe(false);
            expect(privilege.canBeParentEntityReference).toBe(false);
        });

        it('should throw error when privilegeId is empty string', () => {
            expect(() =>
                SecurityPrivilege.create({
                    privilegeId: '',
                    name: 'prvRead',
                    privilegeType: 2,
                    canBeBasic: true,
                    canBeLocal: false,
                    canBeDeep: false,
                    canBeGlobal: false
                })
            ).toThrow('Invalid SecurityPrivilege: privilegeId cannot be empty');
        });

        it('should throw error when privilegeId is whitespace only', () => {
            expect(() =>
                SecurityPrivilege.create({
                    privilegeId: '   ',
                    name: 'prvRead',
                    privilegeType: 2,
                    canBeBasic: true,
                    canBeLocal: false,
                    canBeDeep: false,
                    canBeGlobal: false
                })
            ).toThrow('Invalid SecurityPrivilege: privilegeId cannot be empty');
        });

        it('should throw error when name is empty string', () => {
            expect(() =>
                SecurityPrivilege.create({
                    privilegeId: 'priv-123',
                    name: '',
                    privilegeType: 2,
                    canBeBasic: true,
                    canBeLocal: false,
                    canBeDeep: false,
                    canBeGlobal: false
                })
            ).toThrow('Invalid SecurityPrivilege: name cannot be empty');
        });

        it('should throw error when name is whitespace only', () => {
            expect(() =>
                SecurityPrivilege.create({
                    privilegeId: 'priv-123',
                    name: '   ',
                    privilegeType: 2,
                    canBeBasic: true,
                    canBeLocal: false,
                    canBeDeep: false,
                    canBeGlobal: false
                })
            ).toThrow('Invalid SecurityPrivilege: name cannot be empty');
        });
    });

    describe('getPrivilegeTypeDisplay', () => {
        it('should return "None" for privilege type 0', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvNone',
                privilegeType: 0,
                canBeBasic: false,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: false
            });

            expect(privilege.getPrivilegeTypeDisplay()).toBe('None');
        });

        it('should return "Create" for privilege type 1', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvCreate',
                privilegeType: 1,
                canBeBasic: true,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: false
            });

            expect(privilege.getPrivilegeTypeDisplay()).toBe('Create');
        });

        it('should return "Read" for privilege type 2', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvRead',
                privilegeType: 2,
                canBeBasic: true,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: false
            });

            expect(privilege.getPrivilegeTypeDisplay()).toBe('Read');
        });

        it('should return "Write" for privilege type 3', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvWrite',
                privilegeType: 3,
                canBeBasic: true,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: false
            });

            expect(privilege.getPrivilegeTypeDisplay()).toBe('Write');
        });

        it('should return "Delete" for privilege type 4', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvDelete',
                privilegeType: 4,
                canBeBasic: true,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: false
            });

            expect(privilege.getPrivilegeTypeDisplay()).toBe('Delete');
        });

        it('should return "Assign" for privilege type 5', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvAssign',
                privilegeType: 5,
                canBeBasic: true,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: false
            });

            expect(privilege.getPrivilegeTypeDisplay()).toBe('Assign');
        });

        it('should return "Share" for privilege type 6', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvShare',
                privilegeType: 6,
                canBeBasic: true,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: false
            });

            expect(privilege.getPrivilegeTypeDisplay()).toBe('Share');
        });

        it('should return "Append" for privilege type 7', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvAppend',
                privilegeType: 7,
                canBeBasic: false,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: false
            });

            expect(privilege.getPrivilegeTypeDisplay()).toBe('Append');
        });

        it('should return "AppendTo" for privilege type 8', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvAppendTo',
                privilegeType: 8,
                canBeBasic: false,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: false
            });

            expect(privilege.getPrivilegeTypeDisplay()).toBe('AppendTo');
        });

        it('should return "Unknown (99)" for unknown privilege type', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvUnknown',
                privilegeType: 99,
                canBeBasic: false,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: false
            });

            expect(privilege.getPrivilegeTypeDisplay()).toBe('Unknown (99)');
        });

        it('should return "Unknown (-1)" for negative privilege type', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvNegative',
                privilegeType: -1,
                canBeBasic: false,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: false
            });

            expect(privilege.getPrivilegeTypeDisplay()).toBe('Unknown (-1)');
        });
    });

    describe('getAvailableDepths', () => {
        it('should return all depth levels when all flags are true', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvRead',
                privilegeType: 2,
                canBeBasic: true,
                canBeLocal: true,
                canBeDeep: true,
                canBeGlobal: true
            });

            const depths = privilege.getAvailableDepths();

            expect(depths).toEqual(['Basic', 'Local', 'Deep', 'Global']);
        });

        it('should return only Basic when only canBeBasic is true', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvRead',
                privilegeType: 2,
                canBeBasic: true,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: false
            });

            const depths = privilege.getAvailableDepths();

            expect(depths).toEqual(['Basic']);
        });

        it('should return only Local when only canBeLocal is true', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvRead',
                privilegeType: 2,
                canBeBasic: false,
                canBeLocal: true,
                canBeDeep: false,
                canBeGlobal: false
            });

            const depths = privilege.getAvailableDepths();

            expect(depths).toEqual(['Local']);
        });

        it('should return only Deep when only canBeDeep is true', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvRead',
                privilegeType: 2,
                canBeBasic: false,
                canBeLocal: false,
                canBeDeep: true,
                canBeGlobal: false
            });

            const depths = privilege.getAvailableDepths();

            expect(depths).toEqual(['Deep']);
        });

        it('should return only Global when only canBeGlobal is true', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvRead',
                privilegeType: 2,
                canBeBasic: false,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: true
            });

            const depths = privilege.getAvailableDepths();

            expect(depths).toEqual(['Global']);
        });

        it('should return empty array when all depth flags are false', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvAppend',
                privilegeType: 7,
                canBeBasic: false,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: false
            });

            const depths = privilege.getAvailableDepths();

            expect(depths).toEqual([]);
        });

        it('should return multiple depths in correct order', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvRead',
                privilegeType: 2,
                canBeBasic: true,
                canBeLocal: false,
                canBeDeep: true,
                canBeGlobal: true
            });

            const depths = privilege.getAvailableDepths();

            expect(depths).toEqual(['Basic', 'Deep', 'Global']);
        });
    });

    describe('hasDepthLevels', () => {
        it('should return true when at least one depth flag is true', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvRead',
                privilegeType: 2,
                canBeBasic: true,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: false
            });

            expect(privilege.hasDepthLevels()).toBe(true);
        });

        it('should return true when all depth flags are true', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvRead',
                privilegeType: 2,
                canBeBasic: true,
                canBeLocal: true,
                canBeDeep: true,
                canBeGlobal: true
            });

            expect(privilege.hasDepthLevels()).toBe(true);
        });

        it('should return false when all depth flags are false', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvAppend',
                privilegeType: 7,
                canBeBasic: false,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: false
            });

            expect(privilege.hasDepthLevels()).toBe(false);
        });

        it('should return true when only canBeLocal is true', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvRead',
                privilegeType: 2,
                canBeBasic: false,
                canBeLocal: true,
                canBeDeep: false,
                canBeGlobal: false
            });

            expect(privilege.hasDepthLevels()).toBe(true);
        });

        it('should return true when only canBeDeep is true', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvRead',
                privilegeType: 2,
                canBeBasic: false,
                canBeLocal: false,
                canBeDeep: true,
                canBeGlobal: false
            });

            expect(privilege.hasDepthLevels()).toBe(true);
        });

        it('should return true when only canBeGlobal is true', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvRead',
                privilegeType: 2,
                canBeBasic: false,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: true
            });

            expect(privilege.hasDepthLevels()).toBe(true);
        });
    });

    describe('supportsBasicAccess', () => {
        it('should return true when canBeBasic is true', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvRead',
                privilegeType: 2,
                canBeBasic: true,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: false
            });

            expect(privilege.supportsBasicAccess()).toBe(true);
        });

        it('should return false when canBeBasic is false', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvAppend',
                privilegeType: 7,
                canBeBasic: false,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: false
            });

            expect(privilege.supportsBasicAccess()).toBe(false);
        });
    });

    describe('supportsGlobalAccess', () => {
        it('should return true when canBeGlobal is true', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvRead',
                privilegeType: 2,
                canBeBasic: false,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: true
            });

            expect(privilege.supportsGlobalAccess()).toBe(true);
        });

        it('should return false when canBeGlobal is false', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvRead',
                privilegeType: 2,
                canBeBasic: true,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: false
            });

            expect(privilege.supportsGlobalAccess()).toBe(false);
        });
    });

    describe('raw DTO methods', () => {
        it('should initially have null raw DTO', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvRead',
                privilegeType: 2,
                canBeBasic: true,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: false
            });
            expect(privilege.getRawDto()).toBeNull();
        });

        it('should store and retrieve raw DTO', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvRead',
                privilegeType: 2,
                canBeBasic: true,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: false
            });
            const rawDto = { PrivilegeId: 'priv-123', Name: 'prvRead' };

            privilege.setRawDto(rawDto);

            expect(privilege.getRawDto()).toBe(rawDto);
        });

        it('should allow overwriting raw DTO', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvRead',
                privilegeType: 2,
                canBeBasic: true,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: false
            });
            const firstDto = { PrivilegeId: 'priv-1' };
            const secondDto = { PrivilegeId: 'priv-2' };

            privilege.setRawDto(firstDto);
            privilege.setRawDto(secondDto);

            expect(privilege.getRawDto()).toBe(secondDto);
        });

        it('should return false for hasRawDto when no DTO is set', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvRead',
                privilegeType: 2,
                canBeBasic: true,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: false
            });
            expect(privilege.hasRawDto()).toBe(false);
        });

        it('should return true for hasRawDto after setting DTO', () => {
            const privilege = SecurityPrivilege.create({
                privilegeId: 'priv-123',
                name: 'prvRead',
                privilegeType: 2,
                canBeBasic: true,
                canBeLocal: false,
                canBeDeep: false,
                canBeGlobal: false
            });
            privilege.setRawDto({ PrivilegeId: 'priv-123' });
            expect(privilege.hasRawDto()).toBe(true);
        });
    });
});
