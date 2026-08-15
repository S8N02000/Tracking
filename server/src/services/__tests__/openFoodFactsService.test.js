import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchProductByBarcode, searchProducts } from '../openFoodFactsService.js';

describe('Open Food Facts Service Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should fetch product by barcode successfully when product exists', async () => {
    const mockResponse = {
      status: 1,
      product: {
        code: '3017620422003',
        product_name_fr: 'Nutella',
        nutriments: { 'energy-kcal_100g': 539 }
      }
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })
    );

    const res = await fetchProductByBarcode('3017620422003');
    expect(res).not.toBeNull();
    expect(res.name).toBe('Nutella');
    expect(res.energy_kcal_100g).toBe(539);
  });

  it('should return null when product is not found (status 0)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 0, product: null })
      })
    );

    const res = await fetchProductByBarcode('0000000000000');
    expect(res).toBeNull();
  });

  it('should throw an error on request timeout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        return Promise.reject(err);
      })
    );

    await expect(fetchProductByBarcode('12345')).rejects.toThrow('timed out');
  });
});
