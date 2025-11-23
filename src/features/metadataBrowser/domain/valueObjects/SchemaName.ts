/**
 * Value object representing a Dataverse schema name.
 * Schema names are PascalCase identifiers used for display and code generation.
 */
export class SchemaName {
    private readonly value: string;

    private constructor(value: string) {
        this.value = value;
    }

    /**
     * Creates a SchemaName from a string value.
     * @throws Error if the value is empty or contains invalid characters
     */
    public static create(value: string): SchemaName {
        if (!value || value.trim().length === 0) {
            throw new Error('Invalid SchemaName: cannot be empty');
        }

        // Schema names must be alphanumeric (with underscores allowed)
        // Can start with upper or lowercase letter
        const validPattern = /^[A-Za-z][A-Za-z0-9_]*$/;
        if (!validPattern.test(value)) {
            throw new Error(
                `Invalid SchemaName format: "${value}" must start with a letter and contain only letters, numbers, and underscores`
            );
        }

        return new SchemaName(value);
    }

    /**
     * Gets the underlying string value of the schema name.
     *
     * @returns PascalCase schema name string
     */
    public getValue(): string {
        return this.value;
    }

    /**
     * Checks equality with another SchemaName.
     *
     * @param other - SchemaName to compare with
     * @returns True if values are identical
     */
    public equals(other: SchemaName): boolean {
        return this.value === other.value;
    }

    /**
     * Returns string representation of the schema name.
     *
     * @returns PascalCase schema name string
     */
    public toString(): string {
        return this.value;
    }
}
