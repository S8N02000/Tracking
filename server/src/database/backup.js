import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export function backupDatabase(customDbPath = null) {
  const dbPath = customDbPath || process.env.DB_PATH || '../sqlite/nutrition.db';
  const resolvedPath = path.isAbsolute(dbPath)
    ? dbPath
    : path.resolve(process.cwd(), dbPath);

  if (!fs.existsSync(resolvedPath)) {
    return null;
  }

  const backupDir = path.resolve(process.cwd(), 'backup_reports');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `nutrition_backup_${timestamp}.db`;
  const backupPath = path.join(backupDir, backupFilename);

  fs.copyFileSync(resolvedPath, backupPath);
  return backupPath;
}
