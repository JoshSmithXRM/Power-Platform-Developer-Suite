/**
 * Value object representing an option in a choice/picklist.
 * Immutable.
 */
export class OptionMetadata {
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
}

/**
 * Value object representing option set (choice) metadata.
 * Can be local (inline) or global (shared across entities).
 */
export class OptionSetMetadata {
    private constructor(
        public readonly name: string | null,
        public readonly isGlobal: boolean,
        public readonly options: readonly OptionMetadata[]
    ) {}

    public static create(props: {
        name?: string | null;
        isGlobal: boolean;
        options: readonly OptionMetadata[];
    }): OptionSetMetadata {
        return new OptionSetMetadata(
            props.name ?? null,
            props.isGlobal,
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
