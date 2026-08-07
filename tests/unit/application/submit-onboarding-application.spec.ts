import { describe, it, expect, vi } from 'vitest';
import { SubmitOnboardingApplicationUseCase } from '../../../src/application/use-cases/onboarding/submit-onboarding-application.usecase.js';
import { OnboardingApplicationEntity } from '../../../src/domain/entities/onboarding-application.entity.js';
import { OnboardingStatus } from '../../../src/domain/enums/onboarding-status.enum.js';
import { ConflictError, PreconditionFailedError } from '../../../src/shared/errors/app-error.js';

describe('SubmitOnboardingApplicationUseCase', () => {
  it('should throw ConflictError if application is already locked', async () => {
    const mockApp = new OnboardingApplicationEntity({
      id: 'app-locked',
      applicationNumber: 'APP-101',
      masjidId: 'msj-1',
      status: OnboardingStatus.WAITING_MANUAL_VERIFICATION,
      currentStep: 5,
      masjidNameEnglish: 'Masjid Test',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      isLocked: true,
      version: 5,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const mockRepo = {
      findById: vi.fn().mockResolvedValue(mockApp)
    };

    const useCase = new SubmitOnboardingApplicationUseCase(mockRepo as any);

    await expect(
      useCase.execute({
        applicationId: 'app-locked',
        ifMatchVersion: 5,
        submittedBy: 'usr-1'
      })
    ).rejects.toThrow(ConflictError);
  });

  it('should throw PreconditionFailedError on version mismatch', async () => {
    const mockApp = new OnboardingApplicationEntity({
      id: 'app-1',
      applicationNumber: 'APP-101',
      masjidId: 'msj-1',
      status: OnboardingStatus.IN_PROGRESS,
      currentStep: 4,
      masjidNameEnglish: 'Masjid Test',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      isLocked: false,
      version: 10,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const mockRepo = {
      findById: vi.fn().mockResolvedValue(mockApp)
    };

    const useCase = new SubmitOnboardingApplicationUseCase(mockRepo as any);

    await expect(
      useCase.execute({
        applicationId: 'app-1',
        ifMatchVersion: 1,
        submittedBy: 'usr-1'
      })
    ).rejects.toThrow(PreconditionFailedError);
  });
});
