import { PgOnboardingApplicationRepository } from '../../../infrastructure/repositories/pg-onboarding-application.repository.js';
import { OnboardingApplicationEntity } from '../../../domain/entities/onboarding-application.entity.js';

export interface PatchDraftPayloadDTO {
  applicationId: string;
  patchData: Record<string, unknown>;
  ifMatchVersion: number;
}

export class PatchDraftPayloadUseCase {
  constructor(private readonly appRepo: PgOnboardingApplicationRepository) {}

  public async execute(dto: PatchDraftPayloadDTO): Promise<OnboardingApplicationEntity> {
    return this.appRepo.patchDraftPayload(dto.applicationId, dto.patchData, dto.ifMatchVersion);
  }
}
