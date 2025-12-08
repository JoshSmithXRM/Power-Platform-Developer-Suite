import { FetchXmlContextDetector } from './FetchXmlContextDetector';

describe('FetchXmlContextDetector', () => {
	let detector: FetchXmlContextDetector;

	beforeEach(() => {
		detector = new FetchXmlContextDetector();
	});

	// =========================================================================
	// Element Context Tests
	// =========================================================================

	describe('Element Context Detection', () => {
		it('should suggest "fetch" at document start', () => {
			const xml = '<';
			const result = detector.detectContext(xml, 1);

			expect(result.kind).toBe('element');
			if (result.kind === 'element') {
				expect(result.parentElement).toBeNull();
				expect(result.suggestedElements).toContain('fetch');
			}
		});

		it('should suggest "entity" inside fetch element', () => {
			const xml = '<fetch><';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('element');
			if (result.kind === 'element') {
				expect(result.parentElement).toBe('fetch');
				expect(result.suggestedElements).toContain('entity');
			}
		});

		it('should suggest entity children inside entity element', () => {
			const xml = '<fetch><entity name="account"><';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('element');
			if (result.kind === 'element') {
				expect(result.parentElement).toBe('entity');
				expect(result.suggestedElements).toContain('attribute');
				expect(result.suggestedElements).toContain('all-attributes');
				expect(result.suggestedElements).toContain('filter');
				expect(result.suggestedElements).toContain('order');
				expect(result.suggestedElements).toContain('link-entity');
			}
		});

		it('should suggest filter children inside filter element', () => {
			const xml = '<fetch><entity name="account"><filter><';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('element');
			if (result.kind === 'element') {
				expect(result.parentElement).toBe('filter');
				expect(result.suggestedElements).toContain('condition');
				expect(result.suggestedElements).toContain('filter'); // Nested filter
			}
		});

		it('should suggest link-entity children inside link-entity', () => {
			const xml = '<fetch><entity name="account"><link-entity name="contact"><';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('element');
			if (result.kind === 'element') {
				expect(result.parentElement).toBe('link-entity');
				expect(result.suggestedElements).toContain('attribute');
				expect(result.suggestedElements).toContain('filter');
				expect(result.suggestedElements).toContain('link-entity'); // Nested joins
			}
		});

		it('should handle partial element typing', () => {
			const xml = '<fetch><entity name="account"><att';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('element');
			if (result.kind === 'element') {
				expect(result.parentElement).toBe('entity');
				expect(result.suggestedElements).toContain('attribute');
			}
		});

		it('should not suggest elements after closed tag', () => {
			const xml = '<fetch><entity name="account"></entity>';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('none');
		});
	});

	// =========================================================================
	// Attribute Name Context Tests
	// =========================================================================

	describe('Attribute Name Context Detection', () => {
		it('should suggest fetch attributes after fetch element', () => {
			const xml = '<fetch ';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('attribute-name');
			if (result.kind === 'attribute-name') {
				expect(result.element).toBe('fetch');
				expect(result.suggestedAttributes).toContain('version');
				expect(result.suggestedAttributes).toContain('count');
				expect(result.suggestedAttributes).toContain('distinct');
				expect(result.suggestedAttributes).toContain('aggregate');
			}
		});

		it('should suggest entity attributes after entity element', () => {
			const xml = '<fetch><entity ';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('attribute-name');
			if (result.kind === 'attribute-name') {
				expect(result.element).toBe('entity');
				expect(result.suggestedAttributes).toContain('name');
			}
		});

		it('should suggest attribute attributes after attribute element', () => {
			const xml = '<fetch><entity name="account"><attribute ';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('attribute-name');
			if (result.kind === 'attribute-name') {
				expect(result.element).toBe('attribute');
				expect(result.suggestedAttributes).toContain('name');
				expect(result.suggestedAttributes).toContain('alias');
				expect(result.suggestedAttributes).toContain('aggregate');
			}
		});

		it('should suggest order attributes', () => {
			const xml = '<fetch><entity name="account"><order ';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('attribute-name');
			if (result.kind === 'attribute-name') {
				expect(result.element).toBe('order');
				expect(result.suggestedAttributes).toContain('attribute');
				expect(result.suggestedAttributes).toContain('descending');
			}
		});

		it('should suggest filter attributes', () => {
			const xml = '<fetch><entity name="account"><filter ';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('attribute-name');
			if (result.kind === 'attribute-name') {
				expect(result.element).toBe('filter');
				expect(result.suggestedAttributes).toContain('type');
			}
		});

		it('should suggest condition attributes', () => {
			const xml = '<fetch><entity name="account"><filter><condition ';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('attribute-name');
			if (result.kind === 'attribute-name') {
				expect(result.element).toBe('condition');
				expect(result.suggestedAttributes).toContain('attribute');
				expect(result.suggestedAttributes).toContain('operator');
				expect(result.suggestedAttributes).toContain('value');
			}
		});

		it('should suggest link-entity attributes', () => {
			const xml = '<fetch><entity name="account"><link-entity ';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('attribute-name');
			if (result.kind === 'attribute-name') {
				expect(result.element).toBe('link-entity');
				expect(result.suggestedAttributes).toContain('name');
				expect(result.suggestedAttributes).toContain('from');
				expect(result.suggestedAttributes).toContain('to');
				expect(result.suggestedAttributes).toContain('link-type');
			}
		});

		it('should filter out existing attributes', () => {
			const xml = '<fetch version="1.0" ';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('attribute-name');
			if (result.kind === 'attribute-name') {
				expect(result.suggestedAttributes).not.toContain('version');
				expect(result.suggestedAttributes).toContain('count'); // Other attrs still available
			}
		});

		it('should not suggest attributes inside attribute value', () => {
			const xml = '<fetch version="';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('attribute-value');
		});
	});

	// =========================================================================
	// Attribute Value Context Tests
	// =========================================================================

	describe('Attribute Value Context Detection', () => {
		it('should detect entity name attribute value context', () => {
			const xml = '<fetch><entity name="';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('attribute-value');
			if (result.kind === 'attribute-value') {
				expect(result.element).toBe('entity');
				expect(result.attribute).toBe('name');
			}
		});

		it('should detect attribute name value context with entity', () => {
			const xml = '<fetch><entity name="account"><attribute name="';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('attribute-value');
			if (result.kind === 'attribute-value') {
				expect(result.element).toBe('attribute');
				expect(result.attribute).toBe('name');
				expect(result.entityContext).toBe('account');
			}
		});

		it('should detect condition operator value context', () => {
			const xml = '<fetch><entity name="account"><filter><condition attribute="name" operator="';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('attribute-value');
			if (result.kind === 'attribute-value') {
				expect(result.element).toBe('condition');
				expect(result.attribute).toBe('operator');
			}
		});

		it('should detect filter type value context', () => {
			const xml = '<fetch><entity name="account"><filter type="';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('attribute-value');
			if (result.kind === 'attribute-value') {
				expect(result.element).toBe('filter');
				expect(result.attribute).toBe('type');
			}
		});

		it('should detect link-entity name value context', () => {
			const xml = '<fetch><entity name="account"><link-entity name="';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('attribute-value');
			if (result.kind === 'attribute-value') {
				expect(result.element).toBe('link-entity');
				expect(result.attribute).toBe('name');
			}
		});

		it('should detect link-type value context', () => {
			const xml = '<fetch><entity name="account"><link-entity name="contact" link-type="';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('attribute-value');
			if (result.kind === 'attribute-value') {
				expect(result.element).toBe('link-entity');
				expect(result.attribute).toBe('link-type');
			}
		});

		it('should detect order attribute value context', () => {
			const xml = '<fetch><entity name="account"><order attribute="';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('attribute-value');
			if (result.kind === 'attribute-value') {
				expect(result.element).toBe('order');
				expect(result.attribute).toBe('attribute');
				expect(result.entityContext).toBe('account');
			}
		});

		it('should detect condition attribute value context', () => {
			const xml = '<fetch><entity name="account"><filter><condition attribute="';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('attribute-value');
			if (result.kind === 'attribute-value') {
				expect(result.element).toBe('condition');
				expect(result.attribute).toBe('attribute');
				expect(result.entityContext).toBe('account');
			}
		});
	});

	// =========================================================================
	// Entity Context Extraction Tests
	// =========================================================================

	describe('Entity Context Extraction', () => {
		it('should extract entity from entity element', () => {
			const xml = '<fetch><entity name="account">';
			const result = detector.extractEntityContext(xml);

			expect(result).toBe('account');
		});

		it('should extract entity from link-entity context', () => {
			const xml = '<fetch><entity name="account"><link-entity name="contact">';
			const result = detector.extractEntityContext(xml);

			// Should return the most nested entity (contact)
			expect(result).toBe('contact');
		});

		it('should track entity after closing link-entity', () => {
			const xml = '<fetch><entity name="account"><link-entity name="contact"></link-entity>';
			const result = detector.extractEntityContext(xml);

			// Back to account after link-entity closes
			expect(result).toBe('account');
		});

		it('should handle multiple nested link-entities', () => {
			const xml = '<fetch><entity name="account"><link-entity name="contact"><link-entity name="systemuser">';
			const result = detector.extractEntityContext(xml);

			expect(result).toBe('systemuser');
		});

		it('should return null when no entity found', () => {
			const xml = '<fetch>';
			const result = detector.extractEntityContext(xml);

			expect(result).toBeNull();
		});
	});

	// =========================================================================
	// Edge Cases
	// =========================================================================

	describe('Edge Cases', () => {
		it('should handle empty string', () => {
			const result = detector.detectContext('', 0);
			expect(result.kind).toBe('none');
		});

		it('should handle self-closing elements', () => {
			const xml = '<fetch><entity name="account"><attribute name="name" /><';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('element');
			if (result.kind === 'element') {
				expect(result.parentElement).toBe('entity');
			}
		});

		it('should handle multiline FetchXML', () => {
			const xml = `<fetch>
  <entity name="account">
    <attribute name="name" />
    <`;
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('element');
			if (result.kind === 'element') {
				expect(result.parentElement).toBe('entity');
			}
		});

		it('should handle partial attribute value', () => {
			const xml = '<fetch><entity name="acc';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('attribute-value');
			if (result.kind === 'attribute-value') {
				expect(result.element).toBe('entity');
				expect(result.attribute).toBe('name');
			}
		});

		it('should return none for text between elements', () => {
			const xml = '<fetch><entity name="account">some text';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('none');
		});

		it('should handle all-attributes element (no children)', () => {
			const xml = '<fetch><entity name="account"><all-attributes ';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('attribute-name');
			if (result.kind === 'attribute-name') {
				expect(result.element).toBe('all-attributes');
				expect(result.suggestedAttributes).toHaveLength(0);
			}
		});

		it('should handle attribute value context with undefined element', () => {
			const xml = '<entity name="';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('attribute-value');
		});

		it('should handle malformed attribute syntax', () => {
			const xml = '<entity ="test"';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('attribute-name');
		});

		it('should handle attribute name context with closed tag', () => {
			const xml = '<fetch></fetch>';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('none');
		});

		it('should handle attribute name context with closing tag', () => {
			const xml = '<fetch></';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('none');
		});

		it('should handle attribute name context without trailing space', () => {
			const xml = '<fetch';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('element');
		});

		it('should handle unknown element for child suggestions', () => {
			const xml = '<fetch><unknown><';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('element');
			if (result.kind === 'element') {
				expect(result.parentElement).toBe('unknown');
				expect(result.suggestedElements).toHaveLength(0);
			}
		});

		it('should handle unknown element for attribute suggestions', () => {
			const xml = '<fetch><unknown ';
			const result = detector.detectContext(xml, xml.length);

			expect(result.kind).toBe('attribute-name');
			if (result.kind === 'attribute-name') {
				expect(result.element).toBe('unknown');
				expect(result.suggestedAttributes).toHaveLength(0);
			}
		});

		it('should handle entity extraction with empty name', () => {
			const xml = '<fetch><entity name="">';
			const result = detector.extractEntityContext(xml);

			expect(result).toBeNull();
		});

		it('should handle entity extraction with self-closing tag', () => {
			const xml = '<fetch><entity name="account" />';
			const result = detector.extractEntityContext(xml);

			expect(result).toBe('account');
		});
	});

	// =========================================================================
	// Utility Method Tests
	// =========================================================================

	describe('Utility Methods', () => {
		it('should return all operators', () => {
			const operators = detector.getOperators();

			expect(operators).toContain('eq');
			expect(operators).toContain('ne');
			expect(operators).toContain('like');
			expect(operators).toContain('null');
			expect(operators).toContain('today');
			expect(operators).toContain('eq-userid');
		});

		it('should return filter types', () => {
			const types = detector.getFilterTypes();

			expect(types).toContain('and');
			expect(types).toContain('or');
		});

		it('should return link types', () => {
			const types = detector.getLinkTypes();

			expect(types).toContain('inner');
			expect(types).toContain('outer');
		});

		it('should return boolean values', () => {
			const values = detector.getBooleanValues();

			expect(values).toContain('true');
			expect(values).toContain('false');
		});

		it('should return aggregate functions', () => {
			const funcs = detector.getAggregateFunctions();

			expect(funcs).toContain('count');
			expect(funcs).toContain('sum');
			expect(funcs).toContain('avg');
			expect(funcs).toContain('min');
			expect(funcs).toContain('max');
		});

		it('should return date groupings', () => {
			const groupings = detector.getDateGroupings();

			expect(groupings).toContain('day');
			expect(groupings).toContain('week');
			expect(groupings).toContain('month');
			expect(groupings).toContain('year');
		});
	});
});
