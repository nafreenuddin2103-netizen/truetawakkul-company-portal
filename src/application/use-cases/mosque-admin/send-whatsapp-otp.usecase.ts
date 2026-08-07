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

      await client.query(
        `INSERT INTO app.notification_outbox (
          recipient_user_id, channel, template_code, payload, idempotency_key
        ) SELECT id, 'WHATSAPP', 'OTP_VERIFICATION', $2::jsonb, $3
          FROM app.users WHERE mobile_phone = $1 OR whatsapp_phone = $1
          LIMIT 1`,
        [
          dto.phone,
          JSON.stringify({ otp: rawOtp, expiresMinutes: env.OTP_EXPIRY_MINUTES }),
          `outbox-otp-${otpId}`
        ]
      );

      return {
        otpId,
        expiresAt,
        message: 'WhatsApp OTP generated and queued for delivery.'
      };
    });
  }
}
