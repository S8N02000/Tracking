import { describe, it, expect, afterEach } from 'vitest';
import { getDatabase, closeDatabase } from '../db.js';
import path from 'path';
import fs from 'fs';

describe('Database Module (db.js)', () => {
  const tempDbPath = path.resolve(process.cwd(), 'temp_test_db.db');

  afterEach(() => {
    closeDatabase();
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
    if (fs.existsSync(`${tempDbPath}-wal`)) {
      fs.unlinkSync(`${tempDbPath}-wal`);
    }
    if (fs.existsSync(`${tempDbPath}-shm`)) {
      fs.unlinkSync(`${tempDbPath}-shm`);
    }
  });

  it('should initialize sqlite with WAL mode and foreign_keys enabled', () => {
    const db = getDatabase(tempDbPath);
    const fk = db.pragma('foreign_keys', { simple: true });
    const journalMode = db.pragma('journal_mode', { simple: true });

    expect(fk).toBe(1);
    expect(journalMode).toBe('wal');
  });
});
