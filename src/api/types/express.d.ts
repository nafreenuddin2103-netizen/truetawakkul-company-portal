import { TokenPayload } from '../../shared/crypto/jwt-token.service.js';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      idempotencyKey?: string;
      ifMatchVersion?: number;
    }
  }
}
