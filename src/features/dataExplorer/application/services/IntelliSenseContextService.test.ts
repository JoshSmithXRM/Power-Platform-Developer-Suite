import { IntelliSenseContextService } from './IntelliSenseContextService';

describe('IntelliSenseContextService', () => {
	let service: IntelliSenseContextService;

	beforeEach(() => {
		service = new IntelliSenseContextService();
	});

	describe('initial state', () => {
		it('should have no active environment initially', () => {
			expect(service.hasActiveEnvironment()).toBe(false);
			expect(service.getActiveEnvironment()).toBeNull();
		});
	});

	describe('setActiveEnvironment', () => {
		it('should set the active environment', () => {
			service.setActiveEnvironment('env-123');

			expect(service.hasActiveEnvironment()).toBe(true);
			expect(service.getActiveEnvironment()).toBe('env-123');
		});

		it('should allow clearing the active environment', () => {
			service.setActiveEnvironment('env-123');
			service.setActiveEnvironment(null);

			expect(service.hasActiveEnvironment()).toBe(false);
			expect(service.getActiveEnvironment()).toBeNull();
		});

		it('should allow changing the active environment', () => {
			service.setActiveEnvironment('env-123');
			service.setActiveEnvironment('env-456');

			expect(service.getActiveEnvironment()).toBe('env-456');
		});
	});

	describe('onEnvironmentChange', () => {
		it('should notify listener when environment changes', () => {
			const listener = jest.fn();
			service.onEnvironmentChange(listener);

			service.setActiveEnvironment('env-123');

			expect(listener).toHaveBeenCalledWith('env-123');
		});

		it('should notify listener when environment is cleared', () => {
			const listener = jest.fn();
			service.setActiveEnvironment('env-123');
			service.onEnvironmentChange(listener);

			service.setActiveEnvironment(null);

			expect(listener).toHaveBeenCalledWith(null);
		});

		it('should not notify listener when environment is set to same value', () => {
			const listener = jest.fn();
			service.setActiveEnvironment('env-123');
			service.onEnvironmentChange(listener);

			service.setActiveEnvironment('env-123');

			expect(listener).not.toHaveBeenCalled();
		});

		it('should support multiple listeners', () => {
			const listener1 = jest.fn();
			const listener2 = jest.fn();
			service.onEnvironmentChange(listener1);
			service.onEnvironmentChange(listener2);

			service.setActiveEnvironment('env-123');

			expect(listener1).toHaveBeenCalledWith('env-123');
			expect(listener2).toHaveBeenCalledWith('env-123');
		});

		it('should return unsubscribe function', () => {
			const listener = jest.fn();
			const unsubscribe = service.onEnvironmentChange(listener);

			unsubscribe();
			service.setActiveEnvironment('env-123');

			expect(listener).not.toHaveBeenCalled();
		});

		it('should only unsubscribe the specific listener', () => {
			const listener1 = jest.fn();
			const listener2 = jest.fn();
			const unsubscribe1 = service.onEnvironmentChange(listener1);
			service.onEnvironmentChange(listener2);

			unsubscribe1();
			service.setActiveEnvironment('env-123');

			expect(listener1).not.toHaveBeenCalled();
			expect(listener2).toHaveBeenCalledWith('env-123');
		});
	});
});
