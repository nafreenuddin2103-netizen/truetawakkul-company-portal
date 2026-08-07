import { IUserRepository } from '../../ports/user-repository.port.js';
import { PgAuthCredentialsRepository } from '../../../infrastructure/repositories/pg-auth-credentials.repository.js';
import { PasswordHasher } from '../../../shared/crypto/password-hasher.js';
import { JwtTokenService } from '../../../shared/crypto/jwt-token.service.js';
import { UnauthorizedError, ForbiddenError } from '../../../shared/errors/app-error.js';
import { UserRoleCode } from '../../../domain/enums/user-role-code.enum.js';

export interface LoginDTO {
  mobilePhone?: string;
  email?: string;
  password: string;
}

export interface LoginResultDTO {
  token: string;
  user: {
    id: string;
    fullName: string;
    mobilePhone: string;
    email?: string | null;
    roles: UserRoleCode[];
  };
}

export class LoginSuperAdminUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly credsRepo: PgAuthCredentialsRepository
  ) {}

  public async execute(dto: LoginDTO): Promise<LoginResultDTO> {
    if (!dto.mobilePhone && !dto.email) {
      throw new UnauthorizedError('Either mobile phone or email must be provided');
    }

    const user = dto.mobilePhone
      ? await this.userRepo.findByMobilePhone(dto.mobilePhone)
      : await this.userRepo.findByEmail(dto.email!);

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!user.isCompanySuperAdmin()) {
      throw new ForbiddenError('Access restricted to COMPANY_SUPER_ADMIN role');
    }

    const creds = await this.credsRepo.findByUserId(user.id);
    if (!creds) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (creds.lockedUntil && creds.lockedUntil > new Date()) {
      throw new UnauthorizedError('Account is temporarily locked due to multiple failed login attempts');
    }

    const isValid = await PasswordHasher.verify(creds.passwordHash, dto.password);
    if (!isValid) {
      const newAttempts = creds.failedAttempts + 1;
      const lockUntil = newAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : undefined;
      await this.credsRepo.updateFailedAttempts(user.id, newAttempts, lockUntil);
      throw new UnauthorizedError('Invalid credentials');
    }

    if (creds.failedAttempts > 0) {
      await this.credsRepo.resetFailedAttempts(user.id);
    }

    const token = JwtTokenService.sign({
      sub: user.id,
      mobilePhone: user.mobilePhone,
      email: user.email,
      roles: user.roles
    });

    return {
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        mobilePhone: user.mobilePhone,
        email: user.email,
        roles: user.roles
      }
    };
  }
}
