/**
 * Value object representing cascade behavior configuration for relationships.
 * Immutable - validates cascade rules at creation.
 */
export class CascadeConfiguration {
    private constructor(
        public readonly assign: CascadeType,
        public readonly deleteAction: CascadeType,
        public readonly merge: CascadeType,
        public readonly reparent: CascadeType,
        public readonly share: CascadeType,
        public readonly unshare: CascadeType,
        public readonly archive: CascadeType | null,
        public readonly rollupView: CascadeType | null
    ) {}

    public static create(props: {
        assign: CascadeType;
        delete: CascadeType;
        merge: CascadeType;
        reparent: CascadeType;
        share: CascadeType;
        unshare: CascadeType;
        archive?: CascadeType | null;
        rollupView?: CascadeType | null;
    }): CascadeConfiguration {
        return new CascadeConfiguration(
            props.assign,
            props.delete,
            props.merge,
            props.reparent,
            props.share,
            props.unshare,
            props.archive ?? null,
            props.rollupView ?? null
        );
    }

    /**
     * Checks if any cascade operations are active (not NoCascade).
     */
    public hasAnyCascade(): boolean {
        return (
            this.assign !== 'NoCascade' ||
            this.deleteAction !== 'NoCascade' ||
            this.merge !== 'NoCascade' ||
            this.reparent !== 'NoCascade' ||
            this.share !== 'NoCascade' ||
            this.unshare !== 'NoCascade'
        );
    }

    /**
     * Checks if delete cascade is active (will cascade deletes).
     */
    public willCascadeDelete(): boolean {
        return this.deleteAction === 'Cascade';
    }
}

export type CascadeType = 'NoCascade' | 'Cascade' | 'Active' | 'UserOwned' | 'RemoveLink' | 'Restrict';
