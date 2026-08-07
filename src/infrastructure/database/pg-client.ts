import pg from 'pg';
import { env } from '../../config/env.js';
import { logger } from '../../shared/logger/logger.js';

const { Pool } = pg;

export class DatabaseClient {
  private static instance: DatabaseClient;
  private pool: pg.Pool;

  private constructor() {
    this.pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: env.DATABASE_MAX_CONNECTIONS
    });

    this.pool.on('error', (err) => {
      logger.error({ err }, 'Unexpected error on idle PostgreSQL client');
    });
  }

  public static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient();
    }
    return DatabaseClient.instance;
  }

  public getPool(): pg.Pool {
    return this.pool;
  }

  public async query<T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<pg.QueryResult<T>> {
    const start = Date.now();
    const result = await this.pool.query<T>(text, params);
    const duration = Date.now() - start;
    logger.debug({ text, duration, rows: result.rowCount }, 'Executed PostgreSQL Query');
    return result;
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const res = await this.query('SELECT 1 AS healthy');
      return res.rows[0]?.healthy === 1;
    } catch (err) {
      logger.error({ err }, 'PostgreSQL Health Check Failed');
      return false;
    }
  }

  public async withTransaction<T>(
    callback: (client: pg.PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

export const db = DatabaseClient.getInstance();
