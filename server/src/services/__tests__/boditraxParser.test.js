import { describe, it, expect } from 'vitest';
import { parseBoditraxCsv, parseFrenchDate } from '../boditraxParser.js';

describe('Boditrax Parser Unit Tests', () => {
  it('should parse French date/time strings correctly into ISO dates', () => {
    const res = parseFrenchDate('13/08/2026 04:51:20');
    expect(res).toEqual({
      isoDate: '2026-08-13',
      isoDateTime: '2026-08-13 04:51:20'
    });
  });

  it('should reconstitute split French decimal numbers and convert BMR kJ to kcal', () => {
    const sampleCsv = `
User Details
Email,FirstName LastName,DateOfBirth,Gender
lombardnicolas02@gmail.com,Nicolas,LOMBARD,14/02/1988 00:00:00,Male
User Scan Details
BodyMetricTypeId,Value,CreatedDate
FatMass,26,6,13/08/2026 04:51:20
BodyWeight,103,1,13/08/2026 04:51:20
MetabolicAge,51,13/08/2026 04:51:20
BasalMetabolicRatekJ,9519,13/08/2026 04:51:20
User Login Details
    `;

    const sessions = parseBoditraxCsv(sampleCsv);
    expect(sessions.length).toBe(1);
    const session = sessions[0];
    expect(session.scan_datetime).toBe('2026-08-13 04:51:20');
    expect(session.weight_kg).toBe(103.1);
    expect(session.fat_mass_kg).toBe(26.6);
    expect(session.metabolic_age).toBe(51);
    // 9519 kJ / 4.184 = 2275 kcal
    expect(session.bmr_kcal).toBe(2275);
  });

  it('should handle corrupted or empty CSV input gracefully', () => {
    expect(parseBoditraxCsv(null)).toEqual([]);
    expect(parseBoditraxCsv('')).toEqual([]);
    expect(parseBoditraxCsv('random text without scan details')).toEqual([]);
  });
});
