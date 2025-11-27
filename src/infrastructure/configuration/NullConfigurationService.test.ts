import { NullConfigurationService } from './NullConfigurationService';

describe('NullConfigurationService', () => {
	let configService: NullConfigurationService;

	beforeEach(() => {
		configService = new NullConfigurationService();
	});

	describe('get', () => {
		it('should return default value for any key', () => {
			const result = configService.get('any.key', 42);

			expect(result).toBe(42);
		});

		it('should return string default value', () => {
			const result = configService.get('string.key', 'default');

			expect(result).toBe('default');
		});

		it('should return number default value', () => {
			const result = configService.get('number.key', 100);

			expect(result).toBe(100);
		});

		it('should return boolean default value', () => {
			const result = configService.get('boolean.key', true);

			expect(result).toBe(true);
		});

		it('should return object default value', () => {
			const defaultObj = { foo: 'bar' };

			const result = configService.get('object.key', defaultObj);

			expect(result).toBe(defaultObj);
		});

		it('should return array default value', () => {
			const defaultArr = [1, 2, 3];

			const result = configService.get('array.key', defaultArr);

			expect(result).toBe(defaultArr);
		});

		it('should ignore key parameter', () => {
			const result1 = configService.get('pluginTrace.defaultLimit', 100);
			const result2 = configService.get('table.defaultPageSize', 100);
			const result3 = configService.get('nonexistent.key', 100);

			expect(result1).toBe(100);
			expect(result2).toBe(100);
			expect(result3).toBe(100);
		});
	});
});
