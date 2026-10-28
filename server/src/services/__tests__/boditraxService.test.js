import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runMigrations } from '../../database/migrate.js';
import { getDatabase, closeDatabase } from '../../database/db.js';
import { importBoditraxData, getAllScans } from '../boditraxService.js';
import { makeTempDbPath, removeTempDb } from '../../test-utils/tempDb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Fixture d'export Boditrax versionnée.
 *
 * Le test lisait `../BoditraxAccount_<timestamp>.csv` à la racine du repo :
 * un export utilisateur réel, jamais versionné (le `.gitignore` exclut
 * `*.csv`) et donc absent du dépôt. Le test échouait en CI et après tout
 * nettoyage du dossier de travail.
 *
 * La fixture ci-dessous a été reconstituée à partir de scans réels de la
 * base (3 sessions, export complet avec la virgule décimale française qui
 * devient un séparateur CSV). Elle est versionnée et déterministe.
 */
const FIXTURE = path.join(__dirname, 'fixtures', 'boditrax-export-sample.csv');

describe('Boditrax Service Integration Tests', () => {
  const tempDbPath = makeTempDbPath('temp_boditrax_db.db');

  afterEach(() => {
    closeDatabase();
    removeTempDb(tempDbPath);
  });

  it('should import Boditrax CSV file and ignore duplicates on second import', () => {
    runMigrations(tempDbPath);
    const db = getDatabase(tempDbPath);

    const csvContent = fs.readFileSync(FIXTURE, 'utf8');

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

  it('should import every session of the export, not only the last one', () => {
    runMigrations(tempDbPath);
    const db = getDatabase(tempDbPath);

    const csvContent = fs.readFileSync(FIXTURE, 'utf8');
    const result = importBoditraxData(csvContent, db);

    // La fixture contient 3 sessions distinctes : toutes doivent être
    // insérées (le parseur regroupe les métriques par horodatage).
    expect(result.totalDetected).toBe(3);
    expect(result.inserted).toBe(3);

    const scans = getAllScans(db);
    expect(scans.length).toBe(3);

    // Contrôle du contenu : la virgule décimale française doit être
    // reconstituée (103,1 -> 103.1, et non "103" + "1" lus séparément).
    const byDate = Object.fromEntries(scans.map((s) => [s.scan_date, s]));
    const dates = Object.keys(byDate).sort();

    expect(dates).toEqual(['2026-10-22', '2026-10-23', '2026-10-27']);

    // Poids, masse grasse et IMC de la session du 27/10 (valeurs réelles).
    const last = byDate['2026-10-27'];
    expect(last.weight_kg).toBeCloseTo(95.5, 1);
    expect(last.fat_mass_kg).toBeCloseTo(21, 1);
    expect(last.bmi).toBeCloseTo(31.2, 1);
    expect(last.metabolic_age).toBe(39);
    // BMR stocké en kcal : kJ / 4.184 arrondi.
    expect(last.bmr_kcal).toBe(2193);

    // Les métriques brutes sont conservées intégralement.
    const raw = JSON.parse(last.raw_metrics_json);
    expect(raw.BodyWeight).toBeCloseTo(95.5, 1);
    expect(raw.Height).toBe(175);
    expect(raw.Age).toBe(38);
  });

  it('should import only the sessions present in a partial export', () => {
    runMigrations(tempDbPath);
    const db = getDatabase(tempDbPath);

    const csvContent = fs.readFileSync(FIXTURE, 'utf8');

    // Import partiel : seules les métriques d'une seule date sont présentes.
    const partial = csvContent
      .split(/\r?\n/)
      .filter((line) => line.includes('27/10/2026') || line.startsWith('User ') ||
                        line.startsWith('BodyMetricTypeId') || line.startsWith('Email,'))
      .join('\n');

    const result = importBoditraxData(partial, db);

    expect(result.totalDetected).toBe(1);
    expect(result.inserted).toBe(1);

    const scans = getAllScans(db);
    expect(scans.length).toBe(1);
    expect(scans[0].scan_date).toBe('2026-10-27');
  });
});
