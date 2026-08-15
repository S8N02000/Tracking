import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

let instance = null;

export function getDatabase(customPath = null) {
  if (instance && !customPath) {
    return instance;
  }

  const dbPath = customPath || process.env.DB_PATH || process.env.DATABASE_PATH || '../sqlite/nutrition.db';
  const resolvedPath = path.isAbsolute(dbPath)
    ? dbPath
    : path.resolve(process.cwd(), dbPath);

  // Ensure directory exists
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(resolvedPath);

  // Configure Pragmas
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('temp_store = MEMORY');

  if (!customPath) {
    instance = db;
  }

  return db;
}

export function closeDatabase() {
  if (instance) {
    instance.close();
    instance = null;
  }
}

export const db = getDatabase();
