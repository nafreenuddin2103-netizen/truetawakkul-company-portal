import { db } from '../../../infrastructure/database/pg-client.js';
import { OtpService } from '../../../shared/crypto/otp.service.js';
import { JwtTokenService } from '../../../shared/crypto/jwt-token.service.js';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../../shared/errors/app-error.js';
import { UserRoleCode } from '../../../domain/enums/user-role-code.enum.js';

export interface VerifyOtpDTO {
  phone: string;
  code: string;
}

export class VerifyWhatsappOtpUseCase {
  public async execute(dto: VerifyOtpDTO) {
    const res = await db.query(
      `SELECT * FROM app.otp_verifications 
       WHERE phone = $1 AND verified_at IS NULL 
       ORDER BY created_at DESC LIMIT 1`,
      [dto.phone]
    );

    if (res.rows.length === 0) {
      throw new NotFoundError('No active OTP verification session found for this phone number');
    }

    const record = res.rows[0];

    if (new Date(record.expires_at) < new Date()) {
      throw new UnauthorizedError('OTP verification code has expired');
    }

    if (Number(record.attempts) >= Number(record.max_attempts)) {
      throw new UnauthorizedError('Maximum OTP verification attempts exceeded');
    }

    const isValid = OtpService.verifyOtp(dto.code, record.otp_hash);
    if (!isValid) {
      await db.query(
        'UPDATE app.otp_verifications SET attempts = attempts + 1 WHERE id = $1',
        [record.id]
      );
      throw new BadRequestError('Invalid OTP verification code');
    }

    await db.query(
      'UPDATE app.otp_verifications SET verified_at = NOW() WHERE id = $1',
      [record.id]
    );

    const verificationToken = JwtTokenService.sign({
      sub: record.user_id ? String(record.user_id) : 'temp-verified',
      mobilePhone: dto.phone,
      roles: [UserRoleCode.MOSQUE_ADMIN]
    });

    return {
      verified: true,
      phone: dto.phone,
      verificationToken
    };
  }
}
