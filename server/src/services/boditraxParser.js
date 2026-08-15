export function parseFrenchDate(dateStr) {
  if (!dateStr) return null;
  // Format expected: "DD/MM/YYYY HH:MM:SS"
  const parts = dateStr.trim().split(' ');
  if (parts.length < 2) return null;
  const dateParts = parts[0].split('/');
  if (dateParts.length < 3) return null;

  const day = dateParts[0].padStart(2, '0');
  const month = dateParts[1].padStart(2, '0');
  const year = dateParts[2];
  const time = parts[1];

  const isoDate = `${year}-${month}-${day}`;
  const isoDateTime = `${isoDate} ${time}`;

  return { isoDate, isoDateTime };
}

export function parseBoditraxCsv(csvContent) {
  if (!csvContent || typeof csvContent !== 'string') {
    return [];
  }

  const lines = csvContent.split(/\r?\n/);
  let inScanSection = false;

  // Map scan_datetime -> { scan_datetime, scan_date, metrics: {} }
  const sessionsMap = new Map();

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed === 'User Scan Details') {
      inScanSection = true;
      continue;
    }

    if (inScanSection && (trimmed.startsWith('User ') || trimmed === 'User Login Details')) {
      inScanSection = false;
      break;
    }

    if (!inScanSection) continue;
    if (trimmed.startsWith('BodyMetricTypeId,')) continue; // Header line

    const tokens = trimmed.split(',');
    let metricName = null;
    let numericValue = null;
    let rawDateStr = null;

    if (tokens.length === 4) {
      metricName = tokens[0].trim();
      numericValue = parseFloat(`${tokens[1].trim()}.${tokens[2].trim()}`);
      rawDateStr = tokens[3].trim();
    } else if (tokens.length === 3) {
      metricName = tokens[0].trim();
      numericValue = parseFloat(tokens[1].trim());
      rawDateStr = tokens[2].trim();
    } else {
      continue;
    }

    if (!metricName || isNaN(numericValue) || !rawDateStr) {
      continue;
    }

    const dateParsed = parseFrenchDate(rawDateStr);
    if (!dateParsed) continue;

    const { isoDateTime, isoDate } = dateParsed;

    if (!sessionsMap.has(isoDateTime)) {
      sessionsMap.set(isoDateTime, {
        scan_datetime: isoDateTime,
        scan_date: isoDate,
        raw_metrics: {}
      });
    }

    const session = sessionsMap.get(isoDateTime);
    session.raw_metrics[metricName] = numericValue;
  }

  // Convert sessions map to normalized scan objects
  const sessions = [];

  for (const session of sessionsMap.values()) {
    const rm = session.raw_metrics;
    const bmrkJ = rm['BasalMetabolicRatekJ'];
    const bmrKcal = bmrkJ != null ? Math.round(bmrkJ / 4.184) : null;

    sessions.push({
      scan_datetime: session.scan_datetime,
      scan_date: session.scan_date,
      weight_kg: rm['BodyWeight'] ?? null,
      fat_mass_kg: rm['FatMass'] ?? null,
      fat_free_mass_kg: rm['FatFreeMass'] ?? null,
      muscle_mass_kg: rm['MuscleMass'] ?? null,
      bone_mass_kg: rm['BoneMass'] ?? null,
      water_mass_kg: rm['WaterMass'] ?? null,
      visceral_fat_rating: rm['VisceralFatRating'] ?? null,
      bmr_kcal: bmrKcal,
      metabolic_age: rm['MetabolicAge'] ? Math.round(rm['MetabolicAge']) : null,
      bmi: rm['BodyMassIndex'] ?? null,
      raw_metrics_json: JSON.stringify(rm)
    });
  }

  // Return sorted chronologically
  return sessions.sort((a, b) => a.scan_datetime.localeCompare(b.scan_datetime));
}
