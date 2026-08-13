import { describe, it, expect, vi } from 'vitest';
import { UploadMediaUseCase } from './use-cases/media/upload-media.usecase.js';
import { OnboardingApplicationEntity } from '../domain/entities/onboarding-application.entity.js';
import { OnboardingStatus } from '../domain/enums/onboarding-status.enum.js';
import { MediaType } from '../domain/enums/media-type.enum.js';
import { PreconditionFailedError } from '../shared/errors/app-error.js';

describe('UploadMediaUseCase', () => {
  it('should throw PreconditionFailedError on version lock mismatch', async () => {
    const mockApp = new OnboardingApplicationEntity({
      id: 'app-1',
      applicationNumber: 'APP-101',
      masjidId: 'msj-1',
      status: OnboardingStatus.IN_PROGRESS,
      currentStep: 3,
      masjidNameEnglish: 'Masjid Test',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      isLocked: false,
      version: 12,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const mockAppRepo = {
      findById: vi.fn().mockResolvedValue(mockApp)
    };
    const mockMediaRepo = {
      save: vi.fn()
    };

    const useCase = new UploadMediaUseCase(mockAppRepo as any, mockMediaRepo as any);

    await expect(
      useCase.execute({
        applicationId: 'app-1',
        mediaType: MediaType.LOGO,
        storageKey: 'logos/msj-1.png',
        mimeType: 'image/png',
        sizeBytes: 102400,
        sha256Checksum: 'abcdef123456',
        ifMatchVersion: 1,
        uploadedBy: 'usr-1'
      })
    ).rejects.toThrow(PreconditionFailedError);
  });
});
