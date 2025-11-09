import { CascadeConfiguration } from '../CascadeConfiguration';

describe('CascadeConfiguration', () => {
    describe('create', () => {
        it('should create cascade configuration with all required fields', () => {
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'Cascade',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade'
            });

            expect(config.assign).toBe('NoCascade');
            expect(config.deleteAction).toBe('Cascade');
            expect(config.merge).toBe('NoCascade');
            expect(config.reparent).toBe('NoCascade');
            expect(config.share).toBe('NoCascade');
            expect(config.unshare).toBe('NoCascade');
            expect(config.archive).toBeNull();
            expect(config.rollupView).toBeNull();
        });

        it('should create cascade configuration with optional archive field', () => {
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'NoCascade',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade',
                archive: 'Cascade'
            });

            expect(config.archive).toBe('Cascade');
        });

        it('should create cascade configuration with optional rollupView field', () => {
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'NoCascade',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade',
                rollupView: 'Active'
            });

            expect(config.rollupView).toBe('Active');
        });

        it('should set archive to null when not provided', () => {
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'NoCascade',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade'
            });

            expect(config.archive).toBeNull();
        });

        it('should set rollupView to null when not provided', () => {
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'NoCascade',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade'
            });

            expect(config.rollupView).toBeNull();
        });

        it('should handle all cascade types', () => {
            const config = CascadeConfiguration.create({
                assign: 'Cascade',
                delete: 'RemoveLink',
                merge: 'Active',
                reparent: 'UserOwned',
                share: 'Restrict',
                unshare: 'NoCascade'
            });

            expect(config.assign).toBe('Cascade');
            expect(config.deleteAction).toBe('RemoveLink');
            expect(config.merge).toBe('Active');
            expect(config.reparent).toBe('UserOwned');
            expect(config.share).toBe('Restrict');
            expect(config.unshare).toBe('NoCascade');
        });
    });

    describe('hasAnyCascade', () => {
        it('should return false when all cascades are NoCascade', () => {
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'NoCascade',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade'
            });

            expect(config.hasAnyCascade()).toBe(false);
        });

        it('should return true when assign is cascading', () => {
            const config = CascadeConfiguration.create({
                assign: 'Cascade',
                delete: 'NoCascade',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade'
            });

            expect(config.hasAnyCascade()).toBe(true);
        });

        it('should return true when delete is cascading', () => {
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'Cascade',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade'
            });

            expect(config.hasAnyCascade()).toBe(true);
        });

        it('should return true when merge is cascading', () => {
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'NoCascade',
                merge: 'Active',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade'
            });

            expect(config.hasAnyCascade()).toBe(true);
        });

        it('should return true when reparent is cascading', () => {
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'NoCascade',
                merge: 'NoCascade',
                reparent: 'UserOwned',
                share: 'NoCascade',
                unshare: 'NoCascade'
            });

            expect(config.hasAnyCascade()).toBe(true);
        });

        it('should return true when share is cascading', () => {
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'NoCascade',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'Cascade',
                unshare: 'NoCascade'
            });

            expect(config.hasAnyCascade()).toBe(true);
        });

        it('should return true when unshare is cascading', () => {
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'NoCascade',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'Restrict'
            });

            expect(config.hasAnyCascade()).toBe(true);
        });

        it('should return true when multiple cascades are active', () => {
            const config = CascadeConfiguration.create({
                assign: 'Cascade',
                delete: 'Cascade',
                merge: 'Active',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade'
            });

            expect(config.hasAnyCascade()).toBe(true);
        });
    });

    describe('willCascadeDelete', () => {
        it('should return true when delete is Cascade', () => {
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'Cascade',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade'
            });

            expect(config.willCascadeDelete()).toBe(true);
        });

        it('should return false when delete is NoCascade', () => {
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'NoCascade',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade'
            });

            expect(config.willCascadeDelete()).toBe(false);
        });

        it('should return false when delete is RemoveLink', () => {
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'RemoveLink',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade'
            });

            expect(config.willCascadeDelete()).toBe(false);
        });

        it('should return false when delete is Restrict', () => {
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'Restrict',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade'
            });

            expect(config.willCascadeDelete()).toBe(false);
        });

        it('should return false when delete is Active', () => {
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'Active',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade'
            });

            expect(config.willCascadeDelete()).toBe(false);
        });

        it('should return false when delete is UserOwned', () => {
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'UserOwned',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade'
            });

            expect(config.willCascadeDelete()).toBe(false);
        });
    });
});
