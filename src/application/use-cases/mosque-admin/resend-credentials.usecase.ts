import crypto from 'crypto';
import { db } from '../../../infrastructure/database/pg-client.js';
import { PasswordHasher } from '../../../shared/crypto/password-hasher.js';
import { NotFoundError } from '../../../shared/errors/app-error.js';

export class ResendCredentialsUseCase {
  public async execute(userId: string) {
    const userRes = await db.query(
      'SELECT id, full_name, mobile_phone FROM app.users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );

    if (userRes.rows.length === 0) {
      throw new NotFoundError(`Mosque admin user not found with ID: ${userId}`);
    }

    const user = userRes.rows[0];
    const newTempPassword = `Tt@${crypto.randomBytes(4).toString('hex')}!`;
    const passwordHash = await PasswordHasher.hash(newTempPassword);

    return await db.withTransaction(async (client) => {
      await client.query(
        `UPDATE app.auth_credentials SET password_hash = $2, updated_at = NOW() WHERE user_id = $1`,
        [userId, passwordHash]
      );

      await client.query(
        `UPDATE app.users SET must_change_password = true, updated_at = NOW() WHERE id = $1`,
        [userId]
      );


      return {

        userId,
        mobilePhone: String(user.mobile_phone),
        message: 'New temporary credentials generated and queued for WhatsApp delivery.'
      };
    });
  }
}
