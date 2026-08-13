import { describe, it, expect, vi } from 'vitest';
import { GoLiveOnboardingApplicationUseCase } from './use-cases/onboarding/go-live-onboarding-application.usecase.js';
import { OnboardingApplicationEntity } from '../domain/entities/onboarding-application.entity.js';
import { OnboardingStatus } from '../domain/enums/onboarding-status.enum.js';
import { ValidationError, PreconditionFailedError } from '../shared/errors/app-error.js';

describe('GoLiveOnboardingApplicationUseCase & QualityGateEngine', () => {
  it('should throw ValidationError if status is IN_PROGRESS when attempting Go-Live', async () => {
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

    const useCase = new GoLiveOnboardingApplicationUseCase(mockRepo as any);

    await expect(
      useCase.execute({
        applicationId: 'app-draft',
        ifMatchVersion: 1,
        approvedBy: 'usr-admin'
      })
    ).rejects.toThrow(ValidationError);
  });
});
