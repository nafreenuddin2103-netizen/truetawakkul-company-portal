import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { apiRateLimiter } from './middleware/rate-limit.middleware.js';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';
import { authRouter } from './routes/auth.routes.js';
import { onboardingRouter } from './routes/onboarding.routes.js';
import { mediaRouter } from './routes/media.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { GetOperationalMetricsUseCase } from '../application/use-cases/operations/get-operational-metrics.usecase.js';
import { authenticate } from './middleware/authenticate.middleware.js';
import { authorize } from './middleware/authorize.middleware.js';
import { UserRoleCode } from '../domain/enums/user-role-code.enum.js';

import { locationRouter } from './routes/location.routes.js';
import { env } from '../config/env.js';

export const app = express();

// Trust reverse proxy for rate limiting (e.g., Cloud Run, Nginx, ALB)
app.set('trust proxy', 1);

app.use(requestIdMiddleware);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://storage.googleapis.com"],
      connectSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny',
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  noSniff: true,
}));
// Note: Permissions-Policy is not yet fully supported by Helmet v7 out of the box without custom middleware, but we can set it manually.
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});
app.use(compression());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json({ limit: '10kb' }));

// Apply rate limiting globally to all /api/v1 routes (except auth login which has stricter limits)
app.use('/api/v1', apiRateLimiter);

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/onboarding', onboardingRouter);
app.use('/api/v1/onboarding', mediaRouter);
app.use('/api/v1/location', authenticate, authorize(UserRoleCode.MOSQUE_ADMIN, UserRoleCode.COMPANY_SUPER_ADMIN), locationRouter);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

app.get('/ready', (_req, res) => {
  // In a real scenario, you might check DB connection here
  res.status(200).json({ status: 'READY', timestamp: new Date().toISOString() });
});

const metricsUseCase = new GetOperationalMetricsUseCase();
app.get('/api/v1/metrics', authenticate, authorize(UserRoleCode.COMPANY_SUPER_ADMIN), async (_req, res, next) => {
  try {
    const result = await metricsUseCase.execute();
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

app.use(errorHandler);
