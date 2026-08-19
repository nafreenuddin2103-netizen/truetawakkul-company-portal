import { db } from '../../../infrastructure/database/pg-client.js';
import { OtpService } from '../../../shared/crypto/otp.service.js';
import { env } from '../../../config/env.js';

export interface SendOtpDTO {
  phone: string;
  actionType: string;
}

export class SendWhatsappOtpUseCase {
  public async execute(dto: SendOtpDTO) {
    const rawOtp = OtpService.generateCode();
    const otpHash = OtpService.hashOtp(rawOtp);
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

    return await db.withTransaction(async (client) => {
      const otpRes = await client.query(
        `INSERT INTO app.otp_verifications (phone, action_type, otp_hash, expires_at, max_attempts)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [dto.phone, dto.actionType, otpHash, expiresAt, env.OTP_MAX_ATTEMPTS]
      );

      const otpId = String(otpRes.rows[0].id);


      return {

        otpId,
        expiresAt,
        message: 'WhatsApp OTP generated and queued for delivery.'
      };
    });
  }
}
