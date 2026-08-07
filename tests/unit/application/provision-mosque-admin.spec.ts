import { describe, it, expect, vi } from 'vitest';
import { ProvisionMosqueAdminUseCase } from '../../../src/application/use-cases/mosque-admin/provision-mosque-admin.usecase.js';
import { BadRequestError } from '../../../src/shared/errors/app-error.js';

describe('ProvisionMosqueAdminUseCase', () => {
  it('should throw BadRequestError if verification token is invalid', async () => {
    const useCase = new ProvisionMosqueAdminUseCase();

    await expect(
      useCase.execute({
        fullName: 'Admin Name',
        mobilePhone: '+919999999999',
        masjidId: 'msj-1',
        verificationToken: 'invalid-token',
        creatorId: 'usr-admin'
      })
    ).rejects.toThrow(BadRequestError);
  });
});
