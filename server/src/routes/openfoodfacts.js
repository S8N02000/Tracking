import { Router } from 'express';
import { fetchProductByBarcode, searchProducts } from '../services/openFoodFactsService.js';

const router = Router();

// GET /api/openfoodfacts/barcode/:barcode
router.get('/openfoodfacts/barcode/:barcode', async (req, res, next) => {
  try {
    const product = await fetchProductByBarcode(req.params.barcode);
    if (!product) {
      return res.status(404).json({ error: true, message: 'Produit non trouvé sur Open Food Facts.' });
    }
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// GET /api/openfoodfacts/search?q=query
router.get('/openfoodfacts/search', async (req, res, next) => {
  try {
    const query = req.query.q || '';
    const page = parseInt(req.query.page || '1', 10);
    const results = await searchProducts(query, page);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

export default router;
