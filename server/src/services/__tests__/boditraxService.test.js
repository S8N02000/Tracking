import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { runMigrations } from '../../database/migrate.js';
import { getDatabase, closeDatabase } from '../../database/db.js';
import { importBoditraxData, getAllScans } from '../boditraxService.js';

describe('Boditrax Service Integration Tests', () => {
  const tempDbPath = path.resolve(process.cwd(), 'temp_boditrax_db.db');

  afterEach(() => {
    closeDatabase();
    if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
    if (fs.existsSync(`${tempDbPath}-wal`)) fs.unlinkSync(`${tempDbPath}-wal`);
    if (fs.existsSync(`${tempDbPath}-shm`)) fs.unlinkSync(`${tempDbPath}-shm`);
  });

  it('should import Boditrax CSV file and ignore duplicates on second import', () => {
    runMigrations(tempDbPath);
    const db = getDatabase(tempDbPath);

    const csvPath = path.resolve(process.cwd(), '../BoditraxAccount_20260815_065437.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');

    const result1 = importBoditraxData(csvContent, db);
    expect(result1.totalDetected).toBeGreaterThan(0);
    expect(result1.inserted).toBe(result1.totalDetected);
    expect(result1.duplicatesIgnored).toBe(0);

    const scans = getAllScans(db);
    expect(scans.length).toBe(result1.inserted);

    // Second import must ignore all duplicates idempotently
    const result2 = importBoditraxData(csvContent, db);
    expect(result2.totalDetected).toBe(result1.totalDetected);
    expect(result2.inserted).toBe(0);
    expect(result2.duplicatesIgnored).toBe(result1.totalDetected);

    const scansAfter = getAllScans(db);
    expect(scansAfter.length).toBe(result1.inserted);
  });
});
