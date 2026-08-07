import { db } from '../database/pg-client.js';
import { ConflictError } from '../../shared/errors/app-error.js';

export interface IdempotencyRecord {
  userId: string;
  idempotencyKey: string;
  httpMethod: string;
  requestPath: string;
  status: 'PROCESSING' | 'COMPLETED';
  responseCode?: number | null;
  responseBody?: unknown | null;
}

export class PgIdempotencyRepository {
  public async reserveOrGet(
    userId: string,
    key: string,
    method: string,
    path: string,
    fingerprint: string
  ): Promise<{ isCached: boolean; record: IdempotencyRecord }> {
    const existing = await db.query(
      `SELECT * FROM app.idempotency_keys WHERE user_id = $1 AND idempotency_key = $2`,
      [userId, key]
    );

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      if (row.status === 'PROCESSING') {
        throw new ConflictError('Concurrent request with same Idempotency-Key is currently in progress', {
          idempotency_key: key
        });
      }
      return {
        isCached: true,
        record: {
          userId: String(row.user_id),
          idempotencyKey: String(row.idempotency_key),
          httpMethod: String(row.http_method),
          requestPath: String(row.request_path),
          status: row.status,
          responseCode: row.response_code ? Number(row.response_code) : null,
          responseBody: row.response_body
        }
      };
    }

    const inserted = await db.query(
      `INSERT INTO app.idempotency_keys (
        user_id, idempotency_key, http_method, request_path, request_fingerprint, status
      ) VALUES ($1, $2, $3, $4, $5, 'PROCESSING')
      RETURNING *`,
      [userId, key, method, path, fingerprint]
    );

    const row = inserted.rows[0];
    return {
      isCached: false,
      record: {
        userId: String(row.user_id),
        idempotencyKey: String(row.idempotency_key),
        httpMethod: String(row.http_method),
        requestPath: String(row.request_path),
        status: 'PROCESSING'
      }
    };
  }

  public async complete(
    userId: string,
    key: string,
    responseCode: number,
    responseBody: unknown
  ): Promise<void> {
    await db.query(
      `UPDATE app.idempotency_keys 
       SET status = 'COMPLETED', response_code = $3, response_body = $4::jsonb 
       WHERE user_id = $1 AND idempotency_key = $2`,
      [userId, key, responseCode, JSON.stringify(responseBody ?? {})]
    );
  }
}
