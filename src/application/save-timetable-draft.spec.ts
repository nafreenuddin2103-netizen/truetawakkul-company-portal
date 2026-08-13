import { describe, it, expect, vi } from 'vitest';
import { SaveTimetableDraftUseCase } from './use-cases/onboarding/save-timetable-draft.usecase.js';
import { OnboardingApplicationEntity } from '../domain/entities/onboarding-application.entity.js';
import { OnboardingStatus } from '../domain/enums/onboarding-status.enum.js';
import { PreconditionFailedError } from '../shared/errors/app-error.js';

describe('SaveTimetableDraftUseCase', () => {
  it('should throw PreconditionFailedError on version lock mismatch', async () => {
    const mockApp = new OnboardingApplicationEntity({
      id: 'app-1',
      applicationNumber: 'APP-101',
      masjidId: 'msj-1',
      status: OnboardingStatus.IN_PROGRESS,
      currentStep: 2,
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

    const useCase = new SaveTimetableDraftUseCase(mockRepo as any);

    await expect(
      useCase.execute({
        applicationId: 'app-1',
        entries: [{ prayerName: 'FAJR', adhanTime: '05:00:00', iqamahTime: '05:30:00' }],
        ifMatchVersion: 1,
        updatedBy: 'usr-1'
      })
    ).rejects.toThrow(PreconditionFailedError);
  });
});
