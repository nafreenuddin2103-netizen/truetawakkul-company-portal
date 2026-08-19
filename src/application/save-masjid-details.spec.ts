import { describe, it, expect, vi } from 'vitest';
import { SaveMasjidDetailsUseCase } from './use-cases/onboarding/save-masjid-details.usecase.js';
import { OnboardingApplicationEntity } from '../domain/entities/onboarding-application.entity.js';
import { OnboardingStatus } from '../domain/enums/onboarding-status.enum.js';
import { PreconditionFailedError } from '../shared/errors/app-error.js';

describe('SaveMasjidDetailsUseCase', () => {
  it('should throw PreconditionFailedError if version mismatch occurs', async () => {
    const mockApp = new OnboardingApplicationEntity({
      id: 'app-1',
      applicationNumber: 'APP-101',
      masjidId: 'msj-1',
      status: OnboardingStatus.IN_PROGRESS,
      currentStep: 1,
      masjidNameEnglish: 'Masjid Draft',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      isLocked: false,
      version: 5,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const mockRepo = {
      findById: vi.fn().mockResolvedValue(mockApp)
    };

    const useCase = new SaveMasjidDetailsUseCase(mockRepo as any);

    await expect(
      useCase.execute({
        applicationId: 'app-1',
        nameEnglish: 'Masjid Taqwa',
        addressLine1: 'Main St',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        timezone: 'Asia/Kolkata',
        ifMatchVersion: 1,
        updatedBy: 'usr-1'
      })
    ).rejects.toThrow(PreconditionFailedError);
  });
});
