import { db } from '../../../infrastructure/database/pg-client.js';
import { AssignmentType } from '../../../domain/enums/assignment-type.enum.js';
import { ConflictError, NotFoundError } from '../../../shared/errors/app-error.js';

export interface ExecuteAssignmentDTO {
  masjidId: string;
  userId: string;
  assignmentType: AssignmentType;
  assignedBy: string;
  expiresAt?: Date;
}

export interface AssignmentDatabaseClient {
  query(sql: string, params?: unknown[]): Promise<{ rows: any[] }>;
  withTransaction<T>(fn: (client: any) => Promise<T>): Promise<T>;
}

export class ExecuteAssignmentUseCase {
  constructor(private readonly client: AssignmentDatabaseClient = db) {}

  public async execute(dto: ExecuteAssignmentDTO) {
    const masjidRes = await this.client.query('SELECT id, status FROM app.masjids WHERE id = $1 AND deleted_at IS NULL', [dto.masjidId]);
    if (masjidRes.rows.length === 0) {
      throw new NotFoundError(`Masjid not found with ID: ${dto.masjidId}`);
    }

    const userRes = await this.client.query('SELECT id, status FROM app.users WHERE id = $1 AND deleted_at IS NULL', [dto.userId]);
    if (userRes.rows.length === 0) {
      throw new NotFoundError(`Admin user not found with ID: ${dto.userId}`);
    }

    if (dto.assignmentType === AssignmentType.PRIMARY_ADMIN) {
      const activePrimary = await this.client.query(
        `SELECT id FROM app.masjid_assignments 
         WHERE masjid_id = $1 AND assignment_type = 'PRIMARY_ADMIN' AND status = 'ACTIVE'`,
        [dto.masjidId]
      );
      if (activePrimary.rows.length > 0) {
        throw new ConflictError('Masjid already has an active Primary Admin. Revoke existing primary assignment first.');
      }
    }

    return await this.client.withTransaction(async (trx) => {
      const assignRes = await trx.query(
        `INSERT INTO app.masjid_assignments (
          masjid_id, user_id, assignment_type, assigned_by, expires_at, status
        ) VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
        RETURNING id, created_at`,
        [dto.masjidId, dto.userId, dto.assignmentType, dto.assignedBy, dto.expiresAt ?? null]
      );

      const assignmentId = String(assignRes.rows[0].id);

      return {
        assignmentId,
        masjidId: dto.masjidId,
        userId: dto.userId,
        assignmentType: dto.assignmentType,
        status: 'ACTIVE'
      };
    });
  }
}
