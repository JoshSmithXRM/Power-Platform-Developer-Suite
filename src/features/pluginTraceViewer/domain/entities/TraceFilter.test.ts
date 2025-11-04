import { TraceFilter } from './TraceFilter';

describe('TraceFilter', () => {
	describe('default', () => {
		it('should create filter with top 100', () => {
			const filter = TraceFilter.default();
			expect(filter.top).toBe(100);
		});

		it('should create filter with createdon desc order', () => {
			const filter = TraceFilter.default();
			expect(filter.orderBy).toBe('createdon desc');
		});

		it('should create filter with no OData filter', () => {
			const filter = TraceFilter.default();
			expect(filter.odataFilter).toBeUndefined();
		});
	});

	describe('create', () => {
		it('should use default top when not provided', () => {
			const filter = TraceFilter.create({});
			expect(filter.top).toBe(100);
		});

		it('should use default orderBy when not provided', () => {
			const filter = TraceFilter.create({});
			expect(filter.orderBy).toBe('createdon desc');
		});

		it('should accept custom top', () => {
			const filter = TraceFilter.create({ top: 50 });
			expect(filter.top).toBe(50);
		});

		it('should accept custom orderBy', () => {
			const filter = TraceFilter.create({ orderBy: 'duration desc' });
			expect(filter.orderBy).toBe('duration desc');
		});

		it('should accept custom odataFilter', () => {
			const filter = TraceFilter.create({ odataFilter: "typename eq 'MyPlugin'" });
			expect(filter.odataFilter).toBe("typename eq 'MyPlugin'");
		});

		it('should accept all custom parameters', () => {
			const filter = TraceFilter.create({
				top: 200,
				orderBy: 'messagename asc',
				odataFilter: "mode eq 0"
			});
			expect(filter.top).toBe(200);
			expect(filter.orderBy).toBe('messagename asc');
			expect(filter.odataFilter).toBe('mode eq 0');
		});
	});

	describe('withFilter', () => {
		it('should return new filter with updated OData filter', () => {
			const original = TraceFilter.default();
			const updated = original.withFilter("typename eq 'MyPlugin'");
			expect(updated.odataFilter).toBe("typename eq 'MyPlugin'");
		});

		it('should preserve top and orderBy', () => {
			const original = TraceFilter.create({ top: 50, orderBy: 'duration desc' });
			const updated = original.withFilter("mode eq 1");
			expect(updated.top).toBe(50);
			expect(updated.orderBy).toBe('duration desc');
		});

		it('should return new instance (immutability)', () => {
			const original = TraceFilter.default();
			const updated = original.withFilter("mode eq 1");
			expect(updated).not.toBe(original);
			expect(original.odataFilter).toBeUndefined();
		});

		it('should replace existing filter', () => {
			const original = TraceFilter.create({ odataFilter: "mode eq 0" });
			const updated = original.withFilter("mode eq 1");
			expect(updated.odataFilter).toBe('mode eq 1');
			expect(original.odataFilter).toBe('mode eq 0');
		});
	});

	describe('withTop', () => {
		it('should return new filter with updated top', () => {
			const original = TraceFilter.default();
			const updated = original.withTop(200);
			expect(updated.top).toBe(200);
		});

		it('should preserve orderBy and odataFilter', () => {
			const original = TraceFilter.create({
				orderBy: 'duration desc',
				odataFilter: "mode eq 1"
			});
			const updated = original.withTop(50);
			expect(updated.orderBy).toBe('duration desc');
			expect(updated.odataFilter).toBe('mode eq 1');
		});

		it('should return new instance (immutability)', () => {
			const original = TraceFilter.default();
			const updated = original.withTop(50);
			expect(updated).not.toBe(original);
			expect(original.top).toBe(100);
		});
	});

	describe('builder pattern chaining', () => {
		it('should support chaining withFilter and withTop', () => {
			const filter = TraceFilter.default()
				.withFilter("mode eq 1")
				.withTop(50);

			expect(filter.top).toBe(50);
			expect(filter.odataFilter).toBe('mode eq 1');
			expect(filter.orderBy).toBe('createdon desc');
		});

		it('should support chaining withTop and withFilter', () => {
			const filter = TraceFilter.default()
				.withTop(25)
				.withFilter("typename eq 'Test'");

			expect(filter.top).toBe(25);
			expect(filter.odataFilter).toBe("typename eq 'Test'");
			expect(filter.orderBy).toBe('createdon desc');
		});
	});
});
