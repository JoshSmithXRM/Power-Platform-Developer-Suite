/**
 * Value object representing an option in a choice/picklist.
 * Immutable.
 */
export class OptionMetadata {
    /** Raw API response for complete field display in Properties tab */
    private _rawDto: Record<string, unknown> | null = null;

    private constructor(
        public readonly value: number,
        public readonly label: string,
        public readonly description: string | null,
        public readonly color: string | null
    ) {}

    public static create(props: {
        value: number;
        label: string;
        description?: string | null;
        color?: string | null;
    }): OptionMetadata {
        return new OptionMetadata(
            props.value,
            props.label,
            props.description ?? null,
            props.color ?? null
        );
    }

    /**
     * Sets the raw DTO for complete field display.
     * Called by mapper after creation.
     */
    public setRawDto(dto: Record<string, unknown>): void {
        this._rawDto = dto;
    }

    /**
     * Gets the raw DTO if available.
     */
    public getRawDto(): Record<string, unknown> | null {
        return this._rawDto;
    }
}

/**
 * Value object representing option set (choice) metadata.
 * Can be local (inline) or global (shared across entities).
 */
export class OptionSetMetadata {
    private constructor(
        public readonly name: string | null,
        public readonly displayName: string | null,
        public readonly isGlobal: boolean,
        public readonly isCustom: boolean,
        public readonly options: readonly OptionMetadata[]
    ) {}

    public static create(props: {
        name?: string | null;
        displayName?: string | null;
        isGlobal: boolean;
        isCustom?: boolean;
        options: readonly OptionMetadata[];
    }): OptionSetMetadata {
        return new OptionSetMetadata(
            props.name ?? null,
            props.displayName ?? null,
            props.isGlobal,
            props.isCustom ?? false,
            props.options
        );
    }

    /**
     * Checks if this option set has any options.
     */
    public hasOptions(): boolean {
        return this.options.length > 0;
    }

    /**
     * Gets the count of options.
     */
    public getOptionCount(): number {
        return this.options.length;
    }

    /**
     * Finds an option by its value.
     */
    public findOptionByValue(value: number): OptionMetadata | null {
        return this.options.find(opt => opt.value === value) || null;
    }

    /**
     * Gets all option values.
     */
    public getOptionValues(): number[] {
        return this.options.map(opt => opt.value);
    }
}
