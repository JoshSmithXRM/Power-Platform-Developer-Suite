import { CascadeConfiguration, type CascadeType } from './CascadeConfiguration';

describe('CascadeConfiguration', () => {
    describe('create', () => {
        it('should create a configuration with all required cascade types', () => {
            // Arrange
            const props = {
                assign: 'Cascade' as CascadeType,
                delete: 'Cascade' as CascadeType,
                merge: 'Active' as CascadeType,
                reparent: 'UserOwned' as CascadeType,
                share: 'RemoveLink' as CascadeType,
                unshare: 'Restrict' as CascadeType,
            };

            // Act
            const config = CascadeConfiguration.create(props);

            // Assert
            expect(config.assign).toBe('Cascade');
            expect(config.deleteAction).toBe('Cascade');
            expect(config.merge).toBe('Active');
            expect(config.reparent).toBe('UserOwned');
            expect(config.share).toBe('RemoveLink');
            expect(config.unshare).toBe('Restrict');
        });

        it('should set archive to null when not provided', () => {
            // Arrange
            const props = {
                assign: 'NoCascade' as CascadeType,
                delete: 'NoCascade' as CascadeType,
                merge: 'NoCascade' as CascadeType,
                reparent: 'NoCascade' as CascadeType,
                share: 'NoCascade' as CascadeType,
                unshare: 'NoCascade' as CascadeType,
            };

            // Act
            const config = CascadeConfiguration.create(props);

            // Assert
            expect(config.archive).toBeNull();
        });

        it('should set rollupView to null when not provided', () => {
            // Arrange
            const props = {
                assign: 'NoCascade' as CascadeType,
                delete: 'NoCascade' as CascadeType,
                merge: 'NoCascade' as CascadeType,
                reparent: 'NoCascade' as CascadeType,
                share: 'NoCascade' as CascadeType,
                unshare: 'NoCascade' as CascadeType,
            };

            // Act
            const config = CascadeConfiguration.create(props);

            // Assert
            expect(config.rollupView).toBeNull();
        });

        it('should accept archive value when provided', () => {
            // Arrange
            const props = {
                assign: 'NoCascade' as CascadeType,
                delete: 'NoCascade' as CascadeType,
                merge: 'NoCascade' as CascadeType,
                reparent: 'NoCascade' as CascadeType,
                share: 'NoCascade' as CascadeType,
                unshare: 'NoCascade' as CascadeType,
                archive: 'Cascade' as CascadeType,
            };

            // Act
            const config = CascadeConfiguration.create(props);

            // Assert
            expect(config.archive).toBe('Cascade');
        });

        it('should accept rollupView value when provided', () => {
            // Arrange
            const props = {
                assign: 'NoCascade' as CascadeType,
                delete: 'NoCascade' as CascadeType,
                merge: 'NoCascade' as CascadeType,
                reparent: 'NoCascade' as CascadeType,
                share: 'NoCascade' as CascadeType,
                unshare: 'NoCascade' as CascadeType,
                rollupView: 'Active' as CascadeType,
            };

            // Act
            const config = CascadeConfiguration.create(props);

            // Assert
            expect(config.rollupView).toBe('Active');
        });

        it('should accept both archive and rollupView when provided', () => {
            // Arrange
            const props = {
                assign: 'NoCascade' as CascadeType,
                delete: 'NoCascade' as CascadeType,
                merge: 'NoCascade' as CascadeType,
                reparent: 'NoCascade' as CascadeType,
                share: 'NoCascade' as CascadeType,
                unshare: 'NoCascade' as CascadeType,
                archive: 'UserOwned' as CascadeType,
                rollupView: 'RemoveLink' as CascadeType,
            };

            // Act
            const config = CascadeConfiguration.create(props);

            // Assert
            expect(config.archive).toBe('UserOwned');
            expect(config.rollupView).toBe('RemoveLink');
        });

        it('should convert explicit null archive to null', () => {
            // Arrange
            const props = {
                assign: 'NoCascade' as CascadeType,
                delete: 'NoCascade' as CascadeType,
                merge: 'NoCascade' as CascadeType,
                reparent: 'NoCascade' as CascadeType,
                share: 'NoCascade' as CascadeType,
                unshare: 'NoCascade' as CascadeType,
                archive: null,
            };

            // Act
            const config = CascadeConfiguration.create(props);

            // Assert
            expect(config.archive).toBeNull();
        });

        it('should convert explicit null rollupView to null', () => {
            // Arrange
            const props = {
                assign: 'NoCascade' as CascadeType,
                delete: 'NoCascade' as CascadeType,
                merge: 'NoCascade' as CascadeType,
                reparent: 'NoCascade' as CascadeType,
                share: 'NoCascade' as CascadeType,
                unshare: 'NoCascade' as CascadeType,
                rollupView: null,
            };

            // Act
            const config = CascadeConfiguration.create(props);

            // Assert
            expect(config.rollupView).toBeNull();
        });
    });

    describe('hasAnyCascade', () => {
        it('should return false when all cascade types are NoCascade', () => {
            // Arrange
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'NoCascade',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade',
            });

            // Act
            const result = config.hasAnyCascade();

            // Assert
            expect(result).toBe(false);
        });

        it('should return true when assign is not NoCascade', () => {
            // Arrange
            const config = CascadeConfiguration.create({
                assign: 'Cascade',
                delete: 'NoCascade',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade',
            });

            // Act
            const result = config.hasAnyCascade();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true when deleteAction is not NoCascade', () => {
            // Arrange
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'Cascade',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade',
            });

            // Act
            const result = config.hasAnyCascade();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true when merge is not NoCascade', () => {
            // Arrange
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'NoCascade',
                merge: 'Active',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade',
            });

            // Act
            const result = config.hasAnyCascade();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true when reparent is not NoCascade', () => {
            // Arrange
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'NoCascade',
                merge: 'NoCascade',
                reparent: 'UserOwned',
                share: 'NoCascade',
                unshare: 'NoCascade',
            });

            // Act
            const result = config.hasAnyCascade();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true when share is not NoCascade', () => {
            // Arrange
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'NoCascade',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'RemoveLink',
                unshare: 'NoCascade',
            });

            // Act
            const result = config.hasAnyCascade();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true when unshare is not NoCascade', () => {
            // Arrange
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'NoCascade',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'Restrict',
            });

            // Act
            const result = config.hasAnyCascade();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true when multiple cascade types are active', () => {
            // Arrange
            const config = CascadeConfiguration.create({
                assign: 'Cascade',
                delete: 'Active',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade',
            });

            // Act
            const result = config.hasAnyCascade();

            // Assert
            expect(result).toBe(true);
        });

        it('should return true when all cascade types are active', () => {
            // Arrange
            const config = CascadeConfiguration.create({
                assign: 'Cascade',
                delete: 'Cascade',
                merge: 'Active',
                reparent: 'UserOwned',
                share: 'RemoveLink',
                unshare: 'Restrict',
            });

            // Act
            const result = config.hasAnyCascade();

            // Assert
            expect(result).toBe(true);
        });

        it('should ignore archive when checking for cascades', () => {
            // Arrange
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'NoCascade',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade',
                archive: 'Cascade',
            });

            // Act
            const result = config.hasAnyCascade();

            // Assert
            expect(result).toBe(false);
        });

        it('should ignore rollupView when checking for cascades', () => {
            // Arrange
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'NoCascade',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade',
                rollupView: 'Active',
            });

            // Act
            const result = config.hasAnyCascade();

            // Assert
            expect(result).toBe(false);
        });
    });

    describe('willCascadeDelete', () => {
        it('should return true when deleteAction is Cascade', () => {
            // Arrange
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'Cascade',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade',
            });

            // Act
            const result = config.willCascadeDelete();

            // Assert
            expect(result).toBe(true);
        });

        it('should return false when deleteAction is NoCascade', () => {
            // Arrange
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'NoCascade',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade',
            });

            // Act
            const result = config.willCascadeDelete();

            // Assert
            expect(result).toBe(false);
        });

        it('should return false when deleteAction is Active', () => {
            // Arrange
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'Active',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade',
            });

            // Act
            const result = config.willCascadeDelete();

            // Assert
            expect(result).toBe(false);
        });

        it('should return false when deleteAction is UserOwned', () => {
            // Arrange
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'UserOwned',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade',
            });

            // Act
            const result = config.willCascadeDelete();

            // Assert
            expect(result).toBe(false);
        });

        it('should return false when deleteAction is RemoveLink', () => {
            // Arrange
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'RemoveLink',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade',
            });

            // Act
            const result = config.willCascadeDelete();

            // Assert
            expect(result).toBe(false);
        });

        it('should return false when deleteAction is Restrict', () => {
            // Arrange
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'Restrict',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade',
            });

            // Act
            const result = config.willCascadeDelete();

            // Assert
            expect(result).toBe(false);
        });

        it('should only check deleteAction and ignore other cascade types', () => {
            // Arrange
            const config = CascadeConfiguration.create({
                assign: 'Cascade',
                delete: 'NoCascade',
                merge: 'Cascade',
                reparent: 'Cascade',
                share: 'Cascade',
                unshare: 'Cascade',
            });

            // Act
            const result = config.willCascadeDelete();

            // Assert
            expect(result).toBe(false);
        });
    });

    describe('property access', () => {
        it('should expose all cascade properties as readonly', () => {
            // Arrange
            const config = CascadeConfiguration.create({
                assign: 'Cascade',
                delete: 'Active',
                merge: 'UserOwned',
                reparent: 'RemoveLink',
                share: 'Restrict',
                unshare: 'NoCascade',
                archive: 'Cascade',
                rollupView: 'Active',
            });

            // Act & Assert - verify all properties are accessible
            expect(config.assign).toBeDefined();
            expect(config.deleteAction).toBeDefined();
            expect(config.merge).toBeDefined();
            expect(config.reparent).toBeDefined();
            expect(config.share).toBeDefined();
            expect(config.unshare).toBeDefined();
            expect(config.archive).toBeDefined();
            expect(config.rollupView).toBeDefined();
        });

        it('should have deleteAction property separate from delete parameter', () => {
            // Arrange
            const config = CascadeConfiguration.create({
                assign: 'NoCascade',
                delete: 'Cascade',
                merge: 'NoCascade',
                reparent: 'NoCascade',
                share: 'NoCascade',
                unshare: 'NoCascade',
            });

            // Act & Assert
            expect(config.deleteAction).toBe('Cascade');
        });
    });

    describe('edge cases with all cascade types', () => {
        it('should handle NoCascade for all properties', () => {
            // Arrange
            const props = {
                assign: 'NoCascade' as CascadeType,
                delete: 'NoCascade' as CascadeType,
                merge: 'NoCascade' as CascadeType,
                reparent: 'NoCascade' as CascadeType,
                share: 'NoCascade' as CascadeType,
                unshare: 'NoCascade' as CascadeType,
                archive: 'NoCascade' as CascadeType,
                rollupView: 'NoCascade' as CascadeType,
            };

            // Act
            const config = CascadeConfiguration.create(props);

            // Assert
            expect(config.assign).toBe('NoCascade');
            expect(config.deleteAction).toBe('NoCascade');
            expect(config.merge).toBe('NoCascade');
            expect(config.reparent).toBe('NoCascade');
            expect(config.share).toBe('NoCascade');
            expect(config.unshare).toBe('NoCascade');
            expect(config.archive).toBe('NoCascade');
            expect(config.rollupView).toBe('NoCascade');
            expect(config.hasAnyCascade()).toBe(false);
        });

        it('should handle Cascade for all properties', () => {
            // Arrange
            const props = {
                assign: 'Cascade' as CascadeType,
                delete: 'Cascade' as CascadeType,
                merge: 'Cascade' as CascadeType,
                reparent: 'Cascade' as CascadeType,
                share: 'Cascade' as CascadeType,
                unshare: 'Cascade' as CascadeType,
                archive: 'Cascade' as CascadeType,
                rollupView: 'Cascade' as CascadeType,
            };

            // Act
            const config = CascadeConfiguration.create(props);

            // Assert
            expect(config.assign).toBe('Cascade');
            expect(config.deleteAction).toBe('Cascade');
            expect(config.merge).toBe('Cascade');
            expect(config.reparent).toBe('Cascade');
            expect(config.share).toBe('Cascade');
            expect(config.unshare).toBe('Cascade');
            expect(config.archive).toBe('Cascade');
            expect(config.rollupView).toBe('Cascade');
            expect(config.hasAnyCascade()).toBe(true);
            expect(config.willCascadeDelete()).toBe(true);
        });

        it('should handle mixed cascade types', () => {
            // Arrange
            const props = {
                assign: 'Cascade' as CascadeType,
                delete: 'Active' as CascadeType,
                merge: 'UserOwned' as CascadeType,
                reparent: 'RemoveLink' as CascadeType,
                share: 'Restrict' as CascadeType,
                unshare: 'NoCascade' as CascadeType,
                archive: 'Cascade' as CascadeType,
                rollupView: 'Active' as CascadeType,
            };

            // Act
            const config = CascadeConfiguration.create(props);

            // Assert
            expect(config.assign).toBe('Cascade');
            expect(config.deleteAction).toBe('Active');
            expect(config.merge).toBe('UserOwned');
            expect(config.reparent).toBe('RemoveLink');
            expect(config.share).toBe('Restrict');
            expect(config.unshare).toBe('NoCascade');
            expect(config.archive).toBe('Cascade');
            expect(config.rollupView).toBe('Active');
            expect(config.hasAnyCascade()).toBe(true);
            expect(config.willCascadeDelete()).toBe(false);
        });
    });
});
