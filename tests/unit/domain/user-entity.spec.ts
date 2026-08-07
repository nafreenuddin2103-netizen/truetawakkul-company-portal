import { describe, it, expect } from 'vitest';
import { UserEntity } from '../../../src/domain/entities/user.entity.js';
import { UserRoleCode } from '../../../src/domain/enums/user-role-code.enum.js';
import { UserStatus } from '../../../src/domain/enums/user-status.enum.js';

describe('UserEntity Domain Model', () => {
  it('should evaluate user roles and COMPANY_SUPER_ADMIN authorization correctly', () => {
    const superAdmin = new UserEntity({
      id: 'usr-1',
      fullName: 'Platform Founder',
      mobilePhone: '+919900112233',
      status: UserStatus.ACTIVE,
      roles: [UserRoleCode.COMPANY_SUPER_ADMIN],
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    expect(superAdmin.isCompanySuperAdmin()).toBe(true);
    expect(superAdmin.hasRole(UserRoleCode.COMPANY_SUPER_ADMIN)).toBe(true);
    expect(superAdmin.hasRole(UserRoleCode.MOSQUE_ADMIN)).toBe(false);
  });

  it('should evaluate MOSQUE_ADMIN role correctly', () => {
    const mosqueAdmin = new UserEntity({
      id: 'usr-2',
      fullName: 'Local Imam',
      mobilePhone: '+919988776655',
      status: UserStatus.FIRST_LOGIN_PENDING,
      roles: [UserRoleCode.MOSQUE_ADMIN],
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    expect(mosqueAdmin.isCompanySuperAdmin()).toBe(false);
    expect(mosqueAdmin.hasRole(UserRoleCode.MOSQUE_ADMIN)).toBe(true);
  });
});
