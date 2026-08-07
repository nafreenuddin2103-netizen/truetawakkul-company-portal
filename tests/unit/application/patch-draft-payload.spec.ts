import { describe, it, expect, vi } from 'vitest';
import { PatchDraftPayloadUseCase } from '../../../src/application/use-cases/onboarding/patch-draft-payload.usecase.js';
import { OnboardingApplicationEntity } from '../../../src/domain/entities/onboarding-application.entity.js';
import { OnboardingStatus } from '../../../src/domain/enums/onboarding-status.enum.js';
import { PreconditionFailedError } from '../../../src/shared/errors/app-error.js';

describe('PatchDraftPayloadUseCase', () => {
  it('should patch draft payload successfully when versions match', async () => {
    const mockApp = new OnboardingApplicationEntity({
      id: 'app-1',
      applicationNumber: 'APP-1001',
      masjidId: 'msj-1',
      status: OnboardingStatus.IN_PROGRESS,
      currentStep: 2,
      masjidNameEnglish: 'Masjid Taqwa',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      draftPayload: { step1: 'done', step2: 'saving' },
      isLocked: false,
      version: 2,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const mockRepo = {
      findById: vi.fn(),
      patchDraftPayload: vi.fn().mockResolvedValue(mockApp)
    };

    const useCase = new PatchDraftPayloadUseCase(mockRepo as any);
    const result = await useCase.execute({
      applicationId: 'app-1',
      patchData: { step2: 'saving' },
      ifMatchVersion: 1
    });

    expect(result.id).toBe('app-1');
    expect(mockRepo.patchDraftPayload).toHaveBeenCalledWith('app-1', { step2: 'saving' }, 1);
  });

  it('should propagate PreconditionFailedError if optimistic locking version mismatches', async () => {
    const mockRepo = {
      patchDraftPayload: vi.fn().mockRejectedValue(new PreconditionFailedError('Version mismatch'))
    };

    const useCase = new PatchDraftPayloadUseCase(mockRepo as any);

    await expect(
      useCase.execute({
        applicationId: 'app-1',
        patchData: { name: 'New Name' },
        ifMatchVersion: 99
      })
    ).rejects.toThrow(PreconditionFailedError);
  });
});
