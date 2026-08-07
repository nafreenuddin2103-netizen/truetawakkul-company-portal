import { db } from '../database/pg-client.js';
import { logger } from '../../shared/logger/logger.js';

export class OutboxWorkerService {
  public static async processPendingNotifications(): Promise<number> {
    const pendingRes = await db.query(
      `SELECT * FROM app.notification_outbox 
       WHERE status = 'PENDING' AND retry_count < max_retries 
       ORDER BY created_at ASC LIMIT 50 FOR UPDATE SKIP LOCKED`
    );

    let processed = 0;
    for (const row of pendingRes.rows) {
      try {
        logger.info(`OutboxWorker dispatching ${row.channel} notification (${row.template_code}) to user ${row.recipient_user_id}`);
        await db.query(
          `UPDATE app.notification_outbox SET
            status = 'SENT', sent_at = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [row.id]
        );
        processed++;
      } catch (err: unknown) {
        await db.query(
          `UPDATE app.notification_outbox SET
            retry_count = retry_count + 1,
            last_error = $2,
            updated_at = NOW()
           WHERE id = $1`,
          [row.id, String(err)]
        );
      }
    }

    return processed;
  }
}
