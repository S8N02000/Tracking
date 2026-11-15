import { describe, it, expect } from 'vitest';
import { NUTRIENTS_MAP, DISPLAY_COLS } from '../config/nutrients.js';

describe('Nutrients Configuration Tests', () => {
  it('should expose exactly 38 registered nutrients', () => {
    expect(DISPLAY_COLS.length).toBe(38);
    expect(Object.keys(NUTRIENTS_MAP).length).toBe(38);
  });

  it('should ensure each nutrient has valid metadata and property mappings', () => {
    for (const key of DISPLAY_COLS) {
      const def = NUTRIENTS_MAP[key];
      expect(def).toBeDefined();
      expect(def.key).toBe(key);
      expect(typeof def.label).toBe('string');
      expect(typeof def.name).toBe('string');
      expect(typeof def.unit).toBe('string');
      expect(typeof def.decimals).toBe('number');
      expect(def.foodProp).toMatch(/_100g$/);
      expect(def.recipeProp).toMatch(/_per_portion$/);
      expect(typeof def.color).toBe('string');
      expect(typeof def.tooltip).toBe('string');
    }
  });

  it('should verify essential macronutrient and micronutrient keys', () => {
    const keys = DISPLAY_COLS;
    expect(keys).toContain('kcal');
    expect(keys).toContain('P');
    expect(keys).toContain('G');
    expect(keys).toContain('L');
    expect(keys).toContain('fibres');
    expect(keys).toContain('omega3');
    expect(keys).toContain('omega6');
    expect(keys).toContain('sodium');
    expect(keys).toContain('K');
    expect(keys).toContain('Ca');
    expect(keys).toContain('Mg');
    expect(keys).toContain('Zn');
    expect(keys).toContain('cuivre');
  });
});
