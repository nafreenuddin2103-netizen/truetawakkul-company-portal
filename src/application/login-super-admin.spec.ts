import { describe, it, expect, vi } from 'vitest';
import { LoginSuperAdminUseCase } from './use-cases/auth/login-super-admin.usecase.js';
import { PasswordHasher } from '../shared/crypto/password-hasher.js';
import { JwtTokenService } from '../shared/crypto/jwt-token.service.js';
import { UserEntity } from '../domain/entities/user.entity.js';
import { UserRoleCode } from '../domain/enums/user-role-code.enum.js';
import { UserStatus } from '../domain/enums/user-status.enum.js';
import { ForbiddenError, UnauthorizedError } from '../shared/errors/app-error.js';

describe('LoginSuperAdminUseCase & Crypto Services', () => {
  it('should hash and verify passwords using Argon2id', async () => {
    const plainText = 'SuperSecretP@ssw0rd!';
    const hash = await PasswordHasher.hash(plainText);
    
    expect(hash).toContain('$argon2id$');
    const isValid = await PasswordHasher.verify(hash, plainText);
    expect(isValid).toBe(true);

    const isInvalid = await PasswordHasher.verify(hash, 'WrongPassword');
    expect(isInvalid).toBe(false);
  });

  it('should sign and verify JWT tokens correctly', () => {
    const payload = {
      sub: 'usr-123',
      mobilePhone: '+919900112233',
      email: 'founder@truetawakkul.org',
      roles: [UserRoleCode.COMPANY_SUPER_ADMIN]
    };

    const token = JwtTokenService.sign(payload);
    expect(token).toBeDefined();

    const decoded = JwtTokenService.verify(token);
    expect(decoded.sub).toBe('usr-123');
    expect(decoded.roles).toContain(UserRoleCode.COMPANY_SUPER_ADMIN);
  });

  it('should reject login for non-SUPER_ADMIN users with 403 Forbidden', async () => {
    const mockUserRepo = {
      findByMobilePhone: vi.fn().mockResolvedValue(
        new UserEntity({
          id: 'usr-2',
          fullName: 'Local Imam',
          mobilePhone: '+919876543210',
          status: UserStatus.ACTIVE,
          roles: [UserRoleCode.MOSQUE_ADMIN],
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      ),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      save: vi.fn(),
      assignRole: vi.fn(),
      getUserRoles: vi.fn()
    };

    const mockCredsRepo = {
      findByUserId: vi.fn(),
      updateFailedAttempts: vi.fn(),
      resetFailedAttempts: vi.fn()
    };

    const useCase = new LoginSuperAdminUseCase(mockUserRepo, mockCredsRepo as any);

    await expect(
      useCase.execute({ mobilePhone: '+919876543210', password: 'Password123!' })
    ).rejects.toThrow(ForbiddenError);
  });
});
