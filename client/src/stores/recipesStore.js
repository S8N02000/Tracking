import { defineStore } from 'pinia';
import api from '@/api/client.js';

export const useRecipesStore = defineStore('recipes', {
  state: () => ({
    recipes: [],
    searchQuery: '',
    minRating: '',
    sortBy: 'rating_desc',
    loading: false,
    error: null
  }),
  actions: {
    async fetchRecipes() {
      this.loading = true;
      this.error = null;
      try {
        let url = '/recipes?1=1';
        if (this.searchQuery) url += `&search=${encodeURIComponent(this.searchQuery)}`;
        if (this.minRating !== '' && this.minRating !== null) url += `&minRating=${encodeURIComponent(this.minRating)}`;
        if (this.sortBy) url += `&sortBy=${encodeURIComponent(this.sortBy)}`;

        const res = await api.get(url);
        this.recipes = res.data || [];
      } catch (err) {
        this.error = 'Erreur lors de la récupération des recettes.';
      } finally {
        this.loading = false;
      }
    },
    async createRecipe(recipeData, ingredients) {
      const res = await api.post('/recipes', { ...recipeData, ingredients });
      await this.fetchRecipes();
      return res.data;
    },
    async updateRecipe(id, recipeData, ingredients) {
      const res = await api.put(`/recipes/${id}`, { ...recipeData, ingredients });
      await this.fetchRecipes();
      return res.data;
    },
    async deleteRecipe(id) {
      await api.delete(`/recipes/${id}`);
      await this.fetchRecipes();
    }
  }
});
