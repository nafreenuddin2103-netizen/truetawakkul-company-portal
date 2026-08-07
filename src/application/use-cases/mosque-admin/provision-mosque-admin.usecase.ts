import crypto from 'crypto';
import { db } from '../../../infrastructure/database/pg-client.js';
import { PasswordHasher } from '../../../shared/crypto/password-hasher.js';
import { JwtTokenService, TokenPayload } from '../../../shared/crypto/jwt-token.service.js';
import { BadRequestError, ConflictError } from '../../../shared/errors/app-error.js';
import { UserRoleCode } from '../../../domain/enums/user-role-code.enum.js';

export interface ProvisionAdminDTO {
  fullName: string;
  mobilePhone: string;
  email?: string;
  masjidId: string;
  verificationToken: string;
  creatorId: string;
}

export class ProvisionMosqueAdminUseCase {
  public async execute(dto: ProvisionAdminDTO) {
    let tokenPayload: TokenPayload | null = null;
    try {
      tokenPayload = JwtTokenService.verify(dto.verificationToken);
    } catch {
      throw new BadRequestError('Invalid or expired OTP verification token');
    }

    if (!tokenPayload || tokenPayload.mobilePhone !== dto.mobilePhone) {
      throw new BadRequestError('Invalid or expired OTP verification token');
    }

    const existingUser = await db.query(
      'SELECT id FROM app.users WHERE mobile_phone = $1',
      [dto.mobilePhone]
    );

    if (existingUser.rows.length > 0) {
      throw new ConflictError('A user account with this mobile phone number already exists');
    }

    const tempPassword = `Tt@${crypto.randomBytes(4).toString('hex')}!`;
    const passwordHash = await PasswordHasher.hash(tempPassword);

    return await db.withTransaction(async (client) => {
      const userRes = await client.query(
        `INSERT INTO app.users (
          full_name, mobile_phone, whatsapp_phone, email, status,
          must_change_password, created_by
        ) VALUES ($1, $2, $2, $3, 'ACTIVE', true, $4)
        RETURNING id`,
        [dto.fullName, dto.mobilePhone, dto.email ?? null, dto.creatorId]
      );

      const userId = String(userRes.rows[0].id);

      await client.query(
        `INSERT INTO app.auth_credentials (user_id, password_hash) VALUES ($1, $2)`,
        [userId, passwordHash]
      );

      const roleRes = await client.query(
        'SELECT id FROM app.roles WHERE code = $1',
        [UserRoleCode.MOSQUE_ADMIN]
      );

      if (roleRes.rows.length > 0) {
        await client.query(
          'INSERT INTO app.user_roles (user_id, role_id) VALUES ($1, $2)',
          [userId, roleRes.rows[0].id]
        );
      }

      await client.query(
        `INSERT INTO app.masjid_assignments (
          masjid_id, user_id, assignment_type, assigned_by, status
        ) VALUES ($1, $2, 'PRIMARY_ADMIN', $3, 'ACTIVE')`,
        [dto.masjidId, userId, dto.creatorId]
      );

      await client.query(
        `INSERT INTO app.notification_outbox (
          recipient_user_id, channel, template_code, payload, idempotency_key
        ) VALUES ($1, 'WHATSAPP', 'CREDENTIAL_WELCOME', $2::jsonb, $3)`,
        [
          userId,
          JSON.stringify({
            fullName: dto.fullName,
            mobilePhone: dto.mobilePhone,
            tempPassword
          }),
          `outbox-provision-${userId}`
        ]
      );

      return {
        userId,
        fullName: dto.fullName,
        mobilePhone: dto.mobilePhone,
        masjidId: dto.masjidId,
        temporaryPasswordEnqueued: true
      };
    });
  }
}
