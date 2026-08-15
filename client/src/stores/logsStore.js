import { defineStore } from 'pinia';
import api from '@/api/client.js';

export const useLogsStore = defineStore('logs', {
  state: () => {
    const today = new Date().toISOString().substring(0, 10);
    return {
      selectedDate: today,
      meals: [],
      sports: [],
      targets: null,
      loading: false,
      error: null
    };
  },
  actions: {
    setSelectedDate(dateStr) {
      this.selectedDate = dateStr;
      return this.fetchLogsForDate();
    },
    async fetchLogsForDate() {
      this.loading = true;
      this.error = null;
      try {
        const [mealsRes, sportsRes, targetsRes] = await Promise.all([
          api.get(`/meals?date=${this.selectedDate}`),
          api.get(`/sports?date=${this.selectedDate}`),
          api.get(`/targets?date=${this.selectedDate}`)
        ]);

        this.meals = mealsRes.data || [];
        this.sports = sportsRes.data || [];
        this.targets = targetsRes.data || null;
      } catch (err) {
        this.error = 'Erreur lors du chargement des journaux de la journée.';
      } finally {
        this.loading = false;
      }
    },
    async addMeal(mealData) {
      await api.post('/meals', { ...mealData, date_: this.selectedDate });
      await this.fetchLogsForDate();
    },
    async deleteMeal(id) {
      await api.delete(`/meals/${id}`);
      await this.fetchLogsForDate();
    },
    async addSport(sportData) {
      await api.post('/sports', { ...sportData, date_: this.selectedDate });
      await this.fetchLogsForDate();
    },
    async deleteSport(id) {
      await api.delete(`/sports/${id}`);
      await this.fetchLogsForDate();
    },
    async saveTargets(targetData) {
      await api.post('/targets', { ...targetData, date_: this.selectedDate });
      await this.fetchLogsForDate();
    }
  }
});
