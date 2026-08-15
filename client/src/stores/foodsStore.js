import { defineStore } from 'pinia';
import api from '@/api/client.js';

export const useFoodsStore = defineStore('foods', {
  state: () => ({
    foods: [],
    selectedCategory: '',
    searchQuery: '',
    loading: false,
    offSearching: false,
    offSearchResults: [],
    error: null
  }),
  actions: {
    async fetchFoods() {
      this.loading = true;
      this.error = null;
      try {
        let url = '/foods?1=1';
        if (this.selectedCategory) url += `&category=${encodeURIComponent(this.selectedCategory)}`;
        if (this.searchQuery) url += `&search=${encodeURIComponent(this.searchQuery)}`;

        const res = await api.get(url);
        this.foods = res.data || [];
      } catch (err) {
        this.error = 'Erreur lors du chargement de la base d\'aliments.';
      } finally {
        this.loading = false;
      }
    },
    async searchOpenFoodFacts(query) {
      if (!query) {
        this.offSearchResults = [];
        return;
      }
      this.offSearching = true;
      try {
        const res = await api.get(`/openfoodfacts/search?q=${encodeURIComponent(query)}`);
        this.offSearchResults = res.data || [];
      } catch (err) {
        this.offSearchResults = [];
      } finally {
        this.offSearching = false;
      }
    },
    async fetchByBarcode(barcode) {
      this.offSearching = true;
      try {
        const res = await api.get(`/openfoodfacts/barcode/${barcode}`);
        return res.data;
      } catch (err) {
        return null;
      } finally {
        this.offSearching = false;
      }
    },
    async createFood(foodData) {
      const res = await api.post('/foods', foodData);
      await this.fetchFoods();
      return res.data;
    },
    async updateFood(id, foodData) {
      const res = await api.put(`/foods/${id}`, foodData);
      await this.fetchFoods();
      return res.data;
    },
    async deleteFood(id) {
      await api.delete(`/foods/${id}`);
      await this.fetchFoods();
    }
  }
});
