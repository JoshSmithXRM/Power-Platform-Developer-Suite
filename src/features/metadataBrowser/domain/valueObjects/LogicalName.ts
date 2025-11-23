/**
 * Value object representing a Dataverse logical name.
 * Logical names are lowercase identifiers used in the Dataverse API.
 */
export class LogicalName {
    private readonly value: string;

    private constructor(value: string) {
        this.value = value;
    }

    /**
     * Creates a LogicalName from a string value.
     * @throws Error if the value is empty or contains invalid characters
     */
    public static create(value: string): LogicalName {
        if (!value || value.trim().length === 0) {
            throw new Error('Logical name cannot be empty');
        }

        // Logical names must be lowercase alphanumeric with underscores
        const validPattern = /^[a-z][a-z0-9_]*$/;
        if (!validPattern.test(value)) {
            throw new Error(
                `Invalid logical name format: "${value}". Must start with lowercase letter and contain only lowercase letters, numbers, and underscores.`
            );
        }

        return new LogicalName(value);
    }

    /**
     * Gets the underlying string value of the logical name.
     *
     * @returns Lowercase logical name string
     */
    public getValue(): string {
        return this.value;
    }

    /**
     * Checks equality with another LogicalName.
     *
     * @param other - LogicalName to compare with
     * @returns True if values are identical
     */
    public equals(other: LogicalName): boolean {
        return this.value === other.value;
    }

    /**
     * Returns string representation of the logical name.
     *
     * @returns Lowercase logical name string
     */
    public toString(): string {
        return this.value;
    }
}
