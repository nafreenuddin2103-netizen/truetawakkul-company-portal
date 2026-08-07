import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { UserRoleCode } from '../../domain/enums/user-role-code.enum.js';

export interface TokenPayload {
  sub: string;
  mobilePhone: string;
  email?: string | null;
  roles: UserRoleCode[];
}

export class JwtTokenService {
  public static sign(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']
    });
  }

  public static verify(token: string): TokenPayload {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  }
}
