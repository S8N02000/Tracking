import { Router } from 'express';
import {
  getAllRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe
} from '../services/recipeService.js';

const router = Router();

// GET /api/recipes
router.get('/recipes', (req, res) => {
  const { minRating, maxRating, search, sortBy } = req.query;
  const recipes = getAllRecipes({ minRating, maxRating, search, sortBy });
  res.json(recipes);
});

// GET /api/recipes/:id
router.get('/recipes/:id', (req, res) => {
  const recipe = getRecipeById(req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: true, message: 'Recette introuvable.' });
  }
  res.json(recipe);
});

// POST /api/recipes
router.post('/recipes', (req, res, next) => {
  try {
    const { name, description, rating, portions, source, ingredients } = req.body;
    if (!name || !portions || !Array.isArray(ingredients)) {
      return res.status(400).json({
        error: true,
        message: 'Le nom, les portions et la liste d\'ingrédients sont obligatoires.'
      });
    }

    const created = createRecipe({ name, description, rating, portions, source }, ingredients);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PUT /api/recipes/:id
router.put('/recipes/:id', (req, res, next) => {
  try {
    const { name, description, rating, portions, source, ingredients } = req.body;
    const updated = updateRecipe(
      req.params.id,
      { name, description, rating, portions, source },
      ingredients
    );
    if (!updated) {
      return res.status(404).json({ error: true, message: 'Recette introuvable.' });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/recipes/:id
router.delete('/recipes/:id', (req, res, next) => {
  try {
    deleteRecipe(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: true, message: err.message });
  }
});

export default router;
