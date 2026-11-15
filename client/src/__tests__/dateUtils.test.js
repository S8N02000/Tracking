import { describe, it, expect } from 'vitest';
import {
  getTodayLocalDate,
  formatDateToISO,
  shiftDaysLocal,
  formatShortDate
} from '../utils/dateUtils.js';

describe('dateUtils Unit Tests', () => {
  it('should return a valid local ISO date YYYY-MM-DD for today', () => {
    const today = getTodayLocalDate();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should correctly format Date instances into YYYY-MM-DD without UTC shift', () => {
    const sample = new Date(2026, 7, 15); // Note: month index 7 = August
    expect(formatDateToISO(sample)).toBe('2026-08-15');
  });

  it('should handle leap years and month transitions with shiftDaysLocal', () => {
    // Leap year 2024: 2024-02-28 + 1 day = 2024-02-29
    expect(shiftDaysLocal('2024-02-28', 1)).toBe('2024-02-29');
    expect(shiftDaysLocal('2024-02-29', 1)).toBe('2024-03-01');

    // Year change: 2026-12-31 + 1 day = 2027-01-01
    expect(shiftDaysLocal('2026-12-31', 1)).toBe('2027-01-01');

    // Backward transition: 2026-03-01 - 1 day = 2026-02-28
    expect(shiftDaysLocal('2026-03-01', -1)).toBe('2026-02-28');

    // Week shift: 2026-08-15 - 7 days = 2026-08-08
    expect(shiftDaysLocal('2026-08-15', -7)).toBe('2026-08-08');
  });

  it('should format short date JJ/MM properly', () => {
    expect(formatShortDate('2026-08-05')).toBe('05/08');
    expect(formatShortDate('invalid')).toBe('invalid');
  });
});
