import { getDatabase } from '../database/db.js';
import { parseBoditraxCsv } from './boditraxParser.js';

export function importBoditraxData(csvContent, customDb = null) {
  const db = customDb || getDatabase();
  const sessions = parseBoditraxCsv(csvContent);

  if (sessions.length === 0) {
    return { totalDetected: 0, inserted: 0, duplicatesIgnored: 0 };
  }

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO body_scans (
      scan_datetime, scan_date, weight_kg, fat_mass_kg, fat_free_mass_kg,
      muscle_mass_kg, bone_mass_kg, water_mass_kg, visceral_fat_rating,
      bmr_kcal, metabolic_age, bmi, raw_metrics_json
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  let insertedCount = 0;

  const runBatch = db.transaction((items) => {
    for (const item of items) {
      const res = insertStmt.run(
        item.scan_datetime,
        item.scan_date,
        item.weight_kg,
        item.fat_mass_kg,
        item.fat_free_mass_kg,
        item.muscle_mass_kg,
        item.bone_mass_kg,
        item.water_mass_kg,
        item.visceral_fat_rating,
        item.bmr_kcal,
        item.metabolic_age,
        item.bmi,
        item.raw_metrics_json
      );
      if (res.changes > 0) {
        insertedCount++;
      }
    }
  });

  runBatch(sessions);

  const duplicatesIgnored = sessions.length - insertedCount;
  return {
    totalDetected: sessions.length,
    inserted: insertedCount,
    duplicatesIgnored
  };
}

export function getAllScans(customDb = null) {
  const db = customDb || getDatabase();
  return db
    .prepare('SELECT * FROM body_scans ORDER BY scan_datetime DESC')
    .all();
}
