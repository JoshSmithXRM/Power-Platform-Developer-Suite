import { UserClaimType } from './UserClaimType';

describe('UserClaimType', () => {
	describe('static instances', () => {
		it('should have None with value 1', () => {
			expect(UserClaimType.None.getValue()).toBe(1);
			expect(UserClaimType.None.getName()).toBe('None');
		});

		it('should have UserId with value 2', () => {
			expect(UserClaimType.UserId.getValue()).toBe(2);
			expect(UserClaimType.UserId.getName()).toBe('UserId');
		});

		it('should have UserInfo with value 3', () => {
			expect(UserClaimType.UserInfo.getValue()).toBe(3);
			expect(UserClaimType.UserInfo.getName()).toBe('UserInfo');
		});
	});

	describe('fromValue', () => {
		it('should return None for value 1', () => {
			expect(UserClaimType.fromValue(1)).toBe(UserClaimType.None);
		});

		it('should return UserId for value 2', () => {
			expect(UserClaimType.fromValue(2)).toBe(UserClaimType.UserId);
		});

		it('should return UserInfo for value 3', () => {
			expect(UserClaimType.fromValue(3)).toBe(UserClaimType.UserInfo);
		});

		it('should throw for invalid value', () => {
			expect(() => UserClaimType.fromValue(0)).toThrow('Invalid UserClaimType value: 0');
		});

		it('should throw for value 4', () => {
			expect(() => UserClaimType.fromValue(4)).toThrow('Invalid UserClaimType value: 4');
		});
	});

	describe('all', () => {
		it('should return all user claim types', () => {
			const all = UserClaimType.all();
			expect(all).toHaveLength(3);
			expect(all).toContain(UserClaimType.None);
			expect(all).toContain(UserClaimType.UserId);
			expect(all).toContain(UserClaimType.UserInfo);
		});
	});

	describe('equals', () => {
		it('should return true for same instance', () => {
			expect(UserClaimType.None.equals(UserClaimType.None)).toBe(true);
		});

		it('should return true for instances with same value', () => {
			const type1 = UserClaimType.fromValue(2);
			const type2 = UserClaimType.fromValue(2);
			expect(type1.equals(type2)).toBe(true);
		});

		it('should return false for different types', () => {
			expect(UserClaimType.None.equals(UserClaimType.UserInfo)).toBe(false);
		});
	});
});
