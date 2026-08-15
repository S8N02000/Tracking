import { mapOffProductToFood } from './openFoodFactsMapper.js';

const OFF_BASE_URL = 'https://world.openfoodfacts.org';
const TIMEOUT_MS = 3500;

export async function fetchProductByBarcode(barcode) {
  if (!barcode) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = `${OFF_BASE_URL}/api/v2/product/${encodeURIComponent(barcode)}.json`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'NutritionTracker - Version 1.0 (contact@nutrition.local)'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Open Food Facts API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.status !== 1 || !data.product) {
      return null;
    }

    return mapOffProductToFood(data.product);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Open Food Facts API request timed out (3.5s)');
    }
    throw err;
  }
}

export async function searchProducts(query, page = 1) {
  if (!query || typeof query !== 'string') return [];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = `${OFF_BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(
      query
    )}&search_simple=1&action=process&json=1&page=${page}&page_size=20`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'NutritionTracker - Version 1.0 (contact@nutrition.local)'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Open Food Facts API search error: ${response.status}`);
    }

    const data = await response.json();
    const products = data.products || [];

    return products
      .filter((p) => p.product_name_fr || p.product_name)
      .map((p) => mapOffProductToFood(p));
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Open Food Facts API search timed out (3.5s)');
    }
    throw err;
  }
}
