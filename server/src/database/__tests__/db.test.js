import { describe, it, expect, afterEach } from 'vitest';
import { getDatabase, closeDatabase } from '../db.js';
import { makeTempDbPath, removeTempDb } from '../../test-utils/tempDb.js';

describe('Database Module (db.js)', () => {
  const tempDbPath = makeTempDbPath('temp_test_db.db');

  afterEach(() => {
    closeDatabase();
    removeTempDb(tempDbPath);
  });

  it('should initialize sqlite with WAL mode and foreign_keys enabled', () => {
    const db = getDatabase(tempDbPath);
    const fk = db.pragma('foreign_keys', { simple: true });
    const journalMode = db.pragma('journal_mode', { simple: true });

    expect(fk).toBe(1);
    expect(journalMode).toBe('wal');
  });
});
