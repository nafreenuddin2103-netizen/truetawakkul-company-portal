import { beforeAll, afterAll, vi } from 'vitest';
import { db } from '../src/infrastructure/database/pg-client.js';
import dotenv from 'dotenv';
import path from 'path';

// Load the .env.test file before any tests run
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

beforeAll(() => {
  // Global mocks
  // If we don't have a real test database running, we mock the db client globally
  // so tests don't crash with ECONNREFUSED.
  
  if (process.env.NODE_ENV === 'test') {
    vi.spyOn(db, 'query').mockImplementation(async (text: string) => {
      // Basic mock responses to prevent DB crashes during tests
      if (text.includes('SELECT count(*)')) return { rows: [{ count: '1' }] } as any;
      if (text.includes('ST_Distance')) return { rows: [] } as any; 
      if (text.includes('INSERT INTO app.idempotency_keys')) return { rows: [] } as any;
      if (text.includes('INSERT INTO app.onboarding_applications')) {
        return { rows: [{ id: 'app-mock', application_number: `APP-${Math.random()}`, status: 'IN_PROGRESS', current_step: 1 }] } as any;
      }
      return { rows: [{ id: 'mock-id-123' }] } as any;
    });

    vi.spyOn(db, 'withTransaction').mockImplementation(async (callback: any) => {
      const mockClient = { query: db.query, release: vi.fn() };
      return callback(mockClient);
    });
  }
});

afterAll(() => {
  vi.restoreAllMocks();
});
