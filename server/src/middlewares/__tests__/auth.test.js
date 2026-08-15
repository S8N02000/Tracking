import { describe, it, expect } from 'vitest';
import { safeCompare } from '../auth.js';

describe('Auth Middleware Utilities', () => {
  it('should accurately compare identical strings', () => {
    expect(safeCompare('secret123', 'secret123')).toBe(true);
  });

  it('should return false for different strings of same length', () => {
    expect(safeCompare('secret123', 'secret456')).toBe(false);
  });

  it('should return false for different strings of different lengths without throwing', () => {
    expect(safeCompare('short', 'very_long_secret')).toBe(false);
    expect(safeCompare(null, 'secret')).toBe(false);
    expect(safeCompare(undefined, 'secret')).toBe(false);
  });
});
