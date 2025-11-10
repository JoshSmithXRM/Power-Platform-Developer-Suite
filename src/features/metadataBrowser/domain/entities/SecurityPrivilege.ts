/**
 * Domain entity representing a security privilege for an entity.
 * Rich domain model with behavior methods.
 */
export class SecurityPrivilege {
    private constructor(
        public readonly privilegeId: string,
        public readonly name: string,
        public readonly privilegeType: number,
        public readonly canBeBasic: boolean,
        public readonly canBeLocal: boolean,
        public readonly canBeDeep: boolean,
        public readonly canBeGlobal: boolean,
        public readonly canBeEntityReference: boolean,
        public readonly canBeParentEntityReference: boolean
    ) {}

    public static create(props: {
        privilegeId: string;
        name: string;
        privilegeType: number;
        canBeBasic: boolean;
        canBeLocal: boolean;
        canBeDeep: boolean;
        canBeGlobal: boolean;
        canBeEntityReference?: boolean;
        canBeParentEntityReference?: boolean;
    }): SecurityPrivilege {
        if (!props.privilegeId || props.privilegeId.trim().length === 0) {
            throw new Error('Privilege ID cannot be empty');
        }

        if (!props.name || props.name.trim().length === 0) {
            throw new Error('Privilege name cannot be empty');
        }

        return new SecurityPrivilege(
            props.privilegeId,
            props.name,
            props.privilegeType,
            props.canBeBasic,
            props.canBeLocal,
            props.canBeDeep,
            props.canBeGlobal,
            props.canBeEntityReference ?? false,
            props.canBeParentEntityReference ?? false
        );
    }

    /**
     * Gets the privilege type as a user-friendly string.
     */
    public getPrivilegeTypeDisplay(): string {
        // Privilege type enum values from Dataverse
        const typeMap: Record<number, string> = {
            0: 'None',
            1: 'Create',
            2: 'Read',
            3: 'Write',
            4: 'Delete',
            5: 'Assign',
            6: 'Share',
            7: 'Append',
            8: 'AppendTo'
        };

        return typeMap[this.privilegeType] || `Unknown (${this.privilegeType})`;
    }

    /**
     * Gets all available depth levels for this privilege.
     */
    public getAvailableDepths(): string[] {
        const depths: string[] = [];

        if (this.canBeBasic) {
            depths.push('Basic');
        }
        if (this.canBeLocal) {
            depths.push('Local');
        }
        if (this.canBeDeep) {
            depths.push('Deep');
        }
        if (this.canBeGlobal) {
            depths.push('Global');
        }

        return depths;
    }

    /**
     * Checks if this privilege supports any depth levels.
     */
    public hasDepthLevels(): boolean {
        return this.canBeBasic || this.canBeLocal || this.canBeDeep || this.canBeGlobal;
    }

    /**
     * Checks if this privilege supports basic (user-owned) access.
     */
    public supportsBasicAccess(): boolean {
        return this.canBeBasic;
    }

    /**
     * Checks if this privilege supports organization-wide access.
     */
    public supportsGlobalAccess(): boolean {
        return this.canBeGlobal;
    }
}
