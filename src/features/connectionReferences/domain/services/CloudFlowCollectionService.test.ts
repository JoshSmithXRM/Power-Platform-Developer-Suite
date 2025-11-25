import { CloudFlowCollectionService } from './CloudFlowCollectionService';
import { CloudFlow } from '../entities/CloudFlow';

describe('CloudFlowCollectionService', () => {
	let service: CloudFlowCollectionService;

	beforeEach(() => {
		service = new CloudFlowCollectionService();
	});

	// Test data factory
	function createFlow(
		name: string,
		overrides?: {
			id?: string;
			modifiedOn?: Date;
			isManaged?: boolean;
			createdBy?: string;
			clientData?: string | null;
		}
	): CloudFlow {
		return new CloudFlow(
			overrides?.id ?? `flow-${name}`,
			name,
			overrides?.modifiedOn ?? new Date('2024-01-01T10:00:00Z'),
			overrides?.isManaged ?? false,
			overrides?.createdBy ?? 'user@example.com',
			overrides?.clientData ?? null
		);
	}

	describe('sort', () => {
		describe('alphabetical sorting', () => {
			it('should sort flows alphabetically by name', () => {
				const flows = [
					createFlow('Zulu Flow'),
					createFlow('Alpha Flow'),
					createFlow('Mike Flow')
				];

				const sorted = service.sort(flows);

				expect(sorted[0]?.name).toBe('Alpha Flow');
				expect(sorted[1]?.name).toBe('Mike Flow');
				expect(sorted[2]?.name).toBe('Zulu Flow');
			});

			it('should sort flows with numeric prefixes correctly', () => {
				const flows = [
					createFlow('Flow 2'),
					createFlow('Flow 10'),
					createFlow('Flow 1')
				];

				const sorted = service.sort(flows);

				expect(sorted[0]?.name).toBe('Flow 1');
				expect(sorted[1]?.name).toBe('Flow 10');
				expect(sorted[2]?.name).toBe('Flow 2');
			});

			it('should handle case-insensitive sorting', () => {
				const flows = [
					createFlow('zebra'),
					createFlow('Apple'),
					createFlow('BANANA')
				];

				const sorted = service.sort(flows);

				expect(sorted[0]?.name).toBe('Apple');
				expect(sorted[1]?.name).toBe('BANANA');
				expect(sorted[2]?.name).toBe('zebra');
			});

			it('should sort flows with underscore prefixes', () => {
				const flows = [
					createFlow('_private_flow'),
					createFlow('public_flow'),
					createFlow('__double_private')
				];

				const sorted = service.sort(flows);

				expect(sorted[0]?.name).toBe('__double_private');
				expect(sorted[1]?.name).toBe('_private_flow');
				expect(sorted[2]?.name).toBe('public_flow');
			});
		});

		describe('defensive copy behavior', () => {
			it('should not mutate original array', () => {
				const flows = [
					createFlow('Charlie'),
					createFlow('Alpha'),
					createFlow('Bravo')
				];
				const originalOrder = flows.map((f) => f.name);

				service.sort(flows);

				expect(flows.map((f) => f.name)).toEqual(originalOrder);
				expect(flows[0]?.name).toBe('Charlie');
			});

			it('should return new array instance', () => {
				const flows = [createFlow('Alpha'), createFlow('Bravo')];

				const sorted = service.sort(flows);

				expect(sorted).not.toBe(flows);
			});

			it('should allow multiple sorts without affecting original', () => {
				const flows = [
					createFlow('Charlie'),
					createFlow('Alpha'),
					createFlow('Bravo')
				];

				const sorted1 = service.sort(flows);
				const sorted2 = service.sort(flows);

				expect(sorted1).toEqual(sorted2);
				expect(sorted1).not.toBe(sorted2);
				expect(flows[0]?.name).toBe('Charlie');
			});
		});

		describe('edge cases', () => {
			it('should handle empty array', () => {
				const flows: CloudFlow[] = [];

				const sorted = service.sort(flows);

				expect(sorted).toHaveLength(0);
			});

			it('should handle single flow', () => {
				const flows = [createFlow('Only Flow')];

				const sorted = service.sort(flows);

				expect(sorted).toHaveLength(1);
				expect(sorted[0]?.name).toBe('Only Flow');
			});

			it('should handle two flows', () => {
				const flows = [createFlow('Bravo'), createFlow('Alpha')];

				const sorted = service.sort(flows);

				expect(sorted).toHaveLength(2);
				expect(sorted[0]?.name).toBe('Alpha');
				expect(sorted[1]?.name).toBe('Bravo');
			});

			it('should handle identical names', () => {
				const flows = [
					createFlow('Same Name'),
					createFlow('Same Name'),
					createFlow('Same Name')
				];

				const sorted = service.sort(flows);

				expect(sorted).toHaveLength(3);
				expect(sorted.every((f) => f.name === 'Same Name')).toBe(true);
			});

			it('should handle flows with same prefix', () => {
				const flows = [
					createFlow('Process Order C'),
					createFlow('Process Order A'),
					createFlow('Process Order B')
				];

				const sorted = service.sort(flows);

				expect(sorted[0]?.name).toBe('Process Order A');
				expect(sorted[1]?.name).toBe('Process Order B');
				expect(sorted[2]?.name).toBe('Process Order C');
			});
		});

		describe('special characters', () => {
			it('should sort flows with special characters', () => {
				const flows = [
					createFlow('Flow-Dash'),
					createFlow('Flow_Underscore'),
					createFlow('Flow.Dot')
				];

				const sorted = service.sort(flows);

				expect(sorted).toHaveLength(3);
				const names = sorted.map((f) => f?.name);
				expect(names).toContain('Flow-Dash');
				expect(names).toContain('Flow.Dot');
				expect(names).toContain('Flow_Underscore');
			});

			it('should handle Unicode characters', () => {
				const flows = [
					createFlow('Flow 中文'),
					createFlow('Flow ABC'),
					createFlow('Flow ñoño')
				];

				const sorted = service.sort(flows);

				expect(sorted).toHaveLength(3);
			});

			it('should handle whitespace in names', () => {
				const flows = [
					createFlow('Flow with spaces'),
					createFlow('FlowNoSpaces'),
					createFlow('Another flow')
				];

				const sorted = service.sort(flows);

				expect(sorted).toHaveLength(3);
			});

			it('should handle flows with parentheses', () => {
				const flows = [
					createFlow('Flow (Production)'),
					createFlow('Flow (Dev)'),
					createFlow('Flow (Test)')
				];

				const sorted = service.sort(flows);

				expect(sorted[0]?.name).toBe('Flow (Dev)');
				expect(sorted[1]?.name).toBe('Flow (Production)');
				expect(sorted[2]?.name).toBe('Flow (Test)');
			});
		});

		describe('large collections', () => {
			it('should handle sorting 100 flows', () => {
				const flows = Array.from({ length: 100 }, (_, i) =>
					createFlow(`Flow ${String(i).padStart(3, '0')}`)
				);

				const sorted = service.sort(flows);

				expect(sorted).toHaveLength(100);
				expect(sorted[0]?.name).toBe('Flow 000');
				expect(sorted[99]?.name).toBe('Flow 099');
			});

			it('should handle sorting 500 flows', () => {
				const flows = Array.from({ length: 500 }, () =>
					createFlow(`Flow ${Math.floor(Math.random() * 10000)}`)
				);

				const sorted = service.sort(flows);

				expect(sorted).toHaveLength(500);

				for (let i = 0; i < sorted.length - 1; i++) {
					const current = sorted[i];
					const next = sorted[i + 1];
					if (current && next) {
						expect(
							current.name.localeCompare(next.name)
						).toBeLessThanOrEqual(0);
					}
				}
			});
		});

		describe('different flow properties', () => {
			it('should sort managed and unmanaged flows together', () => {
				const flows = [
					createFlow('Zulu', { isManaged: true }),
					createFlow('Alpha', { isManaged: false })
				];

				const sorted = service.sort(flows);

				expect(sorted[0]?.name).toBe('Alpha');
				expect(sorted[1]?.name).toBe('Zulu');
			});

			it('should sort flows with different modification dates', () => {
				const flows = [
					createFlow('Zulu', { modifiedOn: new Date('2024-01-01') }),
					createFlow('Alpha', { modifiedOn: new Date('2024-12-31') })
				];

				const sorted = service.sort(flows);

				expect(sorted[0]?.name).toBe('Alpha');
				expect(sorted[1]?.name).toBe('Zulu');
			});

			it('should sort flows with different creators', () => {
				const flows = [
					createFlow('Zulu', { createdBy: 'user1@example.com' }),
					createFlow('Alpha', { createdBy: 'user2@example.com' })
				];

				const sorted = service.sort(flows);

				expect(sorted[0]?.name).toBe('Alpha');
				expect(sorted[1]?.name).toBe('Zulu');
			});

			it('should sort flows with and without client data', () => {
				const flows = [
					createFlow('Zulu', { clientData: '{"properties":{}}' }),
					createFlow('Alpha', { clientData: null })
				];

				const sorted = service.sort(flows);

				expect(sorted[0]?.name).toBe('Alpha');
				expect(sorted[1]?.name).toBe('Zulu');
			});
		});

		describe('localeCompare behavior', () => {
			it('should use locale-aware comparison', () => {
				const flows = [
					createFlow('Flow 10'),
					createFlow('Flow 2'),
					createFlow('Flow 1'),
					createFlow('Flow 20')
				];

				const sorted = service.sort(flows);

				expect(sorted.map((f) => f.name)).toEqual([
					'Flow 1',
					'Flow 10',
					'Flow 2',
					'Flow 20'
				]);
			});

			it('should handle accented characters', () => {
				const flows = [
					createFlow('café'),
					createFlow('cache'),
					createFlow('caché')
				];

				const sorted = service.sort(flows);

				expect(sorted).toHaveLength(3);
			});
		});

		describe('stability', () => {
			it('should maintain relative order for equal names', () => {
				const flow1 = createFlow('Same', { id: 'id-1' });
				const flow2 = createFlow('Same', { id: 'id-2' });
				const flow3 = createFlow('Same', { id: 'id-3' });
				const flows = [flow1, flow2, flow3];

				const sorted = service.sort(flows);

				expect(sorted[0]?.id).toBe('id-1');
				expect(sorted[1]?.id).toBe('id-2');
				expect(sorted[2]?.id).toBe('id-3');
			});
		});

		describe('realistic scenarios', () => {
			it('should sort typical Power Automate flows', () => {
				const flows = [
					createFlow('When an item is created or modified'),
					createFlow('Approval - Start and wait for response'),
					createFlow('Send email notification'),
					createFlow('Daily data sync'),
					createFlow('Process invoice submissions')
				];

				const sorted = service.sort(flows);

				expect(sorted[0]?.name).toBe('Approval - Start and wait for response');
				expect(sorted[1]?.name).toBe('Daily data sync');
				expect(sorted[2]?.name).toBe('Process invoice submissions');
				expect(sorted[3]?.name).toBe('Send email notification');
				expect(sorted[4]?.name).toBe('When an item is created or modified');
			});

			it('should sort flows with common automation prefixes', () => {
				const flows = [
					createFlow('Scheduled - Weekly report'),
					createFlow('Automated - New customer onboarding'),
					createFlow('Manual - Export data'),
					createFlow('Automated - Invoice processing'),
					createFlow('Scheduled - Daily backup')
				];

				const sorted = service.sort(flows);

				expect(sorted[0]?.name).toBe('Automated - Invoice processing');
				expect(sorted[1]?.name).toBe('Automated - New customer onboarding');
				expect(sorted[2]?.name).toBe('Manual - Export data');
				expect(sorted[3]?.name).toBe('Scheduled - Daily backup');
				expect(sorted[4]?.name).toBe('Scheduled - Weekly report');
			});

			it('should sort flows with version numbers', () => {
				const flows = [
					createFlow('Process Order v2'),
					createFlow('Process Order v1'),
					createFlow('Process Order v3'),
					createFlow('Process Order v10')
				];

				const sorted = service.sort(flows);

				expect(sorted[0]?.name).toBe('Process Order v1');
				expect(sorted[1]?.name).toBe('Process Order v10');
				expect(sorted[2]?.name).toBe('Process Order v2');
				expect(sorted[3]?.name).toBe('Process Order v3');
			});

			it('should sort flows with environment indicators', () => {
				const flows = [
					createFlow('Sync Contacts [PROD]'),
					createFlow('Sync Contacts [DEV]'),
					createFlow('Sync Contacts [TEST]'),
					createFlow('Sync Contacts [UAT]')
				];

				const sorted = service.sort(flows);

				expect(sorted[0]?.name).toBe('Sync Contacts [DEV]');
				expect(sorted[1]?.name).toBe('Sync Contacts [PROD]');
				expect(sorted[2]?.name).toBe('Sync Contacts [TEST]');
				expect(sorted[3]?.name).toBe('Sync Contacts [UAT]');
			});
		});
	});
});
