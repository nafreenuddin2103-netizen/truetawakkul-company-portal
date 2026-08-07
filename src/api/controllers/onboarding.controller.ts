import { Request, Response, NextFunction } from 'express';
import { InitOnboardingApplicationUseCase } from '../../application/use-cases/onboarding/init-onboarding-application.usecase.js';
import { PatchDraftPayloadUseCase } from '../../application/use-cases/onboarding/patch-draft-payload.usecase.js';
import { SaveMasjidDetailsUseCase } from '../../application/use-cases/onboarding/save-masjid-details.usecase.js';
import { SaveTimetableDraftUseCase } from '../../application/use-cases/onboarding/save-timetable-draft.usecase.js';
import { GetOnboardingApplicationUseCase } from '../../application/use-cases/onboarding/get-onboarding-application.usecase.js';
import { ListOnboardingApplicationsUseCase } from '../../application/use-cases/onboarding/list-onboarding-applications.usecase.js';
import { PgMasjidRepository } from '../../infrastructure/repositories/pg-masjid.repository.js';
import { PgOnboardingApplicationRepository } from '../../infrastructure/repositories/pg-onboarding-application.repository.js';

const masjidRepo = new PgMasjidRepository();
const appRepo = new PgOnboardingApplicationRepository();

const initUseCase = new InitOnboardingApplicationUseCase(masjidRepo);
const patchUseCase = new PatchDraftPayloadUseCase(appRepo);
const saveDetailsUseCase = new SaveMasjidDetailsUseCase(appRepo);
const saveTimetableUseCase = new SaveTimetableDraftUseCase(appRepo);
const getUseCase = new GetOnboardingApplicationUseCase(appRepo);
const listUseCase = new ListOnboardingApplicationsUseCase();

export class OnboardingController {
  public static async initApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await initUseCase.execute({
        ...req.body,
        creatorId: req.user!.sub
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async patchDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const appId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await patchUseCase.execute({
        applicationId: appId,
        patchData: req.body,
        ifMatchVersion: req.ifMatchVersion!
      });
      res.setHeader('ETag', `"${result.version}"`);
      res.status(200).json(result.toJSON());
    } catch (err) {
      next(err);
    }
  }

  public static async saveMasjidDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const appId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await saveDetailsUseCase.execute({
        applicationId: appId,
        ...req.body,
        ifMatchVersion: req.ifMatchVersion!,
        updatedBy: req.user!.sub
      });
      res.setHeader('ETag', `"${result.version}"`);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async saveTimetableDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const appId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await saveTimetableUseCase.execute({
        applicationId: appId,
        entries: req.body.entries,
        ifMatchVersion: req.ifMatchVersion!,
        updatedBy: req.user!.sub
      });
      res.setHeader('ETag', `"${result.version}"`);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async getApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const appId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await getUseCase.execute(appId);
      res.setHeader('ETag', `"${result.application.version}"`);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async listApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await listUseCase.execute({
        page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
        city: req.query.city ? String(req.query.city) : undefined
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
