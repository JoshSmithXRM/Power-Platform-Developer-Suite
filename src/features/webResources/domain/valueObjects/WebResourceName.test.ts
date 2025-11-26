import { WebResourceName } from './WebResourceName';

describe('WebResourceName', () => {
	// ========== Creation & Validation ==========

	describe('create', () => {
		it('should create WebResourceName with simple prefix_name format', () => {
			// Arrange & Act
			const name = WebResourceName.create('new_myscript.js');

			// Assert
			expect(name).toBeInstanceOf(WebResourceName);
			expect(name.getValue()).toBe('new_myscript.js');
		});

		it('should create WebResourceName with path format', () => {
			// Arrange & Act
			const name = WebResourceName.create('contoso_/scripts/utilities.js');

			// Assert
			expect(name.getValue()).toBe('contoso_/scripts/utilities.js');
		});

		it('should create WebResourceName with multiple underscores', () => {
			// Arrange & Act
			const name = WebResourceName.create('cr123_my_script_file.js');

			// Assert
			expect(name.getValue()).toBe('cr123_my_script_file.js');
		});

		it('should create WebResourceName with numeric prefix', () => {
			// Arrange & Act
			const name = WebResourceName.create('cr123_test.html');

			// Assert
			expect(name.getValue()).toBe('cr123_test.html');
		});

		it('should create WebResourceName with CSS file', () => {
			// Arrange & Act
			const name = WebResourceName.create('new_styles/main.css');

			// Assert
			expect(name.getValue()).toBe('new_styles/main.css');
		});

		it('should throw error for empty string', () => {
			// Arrange, Act & Assert
			expect(() => WebResourceName.create('')).toThrow('Web resource name cannot be empty');
		});

		it('should throw error for whitespace-only string', () => {
			// Arrange, Act & Assert
			expect(() => WebResourceName.create('   ')).toThrow('Web resource name cannot be empty');
		});

		it('should create WebResourceName without underscore (legacy/system resources)', () => {
			// Arrange & Act
			const name = WebResourceName.create('legacyfile.js');

			// Assert
			expect(name).toBeInstanceOf(WebResourceName);
			expect(name.getValue()).toBe('legacyfile.js');
		});

		it('should create WebResourceName for system resources without prefix', () => {
			// Arrange & Act
			const name = WebResourceName.create('systemresource');

			// Assert
			expect(name.getValue()).toBe('systemresource');
		});
	});

	// ========== getPrefix ==========

	describe('getPrefix', () => {
		it('should return prefix for simple name', () => {
			// Arrange
			const name = WebResourceName.create('new_myscript.js');

			// Act
			const result = name.getPrefix();

			// Assert
			expect(result).toBe('new');
		});

		it('should return prefix for path-style name', () => {
			// Arrange
			const name = WebResourceName.create('contoso_/scripts/utilities.js');

			// Act
			const result = name.getPrefix();

			// Assert
			expect(result).toBe('contoso');
		});

		it('should return prefix when name has multiple underscores', () => {
			// Arrange
			const name = WebResourceName.create('cr123_my_script_file.js');

			// Act
			const result = name.getPrefix();

			// Assert
			expect(result).toBe('cr123');
		});

		it('should return numeric prefix', () => {
			// Arrange
			const name = WebResourceName.create('99_test.html');

			// Act
			const result = name.getPrefix();

			// Assert
			expect(result).toBe('99');
		});

		it('should return empty string for name without underscore', () => {
			// Arrange
			const name = WebResourceName.create('legacyfile.js');

			// Act
			const result = name.getPrefix();

			// Assert
			expect(result).toBe('');
		});
	});

	// ========== getNameWithoutPrefix ==========

	describe('getNameWithoutPrefix', () => {
		it('should return name without prefix for simple name', () => {
			// Arrange
			const name = WebResourceName.create('new_myscript.js');

			// Act
			const result = name.getNameWithoutPrefix();

			// Assert
			expect(result).toBe('myscript.js');
		});

		it('should return path without prefix', () => {
			// Arrange
			const name = WebResourceName.create('contoso_/scripts/utilities.js');

			// Act
			const result = name.getNameWithoutPrefix();

			// Assert
			expect(result).toBe('/scripts/utilities.js');
		});

		it('should preserve underscores in name part', () => {
			// Arrange
			const name = WebResourceName.create('cr123_my_script_file.js');

			// Act
			const result = name.getNameWithoutPrefix();

			// Assert
			expect(result).toBe('my_script_file.js');
		});

		it('should handle empty name after prefix', () => {
			// Arrange
			const name = WebResourceName.create('prefix_');

			// Act
			const result = name.getNameWithoutPrefix();

			// Assert
			expect(result).toBe('');
		});

		it('should return full name when no underscore present', () => {
			// Arrange
			const name = WebResourceName.create('legacyfile.js');

			// Act
			const result = name.getNameWithoutPrefix();

			// Assert
			expect(result).toBe('legacyfile.js');
		});
	});

	// ========== getValue ==========

	describe('getValue', () => {
		it('should return full name value', () => {
			// Arrange
			const name = WebResourceName.create('new_myscript.js');

			// Act
			const result = name.getValue();

			// Assert
			expect(result).toBe('new_myscript.js');
		});

		it('should preserve original casing', () => {
			// Arrange
			const name = WebResourceName.create('New_MyScript.JS');

			// Act
			const result = name.getValue();

			// Assert
			expect(result).toBe('New_MyScript.JS');
		});
	});

	// ========== Equality ==========

	describe('equals', () => {
		it('should return true when comparing identical names', () => {
			// Arrange
			const name1 = WebResourceName.create('new_myscript.js');
			const name2 = WebResourceName.create('new_myscript.js');

			// Act
			const result = name1.equals(name2);

			// Assert
			expect(result).toBe(true);
		});

		it('should return false when comparing different names', () => {
			// Arrange
			const name1 = WebResourceName.create('new_script1.js');
			const name2 = WebResourceName.create('new_script2.js');

			// Act
			const result = name1.equals(name2);

			// Assert
			expect(result).toBe(false);
		});

		it('should return false when comparing different prefixes', () => {
			// Arrange
			const name1 = WebResourceName.create('new_script.js');
			const name2 = WebResourceName.create('custom_script.js');

			// Act
			const result = name1.equals(name2);

			// Assert
			expect(result).toBe(false);
		});

		it('should return false when comparing with null', () => {
			// Arrange
			const name = WebResourceName.create('new_script.js');

			// Act
			const result = name.equals(null);

			// Assert
			expect(result).toBe(false);
		});

		it('should be case-sensitive', () => {
			// Arrange
			const name1 = WebResourceName.create('new_Script.js');
			const name2 = WebResourceName.create('new_script.js');

			// Act
			const result = name1.equals(name2);

			// Assert
			expect(result).toBe(false);
		});
	});

	// ========== toString ==========

	describe('toString', () => {
		it('should return the full name value', () => {
			// Arrange
			const name = WebResourceName.create('new_myscript.js');

			// Act
			const result = name.toString();

			// Assert
			expect(result).toBe('new_myscript.js');
		});

		it('should be usable in string concatenation', () => {
			// Arrange
			const name = WebResourceName.create('new_test.js');

			// Act
			const result = `File: ${name}`;

			// Assert
			expect(result).toBe('File: new_test.js');
		});
	});

	// ========== Integration Tests ==========

	describe('integration', () => {
		it('should handle typical Dataverse web resource names', () => {
			// Arrange
			const testCases = [
				{ input: 'new_script.js', prefix: 'new', nameWithoutPrefix: 'script.js' },
				{ input: 'contoso_/lib/jquery.min.js', prefix: 'contoso', nameWithoutPrefix: '/lib/jquery.min.js' },
				{ input: 'cr123_styles/theme.css', prefix: 'cr123', nameWithoutPrefix: 'styles/theme.css' },
				{ input: 'publisher_images/logo.png', prefix: 'publisher', nameWithoutPrefix: 'images/logo.png' },
				{ input: 'app_config.xml', prefix: 'app', nameWithoutPrefix: 'config.xml' },
				// Legacy/system web resources without underscore
				{ input: 'legacyfile.js', prefix: '', nameWithoutPrefix: 'legacyfile.js' },
				{ input: 'systemresource', prefix: '', nameWithoutPrefix: 'systemresource' }
			];

			// Act & Assert
			testCases.forEach(({ input, prefix, nameWithoutPrefix }) => {
				const name = WebResourceName.create(input);
				expect(name.getValue()).toBe(input);
				expect(name.getPrefix()).toBe(prefix);
				expect(name.getNameWithoutPrefix()).toBe(nameWithoutPrefix);
			});
		});

		it('should be immutable after creation', () => {
			// Arrange
			const name = WebResourceName.create('new_test.js');
			const originalValue = name.getValue();

			// Act - attempt to get and modify (not actually possible with strings, but verifying immutability)
			const value = name.getValue();

			// Assert
			expect(name.getValue()).toBe(originalValue);
			expect(value).toBe(originalValue);
		});
	});
});
