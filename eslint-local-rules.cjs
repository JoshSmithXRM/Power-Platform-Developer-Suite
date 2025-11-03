/**
 * Custom ESLint rules for enforcing Clean Architecture boundaries.
 *
 * These rules prevent violations of CLAUDE.md architectural principles:
 * - Presentation layer cannot import domain entities/value objects
 * - Domain layer must have ZERO dependencies on outer layers
 * - Dependencies must point inward: Presentation → Application → Domain
 */

module.exports = {
	'no-domain-in-presentation': {
		meta: {
			type: 'problem',
			docs: {
				description: 'Prevent presentation layer from importing domain entities or value objects',
				category: 'Clean Architecture',
				recommended: true
			},
			messages: {
				domainEntityInPresentation: '❌ Presentation layer cannot import domain entity "{{importPath}}". Use ViewModels from application layer instead. (CLAUDE.md rule #2: Clean Architecture layers)',
				domainValueObjectInPresentation: '❌ Presentation layer cannot import domain value object "{{importPath}}". Re-export types through application layer. (CLAUDE.md rule #2: Clean Architecture layers)'
			},
			schema: []
		},
		create(context) {
			const filename = context.getFilename();

			// Only apply to presentation layer files
			if (!filename.includes('/presentation/') && !filename.includes('\\presentation\\')) {
				return {};
			}

			return {
				ImportDeclaration(node) {
					const importPath = node.source.value;

					// Allow type-only imports (e.g., import { type Solution })
					const isTypeOnlyImport = node.importKind === 'type' ||
						node.specifiers.every(spec => spec.importKind === 'type');

					if (isTypeOnlyImport) {
						return; // Type-only imports are allowed
					}

					// Check for domain entity imports
					if (importPath.includes('/domain/entities/') || importPath.includes('\\domain\\entities\\')) {
						context.report({
							node,
							messageId: 'domainEntityInPresentation',
							data: {
								importPath
							}
						});
					}

					// Check for domain value object imports
					if (importPath.includes('/domain/valueObjects/') || importPath.includes('\\domain\\valueObjects\\')) {
						context.report({
							node,
							messageId: 'domainValueObjectInPresentation',
							data: {
								importPath
							}
						});
					}
				}
			};
		}
	},

	'no-outer-layers-in-domain': {
		meta: {
			type: 'problem',
			docs: {
				description: 'Prevent domain layer from depending on infrastructure or presentation',
				category: 'Clean Architecture',
				recommended: true
			},
			messages: {
				infrastructureInDomain: '❌ Domain layer cannot depend on infrastructure "{{importPath}}". Domain must have ZERO dependencies. (CLAUDE.md rule #7: Domain has ZERO dependencies)',
				presentationInDomain: '❌ Domain layer cannot depend on presentation "{{importPath}}". Dependencies must point inward. (CLAUDE.md rule #7: Dependency direction inward)',
				applicationInDomain: '❌ Domain layer cannot depend on application layer "{{importPath}}". Dependencies must point inward. (CLAUDE.md rule #7: Dependency direction inward)'
			},
			schema: []
		},
		create(context) {
			const filename = context.getFilename();

			// Only apply to domain layer files
			if (!filename.includes('/domain/') && !filename.includes('\\domain\\')) {
				return {};
			}

			return {
				ImportDeclaration(node) {
					const importPath = node.source.value;

					// Check for infrastructure imports
					if (importPath.includes('/infrastructure/') || importPath.includes('\\infrastructure\\')) {
						context.report({
							node,
							messageId: 'infrastructureInDomain',
							data: {
								importPath
							}
						});
					}

					// Check for presentation imports
					if (importPath.includes('/presentation/') || importPath.includes('\\presentation\\')) {
						context.report({
							node,
							messageId: 'presentationInDomain',
							data: {
								importPath
							}
						});
					}

					// Check for application imports
					if (importPath.includes('/application/') || importPath.includes('\\application\\')) {
						context.report({
							node,
							messageId: 'applicationInDomain',
							data: {
								importPath
							}
						});
					}
				}
			};
		}
	},

	'no-presentation-in-application': {
		meta: {
			type: 'problem',
			docs: {
				description: 'Prevent application layer from depending on presentation',
				category: 'Clean Architecture',
				recommended: true
			},
			messages: {
				presentationInApplication: '❌ Application layer cannot depend on presentation "{{importPath}}". Dependencies must point inward. (CLAUDE.md rule #7: Dependency direction inward)'
			},
			schema: []
		},
		create(context) {
			const filename = context.getFilename();

			// Only apply to application layer files
			if (!filename.includes('/application/') && !filename.includes('\\application\\')) {
				return {};
			}

			return {
				ImportDeclaration(node) {
					const importPath = node.source.value;

					// Check for presentation imports
					if (importPath.includes('/presentation/') || importPath.includes('\\presentation\\')) {
						context.report({
							node,
							messageId: 'presentationInApplication',
							data: {
								importPath
							}
						});
					}
				}
			};
		}
	}
};
