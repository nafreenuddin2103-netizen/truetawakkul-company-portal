import { Router, Request, Response, NextFunction } from 'express';
import { LoginSuperAdminUseCase } from '../../application/use-cases/auth/login-super-admin.usecase.js';
import { PgAuthCredentialsRepository } from '../../infrastructure/repositories/pg-auth-credentials.repository.js';
import { PgUserRepository } from '../../infrastructure/repositories/pg-user.repository.js';

export const authRouter = Router();

const userRepo = new PgUserRepository();
const authRepo = new PgAuthCredentialsRepository();

const loginUseCase = new LoginSuperAdminUseCase(userRepo, authRepo);

authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await loginUseCase.execute({
      mobilePhone: req.body.mobilePhone,
      password: req.body.password
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});
