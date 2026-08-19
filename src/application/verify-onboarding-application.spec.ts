import { describe, it, expect, vi } from 'vitest';
import { VerifyOnboardingApplicationUseCase } from './use-cases/onboarding/verify-onboarding-application.usecase.js';
import { OnboardingApplicationEntity } from '../domain/entities/onboarding-application.entity.js';
import { OnboardingStatus } from '../domain/enums/onboarding-status.enum.js';
import { ConflictError, PreconditionFailedError } from '../shared/errors/app-error.js';

describe('VerifyOnboardingApplicationUseCase', () => {
  it('should throw ConflictError if application is not in WAITING_MANUAL_VERIFICATION status', async () => {
    const mockApp = new OnboardingApplicationEntity({
      id: 'app-draft',
      applicationNumber: 'APP-101',
      masjidId: 'msj-1',
      status: OnboardingStatus.IN_PROGRESS,
      currentStep: 1,
      masjidNameEnglish: 'Masjid Test',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      isLocked: false,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const mockRepo = {
      findById: vi.fn().mockResolvedValue(mockApp)
    };

    const useCase = new VerifyOnboardingApplicationUseCase(mockRepo as any);

    await expect(
      useCase.execute({
        applicationId: 'app-draft',
        result: 'PASSED',
        notes: 'Verification passed',
        ifMatchVersion: 1,
        verifierId: 'usr-admin'
      })
    ).rejects.toThrow(ConflictError);
  });
});
