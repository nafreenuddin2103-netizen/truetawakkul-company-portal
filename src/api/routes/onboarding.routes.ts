import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { idempotency } from '../middleware/idempotency.middleware.js';
import { optimisticLocking } from '../middleware/optimistic-locking.middleware.js';
import { UserRoleCode } from '../../domain/enums/user-role-code.enum.js';
import { OnboardingController } from '../controllers/onboarding.controller.js';

export const onboardingRouter = Router();

onboardingRouter.use(authenticate, authorize(UserRoleCode.COMPANY_SUPER_ADMIN));

onboardingRouter.post('/', idempotency(), OnboardingController.initApplication);
onboardingRouter.get('/', OnboardingController.listApplications);
onboardingRouter.get('/:id', OnboardingController.getApplication);
onboardingRouter.patch('/:id/draft', optimisticLocking, idempotency(), OnboardingController.patchDraft);
onboardingRouter.put('/:id/step/2', optimisticLocking, idempotency(), OnboardingController.saveMasjidDetails);
onboardingRouter.put('/:id/step/3', optimisticLocking, idempotency(), OnboardingController.saveTimetableDraft);
