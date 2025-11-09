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
            throw new Error('Schema name cannot be empty');
        }

        // Schema names must be alphanumeric (with underscores allowed)
        // Can start with upper or lowercase letter
        const validPattern = /^[A-Za-z][A-Za-z0-9_]*$/;
        if (!validPattern.test(value)) {
            throw new Error(
                `Invalid schema name format: "${value}". Must start with a letter and contain only letters, numbers, and underscores.`
            );
        }

        return new SchemaName(value);
    }

    public getValue(): string {
        return this.value;
    }

    public equals(other: SchemaName): boolean {
        return this.value === other.value;
    }

    public toString(): string {
        return this.value;
    }
}
