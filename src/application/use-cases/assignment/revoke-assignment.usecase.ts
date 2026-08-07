import { db } from '../../../infrastructure/database/pg-client.js';
import { NotFoundError } from '../../../shared/errors/app-error.js';

export interface RevokeAssignmentDTO {
  assignmentId: string;
  revocationReason: string;
  revokedBy: string;
}

export class RevokeAssignmentUseCase {
  public async execute(dto: RevokeAssignmentDTO) {
    const res = await db.query(
      'SELECT id, status, masjid_id, user_id FROM app.masjid_assignments WHERE id = $1',
      [dto.assignmentId]
    );

    if (res.rows.length === 0) {
      throw new NotFoundError(`Masjid assignment record not found: ${dto.assignmentId}`);
    }

    return await db.withTransaction(async (client) => {
      await client.query(
        `UPDATE app.masjid_assignments SET
          status = 'REVOKED', revoked_at = NOW(), revoked_by = $2, revocation_reason = $3
         WHERE id = $1`,
        [dto.assignmentId, dto.revokedBy, dto.revocationReason]
      );

      return {
        assignmentId: dto.assignmentId,
        status: 'REVOKED',
        revokedAt: new Date()
      };
    });
  }
}
