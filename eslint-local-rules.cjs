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
	},

	'no-static-entity-methods': {
		meta: {
			type: 'problem',
			docs: {
				description: 'Prevent static utility methods on domain entities and value objects',
				category: 'Clean Architecture',
				recommended: true
			},
			messages: {
				staticMethodOnEntity: '❌ Static utility method "{{methodName}}" on {{objectType}} "{{entityName}}". Use domain services or collection classes instead. (CLAUDE.md rule #13)'
			},
			schema: []
		},
		create(context) {
			const filename = context.getFilename();

			// Only apply to domain entities and value objects
			const isEntity = filename.includes('/domain/entities/') || filename.includes('\\domain\\entities\\');
			const isValueObject = filename.includes('/domain/valueObjects/') || filename.includes('\\domain\\valueObjects\\');

			if (!isEntity && !isValueObject) {
				return {};
			}

			const objectType = isEntity ? 'entity' : 'value object';

			return {
				MethodDefinition(node) {
					// Allow factory/creation methods (common value object patterns)
					const allowedStaticMethods = [
						'create', 'createFrom', 'createEmpty', 'createGlobal', 'createSecret',
						'from', 'fromJson', 'fromData', 'fromValue', 'fromSegments',
						'generate', 'success', 'failure', 'successWithWarnings',
						'allowed', 'protected', 'notFound', 'forSecret', 'parsePath',
						'calculateSize', 'empty'
					];
					const methodName = node.key.name;

					if (node.static &&
						node.kind === 'method' &&
						!allowedStaticMethods.includes(methodName)) {
						const className = node.parent.parent.id?.name || 'Unknown';
						context.report({
							node,
							messageId: 'staticMethodOnEntity',
							data: {
								methodName: methodName,
								entityName: className,
								objectType: objectType
							}
						});
					}
				}
			};
		}
	},

	'no-presentation-methods-in-domain': {
		meta: {
			type: 'problem',
			docs: {
				description: 'Prevent presentation/serialization methods in domain entities and value objects',
				category: 'Clean Architecture',
				recommended: true
			},
			messages: {
				presentationMethodInDomain: '❌ Presentation method "{{methodName}}" in domain {{objectType}}. Move to mapper in application layer. (CLAUDE.md rule #14: Presentation logic in domain)'
			},
			schema: []
		},
		create(context) {
			const filename = context.getFilename();

			// Only apply to domain entities and value objects
			const isEntity = filename.includes('/domain/entities/') || filename.includes('\\domain\\entities\\');
			const isValueObject = filename.includes('/domain/valueObjects/') || filename.includes('\\domain\\valueObjects\\');

			if (!isEntity && !isValueObject) {
				return {};
			}

			const objectType = isEntity ? 'entity' : 'value object';

			const FORBIDDEN_PREFIXES = ['to', 'as', 'serialize', 'deserialize', 'format'];
			const FORBIDDEN_METHODS = ['getTypeName', 'getStatusLabel', 'getLabel', 'getDisplayName', 'getDisplayText'];
			const ALLOWED_METHODS = ['toString', 'toJSON']; // Standard JavaScript methods

			return {
				MethodDefinition(node) {
					const methodName = node.key.name;

					// Skip allowed methods
					if (ALLOWED_METHODS.includes(methodName)) {
						return;
					}

					// Check if method is explicitly forbidden
					const isExplicitlyForbidden = FORBIDDEN_METHODS.includes(methodName);

					// Check if method starts with forbidden prefix
					const hasForbiddenPrefix = FORBIDDEN_PREFIXES.some(prefix =>
						methodName.startsWith(prefix)
					);

					if (isExplicitlyForbidden || hasForbiddenPrefix) {
						context.report({
							node,
							messageId: 'presentationMethodInDomain',
							data: {
								methodName: methodName,
								objectType: objectType
							}
						});
					}
				}
			};
		}
	},

	'no-html-in-typescript': {
		meta: {
			type: 'problem',
			docs: {
				description: 'Prevent HTML templates in TypeScript panel files',
				category: 'Clean Architecture',
				recommended: true
			},
			messages: {
				htmlInTypescript: '❌ HTML template in TypeScript file. Extract to view file in presentation/views/. (CLAUDE.md rule #11: HTML in panel .ts files)'
			},
			schema: []
		},
		create(context) {
			const filename = context.getFilename();

			// Only apply to panel files (not view files)
			const isPanel = (filename.includes('/presentation/panels/') || filename.includes('\\presentation\\panels\\'));
			const isView = (filename.includes('/presentation/views/') || filename.includes('\\presentation\\views\\'));

			if (!isPanel || isView) {
				return {};
			}

			const HTML_TAG_REGEX = /<[a-z][\s\S]*>/i;

			return {
				TemplateLiteral(node) {
					const templateValue = context.sourceCode.getText(node);

					// Check if template contains HTML tags
					if (HTML_TAG_REGEX.test(templateValue)) {
						context.report({
							node,
							messageId: 'htmlInTypescript'
						});
					}
				}
			};
		}
	},

	'prefer-explicit-undefined': {
		meta: {
			type: 'suggestion',
			docs: {
				description: 'Require explicit "| undefined" instead of optional parameter syntax',
				category: 'Best Practices',
				recommended: false
			},
			messages: {
				preferExplicitUndefined: 'Use explicit "| undefined" instead of optional parameter "?". Makes optionality clearer in function signatures.'
			},
			schema: []
		},
		create(context) {
			return {
				'FunctionDeclaration, MethodDefinition, ArrowFunctionExpression': (node) => {
					const params = node.value?.params || node.params;

					if (!params) {
						return;
					}

					params.forEach(param => {
						// Check if parameter is optional
						if (param.optional && param.typeAnnotation) {
							// Check if type annotation already includes undefined
							const typeAnnotation = param.typeAnnotation.typeAnnotation;
							const hasExplicitUndefined = typeAnnotation.types?.some(
								t => t.type === 'TSUndefinedKeyword'
							);

							if (!hasExplicitUndefined) {
								context.report({
									node: param,
									messageId: 'preferExplicitUndefined'
								});
							}
						}
					});
				}
			};
		}
	},

	'no-static-dependency-instantiation': {
		meta: {
			type: 'problem',
			docs: {
				description: 'Prevent static instantiation of dependencies in classes',
				category: 'Best Practices',
				recommended: true
			},
			messages: {
				staticDependencyInstantiation: '❌ Static dependency instantiation "{{propertyName}}". Inject dependencies via constructor or method parameters for testability.'
			},
			schema: []
		},
		create(context) {
			return {
				PropertyDefinition(node) {
					// Check if property is static and readonly
					const isStatic = node.static === true;
					const isReadonly = node.readonly === true;

					if (!isStatic || !isReadonly) {
						return;
					}

					// Check if value is a NewExpression (new X())
					if (node.value && node.value.type === 'NewExpression') {
						const propertyName = node.key.name || 'unknown';
						context.report({
							node,
							messageId: 'staticDependencyInstantiation',
							data: {
								propertyName: propertyName
							}
						});
					}
				}
			};
		}
	}
};
